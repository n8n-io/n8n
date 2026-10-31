/**
 * Regenerates n8n-nodes-starter's example scaffolding from the `@n8n/node-cli`
 * templates in this repo, built from source rather than installed from npm —
 * so a template change here surfaces as scaffold drift before it ships.
 *
 * n8n-nodes-starter's example content is a composite of two separately
 * generated templates:
 *   - nodes/Example/                          <- programmatic/example
 *   - nodes/GithubIssues/, credentials/, icons/ <- declarative/github-issues
 *
 * Everything else at the project root (tsconfig.json, eslint/prettier config,
 * .vscode/, .gitignore, .github/workflows/{ci,publish}.yml, .agents/,
 * AGENTS.md, CLAUDE.md, ...) is synced wholesale from the first template's
 * generated output, since none of it carries repo-specific customization.
 * `DENYLIST` below is the explicit exception list: files that must diverge
 * per-repo (README, CHANGELOG) or that get narrower, field-level handling
 * (package.json) instead of a blind overwrite.
 *
 * Usage: node refresh-starter-scaffold.mjs --starter-root <path>
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const {
	values: { 'starter-root': starterRootArg },
} = parseArgs({ options: { 'starter-root': { type: 'string' } } });

if (!starterRootArg) {
	console.error('Usage: refresh-starter-scaffold.mjs --starter-root <path>');
	process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const nodeCliBin = path.join(repoRoot, 'packages/@n8n/node-cli/bin/n8n-node.mjs');
const starterRoot = path.resolve(starterRootArg);

const TEMPLATES = [
	{
		// Package name matches what's already committed in n8n-nodes-starter's
		// nodes/Example/Example.node.json ("node" field) — using anything else
		// would make that field flip on every refresh for no real reason.
		template: 'programmatic/example',
		pkgName: 'n8n-nodes-example',
		syncDirs: ['nodes/Example'],
	},
	{
		// Same idea, matching nodes/GithubIssues/GithubIssues.node.json.
		template: 'declarative/github-issues',
		pkgName: 'n8n-nodes-github-issues',
		syncDirs: ['nodes/GithubIssues', 'credentials', 'icons'],
	},
];

// Top-level entries in the first template's generated output that are NOT
// synced wholesale:
//   - nodes/, credentials/, icons/ — handled per-entry above via `syncDirs`
//   - README.md                   — repo-specific, hand-maintained
//   - CHANGELOG.md                — accumulates real release history per-repo
//   - package.json                — only its `scripts` block is synced, below
//   - .git                        — `n8n-node new` inits its own repo per run
const DENYLIST = new Set([
	'nodes',
	'credentials',
	'icons',
	'README.md',
	'CHANGELOG.md',
	'package.json',
	'.git',
]);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-node-scaffold-'));

function generate({ template, pkgName }) {
	const cwd = path.join(tmpRoot, pkgName);
	fs.mkdirSync(cwd, { recursive: true });
	console.log(`Running n8n-node new --template ${template}`);
	execFileSync(
		process.execPath,
		[nodeCliBin, 'new', pkgName, '--skip-install', '--force', '--template', template],
		{ cwd, env: { ...process.env, CI: 'true' }, stdio: 'inherit' },
	);
	return path.join(cwd, pkgName);
}

function syncDir(src, dest) {
	fs.rmSync(dest, { recursive: true, force: true });
	fs.cpSync(src, dest, { recursive: true });
	console.log(`Synced ${path.relative(starterRoot, dest)}`);
}

function syncFile(src, dest) {
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
	console.log(`Synced ${path.relative(starterRoot, dest)}`);
}

// Unlike `syncDir` (used for nodes/Example, nodes/GithubIssues, credentials,
// icons — directories the template owns entirely), these top-level
// directories can carry starter-specific extras the template doesn't know
// about (e.g. .github/dependabot.yml, .github/workflows/ci-cla-check.yml,
// .vscode/extensions.json). A destructive replace would delete those, so
// this only adds/overwrites the files the template actually contributes.
function mergeDir(src, dest) {
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, entry.name);
		const d = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			fs.mkdirSync(d, { recursive: true });
			mergeDir(s, d);
		} else {
			syncFile(s, d);
		}
	}
}

function syncEverythingElse(generatedRoot) {
	for (const entry of fs.readdirSync(generatedRoot, { withFileTypes: true })) {
		if (DENYLIST.has(entry.name)) continue;

		const src = path.join(generatedRoot, entry.name);
		const dest = path.join(starterRoot, entry.name);
		if (entry.isDirectory()) {
			mergeDir(src, dest);
		} else {
			syncFile(src, dest);
		}
	}
}

let firstGeneratedRoot;

for (const entry of TEMPLATES) {
	const generatedRoot = generate(entry);
	firstGeneratedRoot ??= generatedRoot;

	for (const relDir of entry.syncDirs) {
		syncDir(path.join(generatedRoot, relDir), path.join(starterRoot, relDir));
	}
}

syncEverythingElse(firstGeneratedRoot);

// Only the `scripts` block is refreshed — every other field (name, version,
// author, repository, the n8n nodes/credentials manifest, devDependency
// pins, ...) is repo-specific or already kept current by Dependabot.
const generatedPkg = JSON.parse(fs.readFileSync(path.join(firstGeneratedRoot, 'package.json'), 'utf8'));
const starterPkgPath = path.join(starterRoot, 'package.json');
const starterPkg = JSON.parse(fs.readFileSync(starterPkgPath, 'utf8'));
starterPkg.scripts = generatedPkg.scripts;
fs.writeFileSync(starterPkgPath, `${JSON.stringify(starterPkg, null, '\t')}\n`);
console.log('Synced package.json scripts');

fs.rmSync(tmpRoot, { recursive: true, force: true });
