import type { WorkflowListResource } from '@/Interface';
import { getResourcePermissions } from '@n8n/permissions';

export const WorkflowAccessFilter = {
	ALL: '',
	CAN_START: 'canStart',
	CAN_EDIT: 'canEdit',
} as const;

export type WorkflowAccessFilterType =
	(typeof WorkflowAccessFilter)[keyof typeof WorkflowAccessFilter];

export function filterWorkflowResourcesByAccess(
	resources: WorkflowListResource[],
	filter: WorkflowAccessFilterType,
): WorkflowListResource[] {
	if (filter === WorkflowAccessFilter.ALL) {
		return resources;
	}

	return resources.filter((resource) => {
		if (resource.resource === 'folder') {
			return false;
		}

		const permissions = getResourcePermissions(resource.scopes ?? []).workflow;

		if (filter === WorkflowAccessFilter.CAN_START) {
			return permissions.execute === true;
		}

		if (filter === WorkflowAccessFilter.CAN_EDIT) {
			return permissions.update === true;
		}

		return true;
	});
}
