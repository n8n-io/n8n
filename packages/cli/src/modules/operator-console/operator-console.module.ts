import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

/**
 * Opt-in: `N8N_ENABLED_MODULES=operator-console`. Deliberately absent from
 * `defaultModules`, so an instance that has not asked for it pays nothing —
 * no winston transport, no patched `process.stdout`, no Redis traffic.
 *
 * Loads on every instance type: main, worker and webhook all *produce* logs,
 * while only a main consumes them.
 */
@BackendModule({
	name: 'operator-console',
	instanceTypes: ['main', 'worker', 'webhook'],
})
export class OperatorConsoleModule implements ModuleInterface {
	async init() {
		const { LogCaptureService } = await import('./capture/log-capture.service.js');
		const { LogRingBuffer } = await import('./capture/ring-buffer.js');
		const { LogProducerService } = await import('./producer/log-producer.service.js');
		const { OperatorConsoleConfig } = await import('./operator-console.config.js');

		Container.get(LogCaptureService).start();

		// Publishes to the cross-host stream only while a console holds a lease,
		// and is a no-op outside queue mode — safe to attach unconditionally.
		Container.get(LogProducerService).attach(Container.get(LogRingBuffer));

		const config = Container.get(OperatorConsoleConfig);

		// Every instance type answers `search-logs` against its own `n8n.log`, so
		// history must be wired everywhere — not just on mains. `LogFileSource` is
		// fail-closed and throws until it has a redactor, so wiring it late (or
		// only on mains) turns a worker's answer into an exception.
		await this.wireHistory(config);
		await import('./producer/search-responder.service.js');

		if (Container.get(InstanceSettings).instanceType !== 'main') return;

		await this.wireAiTool(config);

		await import('./operator-console.controller.js');
	}

	/**
	 * History is read from the rotated `n8n.log` set, so the console needs the
	 * winston file transport attached. Enabling it here means the operator sets
	 * one variable rather than remembering to also set `N8N_LOG_OUTPUT=file`.
	 */
	private async wireHistory(config: { history: boolean; redact: boolean }) {
		if (!config.history) return;

		const { Logger } = await import('@n8n/backend-common');
		const { LogFileSource } = await import('./sources/log-file.source.js');
		const { redactRecord } = await import('./capture/redactor.js');

		Container.get(Logger).ensureFileTransport();

		// `n8n.log` is unredacted at rest — the winston transport is not in our
		// path — so reads must redact. `LogFileSource` throws until this is set.
		Container.get(LogFileSource).setRedactor(config.redact ? redactRecord : (record) => record);
	}

	/** Presence of the port on the context is what gates the AI `logs` tool. */
	private async wireAiTool(config: { aiTool: boolean }) {
		if (!config.aiTool) return;

		const { InstanceAiLogQueryAdapter } = await import('./ai/log-query.adapter.js');
		const { setInstanceAiLogQueryPort } = await import(
			'../instance-ai/instance-ai-log-query.registry.js'
		);

		setInstanceAiLogQueryPort(Container.get(InstanceAiLogQueryAdapter));
	}

	@OnShutdown()
	async shutdown() {
		const { LogCaptureService } = await import('./capture/log-capture.service.js');
		const { LogProducerService } = await import('./producer/log-producer.service.js');
		const { LogConsumerService } = await import('./consumer/log-consumer.service.js');
		const { LeaseManagerService } = await import('./consumer/lease-manager.service.js');

		Container.get(LogCaptureService).stop();
		Container.get(LogProducerService).shutdown();
		Container.get(LogConsumerService).shutdown();
		Container.get(LeaseManagerService).shutdown();
	}
}
