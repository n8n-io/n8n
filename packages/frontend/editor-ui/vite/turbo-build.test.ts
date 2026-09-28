import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { modulePackages, sourcePackages } from '@n8n/frontend-vite-config';

// vitest sets the cwd to the package root.
const editorUiDir = process.cwd();
const packagesDir = resolve(editorUiDir, '..', '..');
const repoRoot = resolve(packagesDir, '..');

interface TurboTask {
	dependsOn?: string[];
	inputs?: string[];
}

const readTurboTasks = (): Record<string, TurboTask> => {
	const file = join(repoRoot, 'turbo.json');
	const { config, error } = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'));
	if (error) throw new Error(`Cannot parse ${file}`);
	return (config as { tasks: Record<string, TurboTask> }).tasks;
};

const workspaceDeps = (packageDir: string): string[] => {
	const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as Record<
		string,
		Record<string, string> | undefined
	>;
	const all = {
		...manifest.dependencies,
		...manifest.devDependencies,
		...manifest.optionalDependencies,
	};
	return Object.entries(all)
		.filter(([, version]) => version.startsWith('workspace:'))
		.map(([name]) => name);
};

const readFromSource = new Map(
	[...sourcePackages, ...modulePackages].map(({ name, dir }) => [name, dir]),
);

/**
 * The packages that the editor-ui bundle reads from `dist`. The walk goes through each package
 * that is read from `src`, because its own dependencies then come from `dist`.
 */
const distDependencies = (): string[] => {
	const needed = new Set<string>();
	const visited = new Set<string>();

	const walk = (packageDir: string) => {
		for (const dep of workspaceDeps(packageDir)) {
			const sourceDir = readFromSource.get(dep);
			if (!sourceDir) {
				needed.add(dep);
			} else if (!visited.has(dep)) {
				visited.add(dep);
				walk(join(packagesDir, sourceDir));
			}
		}
	};

	walk(editorUiDir);
	return [...needed].sort();
};

describe('turbo tasks for the editor-ui build', () => {
	const tasks = readTurboTasks();

	it.each(['build', 'build:unchecked'])(
		'n8n-editor-ui#%s waits for each package read from dist',
		(task) => {
			const expected = distDependencies().map((name) => `${name}#${task}`);

			expect([...(tasks[`n8n-editor-ui#${task}`]?.dependsOn ?? [])].sort()).toEqual(expected);
		},
	);

	it.each(['build', 'build:unchecked'])(
		'n8n-editor-ui#%s hashes the src of each package read from source',
		(task) => {
			const expected = [
				'$TURBO_DEFAULT$',
				...[...readFromSource.values()].flatMap((dir) => [
					`$TURBO_ROOT$/packages/${dir}/src/**`,
					`$TURBO_ROOT$/packages/${dir}/package.json`,
				]),
			];

			expect(tasks[`n8n-editor-ui#${task}`]?.inputs).toEqual(expected);
		},
	);
});
