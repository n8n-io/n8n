import { EngineConfig } from '@n8n/config';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ExecutionResponseSender } from '@n8n/engine';
import { BinaryDataConfig, BinaryDataService, ErrorReporter } from 'n8n-core';
import { Expression, UserError } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EngineV2Runtime } from '@/modules/engine-v2/engine-v2.runtime';

import { BaseCommand } from './base-command';

@Command({
	name: 'engine',
	description:
		'Starts the engine v2 data plane. Needs a control plane (`n8n start` with N8N_ENGINE_MODE=remote) to report to and to resolve credentials from.',
})
export class Engine extends BaseCommand {
	// The data plane has no control plane database. Its own database is the
	// engine's, opened by the runtime from N8N_ENGINE_DATABASE_URL.
	override needsDb = false;

	// No task runner yet, so the Code node fails with a clear error instead of
	// waiting for a runner that never connects.
	override needsTaskRunner = false;

	override needsExpressionEngine = true;

	private runtime?: EngineV2Runtime;

	private responseSender?: ExecutionResponseSender;

	async init() {
		// The guards below run before `super.init()` wires the reporter, and the
		// crash path reports through it.
		this.errorReporter = Container.get(ErrorReporter);
		assertControlPlaneIsolated(process.env);
		assertRemoteControlPlane(Container.get(EngineConfig));

		this.logger.info('Starting engine v2 data plane...');
		this.logger.debug(`Host ID: ${this.instanceSettings.hostId}`);

		await super.init();

		await this.initBinaryDataStore();

		// The control plane runs in another process, so responses travel over Redis.
		const { createRedisExecutionResponseSender } = await import(
			'@/modules/engine-v2/response-channel/redis-execution-response-channel.js'
		);
		this.responseSender = await createRedisExecutionResponseSender(this.logger.scoped('engine-v2'));

		const { EngineV2Runtime } = await import('@/modules/engine-v2/engine-v2.runtime.js');
		this.runtime = Container.get(EngineV2Runtime);
		await this.runtime.init(this.responseSender);

		await Container.get(LoadNodesAndCredentials).postProcessLoaders();
	}

	/**
	 * Both planes share one binary data store, so this host registers the same
	 * blob managers as the control plane. `database` mode stores the bytes in the
	 * control plane database, which this process does not have, so it is refused
	 * here: otherwise the error shows only when a run handles its first file.
	 * No license check yet: the certificate lives in the control plane database too.
	 */
	private async initBinaryDataStore() {
		const { mode } = Container.get(BinaryDataConfig);

		if (mode === 'database') {
			throw new UserError(
				'The engine process has no control plane database, so it cannot store binary data in `database` mode. Set N8N_DEFAULT_BINARY_DATA_MODE to filesystem, s3 or azure.',
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

		try {
			try {
				await this.runtime?.shutdown();
			} finally {
				// After the engine, so a final response still has somewhere to go.
				await this.responseSender?.stop();
			}
			await Expression.disposeExpressionEngine();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down the engine.', error);
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
