import 'reflect-metadata';
import config from '@/config';
import {
	collectSuites,
	log,
	logResults,
	registerSuites,
	setup,
	teardown,
	toOneLineJson,
} from './lib';

/* eslint-disable import/no-extraneous-dependencies */
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
/* eslint-enable import/no-extraneous-dependencies */

async function main() {
	const suites = await collectSuites(); // @TODO: --filter suites

	log('Found suites', Object.keys(suites).join(' '));

	await setup(); // 1. create a benchmark postgres DB

	const benchConfig = {
		time: config.getEnv('benchmark.time'),
		iterations: config.getEnv('benchmark.iterations'),
		throws: config.getEnv('benchmark.stopOnError'),
		warmupTime: config.getEnv('benchmark.warmupTime'),
		warmupIterations: config.getEnv('benchmark.warmupIterations'),
	};

	const _bench = new Bench({
		// @TODO: Temp values
		// time: 0,
		// iterations: 1,
		...benchConfig,
	});

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	registerSuites(bench);

	// 2. duplicate all suites
	// - add a `[postgres]` prefix to each suite name
	// - add a `beforeEachTask` hook to each new task, containing `config.set('database.type', 'postgresdb')`

	// await bench.warmup(); // @TODO: Restore

	log('Set config', toOneLineJson(benchConfig));
	log('Running iterations, please wait...');

	await bench.run();

	log('Iterations completed');

	if (process.env.CI !== 'true') logResults(suites, bench.results);
	// console.table(bench.table());
	// console.log(bench.results);

	await teardown(); // 3. remove benchmark postgres DB
}

void main();
