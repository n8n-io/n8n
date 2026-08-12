import type { BulkSelectableResource } from './bulkActions.types';

export const getBulkSelectionWeight = (resource: BulkSelectableResource) =>
	resource.resourceType === 'folder' ? Math.max(resource.workflowCount, 1) : 1;

export const getBulkSelectionCount = (resources: BulkSelectableResource[]) =>
	resources.reduce((count, resource) => count + getBulkSelectionWeight(resource), 0);
