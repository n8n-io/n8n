import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'workflow-tests', instanceTypes: ['main'] })
export class WorkflowTestsModule implements ModuleInterface {
	async init() {
		await import('./workflow-tests.controller.js');
	}

	async entities() {
		const { WorkflowTestEntity } = await import('./database/workflow-test.entity.js');
		return [WorkflowTestEntity];
	}
}
