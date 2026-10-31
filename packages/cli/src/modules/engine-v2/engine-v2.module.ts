import { Logger } from '@n8n/backend-common';
import { EngineConfig, ExecutionsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { randomBytes } from 'node:crypto';

/**
 * Runs the control plane side of engine v2, and in `in-process` mode the data
 * plane too.
 *
 * Not a default module: enable it with `N8N_ENABLED_MODULES=engine-v2`. When it
 * is off, nothing here loads and no data plane connection is opened.
 *
 * Main-only, and regular mode only. The in-process engine uses
 * `InMemoryWorkQueue`, so its work does not survive the process and cannot be
 * shared with other mains or workers. In `remote` mode (`N8N_ENGINE_MODE`) a
 * separate `n8n engine` process hosts the data plane; this module then starts
 * only the control plane server, the client that dials the engine, and the Redis
 * subscriber of the execution channel.
 */
@BackendModule({ name: 'engine-v2', instanceTypes: ['main'] })
export class EngineV2Module implements ModuleInterface {
	private channelPublisher?: { stop(): Promise<void> };

	private channelSubscriber?: { stop(): Promise<void> };

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

		const logger = Container.get(Logger).scoped('engine-v2');
		const { EngineV2WebhookResponseRegistry } = await import(
			'./webhook-response/webhook-response-registry.service.js'
		);
		if (engineConfig.mode === 'in-process') {
			// Hand both endpoints over before the engine starts. A short run can answer
			// before `startExecution` returns, and responses are not replayed.
			const { publisher, subscriber, responseSender, responseReceiver } =
				await this.initInMemoryResponseChannel(logger);
			this.channelPublisher = publisher;
			this.channelSubscriber = subscriber;
			Container.get(EngineV2WebhookResponseRegistry).useReceiver(responseReceiver);

			const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
			await Container.get(EngineV2Runtime).init(responseSender);
		} else {
			// The remote data plane publishes over Redis, so only the subscribing end
			// runs here.
			const { startRedisExecutionChannelSubscriber } = await import(
				'./execution-channel/redis-execution-channel.js'
			);
			const { ExecutionChannelReceiver } = await import(
				'./execution-channel/execution-channel-receiver.js'
			);
			const { createExecutionResponseCodec } = await import(
				'./execution-channel/execution-response-frame.js'
			);
			const subscriber = await startRedisExecutionChannelSubscriber(logger);
			this.channelSubscriber = subscriber;
			Container.get(EngineV2WebhookResponseRegistry).useReceiver(
				new ExecutionChannelReceiver(subscriber, createExecutionResponseCodec(logger), logger),
			);
		}

		const { EngineDataPlaneClient } = await import('./engine-data-plane-client.js');
		const { EngineDataPlaneProxyService } = await import(
			'@/services/engine-data-plane-proxy.service.js'
		);
		Container.get(EngineDataPlaneProxyService).registerProvider(
			Container.get(EngineDataPlaneClient),
		);
	}

	private async initInMemoryResponseChannel(logger: Logger) {
		const { createInMemoryExecutionChannel } = await import(
			'./execution-channel/in-memory-execution-channel.js'
		);
		const { ExecutionChannelSender } = await import(
			'./execution-channel/execution-channel-sender.js'
		);
		const { ExecutionChannelReceiver } = await import(
			'./execution-channel/execution-channel-receiver.js'
		);
		const { createExecutionResponseCodec } = await import(
			'./execution-channel/execution-response-frame.js'
		);
		const { publisher, subscriber } = createInMemoryExecutionChannel();
		const responseCodec = createExecutionResponseCodec(logger);

		return {
			publisher,
			subscriber,
			responseSender: new ExecutionChannelSender(publisher, responseCodec),
			responseReceiver: new ExecutionChannelReceiver(subscriber, responseCodec, logger),
		};
	}

	@OnShutdown()
	async shutdown() {
		try {
			if (Container.get(EngineConfig).mode === 'in-process') {
				const { EngineV2Runtime } = await import('./engine-v2.runtime.js');
				await Container.get(EngineV2Runtime).shutdown();
			}
		} finally {
			// After the engine, so a final response still has somewhere to go.
			// A failed runtime shutdown must still release both endpoints.
			await Promise.all([this.channelPublisher?.stop(), this.channelSubscriber?.stop()]);
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

	if (config.resumeSecret) {
		throw new UserError(
			'N8N_ENGINE_MODE=remote must not set N8N_ENGINE_RESUME_SECRET on this main. The data plane runs elsewhere; set the secret in its environment only.',
		);
	}
}
