import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { cp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { SDK_DIR, scaffoldNewProject, writeCliShim } from './n1-adapter';
import type { Format, TaskSpec } from './tasks';
import { exec } from './util';

const REPO_DIR = path.resolve(SDK_DIR, '../../..');
const PNPM_DIR = path.join(REPO_DIR, 'node_modules/.pnpm');
const NODE_CLI_DIR = path.join(REPO_DIR, 'packages/@n8n/node-cli');

/** The newest store copy of a package, e.g. `typescript@5.` for the TypeScript that the old template pins. */
function storePackage(prefix: string, name: string) {
	const entry = readdirSync(PNPM_DIR)
		.filter((dir) => dir.startsWith(prefix))
		.sort()
		.pop();
	if (!entry) throw new Error(`No ${prefix}* in ${PNPM_DIR}; run pnpm install in the repo`);
	return path.join(PNPM_DIR, entry, 'node_modules', name);
}

/** What the package needs at run time. The bin runs from `src`. */
const SDK_ENTRIES = ['package.json', 'dist', 'spec', 'src', 'templates', 'node_modules'];

/** A package root with only the run-time entries, so the workspace cannot browse `evaluations/`. */
async function stageSdk(dir: string) {
	if (existsSync(dir)) return;
	await mkdir(dir, { recursive: true });
	for (const entry of SDK_ENTRIES) await symlink(path.join(SDK_DIR, entry), path.join(dir, entry));
}

/** node_modules entries, resolved to repo packages: no network install. */
function linksOf(format: Format, sdkDir: string): Record<string, string> {
	const common = {
		'n8n-workflow': path.join(REPO_DIR, 'packages/workflow'),
		'@types/node': realpathSync(path.join(REPO_DIR, 'node_modules/@types/node')),
		tsx: storePackage('tsx@', 'tsx'),
	};
	return format === 'old'
		? {
				...common,
				'@n8n/node-cli': NODE_CLI_DIR,
				// The template pins TypeScript 5.9; the repo default (6) rejects its tsconfig.
				typescript: storePackage('typescript@5.', 'typescript'),
				eslint: realpathSync(path.join(NODE_CLI_DIR, 'node_modules/eslint')),
			}
		: {
				...common,
				'@n8n/node-sdk': sdkDir,
				typescript: realpathSync(path.join(REPO_DIR, 'node_modules/typescript')),
			};
}

const BINS: Record<Format, Record<string, string>> = {
	old: {
		'n8n-node': '../@n8n/node-cli/bin/n8n-node.mjs',
		tsc: '../typescript/bin/tsc',
		eslint: '../eslint/bin/eslint.js',
		tsx: '../tsx/dist/cli.mjs',
	},
	new: { tsc: '../typescript/bin/tsc', tsx: '../tsx/dist/cli.mjs' },
};

async function linkNodeModules(dir: string, format: Format, sdkDir: string) {
	const modules = path.join(dir, 'node_modules');
	await rm(modules, { recursive: true, force: true });
	await mkdir(path.join(modules, '.bin'), { recursive: true });
	for (const [name, target] of Object.entries(linksOf(format, sdkDir))) {
		await mkdir(path.dirname(path.join(modules, name)), { recursive: true });
		await symlink(target, path.join(modules, name));
	}
	for (const [name, target] of Object.entries(BINS[format])) {
		await symlink(target, path.join(modules, '.bin', name));
	}
	if (format === 'new') await writeCliShim(path.join(modules, '.bin'), sdkDir);
}

/** Environment for agent and grader: the project's bins first, no GitHub login, no installs. */
export function workspaceEnv(dir: string): NodeJS.ProcessEnv {
	const {
		GITHUB_TOKEN: _github,
		GH_TOKEN: _gh,
		npm_config_user_agent: _agent,
		// eslint-plugin-n8n-nodes-base changes its file name rules under NODE_ENV=test.
		NODE_ENV: _nodeEnv,
		...env
	} = process.env;
	return {
		...Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith('VITEST'))),
		PATH: `${path.join(dir, 'node_modules/.bin')}:${env.PATH ?? ''}`,
		// An empty gh config means no stored login, so the agent cannot borrow the grader's token.
		GH_CONFIG_DIR: path.join(dir, 'node_modules/.gh-config'),
		npm_config_offline: 'true',
		npm_config_update_notifier: 'false',
		N8N_USER_FOLDER: path.join(dir, 'node_modules/.n8n-user'),
	};
}

/** Scaffolds a project once per format and task, the way each format's CLI does, then adds the overlay. */
export async function prepareTemplate(
	root: string,
	task: TaskSpec,
	format: Format,
): Promise<string> {
	const dir = path.join(root, format, task.id);
	if (existsSync(path.join(dir, 'node_modules'))) return dir;
	await rm(dir, { recursive: true, force: true });
	await mkdir(path.dirname(dir), { recursive: true });
	if (format === 'old') {
		const name = `n8n-nodes-${task.id}`;
		const result = await exec(
			process.execPath,
			[
				path.join(NODE_CLI_DIR, 'bin/n8n-node.mjs'),
				'new',
				name,
				'--template',
				'programmatic/example',
				'--skip-install',
				'--force',
			],
			{ cwd: path.dirname(dir), timeoutMs: 120_000 },
		);
		if (result.code !== 0) throw new Error(`n8n-node new failed:\n${result.output}`);
		await rename(path.join(path.dirname(dir), name), dir);
	} else {
		const result = await scaffoldNewProject(dir, task.node);
		if (result.code !== 0) throw new Error(`n8n-node-next new failed:\n${result.output}`);
	}
	// Eval docs for the format, tuned like the new-format scaffold docs; they replace the scaffold files.
	const overlay = path.join(__dirname, 'overlays', format);
	if (existsSync(overlay)) await cp(overlay, dir, { recursive: true });
	const sdkDir = path.join(root, 'node-sdk');
	await stageSdk(sdkDir);
	if (format === 'new') {
		// The scaffold links the SDK by its repo path, which points the agent at `evaluations/`.
		const manifest = path.join(dir, 'package.json');
		const text = await readFile(manifest, 'utf8');
		await writeFile(manifest, text.split(`link:${SDK_DIR}`).join(`link:${sdkDir}`));
	}
	await linkNodeModules(dir, format, sdkDir);
	return dir;
}

/** A fresh copy of the template for one run. Symlinks stay symlinks. */
export async function copyTemplate(template: string, dir: string) {
	await rm(dir, { recursive: true, force: true });
	await cp(template, dir, { recursive: true, verbatimSymlinks: true });
}
