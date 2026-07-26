import { ref } from 'vue';
import type { SourceControlledFile } from '@n8n/api-types';
import { useWorkflowTreeRows } from './useWorkflowTreeRows';

const createWorkflow = (overrides: Partial<SourceControlledFile> = {}): SourceControlledFile => ({
	id: 'wf-1',
	name: 'Workflow 1',
	type: 'workflow',
	status: 'created',
	location: 'local',
	conflict: false,
	file: '/wf-1.json',
	updatedAt: '2025-01-01T00:00:00.000Z',
	...overrides,
});

describe('useWorkflowTreeRows', () => {
	it('hides descendants when a folder is collapsed and reveals them when expanded', () => {
		const workflows = ref<SourceControlledFile[]>([
			createWorkflow({ id: 'wf-a', folderPath: ['Prod', 'Billing'] }),
			createWorkflow({ id: 'wf-b', folderPath: ['Prod', 'Support'] }),
		]);

		const tree = useWorkflowTreeRows(workflows);

		expect(tree.visibleWorkflowRows.value.some((row) => row.type === 'file')).toBe(true);

		tree.toggleFolderCollapse('folder:Prod');
		expect(tree.isFolderCollapsed('folder:Prod')).toBe(true);
		expect(tree.visibleWorkflowRows.value.map((row) => row.id)).toEqual(['folder:Prod']);

		tree.toggleFolderCollapse('folder:Prod');
		expect(tree.isFolderCollapsed('folder:Prod')).toBe(false);
		expect(tree.visibleWorkflowRows.value.some((row) => row.type === 'file')).toBe(true);
	});

	it('returns ancestor folders for workflow and supports expandFolders', () => {
		const workflows = ref<SourceControlledFile[]>([
			createWorkflow({ id: 'wf-target', folderPath: ['Prod', 'Billing'] }),
		]);

		const tree = useWorkflowTreeRows(workflows);
		const ancestors = tree.getAncestorFolderIdsForWorkflow('wf-target');

		expect(ancestors).toEqual(['folder:Prod', 'folder:Prod/Billing']);

		tree.toggleFolderCollapse('folder:Prod');
		tree.toggleFolderCollapse('folder:Prod/Billing');
		tree.expandFolders(ancestors);

		expect(tree.isFolderCollapsed('folder:Prod')).toBe(false);
		expect(tree.isFolderCollapsed('folder:Prod/Billing')).toBe(false);
	});
});
