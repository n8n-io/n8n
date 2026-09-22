import { Logger } from '@n8n/backend-common';
import { EngineConfig, ExecutionsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ExecutionResponseSender } from '@n8n/engine';
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
	private responseSender?: ExecutionResponseSender;

	private responseReceiver?: { stop(): Promise<void> };

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

		// Create both endpoints before the engine starts. A short run can answer
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
		// In-memory for now because both planes share this process. Redis endpoints
		// can use the same response contracts when the planes run separately.
		const responseChannel = new InMemoryExecutionResponseChannel();
		const responseSender = new InMemoryExecutionResponseSender(responseChannel);
		const responseReceiver = new InMemoryExecutionResponseReceiver(
			responseChannel,
			Container.get(Logger).scoped('engine-v2'),
		);
		this.responseSender = responseSender;
		this.responseReceiver = responseReceiver;

		const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
		await Container.get(EngineV2Runtime).init(responseSender);

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
			// A failed runtime shutdown must still release both endpoints.
			await Promise.all([this.responseSender?.stop(), this.responseReceiver?.stop()]);
		}

		// After the engine, so its final flush still has somewhere to land.
		const { EngineControlPlaneServer } = await import('./engine-control-plane-server.js');
		await Container.get(EngineControlPlaneServer).stop();
	}
}
