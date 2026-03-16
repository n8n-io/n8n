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
		void Container.get(InstanceAiMemoryService)
			.cleanupExpiredThreads()
			.catch(() => undefined);
	}

	async settings() {
		const { InstanceAiService } = await import('./instance-ai.service');
		const { InstanceAiSettingsService } = await import('./instance-ai-settings.service');
		const service = Container.get(InstanceAiService);
		const settingsService = Container.get(InstanceAiSettingsService);
		const enabled = service.isEnabled();
		const localGateway = service.isLocalFilesystemAvailable();
		const gatewayStatus = service.getGatewayStatus();
		const gatewayConnected = gatewayStatus.connected;
		const gatewayDirectory = gatewayStatus.directory;
		const localGatewayDisabled = settingsService.isFilesystemDisabled();
		const localGatewayFallbackDirectory = service.getLocalFilesystemDirectory();
		return {
			enabled,
			localGateway,
			gatewayConnected,
			gatewayDirectory,
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

		return [
			InstanceAiThread,
			InstanceAiMessage,
			InstanceAiResource,
			InstanceAiObservationalMemory,
			InstanceAiWorkflowSnapshot,
		];
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service');
		await Container.get(InstanceAiService).shutdown();
	}
}
