import 'reflect-metadata';
import path from 'node:path';
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
