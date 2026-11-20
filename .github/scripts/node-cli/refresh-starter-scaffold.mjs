/**
 * Regenerates n8n-nodes-starter from the `@n8n/node-cli` templates.
 *
 * The starter has no scaffold logic of its own. It is the output of
 * `n8n-node new` for several templates, committed as a GitHub template repo.
 * This script runs the CLI that the starter has installed, writes the generated
 * files into the starter checkout, and records what it wrote in a manifest.
 *
 * The manifest (`.github/scaffold-manifest.json`) lists the files owned by the
 * templates. A file that was in the manifest but is no longer generated gets
 * deleted. A starter file that was never in the manifest is left alone.
 *
 * Usage:
 *   node refresh-starter-scaffold.mjs --starter-root <path> [--node-cli-root <path>]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const MANIFEST_PATH = '.github/scaffold-manifest.json';

export const TEMPLATES = [
	// `pkgName` lands in the generated `*.node.json` `node` field. Keep it stable
	// so that field does not flip on every refresh.
	{ template: 'programmatic/example', pkgName: 'n8n-nodes-example' },
	{ template: 'declarative/github-issues', pkgName: 'n8n-nodes-github-issues' },
	// Ships with the `@n8n/node-cli` release that carries n8n-io/n8n#43879.
	// Until then the installed CLI does not know the template, so it is skipped.
	{ template: 'declarative/webhook-trigger', pkgName: 'n8n-nodes-webhook-trigger', optional: true },
];

// Generated paths that are never written to the starter.
//   README.md, CHANGELOG.md: repo-specific, hand-maintained
//   package.json: merged field by field in `mergePackageJson`
//   .git: `n8n-node new` runs `git init` in its output
export const DENYLIST = new Set(['README.md', 'CHANGELOG.md', 'package.json', '.git']);

// Starter paths that are never deleted, even when a stale manifest lists them.
export const PROTECTED = new Set([
	...DENYLIST,
	'README_TEMPLATE.md',
	'CODE_OF_CONDUCT.md',
	'LICENSE.md',
	'.github/workflows/ci-cla-check.yml',
	MANIFEST_PATH,
	'package-lock.json',
]);

const TRIGGER_GROUP = /group:\s*\[[^\]]*['"]trigger['"][^\]]*\]/;

const toPosix = (p) => p.split(path.sep).join('/');

/** True when `rel` is `name` or lives under the directory `name`. */
const matchesEntry = (set, rel) => {
	for (const name of set) {
		if (rel === name || rel.startsWith(`${name}/`)) return true;
	}
	return false;
};

/** Sorted, posix-style relative paths of every file under `root`, skipping `.git`. */
export function listFiles(root) {
	const files = [];
	for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
		if (!entry.isFile()) continue;
		const rel = toPosix(path.relative(root, path.join(entry.parentPath, entry.name)));
		if (rel === '.git' || rel.startsWith('.git/')) continue;
		files.push(rel);
	}
	return files.sort();
}

/**
 * Decide what to write and what to delete.
 *
 * @param {{ generated: Array<{ template: string, root: string }>, previousFiles: string[] }} input
 * @returns {{ writes: Map<string, { src: string, template: string }>, deletes: string[], conflicts: Array<{ path: string, templates: string[] }> }}
 */
export function planSync({ generated, previousFiles }) {
	const writes = new Map();
	const conflicts = [];

	for (const { template, root } of generated) {
		for (const rel of listFiles(root)) {
			if (matchesEntry(DENYLIST, rel)) continue;
			const src = path.join(root, rel);
			const existing = writes.get(rel);
			if (!existing) {
				writes.set(rel, { src, template });
				continue;
			}
			// Two templates may ship the same file (tsconfig, CI workflows) only
			// when the bytes agree. Anything else is a template bug to fix upstream.
			if (!fs.readFileSync(existing.src).equals(fs.readFileSync(src))) {
				conflicts.push({ path: rel, templates: [existing.template, template] });
			}
		}
	}

	const deletes = previousFiles
		.filter((rel) => !writes.has(rel) && !matchesEntry(PROTECTED, rel))
		.sort();

	return { writes, deletes, conflicts };
}

function pruneEmptyDirs(dir, stopAt) {
	let current = dir;
	while (current !== stopAt && current.startsWith(stopAt)) {
		if (fs.readdirSync(current).length > 0) return;
		fs.rmdirSync(current);
		current = path.dirname(current);
	}
}

