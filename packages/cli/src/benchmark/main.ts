import 'reflect-metadata';

/* eslint-disable import/no-extraneous-dependencies */ // @TODO

import { Bench } from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
// import { example } from './example.bm';
import { start } from './start.bm';

function registerBenchmarks(bench: Bench) {
	// example(bench);
	start(bench);
}

async function main() {
	const bench = withCodSpeed(new Bench());

	registerBenchmarks(bench);

	await bench.warmup();
	await bench.run();

	console.table(bench.table());
}

void main();
