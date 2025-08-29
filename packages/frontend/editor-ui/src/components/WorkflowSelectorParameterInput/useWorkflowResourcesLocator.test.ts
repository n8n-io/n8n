import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkflowResourcesLocator } from './useWorkflowResourcesLocator';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import type { Router } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';

const useCanvasOperations = vi.hoisted(() => vi.fn());

vi.mock('@/composables/useCanvasOperations', () => ({
	useCanvasOperations,
}));

describe('useWorkflowResourcesLocator', () => {
	let workflowsStoreMock: MockedStore<typeof useWorkflowsStore>;
	let ndvStoreMock: MockedStore<typeof useNDVStore>;

	const renameNodeMock = vi.fn();
	const routerMock = { resolve: vi.fn() } as unknown as Router;

	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia();
		workflowsStoreMock = mockedStore(useWorkflowsStore);
		ndvStoreMock = mockedStore(useNDVStore);

		useCanvasOperations.mockReturnValue({ renameNode: renameNodeMock });
	});

	describe('renameDefaultNodeName', () => {
		it.each([
			{
				activeNodeName: 'Execute Workflow',
				workflowId: 'workflow-id',
				mockedWorkflow: { name: 'Test Workflow' },
				expectedRename: "Call 'Test Workflow'",
				expectedCalledWith: 'Execute Workflow',
			},
			{
				activeNodeName: 'Call n8n Workflow Tool',
				workflowId: 'workflow-id',
				mockedWorkflow: { name: 'Test Workflow' },
				expectedRename: "Call 'Test Workflow'",
				expectedCalledWith: 'Call n8n Workflow Tool',
			},
			{
				activeNodeName: "Call 'Old Workflow'",
				workflowId: 'workflow-id',
				mockedWorkflow: { name: 'New Workflow' },
				expectedRename: "Call 'New Workflow'",
				expectedCalledWith: "Call 'Old Workflow'",
			},
		])(
			'should rename the node correctly for activeNodeName: $activeNodeName',
			({ activeNodeName, workflowId, mockedWorkflow, expectedRename, expectedCalledWith }) => {
				const { renameDefaultNodeName } = useWorkflowResourcesLocator(routerMock);

				ndvStoreMock.activeNodeName = activeNodeName;
				workflowsStoreMock.getWorkflowById.mockReturnValue(
					mockedWorkflow as unknown as IWorkflowDb,
				);

				renameDefaultNodeName(workflowId);

				expect(workflowsStoreMock.getWorkflowById).toHaveBeenCalledWith(workflowId);
				expect(renameNodeMock).toHaveBeenCalledWith(expectedCalledWith, expectedRename);
			},
		);

		it('should not rename the node for invalid workflowId', () => {
			const { renameDefaultNodeName } = useWorkflowResourcesLocator(routerMock);
			const workflowId = 123;

			renameDefaultNodeName(workflowId);

			expect(renameNodeMock).not.toHaveBeenCalled();
		});

		it('should not rename the node for workflowId: workflow-id with null mockedWorkflow', () => {
			const { renameDefaultNodeName } = useWorkflowResourcesLocator(routerMock);
			const workflowId = 'workflow-id';
			const activeNodeName = 'Execute Workflow';

			ndvStoreMock.activeNodeName = activeNodeName;
			workflowsStoreMock.getWorkflowById.mockReturnValue(null as unknown as IWorkflowDb);

			renameDefaultNodeName(workflowId);

			expect(workflowsStoreMock.getWorkflowById).toHaveBeenCalledWith(workflowId);
			expect(renameNodeMock).not.toHaveBeenCalled();
		});

		it('should not rename the node for workflowId: workflow-id with activeNodeName: Some Other Node', () => {
			const { renameDefaultNodeName } = useWorkflowResourcesLocator(routerMock);
			const workflowId = 'workflow-id';
			const activeNodeName = 'Some Other Node';
			const mockedWorkflow = { name: 'Test Workflow' };

			ndvStoreMock.activeNodeName = activeNodeName;
			workflowsStoreMock.getWorkflowById.mockReturnValue(mockedWorkflow as unknown as IWorkflowDb);

			renameDefaultNodeName(workflowId);

			expect(workflowsStoreMock.getWorkflowById).not.toHaveBeenCalled();
			expect(renameNodeMock).not.toHaveBeenCalled();
		});
	});
});
