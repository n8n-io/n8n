import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { TelemetryEvent } from '@n8n/db';
import { TelemetrySession } from '@n8n/db';

@BackendModule({ name: 'telemetry-management' })
export class TelemetryManagementModule implements ModuleInterface {
	async init() {
		// Import controller to register routes
		await import('./telemetry-management.controller');
	}

	async entities() {
		return [TelemetryEvent, TelemetrySession];
	}

	async settings() {
		return {
			telemetryManagement: {
				enabled: true,
			},
		};
	}
}
