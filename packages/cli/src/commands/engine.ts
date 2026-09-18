import { EngineConfig } from '@n8n/config';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { EngineV2Runtime } from '@/modules/engine-v2/engine-v2.runtime';

import { BaseCommand } from './base-command';

@Command({
	name: 'engine',
	description:
		'Starts the engine 2.0 data plane. Needs a control plane (`n8n start` with N8N_ENGINE_MODE=remote) to report to and to resolve credentials from.',
})
export class Engine extends BaseCommand {
	// The data plane has no control plane database. Its own database is the
	// engine's, opened by the runtime from N8N_ENGINE_DATABASE_URL.
	override needsDb = false;

	override needsTaskRunner = true;

	override needsExpressionEngine = true;

	private runtime?: EngineV2Runtime;

	async init() {
		assertNoControlPlaneDatabase(process.env);
		assertRemoteControlPlane(Container.get(EngineConfig));

		await this.initCrashJournal();
		this.logger.info('Starting engine 2.0 data plane...');
		this.logger.debug(`Host ID: ${this.instanceSettings.hostId}`);

		await super.init();

		const { EngineV2Runtime } = await import('@/modules/engine-v2/engine-v2.runtime.js');
		this.runtime = Container.get(EngineV2Runtime);
		await this.runtime.init();

		await Container.get(LoadNodesAndCredentials).postProcessLoaders();
	}

	async run() {
		this.logger.info('Engine 2.0 data plane waiting for executions.');

		// Make sure that the process does not close
		await new Promise(() => {});
	}

	async catch(error: Error) {
		await this.exitWithCrash('Exiting due to an error.', error);
	}

	protected async stopProcess() {
		this.logger.info('Stopping engine 2.0 data plane...');

		try {
			await this.runtime?.shutdown();
		} catch (error) {
			await this.exitWithCrash('There was an error shutting down the engine.', error);
		}

		await this.exitSuccessFully();
	}
}

/**
 * A `DB_*` variable means the process was given the control plane database.
 * Refuse it here, at boot, so the isolation is a check and not a convention.
 */
function assertNoControlPlaneDatabase(env: NodeJS.ProcessEnv): void {
	const dbEnv = Object.keys(env).filter((key) => key.startsWith('DB_'));

	if (dbEnv.length > 0) {
		throw new UserError(
			`The engine process must not have control plane database access. Remove ${dbEnv.join(', ')} from its environment.`,
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
