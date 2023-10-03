import { Command } from '@oclif/command';
import { ExitError } from '@oclif/errors';
import { Container } from 'typedi';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import type { IUserSettings } from 'n8n-core';
import { BinaryDataService, UserSettings } from 'n8n-core';
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
import type { IExternalHooksClass, N8nInstanceType } from '@/Interfaces';
import { InternalHooks } from '@/InternalHooks';
import { PostHogClient } from '@/posthog';
import { License } from '@/License';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { initExpressionEvaluator } from '@/ExpressionEvalator';
import { generateHostInstanceId } from '../databases/utils/generators';

export abstract class BaseCommand extends Command {
	protected logger = LoggerProxy.init(getLogger());

	protected externalHooks: IExternalHooksClass;

	protected loadNodesAndCredentials: LoadNodesAndCredentials;

	protected nodeTypes: NodeTypes;

	protected userSettings: IUserSettings;

	protected instanceId: string;

	instanceType: N8nInstanceType = 'main';

	queueModeId: string;

	protected server?: AbstractServer;

	async init(): Promise<void> {
		await initErrorHandling();
		initExpressionEvaluator();

		process.once('SIGTERM', async () => this.stopProcess());
		process.once('SIGINT', async () => this.stopProcess());

		// Make sure the settings exist
		this.userSettings = await UserSettings.prepareUserSettings();

		this.loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		await this.loadNodesAndCredentials.init();
		this.nodeTypes = Container.get(NodeTypes);
		this.nodeTypes.init();
		const credentialTypes = Container.get(CredentialTypes);
		CredentialsOverwrites(credentialTypes);

		await Db.init().catch(async (error: Error) =>
			this.exitWithCrash('There was an error initializing DB', error),
		);

		await this.server?.init();

		await Db.migrate().catch(async (error: Error) =>
			this.exitWithCrash('There was an error running database migrations', error),
		);

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

	protected setInstanceType(instanceType: N8nInstanceType) {
		this.instanceType = instanceType;
		config.set('generic.instanceType', instanceType);
	}

	protected setInstanceQueueModeId() {
		if (config.get('redis.queueModeId')) {
			this.queueModeId = config.get('redis.queueModeId');
			return;
		}
		this.queueModeId = generateHostInstanceId(this.instanceType);
		config.set('redis.queueModeId', this.queueModeId);
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

	async initBinaryDataService() {
		const binaryDataConfig = config.getEnv('binaryDataManager');
		await Container.get(BinaryDataService).init(binaryDataConfig);
	}

	async initExternalHooks() {
		this.externalHooks = Container.get(ExternalHooks);
		await this.externalHooks.init();
	}

	async initLicense(): Promise<void> {
		const license = Container.get(License);
		await license.init(this.instanceId, this.instanceType ?? 'main');

		const activationKey = config.getEnv('license.activationKey');

		if (activationKey) {
			const hasCert = (await license.loadCertStr()).length > 0;

			if (hasCert) {
				return LoggerProxy.debug('Skipping license activation');
			}

			try {
				LoggerProxy.debug('Attempting license activation');
				await license.activate(activationKey);
			} catch (e) {
				LoggerProxy.error('Could not activate license', e as Error);
			}
		}
	}

	async initExternalSecrets() {
		const secretsManager = Container.get(ExternalSecretsManager);
		await secretsManager.init();
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
