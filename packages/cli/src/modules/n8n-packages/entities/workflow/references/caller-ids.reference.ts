import type { EntityReference } from '../../reference';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

/**
 * Replaces `callerId` references on workflow import based on the passed bindings
 *
 * CallerId's are not defined in requirements so nothing to extract
 */
export const callerIdsReference: EntityReference<WorkflowSubWorkflowRequirement> = {
	extract() {
		return [];
	},
	apply(workflow, bindings) {
		const { settings } = workflow;
		// settings is opaque at the schema level, so a non-string callerIds would crash `.split`.
		if (!settings?.callerIds || typeof settings.callerIds !== 'string') return;

		settings.callerIds = settings.callerIds
			.split(',')
			.map((raw) => raw.trim())
			.filter((id) => id !== '')
			.map((id) => bindings.workflows.get(id) ?? id)
			.join(',');
	},
};
