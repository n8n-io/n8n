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

		if (process.env.E2E_TESTS === 'true' && process.env.NODE_ENV !== 'production') {
			await import('./instance-ai-test.controller');
		}

		// Fire-and-forget: clean up expired conversation threads on startup
		const { InstanceAiMemoryService } = await import('./instance-ai-memory.service');
		const { InstanceAiService } = await import('./instance-ai.service');
		const aiService = Container.get(InstanceAiService);
		void Container.get(InstanceAiMemoryService)
			.cleanupExpiredThreads(async (threadId) => await aiService.clearThreadState(threadId))
			.catch(() => undefined);

		// Initialize snapshot pruning — lifecycle decorators handle multi-main start/stop
		const { SnapshotPruningService } = await import('./snapshot-pruning.service');
		Container.get(SnapshotPruningService).init();
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
		const optinModalDismissed = settingsService.getAdminSettings().optinModalDismissed;
		return {
			enabled,
			localGatewayDisabled,
			proxyEnabled: service.isProxyEnabled(),
			optinModalDismissed,
			cloudManaged: globalConfig.deployment.type === 'cloud',
		};
	}

	async entities() {
		const { InstanceAiThread } = await import('./entities/instance-ai-thread.entity');
		const { InstanceAiMessage } = await import('./entities/instance-ai-message.entity');
		const { InstanceAiResource } = await import('./entities/instance-ai-resource.entity');
		const { InstanceAiObservationalMemory } = await import(
			'./entities/instance-ai-observational-memory.entity'
		);
		const { InstanceAiWorkflowSnapshot } = await import(
			'./entities/instance-ai-workflow-snapshot.entity'
		);
		const { InstanceAiRunSnapshot } = await import('./entities/instance-ai-run-snapshot.entity');
		const { InstanceAiIterationLog } = await import('./entities/instance-ai-iteration-log.entity');

		return [
			InstanceAiThread,
			InstanceAiMessage,
			InstanceAiResource,
			InstanceAiObservationalMemory,
			InstanceAiWorkflowSnapshot,
			InstanceAiRunSnapshot,
			InstanceAiIterationLog,
		];
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service');
		await Container.get(InstanceAiService).shutdown();
	}
}
