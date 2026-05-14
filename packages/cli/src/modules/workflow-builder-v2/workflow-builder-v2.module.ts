import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'workflow-builder-v2', instanceTypes: ['main'] })
export class WorkflowBuilderV2Module implements ModuleInterface {
	async init() {
		await import('./workflow-builder-v2.controller');

		const { WorkflowBuilderV2Service } = await import('./workflow-builder-v2.service');
		Container.get(WorkflowBuilderV2Service);
	}
}
