import { ref } from 'vue';
import type { SourceControlledFile } from '@n8n/api-types';
import { useRevealWorkflowInScroller } from './useRevealWorkflowInScroller';

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

describe('useRevealWorkflowInScroller', () => {
	it('reveals current workflow and scrolls only once', async () => {
		const workflowId = 'wf-target';
		const element = document.createElement('div');
		element.dataset.workflowId = workflowId;
		element.scrollIntoView = vi.fn();

		const scrollerRoot = document.createElement('div');
		scrollerRoot.appendChild(element);
		const scrollToItem = vi.fn();

		const composable = useRevealWorkflowInScroller({
			visibleWorkflowRows: ref([
				{
					id: `file:${workflowId}`,
					type: 'file',
					depth: 0,
					file: createWorkflow({ id: workflowId }),
				},
			]),
			workflowScroller: ref({ scrollToItem, $el: scrollerRoot }),
			activeTab: ref('workflow'),
			workflowTabValue: 'workflow',
			currentWorkflowId: ref(workflowId),
			isLoading: ref(false),
			expandAncestorFolders: vi.fn(),
		});

		await composable.revealAndScrollToCurrentWorkflow();
		await composable.revealAndScrollToCurrentWorkflow();

		expect(scrollToItem).toHaveBeenCalledTimes(1);
		expect(element.scrollIntoView).toHaveBeenCalledTimes(1);
	});

	it('does not reveal when tab is not workflow tab', async () => {
		const scrollToItem = vi.fn();
		const expandAncestorFolders = vi.fn();
		const composable = useRevealWorkflowInScroller({
			visibleWorkflowRows: ref([
				{
					id: 'file:wf-target',
					type: 'file',
					depth: 0,
					file: createWorkflow({ id: 'wf-target' }),
				},
			]),
			workflowScroller: ref({ scrollToItem, $el: document.createElement('div') }),
			activeTab: ref('credential'),
			workflowTabValue: 'workflow',
			currentWorkflowId: ref('wf-target'),
			isLoading: ref(false),
			expandAncestorFolders,
		});

		await composable.revealAndScrollToCurrentWorkflow();

		expect(scrollToItem).not.toHaveBeenCalled();
		expect(expandAncestorFolders).not.toHaveBeenCalled();
	});

	it('expands ancestor folders before scrolling', async () => {
		const workflowId = 'wf-target';
		const element = document.createElement('div');
		element.dataset.workflowId = workflowId;
		element.scrollIntoView = vi.fn();

		const scrollerRoot = document.createElement('div');
		scrollerRoot.appendChild(element);

		const expandAncestorFolders = vi.fn();
		const composable = useRevealWorkflowInScroller({
			visibleWorkflowRows: ref([
				{
					id: `file:${workflowId}`,
					type: 'file',
					depth: 2,
					file: createWorkflow({ id: workflowId }),
				},
			]),
			workflowScroller: ref({ scrollToItem: vi.fn(), $el: scrollerRoot }),
			activeTab: ref('workflow'),
			workflowTabValue: 'workflow',
			currentWorkflowId: ref(workflowId),
			isLoading: ref(false),
			expandAncestorFolders,
		});

		await composable.revealAndScrollToCurrentWorkflow();

		expect(expandAncestorFolders).toHaveBeenCalledWith(workflowId);
	});
});
