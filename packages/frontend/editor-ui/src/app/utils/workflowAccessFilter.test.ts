import type { WorkflowListResource } from '@/Interface';
import { filterWorkflowResourcesByAccess, WorkflowAccessFilter } from '@/app/utils/workflowAccessFilter';

function createWorkflowResource(
	id: string,
	scopes: string[],
): WorkflowListResource {
	return {
		resource: 'workflow',
		id,
		name: `Workflow ${id}`,
		active: false,
		activeVersionId: null,
		isArchived: false,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		nodes: [],
		connections: {},
		versionId: 'v1',
		scopes,
	} as unknown as WorkflowListResource;
}

describe('workflow access filter', () => {
	it('returns all resources for ALL filter', () => {
		const resources: WorkflowListResource[] = [
			createWorkflowResource('1', ['workflow:read']),
			{
				resource: 'folder',
				id: 'f1',
				name: 'Finance',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				subFolderCount: 0,
				workflowCount: 1,
			} as unknown as WorkflowListResource,
		];

		expect(filterWorkflowResourcesByAccess(resources, WorkflowAccessFilter.ALL)).toEqual(resources);
	});

	it('filters to executable workflows for CAN_START filter', () => {
		const resources: WorkflowListResource[] = [
			createWorkflowResource('1', ['workflow:read', 'workflow:execute']),
			createWorkflowResource('2', ['workflow:read']),
			{
				resource: 'folder',
				id: 'f1',
				name: 'Finance',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				subFolderCount: 0,
				workflowCount: 2,
			} as unknown as WorkflowListResource,
		];

		expect(filterWorkflowResourcesByAccess(resources, WorkflowAccessFilter.CAN_START)).toEqual([
			resources[0],
		]);
	});

	it('handles workflow resources without scopes safely', () => {
		const resources: WorkflowListResource[] = [
			{
				resource: 'workflow',
				id: '1',
				name: 'Workflow 1',
				active: false,
				activeVersionId: null,
				isArchived: false,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				nodes: [],
				connections: {},
				versionId: 'v1',
			} as unknown as WorkflowListResource,
		];

		expect(filterWorkflowResourcesByAccess(resources, WorkflowAccessFilter.CAN_START)).toEqual([]);
	});

	it('filters to editable workflows for CAN_EDIT filter', () => {
		const resources: WorkflowListResource[] = [
			createWorkflowResource('1', ['workflow:read', 'workflow:update']),
			createWorkflowResource('2', ['workflow:read', 'workflow:execute']),
		];

		expect(filterWorkflowResourcesByAccess(resources, WorkflowAccessFilter.CAN_EDIT)).toEqual([
			resources[0],
		]);
	});
});
