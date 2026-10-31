import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';

/**
 * Version-scoped workflow settings, such as the engine, are saved with each
 * version and go live when the version is published. Only the `engine-v2`
 * module turns this on. Without it, every setting applies at once, as before.
 */
@Service()
export class WorkflowVersionedSettings {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	// Read at call time: modules become active after services are constructed.
	isEnabled(): boolean {
		return this.moduleRegistry.isActive('engine-v2');
	}
}
