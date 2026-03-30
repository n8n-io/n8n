import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'instance-ai', instanceTypes: ['main'] })
export class InstanceAiModule implements ModuleInterface {
	async init() {
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service');
		await Container.get(InstanceAiSettingsService).loadFromDb();
		await import('./instance-ai.controller');

		// Fire-and-forget: clean up expired conversation threads on startup
		const { InstanceAiMemoryService } = await import('./instance-ai-memory.service');
		const { InstanceAiService } = await import('./instance-ai.service');
		const aiService = Container.get(InstanceAiService);
		void Container.get(InstanceAiMemoryService)
			.cleanupExpiredThreads(async (threadId) => await aiService.clearThreadState(threadId))
			.catch(() => undefined);

		// Register snapshot pruning — lifecycle decorators handle start/stop
		await import('./snapshot-pruning.service');
	}

	async settings() {
		const { InstanceAiService } = await import('./instance-ai.service');
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service');
		const service = Container.get(InstanceAiService);
		const settingsService = Container.get(InstanceAiSettingsService);
		const enabled = service.isEnabled();
		const localGateway = service.isLocalFilesystemAvailable();
		const localGatewayDisabled = settingsService.isLocalGatewayDisabled();
		const localGatewayFallbackDirectory = service.getLocalFilesystemDirectory();
		return {
			enabled,
			localGateway,
			localGatewayDisabled,
			localGatewayFallbackDirectory,
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
