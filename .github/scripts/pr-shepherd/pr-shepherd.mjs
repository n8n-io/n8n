import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minimatch } from 'minimatch';
import { parse } from 'yaml';
import {
	assignOwnership,
	findOwningEntry,
	matchesPattern,
	parseOwnersContent,
	resolveRequiredTeams,
	teamHandleToSlug,
} from '../owners/owners.mjs';
import { schemaErrors } from '../quality/check-cubic-config.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const TEAMS = '.agents/review-rules/teams/';

export const PRESETS = Object.freeze({
	'unit-tests':
		'Prepare dependencies inside the sandbox. If workspace build outputs are missing, run pnpm --filter "<owning-package>^..." run build:unchecked > dependency-build.log 2>&1. This is setup, not a type check. Run pnpm --filter <owning-package> exec vitest run <affected-test-files> --maxWorkers=1. Check affected tests in every changed package; lane paths are routing hints, not a coverage boundary. Select existing tests and add a focused probe for changed behavior. Record the package, files, command, SHA, and output.',
	'editor-journey':
		'Build with pnpm build > build.log 2>&1. Use a disposable N8N_USER_FOLDER. Run pnpm --filter n8n-playwright test:local <focused-spec> --workers=1, or reproduce the changed journey in the editor. Save screenshots and a recording. Save, reopen, and execute the fixture.',
	'parser-ab':
		'Run pnpm --filter n8n-workflow exec vitest run test/workflow.test.ts test/node-reference-parser-utils.test.ts --maxWorkers=1. Probe exact and sibling names, Unicode whitespace, bracket access, and replacement names with spaces on pinned base and head. Keep inputs and outputs.',
	'instance-ai-live-model':
		'Start ollama serve on loopback and run ollama pull qwen3:0.6b before restricting external egress. Run inference and the logging proxy inside the secret-free sandbox; keep both on loopback. For Instance AI, set N8N_INSTANCE_AI_MODEL=custom/qwen3:0.6b and N8N_INSTANCE_AI_MODEL_URL to the proxy OpenAI-compatible base URL, including /v1. Use a disposable instance and synthetic two-turn thread. For Agents-only changes, call the changed model or agent API directly with the same local endpoint; Instance AI env vars do not configure that API. Capture request bodies for option-unset and option-enabled trials on pinned base and head. If a new API is absent on base, report that limit and label any legacy-equivalent comparison. An unchanged-path smoke test is not coverage of the new API. If the provider shape requires it, map real Ollama reasoning to reasoning_content in responses; do not fabricate reasoning. Record finish reasons and token limits; truncated reasoning with no text is not by itself an adapter defect. Normalize only IDs, ports, and timestamps for A/B comparison. Check unrelated provider fields and same-provider sub-agents. Record model/version, settings, raw private traces, normalized diff, outcomes, repetitions, and live/replay/mocked dependencies. Mark failed tool calls or missing sub-agent trials as not verified. Do not load provider keys.',
});

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value) =>
	Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim());
function keys(value, allowed, label) {
	if (!record(value) || Object.keys(value).some((key) => !allowed.includes(key)))
		throw new Error(`${label}: unknown keys or invalid object`);
}

export function validateProfile(profile) {
	keys(profile, ['lanes'], 'profile');
	if (!Array.isArray(profile.lanes)) throw new Error('profile: lanes must be an array');
	for (const lane of profile.lanes) {
		keys(lane, ['preset', 'paths', 'evidence', 'notes'], 'lane');
		if (!Object.hasOwn(PRESETS, lane.preset))
			throw new Error(`lane: unknown preset ${lane.preset}`);
		if (
			!strings(lane.paths) ||
			!lane.paths.length ||
			lane.paths.some(
				(path) =>
					path.startsWith('/') ||
					path.split('/').includes('..') ||
					(path !== '*' && /[*?\[\]{}]/.test(path)),
			)
		)
			throw new Error('lane: paths must use OWNERS-style patterns');
		if (lane.evidence !== undefined && !strings(lane.evidence))
			throw new Error('lane: evidence must be a string array');
		if (lane.notes !== undefined && typeof lane.notes !== 'string')
			throw new Error('lane: notes must be a string');
	}
	return profile;
}

