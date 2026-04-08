import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'workflow-bundle' })
export class WorkflowBundleModule implements ModuleInterface {
	async init() {
		await import('./workflow-bundle.controller');
	}
}
