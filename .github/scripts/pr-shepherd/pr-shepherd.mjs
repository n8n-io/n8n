import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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

const ROOT = resolve(import.meta.dirname, '../../..');
const TEAMS = '.agents/review-rules/teams/';

export const PRESETS = Object.freeze({
	'unit-tests':
		'Run pnpm --filter <owning-package> exec vitest run <affected-test-files> --maxWorkers=1. Select existing tests and add a focused probe for changed behavior. Record the package, files, command, SHA, and output.',
	'editor-journey':
		'Build with pnpm build > build.log 2>&1. Use a disposable N8N_USER_FOLDER. Run pnpm --filter n8n-playwright test:local <focused-spec> --workers=1, or reproduce the changed journey in the editor. Save screenshots and a recording. Save, reopen, and execute the fixture.',
	'parser-ab':
		'Run pnpm --filter n8n-workflow exec vitest run test/workflow.test.ts test/node-reference-parser-utils.test.ts --maxWorkers=1. Probe exact and sibling names, Unicode whitespace, bracket access, and replacement names with spaces on pinned base and head. Keep inputs and outputs.',
	'instance-ai-live-model':
		'Use local Ollama: ollama run qwen3:0.6b. Set N8N_INSTANCE_AI_MODEL=custom/qwen3:0.6b and N8N_INSTANCE_AI_MODEL_URL to a loopback logging proxy. Use a disposable instance and synthetic two-turn thread. Capture request bodies for option-unset and option-enabled trials on pinned base and head. If the provider shape requires it, map real Ollama reasoning to reasoning_content in responses; do not fabricate reasoning. Normalize only IDs, ports, and timestamps for A/B comparison. Check unrelated provider fields and same-provider sub-agents. Record model/version, settings, raw private traces, normalized diff, outcomes, repetitions, and live/replay/mocked dependencies. Mark failed tool calls or missing sub-agent trials as not verified. Do not load provider keys.',
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

export function validateTeams(files, read, entries) {
	const slugs = new Set(entries.map((entry) => teamHandleToSlug(entry.team)));
	const errors = [];
	for (const path of files.filter((path) => path.startsWith(TEAMS))) {
		const slug = path.slice(TEAMS.length).split('/')[0];
		if (!slugs.has(slug)) errors.push(`${path}: unknown OWNERS team ${slug}`);
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

export function buildPlan({ files, policyFiles, read, base, head, policy }) {
	const entries = parseOwnersContent(read('OWNERS'));
	const errors = validateTeams(policyFiles, read, entries);
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
	const agents = (parse(read('cubic.yaml')).reviews?.custom_rules ?? [])
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
		execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
	const sha = (ref) => git('rev-parse', '--verify', `${ref}^{commit}`).trim();
	base = sha(base);
	head = sha(head);
	const mergeBase = git('merge-base', base, head).trim();
	const policy = sha(policyRef ?? mergeBase);
	const policyFiles = git('ls-tree', '-r', '--name-only', '-z', policy).split('\0').filter(Boolean);
	const read = (path) => git('show', `${policy}:${path}`);
	const files = changedPaths(git('diff', '--name-status', '-z', '-M', `${base}...${head}`, '--'));
	return buildPlan({ files, policyFiles, read, base, head, policy });
}

function main(args) {
	if (args.length === 1 && args[0] === '--check') {
		const walk = (dir) =>
			readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) =>
				entry.isDirectory()
					? [`${dir}/${entry.name}/`, ...walk(`${dir}/${entry.name}`)]
					: [`${dir}/${entry.name}`],
			);
		const files = walk(TEAMS.slice(0, -1));
		const read = (path) => readFileSync(join(ROOT, path), 'utf8');
		const errors = validateTeams(files, read, parseOwnersContent(read('OWNERS')));
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
