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

		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service');
		await Container.get(InstanceAiSettingsService).loadFromDb();
		await import('./instance-ai.controller');
		await import('./mcp/instance-ai-mcp-connection.controller');

		if (process.env.E2E_TESTS === 'true' && process.env.NODE_ENV !== 'production') {
			await import('./instance-ai-test.controller');
		}
	}

	async settings() {
		const { GlobalConfig } = await import('@n8n/config');
		const { InstanceAiService } = await import('./instance-ai.service');
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service');
		const globalConfig = Container.get(GlobalConfig);
		const service = Container.get(InstanceAiService);
		const settingsService = Container.get(InstanceAiSettingsService);
		const enabled = settingsService.isAgentEnabled();
		const localGatewayDisabled = settingsService.isLocalGatewayDisabled();
		const sandboxStatus = settingsService.getSandboxStatus();
		return {
			enabled,
			localGatewayDisabled,
			proxyEnabled: service.isProxyEnabled(),
			cloudManaged: globalConfig.deployment.type === 'cloud',
			sandboxEnabled: sandboxStatus.enabled,
			workflowBuilderAvailable: enabled && sandboxStatus.workflowBuilderAvailable,
			sandboxUnavailableReason: sandboxStatus.unavailableReason,
		};
	}

	async entities() {
		const { InstanceAiThread } = await import('./entities/instance-ai-thread.entity');
		const { InstanceAiMessage } = await import('./entities/instance-ai-message.entity');
		const { InstanceAiResource } = await import('./entities/instance-ai-resource.entity');
		const { InstanceAiRunSnapshot } = await import('./entities/instance-ai-run-snapshot.entity');
		const { InstanceAiIterationLog } = await import('./entities/instance-ai-iteration-log.entity');
		const { InstanceAiCheckpoint } = await import('./entities/instance-ai-checkpoint.entity');
		const { InstanceAiPendingConfirmation } = await import(
			'./entities/instance-ai-pending-confirmation.entity'
		);
		const { InstanceAiObservation } = await import('./entities/instance-ai-observation.entity');
		const { InstanceAiObservationCursor } = await import(
			'./entities/instance-ai-observation-cursor.entity'
		);
		const { InstanceAiObservationLock } = await import(
			'./entities/instance-ai-observation-lock.entity'
		);
		const { InstanceAiMcpRegistryConnection } = await import(
			'./entities/instance-ai-mcp-registry-connection.entity'
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
		];
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service');
		await Container.get(InstanceAiService).shutdown();
	}
}
