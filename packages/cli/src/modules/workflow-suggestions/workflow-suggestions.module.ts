import { BackendModule } from '@n8n/decorators';
import type { ModuleInterface } from '@n8n/decorators';

@BackendModule({ name: 'workflow-suggestions', instanceTypes: ['main'] })
export class WorkflowSuggestionsModule implements ModuleInterface {
	async init() {
		await import('./workflow-suggestions.controller.js');
	}

	async entities() {
		const { WorkflowSuggestion } = await import('./database/workflow-suggestion.entity.js');
		const { WorkflowSuggestionActivityEntity } = await import(
			'./database/workflow-suggestion-activity.entity.js'
		);
		return [WorkflowSuggestion, WorkflowSuggestionActivityEntity];
	}

	async systemTasks() {
		const { WorkflowSuggestionCleanupTask } = await import('./workflow-suggestion-cleanup.task.js');
		return [WorkflowSuggestionCleanupTask];
	}
}
