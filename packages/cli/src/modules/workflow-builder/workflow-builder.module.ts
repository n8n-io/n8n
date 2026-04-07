import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'workflow-builder', instanceTypes: ['main'] })
export class WorkflowBuilderModule implements ModuleInterface {
	async entities() {
		const { WorkflowBuilderSession } = await import('./workflow-builder-session.entity');
		return [WorkflowBuilderSession];
	}
}