/** Copy every planned write into the starter and remove every planned delete. */
export function applySync(starterRoot, { writes, deletes }) {
	for (const [rel, { src }] of writes) {
		const dest = path.join(starterRoot, rel);
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(src, dest);
	}
	for (const rel of deletes) {
		const dest = path.join(starterRoot, rel);
		fs.rmSync(dest, { force: true });
		pruneEmptyDirs(path.dirname(dest), starterRoot);
	}
}

/** Compare `n8nNodesApiVersion` values such as `1`, `"3.1"`, `"3.10"` numerically per segment. */
export function compareApiVersion(a, b) {
	const pa = String(a).split('.').map(Number);
	const pb = String(b).split('.').map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

const unionSorted = (lists) => [...new Set(lists.flat())].sort();

/** Merge object-valued fields key by key; the same key with different values is a conflict. */
function mergeRecord(field, records) {
	const out = {};
	for (const record of records) {
		for (const [key, value] of Object.entries(record ?? {})) {
			if (key in out && JSON.stringify(out[key]) !== JSON.stringify(value)) {
				throw new Error(
					`Templates disagree on ${field}.${key}: ${JSON.stringify(out[key])} vs ${JSON.stringify(value)}`,
				);
			}
			out[key] = value;
		}
	}
	return out;
}

/**
 * Build the starter's package.json from its current content and the generated ones.
 *
 * Identity fields (name, version, description, author, repository, ...) stay as
 * they are. Dependency pins are added when missing but never changed: Dependabot
 * owns them in the starter, and the template pins are usually older.
 */
export function mergePackageJson(starterPkg, generatedPkgs) {
	if (generatedPkgs.length === 0) throw new Error('No generated package.json to merge');

	const out = { ...starterPkg };
	out.scripts = mergeRecord(
		'scripts',
		generatedPkgs.map((p) => p.scripts),
	);
	out.files = unionSorted(generatedPkgs.map((p) => p.files ?? []));
	out.keywords = unionSorted(generatedPkgs.map((p) => p.keywords ?? []));

	const n8nBlocks = generatedPkgs.map((p) => p.n8n ?? {});
	const apiVersion = n8nBlocks
		.map((b) => b.n8nNodesApiVersion)
		.filter((v) => v !== undefined)
		.reduce((max, v) => (compareApiVersion(v, max) > 0 ? v : max));
	const strictValues = new Set(n8nBlocks.map((b) => JSON.stringify(b.strict)));
	if (strictValues.size > 1) throw new Error('Templates disagree on n8n.strict');

	out.n8n = {
		...starterPkg.n8n,
		n8nNodesApiVersion: apiVersion,
		strict: n8nBlocks[0].strict,
		credentials: unionSorted(n8nBlocks.map((b) => b.credentials ?? [])),
		nodes: unionSorted(n8nBlocks.map((b) => b.nodes ?? [])),
	};

	for (const field of ['devDependencies', 'peerDependencies']) {
		const merged = { ...starterPkg[field] };
		for (const pkg of generatedPkgs) {
			for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
				merged[dep] ??= range;
			}
		}
		if (Object.keys(merged).length > 0) out[field] = merged;
	}

	return out;
}

/** Relative paths of node files under `nodes/` that declare `group: ['trigger']`. */
export function findTriggerNodes(starterRoot) {
	const nodesDir = path.join(starterRoot, 'nodes');
	if (!fs.existsSync(nodesDir)) return [];
	return listFiles(nodesDir)
		.filter((rel) => rel.endsWith('.node.ts'))
		.filter((rel) => TRIGGER_GROUP.test(fs.readFileSync(path.join(nodesDir, rel), 'utf8')))
		.map((rel) => `nodes/${rel}`);
}

/**
 * The ticket asks for at least one trigger example. The check is soft while the
 * installed CLI has no trigger template, and hard once it does.
 */
export function triggerVerdict({ triggerNodes, triggerTemplateGenerated }) {
	if (triggerNodes.length > 0) {
		return { level: 'notice', message: `Trigger examples: ${triggerNodes.join(', ')}` };
	}
	if (triggerTemplateGenerated) {
		return {
			level: 'error',
			message: 'The trigger template was generated but no node declares group trigger',
		};
	}
	return {
		level: 'warning',
		message: 'No trigger example yet: the installed @n8n/node-cli has no trigger template',
	};
}

