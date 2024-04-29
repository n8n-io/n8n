import 'reflect-metadata';
import config from '@/config';
import type { Suites } from './lib';
import { collectSuites, log, logResults, setup, teardown, toOneLineJson } from './lib';
import * as Db from '@/Db';
import type { Callback } from './lib/types';

/* eslint-disable import/no-extraneous-dependencies */
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
/* eslint-enable import/no-extraneous-dependencies */

async function main() {
	/**
	 * Setup
	 */

	const suites = await collectSuites();
	const postgresSuites: Suites = {};
	const sqliteSuites: Suites = {};

	for (const key in suites) {
		postgresSuites[key] = suites[key];
		postgresSuites[key].name += ' [postgres]';
		postgresSuites[key].tasks = postgresSuites[key].tasks.map((t) => ({
			...t,
			name: t.name + ' [postgres]',
		}));

		sqliteSuites[key] = suites[key];
		sqliteSuites[key].name += ' [sqlite]';
		sqliteSuites[key].tasks = sqliteSuites[key].tasks.map((t) => ({
			...t,
			name: t.name + ' [sqlite]',
		}));
	}

	log('Found suites', Object.keys(suites).join(' '));

	await setup();

	const benchConfig = {
		time: config.getEnv('benchmark.time'),
		iterations: config.getEnv('benchmark.iterations'),
		throws: config.getEnv('benchmark.stopOnError'),
		warmupTime: config.getEnv('benchmark.warmupTime'),
		warmupIterations: config.getEnv('benchmark.warmupIterations'),
	};

	/**
	 * Postgres suites
	 */

	const _pgBench = new Bench(benchConfig);

	const postgresBench = process.env.CI === 'true' ? withCodSpeed(_pgBench) : _pgBench;

	for (const { hooks, tasks } of Object.values(postgresSuites)) {
		const options: Record<string, Callback> = {};

		if (hooks.beforeEachTask) options.beforeAll = hooks.beforeEachTask;
		if (hooks.afterEachTask) options.afterAll = hooks.afterEachTask;

		for (const t of tasks) {
			postgresBench.add(t.name, t.operation, options);
		}
	}

	// await bench.warmup(); // @TODO: Restore

	log('Set config', toOneLineJson(benchConfig));

	log('Running iterations in postgres, please wait...');

	await postgresBench.run();

	log('Iterations completed');

	if (process.env.CI !== 'true') logResults(postgresSuites, postgresBench.results, 'postgres');

	/**
	 * Sqlite suites
	 */

	config.set('database.type', 'sqlite'); // @TODO: Not working
	await Db.init();
	await Db.migrate();

	const _sqliteBench = new Bench(benchConfig);

	const sqliteBench = process.env.CI === 'true' ? withCodSpeed(_sqliteBench) : _sqliteBench;

	for (const { hooks, tasks } of Object.values(sqliteSuites)) {
		const options: Record<string, Callback> = {};

		if (hooks.beforeEachTask) options.beforeAll = hooks.beforeEachTask;
		if (hooks.afterEachTask) options.afterAll = hooks.afterEachTask;

		for (const t of tasks) {
			sqliteBench.add(t.name, t.operation, options);
		}
	}

	// await bench.warmup(); // @TODO: Restore

	console.log('========== using database', Db.getConnection().driver.database);

	log('Set config', toOneLineJson(benchConfig));

	log('Running iterations in sqlite, please wait...');

	await sqliteBench.run();

	log('Iterations completed');

	if (process.env.CI !== 'true') logResults(sqliteSuites, sqliteBench.results, 'sqlite');

	/**
	 * Teardown
	 */

	await teardown();

	process.exit(0);
}

void main();
