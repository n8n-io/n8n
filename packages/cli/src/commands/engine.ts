import { AzureBlobConfig, ObjectStoreConfig } from '@n8n/blob-storage';
import { EngineConfig } from '@n8n/config';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { EngineRole, ExecutionChannelPublisher, RedisWorkQueues } from '@n8n/engine';
import { BinaryDataConfig, BinaryDataService, ErrorReporter } from 'n8n-core';
import { Expression } from 'n8n-workflow';
import { UserError } from '@n8n/errors';
import { z } from 'zod';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EngineV2Runtime } from '@/modules/engine-v2/engine-v2.runtime';

import { BaseCommand } from './base-command';

const flagsSchema = z.object({
	roles: z
		.string()
		.optional()
		.describe(
			'Comma-separated list, without spaces, of the engine roles to run: api, orchestrator, step-worker. Takes precedence over N8N_ENGINE_ROLES. Runs every role when neither is set.',
		),
});

@Command({
	name: 'engine',
	description:
		'Starts the engine v2 data plane, with the work queues, execution responses and lifecycle events in Redis. The `api` role serves the engine API, the `orchestrator` role plans executions, and the `step-worker` role runs the nodes and resolves their credentials from a control plane (`n8n start` with N8N_ENGINE_MODE=remote).',
	examples: [
		'',
		'--roles=api',
		'--roles=orchestrator',
		'--roles=step-worker',
		'--roles=api,orchestrator',
	],
	flagsSchema,
})
export class Engine extends BaseCommand<z.infer<typeof flagsSchema>> {
	// The data plane has no control plane database. Its own database is the
	// engine's, opened by the runtime from N8N_ENGINE_DATABASE_URL.
	override needsDb = false;

	private runtime?: EngineV2Runtime;

	private channelPublisher?: ExecutionChannelPublisher;

	private workQueues?: RedisWorkQueues;

	async init() {
		// The guards below run before `super.init()` wires the reporter, and the
		// crash path reports through it.
		this.errorReporter = Container.get(ErrorReporter);
		const engineConfig = Container.get(EngineConfig);
		const { parseEngineRoles } = await import('@/modules/engine-v2/engine-roles.js');
		const roles = parseEngineRoles(this.flags.roles, engineConfig.roles);
		assertControlPlaneIsolated(process.env);
		assertRoleSettings(engineConfig, roles);
		// Only the step worker runs nodes, so only it loads them, evaluates expressions and
		// Code nodes, and dials the control plane.
		const runsSteps = roles.includes('step-worker');
		const { EngineMtls } = await import('@/modules/engine-v2/engine-mtls.js');
		Container.get(EngineMtls).assertSecureTransport(
			runsSteps ? { N8N_ENGINE_CONTROL_PLANE_BASE_URL: engineConfig.controlPlaneBaseUrl } : {},
		);

		this.needsNodeTypes = runsSteps;
		this.needsExpressionEngine = runsSteps;
		// TODO(CET-332): remove once Code nodes run on the sandbox service.
		this.needsCodeExecution = runsSteps;

		this.logger.info(`Starting engine v2 data plane with roles ${roles.join(', ')}...`);
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
		const { createInstanceRedisWorkQueues } = await import(
			'@/modules/engine-v2/work-queue/redis-work-queues.js'
		);
		this.workQueues = await createInstanceRedisWorkQueues(redisPublisher, logger, {
			orchestration: engineConfig.orchestrationConcurrency,
			step: engineConfig.stepConcurrency,
		});

		const { EngineV2Runtime } = await import('@/modules/engine-v2/engine-v2.runtime.js');
		this.runtime = Container.get(EngineV2Runtime);
		await this.runtime.init({
			responseSender: new ExecutionChannelSender(publisher, createExecutionResponseCodec(logger)),
			lifecycleEventSender: new LifecycleEventChannelSender(publisher, logger),
			queues: this.workQueues.queues,
			roles,
		});

		if (runsSteps) await Container.get(LoadNodesAndCredentials).postProcessLoaders();
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
			// Before the publisher, so a late fetch fails instead of taking a message it can no longer give back.
			async () => this.workQueues?.close(),
			// After the engine, so a final response still has somewhere to go.
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

/** The api role verifies the mains' tokens, and the step worker signs its control plane requests. */
function assertRoleSettings(config: EngineConfig, roles: readonly EngineRole[]): void {
	const secretUser = roles.find((role) => role === 'api' || role === 'step-worker');
	if (secretUser && !config.authSecret) {
		throw new UserError(
			`The ${secretUser} role needs N8N_ENGINE_AUTH_SECRET. The control plane runs elsewhere, so nothing here can generate the shared secret.`,
		);
	}

	if (roles.includes('step-worker') && !config.controlPlaneBaseUrl) {
		throw new UserError(
			'The step-worker role needs N8N_ENGINE_CONTROL_PLANE_BASE_URL to resolve credentials, sub-workflows and data tables. The default points at this process, which does not run the control plane.',
		);
	}
}