export function readManifest(starterRoot) {
	const file = path.join(starterRoot, MANIFEST_PATH);
	if (!fs.existsSync(file)) return null;
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeManifest(starterRoot, manifest) {
	const file = path.join(starterRoot, MANIFEST_PATH);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, `${JSON.stringify(manifest, null, '\t')}\n`);
}

/** The published CLI ships each template as `dist/template/templates/<type>/<name>/template/`. */
export function templateAvailable(nodeCliRoot, template) {
	return fs.existsSync(
		path.join(nodeCliRoot, 'dist/template/templates', template, 'template/package.json'),
	);
}

function generate({ nodeCliRoot, template, pkgName, tmpRoot }) {
	const cwd = path.join(tmpRoot, pkgName);
	fs.mkdirSync(cwd, { recursive: true });
	console.log(`Running n8n-node new --template ${template}`);
	execFileSync(
		process.execPath,
		[
			path.join(nodeCliRoot, 'bin/n8n-node.mjs'),
			'new',
			pkgName,
			'--skip-install',
			'--force',
			'--template',
			template,
		],
		{ cwd, env: { ...process.env, CI: 'true' }, stdio: 'inherit' },
	);
	return path.join(cwd, pkgName);
}

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function main(argv = process.argv.slice(2)) {
	const { values } = parseArgs({
		args: argv,
		options: {
			'starter-root': { type: 'string' },
			'node-cli-root': { type: 'string' },
		},
	});
	if (!values['starter-root']) {
		throw new Error(
			'Usage: refresh-starter-scaffold.mjs --starter-root <path> [--node-cli-root <path>]',
		);
	}
	const starterRoot = path.resolve(values['starter-root']);
	const nodeCliRoot = path.resolve(
		values['node-cli-root'] ?? path.join(starterRoot, 'node_modules/@n8n/node-cli'),
	);
	const cliVersion = readJson(path.join(nodeCliRoot, 'package.json')).version;
	console.log(`Using @n8n/node-cli@${cliVersion} from ${nodeCliRoot}`);

	const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-node-scaffold-'));
	try {
		const generated = [];
		for (const entry of TEMPLATES) {
			if (!templateAvailable(nodeCliRoot, entry.template)) {
				if (!entry.optional)
					throw new Error(`Template ${entry.template} is missing in @n8n/node-cli@${cliVersion}`);
				console.log(
					`::warning::Template ${entry.template} is not in @n8n/node-cli@${cliVersion}, skipping`,
				);
				continue;
			}
			generated.push({
				template: entry.template,
				root: generate({ nodeCliRoot, tmpRoot, ...entry }),
			});
		}

		const previous = readManifest(starterRoot);
		if (!previous)
			console.log(
				'::warning::No scaffold manifest found; deletions are not propagated on this run',
			);

		const plan = planSync({ generated, previousFiles: previous?.files ?? [] });
		if (plan.conflicts.length > 0) {
			const lines = plan.conflicts.map((c) => `  ${c.path}: ${c.templates.join(' vs ')}`);
			throw new Error(
				`Templates generate different content for the same path:\n${lines.join('\n')}`,
			);
		}
		applySync(starterRoot, plan);
		console.log(`Wrote ${plan.writes.size} files, deleted ${plan.deletes.length}`);
		for (const rel of plan.deletes) console.log(`  deleted ${rel}`);

		const starterPkgPath = path.join(starterRoot, 'package.json');
		const merged = mergePackageJson(
			readJson(starterPkgPath),
			generated.map((g) => readJson(path.join(g.root, 'package.json'))),
		);
		fs.writeFileSync(starterPkgPath, `${JSON.stringify(merged, null, '\t')}\n`);

		writeManifest(starterRoot, {
			cliVersion,
			templates: generated.map((g) => g.template),
			files: [...plan.writes.keys()].sort(),
		});

		const verdict = triggerVerdict({
			triggerNodes: findTriggerNodes(starterRoot),
			triggerTemplateGenerated: generated.some((g) => g.template.endsWith('-trigger')),
		});
		console.log(`::${verdict.level}::${verdict.message}`);
		if (verdict.level === 'error') process.exitCode = 1;
	} finally {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	}
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		main();
	} catch (error) {
		console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}
