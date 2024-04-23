import 'reflect-metadata';
import * as hooks from './lib/hooks';
import { collectSuites, registerSuites, suiteCount } from './lib/suites';
import config from '@/config';
import { UnsupportedDatabaseError } from './lib/errors/unsupported-database.error';
import { Logger } from '@/Logger';
import Container from 'typedi';

/* eslint-disable import/no-extraneous-dependencies */
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
/* eslint-enable import/no-extraneous-dependencies */

export { beforeEach, afterEach, task } from './lib/suites';

async function main() {
	const dbType = config.getEnv('database.type');

	if (dbType !== 'sqlite') throw new UnsupportedDatabaseError();

	await collectSuites();

	const count = suiteCount();

	const logger = Container.get(Logger);

	if (count === 0) {
		logger.info('No benchmarking suites found. Exiting...');
		return;
	}

	logger.info(`Running ${count} benchmarking ${count === 1 ? 'suite' : 'suites'}...`);

	await hooks.globalSetup();

	const _bench = new Bench({
		time: 0, // @TODO: Temp value
		iterations: 1, // @TODO: Temp value
	});

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	registerSuites(bench);

	await bench.run();

	console.table(bench.table()); // @TODO: Output properly? Ref. Codspeed

	await hooks.globalTeardown();
}

void main();
