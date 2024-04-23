import 'reflect-metadata';
import path from 'node:path';
import type Bench from 'tinybench';
import { assert } from 'n8n-workflow';
import glob from 'fast-glob';
import callsites from 'callsites';
import type { Suites, Task, Callback } from './types';
import { DuplicateHookError } from './errors/duplicate-hook.error';
import { DuplicateSuiteError } from './errors/duplicate-suite.error';

const suites: Suites = {};

export async function collectSuites() {
	const files = await glob('**/*.tasks.js', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	for (const f of files) {
		await import(f);
	}

	return suites;
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
		 * We rename tinybench's hooks to prevent confusion from this difference.
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

export function suite(suiteName: string, suiteFn: () => void) {
	const filePath = suiteFilePath();

	if (suites[filePath]) throw new DuplicateSuiteError(filePath);

	suites[filePath] = { name: suiteName, hooks: {}, tasks: [] };

	suiteFn();
}

export function task(taskName: string, operation: Task['operation']) {
	const filePath = suiteFilePath();

	suites[filePath].tasks.push({
		description: suites[filePath].name + ' ' + taskName,
		operation,
	});
}

// @TODO: Rename next two utils to dismbiguate?

/**
 * Setup step to run once before all iterations of each benchmarking task in a suite.
 */
export function beforeEach(fn: Callback) {
	const filePath = suiteFilePath();

	if (suites[filePath]?.hooks.beforeEach) {
		throw new DuplicateHookError('beforeEach', filePath);
	}

	suites[filePath].hooks.beforeEach = fn;
}

/**
 * Teardown step to run once after all iterations of each benchmarking task in a suite.
 */
export function afterEach(fn: Callback) {
	const filePath = suiteFilePath();

	if (suites[filePath]?.hooks.afterEach) {
		throw new DuplicateHookError('afterEach', filePath);
	}

	suites[filePath].hooks.afterEach = fn;
}
