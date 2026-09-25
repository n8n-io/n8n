import { Logger } from '@n8n/backend-common';
import { EngineConfig, ExecutionsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ExecutionResponseSender } from '@n8n/engine';
import { UserError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

/**
 * Runs the control plane side of engine 2.0, and in `in-process` mode the data
 * plane too.
 *
 * Not a default module: enable it with `N8N_ENABLED_MODULES=engine-v2`. When it
 * is off, nothing here loads and no data plane connection is opened.
 *
 * Main-only, and regular mode only. The in-process engine uses
 * `InMemoryWorkQueue`, so its work does not survive the process and cannot be
 * shared with other mains or workers. In `remote` mode (`N8N_ENGINE_MODE`) a
 * separate `n8n engine` process hosts the data plane; this module then starts
 * only the control plane server and the client that dials the engine.
 */
@BackendModule({ name: 'engine-v2', instanceTypes: ['main'] })
export class EngineV2Module implements ModuleInterface {
	private responseSender?: ExecutionResponseSender;

	private responseReceiver?: { stop(): Promise<void> };

	async init() {
		if (Container.get(ExecutionsConfig).mode === 'queue') {
			throw new UserError('The engine-v2 module does not support queue mode.');
		}

		const engineConfig = Container.get(EngineConfig);

		if (engineConfig.mode === 'remote') {
			assertRemoteConfig(engineConfig);
		} else if (!engineConfig.authSecret) {
			// Both planes live in this process, so a generated secret is enough and the
			// integrated engine is never unauthenticated. A separate DP must be given one.
			engineConfig.authSecret = randomBytes(32).toString('hex');
		}

		// Before the engine, so nothing is reported with no server to receive it.
		const { EngineControlPlaneServer } = await import('./engine-control-plane-server.js');
		await Container.get(EngineControlPlaneServer).start();

		if (engineConfig.mode === 'in-process') {
			// Hand both endpoints over before the engine starts. A short run can answer
			// before `startExecution` returns, and responses are not replayed.
			const { InMemoryExecutionResponseChannel } = await import(
				'./response-channel/in-memory-execution-response-channel.js'
			);
			const { InMemoryExecutionResponseSender } = await import(
				'./response-channel/in-memory-execution-response-sender.js'
			);
			const { InMemoryExecutionResponseReceiver } = await import(
				'./response-channel/in-memory-execution-response-receiver.js'
			);
			const { EngineV2WebhookResponder } = await import(
				'@/services/engine-v2-webhook-responder.service.js'
			);
			// In-memory for now because both planes share this process. Redis endpoints
			// can use the same response contracts when the planes run separately.
			const responseChannel = new InMemoryExecutionResponseChannel();
			const scopedLogger = Container.get(Logger).scoped('engine-v2');
			const responseSender = new InMemoryExecutionResponseSender(responseChannel, scopedLogger);
			const responseReceiver = new InMemoryExecutionResponseReceiver(responseChannel, scopedLogger);
			Container.get(EngineV2WebhookResponder).useReceiver(responseReceiver);
			this.responseSender = responseSender;
			this.responseReceiver = responseReceiver;

			const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
			await Container.get(EngineV2Runtime).init(responseSender);
		}

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
		if (Container.get(EngineConfig).mode === 'in-process') {
			const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
			try {
				await Container.get(EngineV2Runtime).shutdown();
			} finally {
				await Promise.all([this.responseSender?.stop(), this.responseReceiver?.stop()]);
			}
		}

		// After the engine, so its final flush still has somewhere to land.
		const { EngineControlPlaneServer } = await import('./engine-control-plane-server.js');
		await Container.get(EngineControlPlaneServer).stop();
	}
}

/** A remote data plane needs an address to dial and a secret it was also given. */
function assertRemoteConfig(config: EngineConfig): void {
	if (!config.authSecret) {
		throw new UserError(
			'N8N_ENGINE_MODE=remote needs N8N_ENGINE_AUTH_SECRET. The data plane runs elsewhere, so this main cannot generate the shared secret.',
		);
	}

	if (!config.baseUrl) {
		throw new UserError(
			'N8N_ENGINE_MODE=remote needs N8N_ENGINE_BASE_URL. The default points at this process, which does not run the data plane.',
		);
	}
}
