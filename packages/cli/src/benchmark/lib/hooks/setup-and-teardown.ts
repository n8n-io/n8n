import Container from 'typedi';
import { Config } from '@oclif/core';
import { Start } from '@/commands/start';
import { n8nDir } from './n8nDir';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { seedInstanceOwner, seedWorkflows } from './seed';
import { log } from '../log';
import { postgresSetup, postgresTeardown } from '../postgres';
import * as Db from '@/Db';
import config from '@/config';

let main: Start;

const dbType = config.getEnv('database.type');

export async function setup() {
	n8nDir();

	log('Selected DB type', dbType);

	if (dbType === 'postgresdb') await postgresSetup();

	main = new Start([], new Config({ root: __dirname }));

	await main.init();
	await main.run();

	await seedInstanceOwner();
	const files = await seedWorkflows();

	await Container.get(ActiveWorkflowRunner).init();

	log('Activated workflows', files);
}

export async function teardown() {
	await main.stopProcess();

	await Db.close();

	if (dbType === 'postgresdb') await postgresTeardown();
}
