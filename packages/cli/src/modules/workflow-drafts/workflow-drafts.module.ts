import { BackendModule } from '@n8n/decorators';
import type { ModuleInterface } from '@n8n/decorators';

@BackendModule({ name: 'workflow-drafts', instanceTypes: ['main'] })
export class WorkflowDraftsModule implements ModuleInterface {
	async init() {
		await import('./workflow-drafts.controller.js');
	}

	async entities() {
		const { WorkflowDraft } = await import('./database/workflow-draft.entity.js');
		const { WorkflowDraftActivityEntity } = await import(
			'./database/workflow-draft-activity.entity.js'
		);
		return [WorkflowDraft, WorkflowDraftActivityEntity];
	}

	async systemTasks() {
		const { WorkflowDraftCleanupTask } = await import('./workflow-draft-cleanup.task.js');
		return [WorkflowDraftCleanupTask];
	}
}
