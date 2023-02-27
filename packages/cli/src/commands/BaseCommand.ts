import { Command } from '@oclif/command';
import { ExitError } from '@oclif/errors';
import { Container } from 'typedi';
import type { INodeTypes } from 'n8n-workflow';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import type { IUserSettings } from 'n8n-core';
import { BinaryDataManager, UserSettings } from 'n8n-core';
import { getLogger } from '@/Logger';
import config from '@/config';
import * as Db from '@/Db';
import * as CrashJournal from '@/CrashJournal';
import { inTest } from '@/constants';
import { CredentialTypes } from '@/CredentialTypes';
import { CredentialsOverwrites } from '@/CredentialsOverwrites';
import { initErrorHandling } from '@/ErrorReporting';
import { ExternalHooks } from '@/ExternalHooks';
import { NodeTypes } from '@/NodeTypes';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import type { IExternalHooksClass } from '@/Interfaces';
import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';

export const UM_FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

export abstract class BaseCommand extends Command {
	protected logger = LoggerProxy.init(getLogger());

	protected externalHooks: IExternalHooksClass;

	protected loadNodesAndCredentials: LoadNodesAndCredentials;

	protected nodeTypes: INodeTypes;

	protected userSettings: IUserSettings;

	async init(): Promise<void> {
		await initErrorHandling();

		process.once('SIGTERM', async () => this.stopProcess());
		process.once('SIGINT', async () => this.stopProcess());

		// Make sure the settings exist
		this.userSettings = await UserSettings.prepareUserSettings();

		this.loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await this.loadNodesAndCredentials.init();
		this.nodeTypes = Container.get(NodeTypes);
		const credentialTypes = Container.get(CredentialTypes);
		CredentialsOverwrites(credentialTypes);

		const instanceId = this.userSettings.instanceId ?? '';
		await Container.get(PostHogClient).init(instanceId);
		await Container.get(InternalHooks).init(instanceId);

		await Db.init().catch(async (error: Error) =>
			this.exitWithCrash('There was an error initializing DB', error),
		);
	}

	protected async stopProcess() {
		// This needs to be overridden
	}

	protected async initCrashJournal() {
		await CrashJournal.init();
	}

	protected async exitSuccessFully() {
		try {
			await CrashJournal.cleanup();
		} finally {
			process.exit();
		}
	}

	protected async exitWithCrash(message: string, error: unknown) {
		ErrorReporter.error(new Error(message, { cause: error }), { level: 'fatal' });
		await sleep(2000);
		process.exit(1);
	}

	protected async initBinaryManager() {
		const binaryDataConfig = config.getEnv('binaryDataManager');
		await BinaryDataManager.init(binaryDataConfig, true);
	}

	protected async initExternalHooks() {
		this.externalHooks = Container.get(ExternalHooks);
		await this.externalHooks.init();
	}

	async finally(error: Error | undefined) {
		if (inTest || this.id === 'start') return;
		if (Db.isInitialized) {
			await sleep(100); // give any in-flight query some time to finish
			await Db.connection.destroy();
		}
		const exitCode = error instanceof ExitError ? error.oclif.exit : error ? 1 : 0;
		this.exit(exitCode);
	}
}
