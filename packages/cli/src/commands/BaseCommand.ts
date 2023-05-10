import { Command } from '@oclif/command';
import { ExitError } from '@oclif/errors';
import { Container } from 'typedi';
import type { INodeTypes } from 'n8n-workflow';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import type { IUserSettings } from 'n8n-core';
import { BinaryDataManager, UserSettings } from 'n8n-core';
import type { AbstractServer } from '@/AbstractServer';
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

	protected instanceId: string;

	protected server?: AbstractServer;

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

		await Db.init().catch(async (error: Error) =>
			this.exitWithCrash('There was an error initializing DB', error),
		);

		await this.server?.init();

		await Db.migrate().catch(async (error: Error) =>
			this.exitWithCrash('There was an error running database migrations', error),
		);

		if (process.env.WEBHOOK_TUNNEL_URL) {
			LoggerProxy.warn(
				'You are still using the WEBHOOK_TUNNEL_URL environment variable. It has been deprecated and will be removed in a future version of n8n. Please switch to using WEBHOOK_URL instead.',
			);
		}
		const dbType = config.getEnv('database.type');

		if (['mysqldb', 'mariadb'].includes(dbType)) {
			LoggerProxy.warn(
				'Support for MySQL/MariaDB has been deprecated and will be removed with an upcoming version of n8n. Please migrate to PostgreSQL.',
			);
		}
		if (process.env.EXECUTIONS_PROCESS === 'own') {
			LoggerProxy.warn(
				'Own mode has been deprecated and will be removed in a future version of n8n. If you need the isolation and performance gains, please consider using queue mode.',
			);
		}

		this.instanceId = this.userSettings.instanceId ?? '';
		await Container.get(PostHogClient).init(this.instanceId);
		await Container.get(InternalHooks).init(this.instanceId);
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
		if (Db.connectionState.connected) {
			await sleep(100); // give any in-flight query some time to finish
			await Db.close();
		}
		const exitCode = error instanceof ExitError ? error.oclif.exit : error ? 1 : 0;
		this.exit(exitCode);
	}
}
