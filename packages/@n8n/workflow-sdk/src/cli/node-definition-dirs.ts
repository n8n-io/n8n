/**
 * Locate the generated node-definition directories that back Zod parameter
 * validation.
 *
 * `validateNodeConfig` silently passes when no schema is found, so a CLI run
 * without these dirs reports "no issues" for parameter problems the server
 * would reject. Resolution mirrors the server (`<pkg>/dist/node-definitions/`
 * for each builtin nodes package). In the Instance AI sandbox those packages
 * are not installed — graph + source lint still run; parameter schemas do not.
 */

import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export const NODE_DEFINITION_DIRS_ENV_VAR = 'N8N_NODE_DEFINITION_DIRS';

/** A node-definition dir always holds a `nodes/` tree; anything else is a mistyped path. */
function looksLikeNodeDefinitionDir(dir: string): boolean {
	return fs.existsSync(path.join(dir, 'nodes'));
}

function splitEnvValue(value: string): string[] {
	return value
		.split(path.delimiter)
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function keepExisting(candidates: string[]): string[] {
	const dirs: string[] = [];
	for (const candidate of candidates) {
		const resolved = path.resolve(candidate);
		if (!dirs.includes(resolved) && looksLikeNodeDefinitionDir(resolved)) {
			dirs.push(resolved);
		}
	}
	return dirs;
}

/**
 * Resolve `<pkg>/dist/node-definitions` for each builtin nodes package, trying
 * each start directory in turn. `createRequire` is anchored to a file path so
 * resolution follows the workflow file's own `node_modules` chain first.
 */
function resolveFromPackages(startDirs: string[]): string[] {
	const dirs: string[] = [];
	for (const startDir of startDirs) {
		const requireFrom = createRequire(path.join(startDir, 'noop.js'));
		for (const packageId of BUILTIN_NODES_PACKAGES) {
			let packageJsonPath: string;
			try {
				packageJsonPath = requireFrom.resolve(`${packageId}/package.json`);
			} catch {
				continue;
			}
			const candidate = path.join(path.dirname(packageJsonPath), 'dist', 'node-definitions');
			if (!dirs.includes(candidate) && looksLikeNodeDefinitionDir(candidate)) {
				dirs.push(candidate);
			}
		}
	}
	return dirs;
}

/**
 * Precedence: explicit `--node-types` flags, then the env var, then package
 * resolution from the workflow file's directory and the cwd.
 */
export function resolveNodeDefinitionDirs(options: {
	explicit?: string[];
	workflowDir: string;
	cwd?: string;
}): string[] {
	const { explicit = [], workflowDir, cwd = process.cwd() } = options;

	if (explicit.length > 0) {
		return keepExisting(explicit);
	}

	const envValue = process.env[NODE_DEFINITION_DIRS_ENV_VAR];
	if (envValue) {
		return keepExisting(splitEnvValue(envValue));
	}

	return resolveFromPackages([workflowDir, cwd]);
}
