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
	for (const { name: suiteName, hooks, tasks } of Object.values(suites)) {
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
			const taskName = process.env.CI === 'true' ? [suiteName, t.name].join('::') : t.name;

			bench.add(taskName, t.operation, options);
		}
	}
}

function suiteKey() {
	const key = callsites()
		.map((site) => site.getFileName())
		.filter((site): site is string => site !== null)
		.find((site) => site.endsWith('.suite.js'));

	assert(key !== undefined);

	return key.replace(/^.*benchmark\//, '').replace(/\.js$/, '.ts');
}

export function suite(suiteName: string, suiteFn: () => void) {
	const key = suiteKey();

	if (suites[key]) throw new DuplicateSuiteError(key);

	suites[key] = { name: suiteName, hooks: {}, tasks: [] };

	suiteFn();
}

export function task(taskName: string, operation: Task['operation']) {
	const key = suiteKey();

	suites[key].tasks.push({
		name: taskName,
		operation,
	});
}

export function beforeEachTask(fn: Callback) {
	const key = suiteKey();

	if (suites[key]?.hooks.beforeEachTask) {
		throw new DuplicateHookError('beforeEachTask', key);
	}

	suites[key].hooks.beforeEachTask = fn;
}

export function afterEachTask(fn: Callback) {
	const key = suiteKey();

	if (suites[key]?.hooks.afterEachTask) {
		throw new DuplicateHookError('afterEachTask', key);
	}

	suites[key].hooks.afterEachTask = fn;
}
