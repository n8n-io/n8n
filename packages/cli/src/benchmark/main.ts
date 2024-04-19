import 'reflect-metadata';
import path from 'node:path';
import { assert } from 'n8n-workflow';
import glob from 'fast-glob';
import callsites from 'callsites';
import type { Task } from './types';
import { globalHooks } from './hooks';

/* eslint-disable import/no-extraneous-dependencies */
import { withCodSpeed } from '@codspeed/tinybench-plugin';
import Bench from 'tinybench';
/* eslint-enable import/no-extraneous-dependencies */

const map: {
	[suiteFilepath: string]: {
		hooks: Partial<{ beforeEach: () => Promise<void> }>;
		tasks: Task[];
	};
} = {};

function suiteFilePath() {
	const filePath = callsites()
		.map((site) => site.getFileName())
		.filter((site): site is string => site !== null)
		.find((site) => site.endsWith('.tasks.js'));

	assert(filePath !== undefined);

	return filePath;
}

export function task(description: string, operation: Task['operation']) {
	map[suiteFilePath()] ||= { hooks: {}, tasks: [] };
	map[suiteFilePath()].tasks.push({ description, operation });
}

export function beforeEach(fn: () => Promise<void>) {
	map[suiteFilePath()] ||= { hooks: {}, tasks: [] };
	map[suiteFilePath()].hooks.beforeEach = fn;
}

async function loadTasks() {
	const files = await glob('**/*.tasks.js', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	for (const file of files) {
		await import(file);
	}
}

async function main() {
	await loadTasks();

	const suitesCount = Object.keys(map).length;

	if (suitesCount === 0) {
		console.log('No benchmarking suites found');
		return;
	}

	await globalHooks.setup();

	const _bench = new Bench({
		time: 0, // @TODO: Temp value
		iterations: 1, // @TODO: Temp value
	});

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	for (const filePath of Object.keys(map)) {
		const { tasks, hooks } = map[filePath];

		for (const t of tasks) {
			/**
			 * `beforeAll` in tinybench is called once before all iterations of a single operation.
			 * This is functionally equivalent to `beforeEach` in jest and vitest.
			 */
			const options = hooks.beforeEach ? { beforeAll: hooks.beforeEach } : {};

			bench.add(t.description, t.operation, options);
		}
	}

	console.log(`Running ${suitesCount} benchmarking suites...`);

	await bench.run();

	console.table(bench.table());

	await globalHooks.teardown();
}

void main();
