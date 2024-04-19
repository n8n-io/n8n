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
	for (const { tasks, hooks } of Object.values(suites)) {
		for (const t of tasks) {
			/**
			 * `beforeAll` in tinybench is called once before all iterations of a single operation.
			 * This is functionally equivalent to `beforeEach` in jest and vitest.
			 */
			const options = hooks.beforeEach ? { beforeAll: hooks.beforeEach } : {};

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
