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
	const files = await glob('**/*.suite.js', {
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
		 * In tinybench, `beforeAll` and `afterAll` refer to all _iterations_ of
		 * a single task, while `beforeEach` and `afterEach` refer to each _iteration_.
		 *
		 * In jest and vitest, `beforeAll` and `afterAll` refer to all _tests_,
		 * while `beforeEach` and `afterEach` refer to each _test_.
		 *
		 * This API renames tinybench's hooks to prevent confusion from familiarity with jest.
		 */
		const options: Record<string, Callback> = {};

		if (hooks.beforeEachTask) options.beforeAll = hooks.beforeEachTask;
		if (hooks.afterEachTask) options.afterAll = hooks.afterEachTask;

		for (const t of tasks) {
			bench.add(t.name, t.operation, options);
		}
	}
}

function suiteFilePath() {
	const filePath = callsites()
		.map((site) => site.getFileName())
		.filter((site): site is string => site !== null)
		.find((site) => site.endsWith('.suite.js'));

	assert(filePath !== undefined);

	return filePath;
}

// @TODO: Support async suiteFn
export function suite(suiteName: string, suiteFn: () => void) {
	const filePath = suiteFilePath();

	if (suites[filePath]) throw new DuplicateSuiteError(filePath);

	suites[filePath] = { name: suiteName, hooks: {}, tasks: [] };

	suiteFn();
}

export function task(taskName: string, operation: Task['operation']) {
	const filePath = suiteFilePath();

	suites[filePath].tasks.push({
		name: suites[filePath].name + ' ' + taskName,
		operation,
	});
}

/**
 * Setup step to run once before all iterations of each benchmarking task in a suite.
 */
export function beforeEachTask(fn: Callback) {
	const filePath = suiteFilePath();

	if (suites[filePath]?.hooks.beforeEachTask) {
		throw new DuplicateHookError('beforeEach', filePath);
	}

	suites[filePath].hooks.beforeEachTask = fn;
}

/**
 * Teardown step to run once after all iterations of each benchmarking task in a suite.
 */
export function afterEachTask(fn: Callback) {
	const filePath = suiteFilePath();

	if (suites[filePath]?.hooks.afterEachTask) {
		throw new DuplicateHookError('afterEach', filePath);
	}

	suites[filePath].hooks.afterEachTask = fn;
}
