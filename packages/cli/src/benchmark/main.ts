import 'reflect-metadata';
import { collectSuites, log, logResults, setup, teardown, toOneLineJson } from './lib';
import { registerSuites } from './lib/api';
import config from '@/config';

/* eslint-disable import/no-extraneous-dependencies */
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
/* eslint-enable import/no-extraneous-dependencies */

async function main() {
	const suites = await collectSuites();

	log('Found suites', Object.keys(suites).join(' '));

	await setup();

	const benchConfig = {
		time: config.getEnv('benchmark.time'),
		iterations: config.getEnv('benchmark.iterations'),
		throws: config.getEnv('benchmark.stopOnError'),
		warmupTime: config.getEnv('benchmark.warmupTime'),
		warmupIterations: config.getEnv('benchmark.warmupIterations'),
	};

	const _bench = new Bench(benchConfig);

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	registerSuites(bench);

	await bench.warmup();

	log('Set config', toOneLineJson(benchConfig));

	log('Running iterations, please wait...');

	await bench.run();

	log('Iterations completed ✓');

	await teardown();

	if (process.env.CI !== 'true') logResults(suites, bench.results);

	process.exit(0);
}

void main();
