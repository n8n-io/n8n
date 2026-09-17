import { EngineConfig, ExecutionsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ExecutionResponseChannel } from '@n8n/engine';
import { UserError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

/**
 * Runs the engine 2.0 data plane in-process.
 *
 * Not a default module: enable it with `N8N_ENABLED_MODULES=engine-v2`. When it
 * is off, nothing here loads and no data plane connection is opened.
 *
 * Main-only, and regular mode only. The in-process engine uses
 * `InMemoryWorkQueue`, so its work does not survive the process and cannot be
 * shared with other mains or workers.
 */
@BackendModule({ name: 'engine-v2', instanceTypes: ['main'] })
export class EngineV2Module implements ModuleInterface {
	private responseChannel?: ExecutionResponseChannel;

	async init() {
		if (Container.get(ExecutionsConfig).mode === 'queue') {
			throw new UserError('The engine-v2 module does not support queue mode.');
		}

		const engineConfig = Container.get(EngineConfig);
		// Both planes live in this process, so a generated secret is enough and the
		// integrated engine is never unauthenticated. A separate CP must set it.
		if (!engineConfig.authSecret) {
			engineConfig.authSecret = randomBytes(32).toString('hex');
		}

		// Before the engine, so nothing is reported with no server to receive it.
		const { EngineControlPlaneServer } = await import('./engine-control-plane-server.js');
		await Container.get(EngineControlPlaneServer).start();

		// One channel, both planes. Handed over before the engine starts: a short
		// run answers before `startExecution` returns, and nobody replays.
		const { ResponseChannelFactory } = await import('./create-response-channel.js');
		const { EngineV2WebhookResponder } = await import(
			'@/services/engine-v2-webhook-responder.service.js'
		);
		const responseChannel = Container.get(ResponseChannelFactory).create();
		Container.get(EngineV2WebhookResponder).useChannel(responseChannel);
		this.responseChannel = responseChannel;

		const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
		await Container.get(EngineV2Runtime).init(responseChannel);

		const { EngineDataPlaneClient } = await import('./engine-data-plane-client.js');
		const { EngineDataPlaneProxyService } = await import(
			'@/services/engine-data-plane-proxy.service.js'
		);
		Container.get(EngineDataPlaneProxyService).registerProvider(
			Container.get(EngineDataPlaneClient),
		);
	}

	@OnShutdown()
	async shutdown() {
		const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
		try {
			await Container.get(EngineV2Runtime).shutdown();
		} finally {
			// After the engine, so a final response still has somewhere to go.
			// In a `finally`, so a failed runtime shutdown still releases the channel.
			await this.responseChannel?.stop();
		}

		// After the engine, so its final flush still has somewhere to land.
		const { EngineControlPlaneServer } = await import('./engine-control-plane-server.js');
		await Container.get(EngineControlPlaneServer).stop();
	}
}
