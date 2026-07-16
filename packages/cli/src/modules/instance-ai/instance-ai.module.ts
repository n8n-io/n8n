import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

const YELLOW = '\x1b[33m';
const CLEAR = '\x1b[0m';
const WARNING_MESSAGE =
	"[Instance AI] 'instance-ai' module is experimental, undocumented and subject to change. " +
	'Before its official release any features may become inaccessible at any point, ' +
	'and using the module could compromise the stability of your system. Use at your own risk!';

@BackendModule({ name: 'instance-ai', instanceTypes: ['main'] })
export class InstanceAiModule implements ModuleInterface {
	async init() {
		const logger = Container.get(Logger).scoped('instance-ai');
		logger.warn(`${YELLOW}${WARNING_MESSAGE}${CLEAR}`);

		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service.js');
		await Container.get(InstanceAiSettingsService).loadFromDb();
		await import('./instance-ai.controller.js');
		await import('./mcp/instance-ai-mcp-connection.controller.js');

		// Instantiating the relay registers its `user-deleted` listener, which
		// cleans up Instance AI data owned by the deleted user.
		const { InstanceAiEventRelay } = await import('./instance-ai-event-relay.service.js');
		Container.get(InstanceAiEventRelay);

		// Durable-log flag (resilience phase): startup sweep resolves runs the
		// previous process left mid-flight by converting their in-flight tool
		// calls into tool-interrupted facts and appending run-finish{interrupted}.
		const { GlobalConfig } = await import('@n8n/config');
		if (Container.get(GlobalConfig).instanceAi.durableLog) {
			const { InterruptedRunSweeper } = await import('./event-bus/interrupted-run-sweeper.js');
			const { InstanceAiService } = await import('./instance-ai.service.js');
			const sweeper = Container.get(InterruptedRunSweeper);
			sweeper.setResumeHost(Container.get(InstanceAiService));
			void sweeper.sweep().catch((error: unknown) => {
				logger.error('Interrupted-run sweep failed on startup', { error });
			});
		}

		if (process.env.E2E_TESTS === 'true' && process.env.NODE_ENV !== 'production') {
			await import('./instance-ai-test.controller.js');
		}
	}

	async settings() {
		const { GlobalConfig } = await import('@n8n/config');
		const { InstanceAiService } = await import('./instance-ai.service.js');
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service.js');
		const globalConfig = Container.get(GlobalConfig);
		const service = Container.get(InstanceAiService);
		const settingsService = Container.get(InstanceAiSettingsService);
		const enabled = settingsService.isAgentEnabled();
		const localGatewayDisabled = settingsService.isLocalGatewayDisabled();
		const browserUseEnabled = settingsService.isBrowserUseEnabled();
		const sandboxStatus = settingsService.getSandboxStatus();
		return {
			enabled,
			localGatewayDisabled,
			browserUseEnabled,
			proxyEnabled: service.isProxyEnabled(),
			cloudManaged: globalConfig.deployment.type === 'cloud',
			sandboxEnabled: sandboxStatus.enabled,
			workflowBuilderAvailable: enabled && sandboxStatus.workflowBuilderAvailable,
			sandboxUnavailableReason: sandboxStatus.unavailableReason,
			runDebugEnabled: globalConfig.instanceAi.runDebugEnabled,
		};
	}

	async entities() {
		const { InstanceAiThread } = await import('./entities/instance-ai-thread.entity.js');
		const { InstanceAiMessage } = await import('./entities/instance-ai-message.entity.js');
		const { InstanceAiResource } = await import('./entities/instance-ai-resource.entity.js');
		const { InstanceAiRunSnapshot } = await import('./entities/instance-ai-run-snapshot.entity.js');
		const { InstanceAiIterationLog } = await import(
			'./entities/instance-ai-iteration-log.entity.js'
		);
		const { InstanceAiCheckpoint } = await import('./entities/instance-ai-checkpoint.entity.js');
		const { InstanceAiPendingConfirmation } = await import(
			'./entities/instance-ai-pending-confirmation.entity.js'
		);
		const { InstanceAiObservation } = await import('./entities/instance-ai-observation.entity.js');
		const { InstanceAiObservationCursor } = await import(
			'./entities/instance-ai-observation-cursor.entity.js'
		);
		const { InstanceAiObservationLock } = await import(
			'./entities/instance-ai-observation-lock.entity.js'
		);
		const { InstanceAiMcpRegistryConnection } = await import(
			'./entities/instance-ai-mcp-registry-connection.entity.js'
		);
		const { InstanceAiThreadGrant } = await import('./entities/instance-ai-thread-grant.entity.js');
		const { InstanceAiEventLogEntry } = await import(
			'./entities/instance-ai-event-log-entry.entity.js'
		);

		return [
			InstanceAiThread,
			InstanceAiMessage,
			InstanceAiResource,
			InstanceAiRunSnapshot,
			InstanceAiIterationLog,
			InstanceAiCheckpoint,
			InstanceAiPendingConfirmation,
			InstanceAiObservation,
			InstanceAiObservationCursor,
			InstanceAiObservationLock,
			InstanceAiMcpRegistryConnection,
			InstanceAiThreadGrant,
			InstanceAiEventLogEntry,
		];
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service.js');
		await Container.get(InstanceAiService).shutdown();
	}
}
