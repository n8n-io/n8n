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
 * Anything outside those paths (README, LICENSE, CI/publish workflows,
 * package.json identity fields, etc.) is left untouched.
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

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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

// Identical across every template as of this writing; synced from the first
// template's output. Safe to sync wholesale since these files aren't meant
// to carry repo-specific customization.
const SHARED_FILES = ['tsconfig.json', 'eslint.config.mjs', '.prettierrc.js', '.vscode/launch.json'];

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

let firstGeneratedRoot;

for (const entry of TEMPLATES) {
	const generatedRoot = generate(entry);
	firstGeneratedRoot ??= generatedRoot;

	for (const relDir of entry.syncDirs) {
		syncDir(path.join(generatedRoot, relDir), path.join(starterRoot, relDir));
	}
}

for (const relFile of SHARED_FILES) {
	const src = path.join(firstGeneratedRoot, relFile);
	if (fs.existsSync(src)) {
		syncFile(src, path.join(starterRoot, relFile));
	}
}

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
