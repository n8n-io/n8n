import { AzureBlobConfig, ObjectStoreConfig } from '@n8n/blob-storage';
import { EngineConfig } from '@n8n/config';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ExecutionChannelPublisher } from '@n8n/engine';
import { BinaryDataConfig, BinaryDataService, ErrorReporter } from 'n8n-core';
import { Expression } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EngineV2Runtime } from '@/modules/engine-v2/engine-v2.runtime';
import type { RedisWorkQueues } from '@/modules/engine-v2/work-queue/redis-work-queues';

import { BaseCommand } from './base-command';

@Command({
	name: 'engine',
	description:
		'Starts the engine v2 data plane. Needs a control plane (`n8n start` with N8N_ENGINE_MODE=remote) to resolve credentials from, and Redis for its work queues and to send execution responses and lifecycle events over.',
})
export class Engine extends BaseCommand {
	// The data plane has no control plane database. Its own database is the
	// engine's, opened by the runtime from N8N_ENGINE_DATABASE_URL.
	override needsDb = false;

	// The data plane runs the nodes, so it hosts the task broker the Code node's
	// runners connect to. Same module and env as `n8n start`.
	// TODO(CET-332): remove once Code nodes run on the sandbox service.
	override needsTaskRunner = true;

	override needsExpressionEngine = true;

	private runtime?: EngineV2Runtime;

	private channelPublisher?: ExecutionChannelPublisher;

	private workQueues?: RedisWorkQueues;

	async init() {
		// The guards below run before `super.init()` wires the reporter, and the
		// crash path reports through it.
		this.errorReporter = Container.get(ErrorReporter);
		assertControlPlaneIsolated(process.env);
		const engineConfig = Container.get(EngineConfig);
		assertRemoteControlPlane(engineConfig);
		const { EngineMtls } = await import('@/modules/engine-v2/engine-mtls.js');
		Container.get(EngineMtls).assertSecureTransport({
			N8N_ENGINE_CONTROL_PLANE_BASE_URL: engineConfig.controlPlaneBaseUrl,
		});

		this.logger.info('Starting engine v2 data plane...');
		this.logger.debug(`Host ID: ${this.instanceSettings.hostId}`);

		await super.init();

		await this.initBinaryDataStore();

		// The control plane runs in another process, so the execution channel uses Redis.
		const logger = this.logger.scoped('engine-v2');
		const { createRedisExecutionChannelPublisher } = await import(
			'@/modules/engine-v2/execution-channel/redis-execution-channel.js'
		);
		const { ExecutionChannelSender } = await import(
			'@/modules/engine-v2/execution-channel/execution-channel-sender.js'
		);
		const { createExecutionResponseCodec } = await import(
			'@/modules/engine-v2/execution-channel/execution-response-frame.js'
		);
		const { LifecycleEventChannelSender } = await import(
			'@/modules/engine-v2/execution-channel/lifecycle-event-sender.js'
		);
		const { RedisClientService } = await import('@n8n/backend-services');
		// The work queues share this connection, so on one Redis node a response arrives before the queue message that follows it.
		const redisPublisher = Container.get(RedisClientService).createClient({
			type: 'publisher(n8n)',
		});
		const publisher = await createRedisExecutionChannelPublisher(redisPublisher, logger);
		this.channelPublisher = publisher;

		// In Redis, so that every engine process shares the work.
		const { createRedisWorkQueues } = await import(
			'@/modules/engine-v2/work-queue/redis-work-queues.js'
		);
		this.workQueues = await createRedisWorkQueues(redisPublisher, logger);

		const { EngineV2Runtime } = await import('@/modules/engine-v2/engine-v2.runtime.js');
		this.runtime = Container.get(EngineV2Runtime);
		await this.runtime.init(
			{
				responseSender: new ExecutionChannelSender(publisher, createExecutionResponseCodec(logger)),
				lifecycleEventSender: new LifecycleEventChannelSender(publisher, logger),
			},
			this.workQueues.queues,
		);

		await Container.get(LoadNodesAndCredentials).postProcessLoaders();
	}

	/**
	 * Both planes share one binary data store, so this host registers the same
	 * blob managers as the control plane. `database` mode stores the bytes in the
	 * control plane database, which this process does not have, so it is refused
	 * here: otherwise the error shows only when a run handles its first file. The
	 * same goes for an `s3` or `azure` mode with no store configured: the manager
	 * setup skips a store that is not configured, and the service would then keep
	 * every file inline. No license check yet: the certificate lives in the control
	 * plane database too.
	 */
	private async initBinaryDataStore() {
		const { mode } = Container.get(BinaryDataConfig);

		if (mode === 'database') {
			throw new UserError(
				'The engine process has no control plane database, so it cannot store binary data in `database` mode. Set N8N_DEFAULT_BINARY_DATA_MODE to filesystem, s3 or azure.',
			);
		}

		if (mode === 's3' && Container.get(ObjectStoreConfig).bucket.name === '') {
			throw new UserError(
				'S3 binary data storage requires `N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME` to be set.',
			);
		}

		if (mode === 'azure' && Container.get(AzureBlobConfig).containerName === '') {
			throw new UserError(
				'Azure Blob binary data storage requires `N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME` to be set.',
			);
		}

		await this.initBinaryDataBlobManagers({ s3: mode === 's3', azure: mode === 'azure' });
		await Container.get(BinaryDataService).init();
	}

	async run() {
		this.logger.info('Engine v2 data plane waiting for executions.');

		// Make sure that the process does not close
		await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Exiting due to an error.', error);
	}

	protected async stopProcess() {
		this.logger.info('Stopping engine v2 data plane...');

		const errors: unknown[] = [];
		const releaseSteps = [
			async () => await this.runtime?.shutdown(),
			// Before the publisher, so a fetch that returns late fails and does not give its message back.
			async () => this.workQueues?.close(),
			// After the engine and the queues, so a final response still has somewhere to go.
			async () => await this.channelPublisher?.stop(),
			async () => await Expression.disposeExpressionEngine(),
		];

		for (const release of releaseSteps) {
			await release().catch((error: unknown) => {
				errors.push(error);
			});
		}

		if (errors.length > 0) {
			await this.exitWithCrash(
				'There was an error shutting down the engine.',
				new AggregateError(errors, 'The engine could not release every resource'),
			);
		}

		// No control plane database to close and no crash journal to clear, so
		// the base exit helper does not apply.
		process.exit();
	}
}

/**
 * A `DB_*` variable means the process was given the control plane database,
 * and `N8N_ENCRYPTION_KEY` means it could read the credentials in it. Refuse
 * both here, at boot, so the isolation is a check and not a convention.
 */
function assertControlPlaneIsolated(env: NodeJS.ProcessEnv): void {
	const leaked = Object.keys(env).filter(
		(key) =>
			key.startsWith('DB_') || key === 'N8N_ENCRYPTION_KEY' || key === 'N8N_ENCRYPTION_KEY_FILE',
	);

	if (leaked.length > 0) {
		throw new UserError(
			`The engine process must not have control plane database access. Remove ${leaked.join(', ')} from its environment.`,
		);
	}
}

function assertRemoteControlPlane(config: EngineConfig): void {
	if (!config.authSecret) {
		throw new UserError(
			'The engine process needs N8N_ENGINE_AUTH_SECRET. The control plane runs elsewhere, so nothing here can generate the shared secret.',
		);
	}

	if (!config.controlPlaneBaseUrl) {
		throw new UserError(
			'The engine process needs N8N_ENGINE_CONTROL_PLANE_BASE_URL. The default points at this process, which does not run the control plane.',
		);
	}
}
