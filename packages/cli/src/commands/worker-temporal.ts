/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { flags } from '@oclif/command';
import { BaseCommand } from './BaseCommand';

import { Worker } from '@temporalio/worker';
import * as activities from '@/temporal/TemporalActivities';

async function startTemporalWorker() {
	// Step 1: Register Workflows and Activities with the Worker and connect to
	// the Temporal server.
	const worker = await Worker.create({
		workflowsPath: require.resolve('./../temporal/TemporalWorkflow'),
		activities,
		taskQueue: 'hello-world',
	});
	// Worker connects to localhost by default and uses console.error for logging.
	// Customize the Worker by passing more options to create():
	// https://typescript.temporal.io/api/classes/worker.Worker
	// If you need to configure server connection parameters, see docs:
	// https://docs.temporal.io/typescript/security#encryption-in-transit-with-mtls

	// Step 2: Start accepting tasks on the `hello-world` queue
	await worker.run();
}

export class Start extends BaseCommand {
	static description = 'Starts n8n. Makes Web-UI available and starts active workflows';

	static examples = [
		'$ n8n start',
		'$ n8n start --tunnel',
		'$ n8n start -o',
		'$ n8n start --tunnel -o',
	];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	async run() {
		await startTemporalWorker().catch((error) => {
			console.error(error);
			process.exit(1);
		});
	}
}
