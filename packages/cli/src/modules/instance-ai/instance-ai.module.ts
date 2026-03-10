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
		void Container.get(InstanceAiMemoryService).cleanupExpiredThreads();
	}

	async settings() {
		const { InstanceAiService } = await import('./instance-ai.service');
		const service = Container.get(InstanceAiService);
		const enabled = service.isEnabled();
		const filesystem = service.isLocalFilesystemAvailable();
		const gatewayStatus = service.getGatewayStatus();
		const gatewayConnected = gatewayStatus.connected;
		const gatewayDirectory = gatewayStatus.directory;
		const filesystemDisabled = service.isFilesystemDisabled();
		const filesystemDirectory = service.getLocalFilesystemDirectory();
		return {
			enabled,
			filesystem,
			gatewayConnected,
			gatewayDirectory,
			filesystemDisabled,
			filesystemDirectory,
		};
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service');
		await Container.get(InstanceAiService).shutdown();
	}
}
