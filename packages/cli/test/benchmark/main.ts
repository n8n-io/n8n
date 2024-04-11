/* eslint-disable import/no-extraneous-dependencies */ // @TODO: Remove

import 'reflect-metadata';

import { Bench } from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';

import { webhook } from './webhook.bm';

function registerBenchmarks(bench: Bench) {
	webhook(bench);
}

async function main() {
	const bench = withCodSpeed(
		new Bench(
			{ time: 0, iterations: 1 }, // @TEMP: Remove
		),
	);

	registerBenchmarks(bench);

	// await bench.warmup(); // @TODO: Restore
	await bench.run();

	console.table(bench.table());
}

void main();