export function validateTeams(files, read, entries, modeFor = () => '100644') {
	const slugs = new Set(entries.map((entry) => teamHandleToSlug(entry.team)));
	const errors = [];
	for (const path of files.filter(
		(path) => path.startsWith(TEAMS) || path === TEAMS.slice(0, -1),
	)) {
		const mode = modeFor(path);
		if (!['100644', '100755', '040000'].includes(mode)) {
			errors.push(
				`${path}: team policy must use regular files and directories; symlinks are not allowed`,
			);
			continue;
		}
		if (path === TEAMS.slice(0, -1) || path === TEAMS) continue;
		const slug = path.slice(TEAMS.length).split('/')[0];
		if (!slugs.has(slug)) errors.push(`${path}: unknown OWNERS team ${slug}`);
		const parts = path.slice(TEAMS.length).split('/');
		if (path.endsWith('/') && parts.length === 2) continue;
		if (parts.length !== 2 || (!path.endsWith('.md') && parts[1] !== 'profile.json')) {
			errors.push(
				`${path}: use only <team-slug>/*.md or <team-slug>/profile.json; nested directories are not allowed`,
			);
			continue;
		}
		try {
			if (path.endsWith('.md') && !/^Applies to:\s*\S/.test(read(path)))
				throw new Error('rule must open with Applies to:');
			if (path.endsWith('/profile.json')) validateProfile(JSON.parse(read(path)));
		} catch (error) {
			errors.push(`${path}: ${error.message}`);
		}
	}
	return [...new Set(errors)];
}

export function checkLocalTeams(root = ROOT) {
	const modes = new Map();
	const walk = (dir) => {
		const stat = lstatSync(join(root, dir), { throwIfNoEntry: false });
		if (!stat) return [];
		const path = stat.isDirectory() ? `${dir}/` : dir;
		modes.set(path, stat.isDirectory() ? '040000' : stat.isFile() ? '100644' : '120000');
		return [
			path,
			...(stat.isDirectory() &&
			(dir === TEAMS.slice(0, -1) || dir.slice(TEAMS.length).split('/').length === 1)
				? readdirSync(join(root, dir)).flatMap((name) => walk(`${dir}/${name}`))
				: []),
		];
	};
	for (const path of ['.agents', '.agents/review-rules']) {
		if (lstatSync(join(root, path), { throwIfNoEntry: false })?.isSymbolicLink())
			return [`${path}: symlinks are not allowed`];
	}
	const files = walk(TEAMS.slice(0, -1));
	const read = (path) => readFileSync(join(root, path), 'utf8');
	return validateTeams(files, read, parseOwnersContent(read('OWNERS')), (path) => modes.get(path));
}

export function changedPaths(output) {
	const tokens = output.split('\0');
	const files = new Set();
	for (let i = 0; i < tokens.length && tokens[i]; ) {
		const status = tokens[i++];
		const count = /^[RC]/.test(status) ? 2 : 1;
		for (let j = 0; j < count; j++) {
			if (!tokens[i]) throw new Error('Invalid name-status diff');
			files.add(tokens[i++]);
		}
	}
	return files;
}

export function buildPlan({ files, policyFiles, read, base, head, policy, modeFor }) {
	const entries = parseOwnersContent(read('OWNERS'));
	const errors = validateTeams(policyFiles, read, entries, modeFor);
	if (errors.length) throw new Error(errors.join('\n'));
	const required = resolveRequiredTeams(files, entries);
	const teams = [...assignOwnership(files, entries)].map(([team, owned]) => {
		const prefix = `${TEAMS}${teamHandleToSlug(team)}/`;
		return {
			team,
			fileCount: owned.length,
			files: owned,
			reviews: (required.get(team) ?? []).map((file) => ({
				file,
				...findOwningEntry(file, entries).review,
			})),
			rules: policyFiles.filter((path) => path.startsWith(prefix) && path.endsWith('.md')),
			gap: !policyFiles.some((path) => path.startsWith(prefix)),
		};
	});
	let cubic;
	try {
		cubic = parse(read('cubic.yaml'));
		const errors = schemaErrors(
			cubic,
			JSON.parse(
				readFileSync(new URL('../quality/cubic-config.schema.json', import.meta.url), 'utf8'),
			),
		);
		if (errors.length) throw new Error(errors.join('; '));
		if (!Array.isArray(cubic.reviews?.custom_rules))
			throw new Error('reviews.custom_rules must be an array');
	} catch (error) {
		throw new Error(`cubic.yaml: ${error.message}`);
	}
	const agents = cubic.reviews.custom_rules
		.filter((agent) => agent.enabled !== false)
		.map((agent) => ({
			name: agent.name,
			file_paths: agent.file_paths ?? [],
			files: [...files].filter(
				(file) =>
					(agent.include ?? ['**']).some((glob) => minimatch(file, glob, { dot: true })) &&
					!(agent.exclude ?? []).some((glob) => minimatch(file, glob, { dot: true })),
			),
		}))
		.filter((agent) => agent.files.length);
	const lanes = teams.flatMap(({ team }) => {
		const path = `${TEAMS}${teamHandleToSlug(team)}/profile.json`;
		if (!policyFiles.includes(path)) return [];
		return validateProfile(JSON.parse(read(path)))
			.lanes.map((lane) => ({
				team,
				...lane,
				instructions: PRESETS[lane.preset],
				files: [...files].filter((file) =>
					lane.paths.some((pattern) => matchesPattern(file, pattern)),
				),
			}))
			.filter((lane) => lane.files.length);
	});
	const guidance = new Set();
	for (const file of files) {
		if (!file.startsWith('packages/')) continue;
		for (let dir = dirname(file); dir.startsWith('packages/'); dir = dirname(dir)) {
			const found = ['AGENTS.md', 'CLAUDE.md']
				.map((name) => `${dir}/${name}`)
				.filter((path) => policyFiles.includes(path));
			if (found.length) {
				found.forEach((path) => guidance.add(path));
				break;
			}
		}
	}
	return {
		base,
		head,
		policy,
		files: [...files],
		teams,
		agents,
		guidance: [...guidance],
		lanes,
		policyChanges: [...files].filter(
			(path) =>
				path === 'OWNERS' ||
				path === 'cubic.yaml' ||
				path.startsWith('.agents/review-rules/') ||
				/(^|\/)(AGENTS|CLAUDE)\.md$/.test(path) ||
				path.startsWith('.github/scripts/pr-shepherd/'),
		),
	};
}

