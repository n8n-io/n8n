import 'reflect-metadata';
import Container from 'typedi';
import { Logger } from '@/Logger';
import { collectSuites, registerSuites, setup, teardown } from './lib';
import config from '@/config';

/* eslint-disable import/no-extraneous-dependencies */
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
/* eslint-enable import/no-extraneous-dependencies */

async function main() {
	const suites = await collectSuites();

	const count = Object.keys(suites).length;

	const logger = Container.get(Logger);

	if (count === 0) {
		logger.info('[Benchmarking] Found no suites. Exiting...');
		return;
	}

	logger.info(`[Benchmarking] Running ${count} ${count === 1 ? 'suite' : 'suites'}...`);

	await setup();

	const _bench = new Bench({
		// @TODO: Temp values
		time: 0,
		iterations: 1,
		// time: config.getEnv('benchmark.time'),
		// iterations: config.getEnv('benchmark.iterations'),
		throws: config.getEnv('benchmark.stopOnError'),
		warmupTime: config.getEnv('benchmark.warmupTime'),
		warmupIterations: config.getEnv('benchmark.warmupIterations'),
	});

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	registerSuites(bench);

	await bench.run();

	if (process.env.CI !== 'true') console.table(bench.table());

	await teardown();
}

void main();
