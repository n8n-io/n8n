import type { FolderResource, WorkflowResource } from '@/Interface';
import { getBulkSelectionCount } from './bulkActions.utils';

describe('bulk action selection count', () => {
	it('should count workflows contained in selected folders', () => {
		const workflow = { resourceType: 'workflow' } as WorkflowResource;
		const folder = { resourceType: 'folder', workflowCount: 5 } as FolderResource;

		expect(getBulkSelectionCount([workflow, folder])).toBe(6);
	});
});
