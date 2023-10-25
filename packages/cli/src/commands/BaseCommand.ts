import 'reflect-metadata';
import { Command } from '@oclif/command';
import { ExitError } from '@oclif/errors';
import { Container } from 'typedi';
import { LoggerProxy, ErrorReporterProxy as ErrorReporter, sleep } from 'n8n-workflow';
import { BinaryDataService, InstanceSettings, ObjectStoreService } from 'n8n-core';
import type { AbstractServer } from '@/AbstractServer';
import { getLogger } from '@/Logger';
import config from '@/config';
import * as Db from '@/Db';
import * as CrashJournal from '@/CrashJournal';
import { LICENSE_FEATURES, inTest } from '@/constants';
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
import { WorkflowHistoryManager } from '@/workflows/workflowHistory/workflowHistoryManager.ee';

export abstract class BaseCommand extends Command {
	protected logger = LoggerProxy.init(getLogger());

	protected externalHooks: IExternalHooksClass;

	protected nodeTypes: NodeTypes;

	protected instanceSettings: InstanceSettings;

	private instanceType: N8nInstanceType = 'main';

	queueModeId: string;

	protected server?: AbstractServer;

	async init(): Promise<void> {
		await initErrorHandling();
		initExpressionEvaluator();

		process.once('SIGTERM', async () => this.stopProcess());
		process.once('SIGINT', async () => this.stopProcess());

		// Make sure the settings exist
		this.instanceSettings = Container.get(InstanceSettings);

		this.nodeTypes = Container.get(NodeTypes);
		await Container.get(LoadNodesAndCredentials).init();

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

		await Container.get(PostHogClient).init();
		await Container.get(InternalHooks).init();
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

	async initObjectStoreService() {
		const isSelected = config.getEnv('binaryDataManager.mode') === 's3';
		const isAvailable = config.getEnv('binaryDataManager.availableModes').includes('s3');

		if (!isSelected && !isAvailable) return;

		if (isSelected && !isAvailable) {
			throw new Error(
				'External storage selected but unavailable. Please make external storage available by adding "s3" to `N8N_AVAILABLE_BINARY_DATA_MODES`.',
			);
		}

		const isLicensed = Container.get(License).isFeatureEnabled(LICENSE_FEATURES.BINARY_DATA_S3);

		if (isSelected && isAvailable && isLicensed) {
			LoggerProxy.debug(
				'License found for external storage - object store to init in read-write mode',
			);

			await this._initObjectStoreService();

			return;
		}

		if (isSelected && isAvailable && !isLicensed) {
			LoggerProxy.debug(
				'No license found for external storage - object store to init with writes blocked. To enable writes, please upgrade to a license that supports this feature.',
			);

			await this._initObjectStoreService({ isReadOnly: true });

			return;
		}

		if (!isSelected && isAvailable) {
			LoggerProxy.debug(
				'External storage unselected but available - object store to init with writes unused',
			);

			await this._initObjectStoreService();

			return;
		}
	}

	private async _initObjectStoreService(options = { isReadOnly: false }) {
		const objectStoreService = Container.get(ObjectStoreService);

		const host = config.getEnv('externalStorage.s3.host');

		if (host === '') {
			throw new Error(
				'External storage host not configured. Please set `N8N_EXTERNAL_STORAGE_S3_HOST`.',
			);
		}

		const bucket = {
			name: config.getEnv('externalStorage.s3.bucket.name'),
			region: config.getEnv('externalStorage.s3.bucket.region'),
		};

		if (bucket.name === '') {
			throw new Error(
				'External storage bucket name not configured. Please set `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME`.',
			);
		}

		if (bucket.region === '') {
			throw new Error(
				'External storage bucket region not configured. Please set `N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION`.',
			);
		}

		const credentials = {
			accessKey: config.getEnv('externalStorage.s3.credentials.accessKey'),
			accessSecret: config.getEnv('externalStorage.s3.credentials.accessSecret'),
		};

		if (credentials.accessKey === '') {
			throw new Error(
				'External storage access key not configured. Please set `N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY`.',
			);
		}

		if (credentials.accessSecret === '') {
			throw new Error(
				'External storage access secret not configured. Please set `N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET`.',
			);
		}

		LoggerProxy.debug('Initializing object store service');

		try {
			await objectStoreService.init(host, bucket, credentials);
			objectStoreService.setReadonly(options.isReadOnly);

			LoggerProxy.debug('Object store init completed');
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);

			LoggerProxy.debug('Object store init failed', { error });
		}
	}

	async initBinaryDataService() {
		try {
			await this.initObjectStoreService();
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			LoggerProxy.error(`Failed to init object store: ${error.message}`, { error });
			process.exit(1);
		}

		const binaryDataConfig = config.getEnv('binaryDataManager');
		await Container.get(BinaryDataService).init(binaryDataConfig);
	}

	async initExternalHooks() {
		this.externalHooks = Container.get(ExternalHooks);
		await this.externalHooks.init();
	}

	async initLicense(): Promise<void> {
		const license = Container.get(License);
		await license.init(this.instanceType ?? 'main');

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

	initWorkflowHistory() {
		Container.get(WorkflowHistoryManager).init();
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
