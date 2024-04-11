import 'reflect-metadata';
import path from 'node:path';
import glob from 'fast-glob';
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
import type { Task } from './types';
import { hooks } from './hooks';

const tasks: Task[] = [];

export function task(description: string, operation: Task['operation']) {
	tasks.push({ description, operation });
}

async function loadTasks() {
	const files = await glob('**/*.tasks.js', {
		cwd: path.join('dist', 'test', 'benchmarks'),
		absolute: true,
	});

	for (const file of files) {
		await import(file);
	}
}

async function main() {
	await loadTasks();

	if (tasks.length === 0) {
		console.log('No benchmarking tasks found');
		return;
	}

	await hooks.setup();

	const _bench = new Bench({
		time: 0, // @TODO: Temp value
		iterations: 1, // @TODO: Temp value
	});

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	for (const task of tasks) {
		bench.add(task.description, task.operation);
	}

	console.log(`Running ${tasks.length} benchmarking tasks...`);

	// await this.warmup(); // @TODO: Restore

	await bench.run();

	console.table(bench.table());

	await hooks.teardown();
}

void main();
