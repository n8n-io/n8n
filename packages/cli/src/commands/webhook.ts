/* eslint-disable @typescript-eslint/unbound-method */
import { BinaryDataManager, UserSettings } from 'n8n-core';
import { Command, flags } from '@oclif/command';

import { LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import config from '@/config';
import * as ActiveExecutions from '@/ActiveExecutions';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { CredentialTypes } from '@/CredentialTypes';
import * as Db from '@/Db';
import { ExternalHooks } from '@/ExternalHooks';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { InternalHooksManager } from '@/InternalHooksManager';
import { WebhookServer } from '@/WebhookServer';
import { getLogger } from '@/Logger';
import { initErrorHandling } from '@/ErrorReporting';
import * as CrashJournal from '@/CrashJournal';

const exitWithCrash = async (message: string, error: unknown) => {
	ErrorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
	await sleep(2000);
	process.exit(1);
};

const exitSuccessFully = async () => {
	try {
		await CrashJournal.cleanup();
	} finally {
		process.exit();
	}
};

export class Webhook extends Command {
	static description = 'Starts n8n webhook process. Intercepts only production URLs.';

	static examples = ['$ n8n webhook'];

	static flags = {
		help: flags.help({ char: 'h' }),
	};

	/**
	 * Stops n8n in a graceful way.
	 * Make for example sure that all the webhooks from third party services
	 * get removed.
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	static async stopProcess() {
		LoggerProxy.info('\nStopping n8n...');

		try {
			const externalHooks = ExternalHooks();
			await externalHooks.run('n8n.stop', []);

			setTimeout(async () => {
				// In case that something goes wrong with shutdown we
				// kill after max. 30 seconds no matter what
				await exitSuccessFully();
			}, 30000);

			// Wait for active workflow executions to finish
			const activeExecutionsInstance = ActiveExecutions.getInstance();
			let executingWorkflows = activeExecutionsInstance.getActiveExecutions();

			let count = 0;
			while (executingWorkflows.length !== 0) {
				if (count++ % 4 === 0) {
					LoggerProxy.info(
						`Waiting for ${executingWorkflows.length} active executions to finish...`,
					);
				}
				// eslint-disable-next-line no-await-in-loop
				await sleep(500);
				executingWorkflows = activeExecutionsInstance.getActiveExecutions();
			}
		} catch (error) {
			await exitWithCrash('There was an error shutting down n8n.', error);
		}

		await exitSuccessFully();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		if (config.getEnv('executions.mode') !== 'queue') {
			/**
			 * It is technically possible to run without queues but
			 * there are 2 known bugs when running in this mode:
			 * - Executions list will be problematic as the main process
			 * is not aware of current executions in the webhook processes
			 * and therefore will display all current executions as error
			 * as it is unable to determine if it is still running or crashed
			 * - You cannot stop currently executing jobs from webhook processes
			 * when running without queues as the main process cannot talk to
			 * the webhook processes to communicate workflow execution interruption.
			 */

			this.error('Webhook processes can only run with execution mode as queue.');
		}

		const logger = getLogger();
		LoggerProxy.init(logger);

		// Make sure that n8n shuts down gracefully if possible
		process.once('SIGTERM', Webhook.stopProcess);
		process.once('SIGINT', Webhook.stopProcess);

		await initErrorHandling();
		await CrashJournal.init();

		try {
			// Start directly with the init of the database to improve startup time
			const startDbInitPromise = Db.init().catch(async (error: Error) =>
				exitWithCrash('There was an error initializing DB', error),
			);

			// Make sure the settings exist
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			await UserSettings.prepareUserSettings();

			// Load all node and credential types
			const loadNodesAndCredentials = LoadNodesAndCredentials();
			await loadNodesAndCredentials.init();

			// Add the found types to an instance other parts of the application can use
			const nodeTypes = NodeTypes(loadNodesAndCredentials);
			const credentialTypes = CredentialTypes(loadNodesAndCredentials);

			// Load the credentials overwrites if any exist
			await CredentialsOverwrites(credentialTypes).init();

			// Load all external hooks
			const externalHooks = ExternalHooks();
			await externalHooks.init();

			// Wait till the database is ready
			await startDbInitPromise;

			const instanceId = await UserSettings.getInstanceId();
			await InternalHooksManager.init(instanceId, nodeTypes);

			const binaryDataConfig = config.getEnv('binaryDataManager');
			await BinaryDataManager.init(binaryDataConfig);

			const server = new WebhookServer();
			await server.start();

			console.info('Webhook listener waiting for requests.');
		} catch (error) {
			await exitWithCrash('Exiting due to error.', error);
		}
	}
}
