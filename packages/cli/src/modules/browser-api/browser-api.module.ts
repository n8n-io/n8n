import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Module that enables browser API functionality from workflow nodes.
 * Allows nodes to trigger browser-side features like notifications, sounds, etc.
 * The service is loaded during init to register the lifecycle event handler.
 */
@BackendModule({ name: 'browser-api', instanceTypes: ['main', 'webhook'] })
export class BrowserApiModule implements ModuleInterface {
	async init() {
		// Import the service to register the lifecycle event handler
		// The @OnLifecycleEvent decorator registers the handler at decoration time
		await import('./browser-api.service');
	}
}
