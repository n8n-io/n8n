import 'reflect-metadata';
import path from 'node:path';
import type Bench from 'tinybench';
import { assert } from 'n8n-workflow';
import glob from 'fast-glob';
import callsites from 'callsites';
import type { Suites, Task, Callback } from './types';
import { DuplicateHookError } from './duplicate-hook.error';

export const suites: Suites = {};

export function suiteCount() {
	return Object.keys(suites).length;
}

export async function collectSuites() {
	const files = await glob('**/*.tasks.js', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	for (const f of files) {
		await import(f);
	}
}

export function registerSuites(bench: Bench) {
	for (const { hooks, tasks } of Object.values(suites)) {
		/**
		 * In tinybench, `beforeAll` and `afterAll` refer to all iterations of
		 * a single task, while `beforeEach` and `afterEach` refer to each iteration.
		 *
		 * In jest and vitest, `beforeAll` and `afterAll` refer to all tests in a suite,
		 * while `beforeEach` and `afterEach` refer to each individual test.
		 *
		 * The API renames tinybench's hooks to prevent confusion from this difference.
		 */
		const options: Record<string, Callback> = {};

		if (hooks.beforeEach) options.beforeAll = hooks.beforeEach;
		if (hooks.afterEach) options.afterAll = hooks.afterEach;

		for (const t of tasks) {
			bench.add(t.description, t.operation, options);
		}
	}
}

function suiteFilePath() {
	const filePath = callsites()
		.map((site) => site.getFileName())
		.filter((site): site is string => site !== null)
		.find((site) => site.endsWith('.tasks.js'));

	assert(filePath !== undefined);

	return filePath;
}

/**
 * Benchmarking API
 */

export function task(description: string, operation: Task['operation']) {
	const filePath = suiteFilePath();

	suites[filePath] ||= { hooks: {}, tasks: [] };
	suites[filePath].tasks.push({ description, operation });
}

export function beforeEach(fn: Callback) {
	const filePath = suiteFilePath();

	if (suites[filePath]?.hooks.beforeEach) {
		throw new DuplicateHookError('beforeEach', filePath);
	}

	suites[filePath] ||= { hooks: {}, tasks: [] };
	suites[filePath].hooks.beforeEach = fn;
}

export function afterEach(fn: Callback) {
	const filePath = suiteFilePath();

	if (suites[filePath]?.hooks.afterEach) {
		throw new DuplicateHookError('afterEach', filePath);
	}

	suites[filePath] ||= { hooks: {}, tasks: [] };
	suites[filePath].hooks.afterEach = fn;
}
