import 'reflect-metadata';
import Container from 'typedi';
import config from '@/config';
import { Logger } from '@/Logger';
import { collectSuites, registerSuites, UnsupportedDatabaseError, hooks } from './lib';

/* eslint-disable import/no-extraneous-dependencies */
import Bench from 'tinybench';
import { withCodSpeed } from '@codspeed/tinybench-plugin';
/* eslint-enable import/no-extraneous-dependencies */

async function main() {
	const dbType = config.getEnv('database.type');

	if (dbType !== 'sqlite') throw new UnsupportedDatabaseError();

	const suites = await collectSuites();

	const count = Object.keys(suites).length;

	const logger = Container.get(Logger);

	if (count === 0) {
		logger.info('[Benchmarking] Found no suites. Exiting...');
		return;
	}

	logger.info(`[Benchmarking] Running ${count} ${count === 1 ? 'suite' : 'suites'}...`);

	await hooks.globalSetup();

	// @TODO: Make these values configurable
	const _bench = new Bench({
		time: 0, // @TODO: Temp value
		iterations: 1, // @TODO: Temp value
		throws: true,
	});

	const bench = process.env.CI === 'true' ? withCodSpeed(_bench) : _bench;

	registerSuites(bench);

	await bench.run();

	if (process.env.CI !== 'true') console.table(bench.table());

	await hooks.globalTeardown();
}

void main();
