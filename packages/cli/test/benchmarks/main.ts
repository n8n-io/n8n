/* eslint-disable import/no-extraneous-dependencies */ // @TODO: Remove

import 'reflect-metadata';
import { Bench } from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
import { register } from './register';

async function main() {
	const _bench = new Bench({ time: 0, iterations: 1 }); // @TEMP: Remove arg
	const bench = withCodSpeed(_bench);

	process.env.NODE_ENV = 'test';

	register(bench);

	// await bench.warmup(); // @TODO: Restore
	await bench.run();

	console.table(bench.table());
}

void main();
