import Container from 'typedi';
import { Config } from '@oclif/core';
import { Start } from '@/commands/start';
import { n8nDir } from './n8nDir';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { seedInstanceOwner, seedWorkflows } from './seed';
import { log } from '../log';
import { postgresSetup, postgresTeardown } from './postgres';
import * as Db from '@/Db';
import config from '@/config';

let main: Start;

export async function setup() {
	n8nDir();

	await postgresSetup();

	main = new Start([], new Config({ root: __dirname }));

	await main.init();
	await main.run();

	log('Set DB', config.getEnv('database.type'));

	await seedInstanceOwner();
	const files = await seedWorkflows();

	await Container.get(ActiveWorkflowRunner).init();

	log('Activated workflows', files);
}

export async function teardown() {
	await main.stopProcess();

	await Db.close();
	await postgresTeardown();
}
