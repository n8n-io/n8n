#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

// Main n8n package paths (follow weekly release process)
export const MAIN_PACKAGES = [
	'packages/cli',
	'packages/core',
	'packages/workflow',
	'packages/nodes-base',
	'packages/frontend/editor-ui',
];

export async function getMainPackageNames() {
	return Promise.all(
		MAIN_PACKAGES.map(async (path) => {
			try {
				const packageJson = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));
				return packageJson.name;
			} catch (error) {
				console.error(`Could not read package name from ${path}/package.json`);
				throw error;
			}
		}),
	);
}