export function markdown(plan) {
	const lines = [
		'# PR shepherd plan',
		'',
		`Base: ${plan.base}`,
		`Head: ${plan.head}`,
		`Policy: ${plan.policy}`,
		'',
		'## Teams',
	];
	for (const team of plan.teams) {
		lines.push(
			`- ${team.team}: ${team.fileCount} files${team.gap ? ' — GAP: no rules folder' : ''}`,
		);
		for (const review of team.reviews)
			lines.push(`  - ${review.rule}(${review.count}): ${review.file}`);
		for (const rule of team.rules) lines.push(`  - Rule: ${rule}`);
	}
	lines.push('', '## Cubic agents');
	for (const agent of plan.agents)
		lines.push(
			`- ${agent.name}: ${agent.files.join(', ')}`,
			...agent.file_paths.map((path) => `  - ${path}`),
		);
	lines.push(
		'',
		'## Package guidance',
		...plan.guidance.map((path) => `- ${path}`),
		'',
		'## Verification lanes',
	);
	for (const lane of plan.lanes)
		lines.push(
			`- ${lane.team} / ${lane.preset}: ${lane.files.join(', ')}`,
			`  - ${lane.instructions}`,
			...(lane.evidence ?? []).map((item) => `  - Evidence: ${item}`),
			...(lane.notes ? [`  - Notes: ${lane.notes}`] : []),
		);
	lines.push(
		'',
		'## Policy changes in this PR — not applied',
		...(plan.policyChanges.length ? plan.policyChanges.map((path) => `- ${path}`) : ['- None.']),
	);
	return lines.join('\n');
}

export function planRefs({ base, head, policyRef, cwd = ROOT }) {
	const git = (...args) =>
		execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			maxBuffer: 32 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
	const sha = (ref) => {
		if (typeof ref !== 'string' || !ref || ref.startsWith('-'))
			throw new Error(`Invalid Git ref: ${ref}`);
		try {
			return git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
		} catch {
			throw new Error(`Cannot resolve Git ref: ${ref}`);
		}
	};
	base = sha(base);
	head = sha(head);
	let mergeBase;
	try {
		mergeBase = git('merge-base', base, head).trim();
	} catch {
		throw new Error('Base and head have no merge base (unrelated histories).');
	}
	const policy = sha(policyRef ?? mergeBase);
	const modes = new Map(
		git('ls-tree', '-r', '-t', '-z', policy)
			.split('\0')
			.filter(Boolean)
			.map((entry) => {
				const tab = entry.indexOf('\t');
				const [mode, type] = entry.slice(0, tab).split(' ');
				return [entry.slice(tab + 1) + (type === 'tree' ? '/' : ''), mode];
			}),
	);
	const policyFiles = [...modes.keys()];
	const read = (path) => git('show', `${policy}:${path}`);
	const files = changedPaths(git('diff', '--name-status', '-z', '-M', `${base}...${head}`, '--'));
	return buildPlan({
		files,
		policyFiles,
		read,
		base,
		head,
		policy,
		modeFor: (path) => modes.get(path),
	});
}

function main(args) {
	if (args.length === 1 && args[0] === '--check') {
		const errors = checkLocalTeams();
		if (errors.length) throw new Error(errors.join('\n'));
		console.log('PR shepherd team policy is valid.');
		return;
	}
	if (args.shift() !== 'plan')
		throw new Error(
			'Usage: pr-shepherd.mjs plan --base <ref> --head <ref> [--policy-ref <ref>] [--json] | --check',
		);
	const options = {};
	let json = false;
	while (args.length) {
		const arg = args.shift();
		if (arg === '--json' && !json) {
			json = true;
			continue;
		}
		const key = { '--base': 'base', '--head': 'head', '--policy-ref': 'policyRef' }[arg];
		if (!key || options[key] || !args[0] || args[0].startsWith('-'))
			throw new Error(`Invalid argument: ${arg}`);
		options[key] = args.shift();
	}
	if (!options.base || !options.head) throw new Error('plan requires --base and --head');
	const plan = planRefs(options);
	console.log(json ? JSON.stringify(plan, null, 2) : markdown(plan));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	try {
		main(process.argv.slice(2));
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
