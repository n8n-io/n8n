/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWorkflowResourcesLocator } from './useWorkflowResourcesLocator';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestWorkflow } from '@/__tests__/mocks';
import type { IWorkflowDb } from '@/Interface';
import type { Router } from 'vue-router';
import type { Scope } from '@n8n/permissions';
import { createTestingPinia } from '@pinia/testing';

const useCanvasOperations = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations,
}));

const documentScopes = vi.hoisted(() => ({ value: [] as string[] }));

// The document store exposes `scopes` as read-only, so the tests provide a stand-in.
vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowDocument.store')>();
	const { computed } = await import('vue');
	return {
		...actual,
		injectWorkflowDocumentStore: () =>
			computed(() => ({
				documentId: actual.createWorkflowDocumentId(''),
				scopes: documentScopes.value,
			})),
	};
});

describe('useWorkflowResourcesLocator', () => {
	let workflowsListStoreMock: MockedStore<typeof useWorkflowsListStore>;
	let workflowsStoreMock: MockedStore<typeof useWorkflowsStore>;
	let ndvStoreMock: MockedStore<typeof useNDVStore>;

	const renameNodeMock = vi.fn();
	const routerMock = {
		resolve: vi.fn().mockReturnValue({ href: '/workflow/test' }),
	} as unknown as Router;

	beforeEach(() => {
		vi.clearAllMocks();
		documentScopes.value = [];

		createTestingPinia();
		workflowsListStoreMock = mockedStore(useWorkflowsListStore);
		workflowsStoreMock = mockedStore(useWorkflowsStore);
		ndvStoreMock = mockedStore(useNDVStore, createWorkflowDocumentId(''));

		useCanvasOperations.mockReturnValue({ renameNode: renameNodeMock });
	});

	describe('applyDefaultExecuteWorkflowNodeName', () => {
		it.each([
			{
				activeNodeName: 'Execute Workflow',
				workflowId: 'workflow-id',
				mockedWorkflow: createTestWorkflow({ name: 'Test Workflow' }),
				expectedRename: "Call 'Test Workflow'",
				expectedCalledWith: 'Execute Workflow',
			},
			{
				activeNodeName: 'Execute Workflow1',
				workflowId: 'workflow-id',
				mockedWorkflow: createTestWorkflow({ name: 'Test Workflow' }),
				expectedRename: "Call 'Test Workflow'",
				expectedCalledWith: 'Execute Workflow1',
			},
			{
				activeNodeName: 'Execute Workflow2',
				workflowId: 'workflow-id',
				mockedWorkflow: createTestWorkflow({ name: 'Another Workflow' }),
				expectedRename: "Call 'Another Workflow'",
				expectedCalledWith: 'Execute Workflow2',
			},
			{
				activeNodeName: 'Call n8n Workflow Tool',
				workflowId: 'workflow-id',
				mockedWorkflow: createTestWorkflow({ name: 'Test Workflow' }),
				expectedRename: "Call 'Test Workflow'",
				expectedCalledWith: 'Call n8n Workflow Tool',
			},
			{
				activeNodeName: 'Call n8n Workflow Tool1',
				workflowId: 'workflow-id',
				mockedWorkflow: createTestWorkflow({ name: 'Test Workflow' }),
				expectedRename: "Call 'Test Workflow'",
				expectedCalledWith: 'Call n8n Workflow Tool1',
			},
			{
				activeNodeName: "Call 'Old Workflow'",
				workflowId: 'workflow-id',
				mockedWorkflow: createTestWorkflow({ name: 'New Workflow' }),
				expectedRename: "Call 'New Workflow'",
				expectedCalledWith: "Call 'Old Workflow'",
			},
		])(
			'should rename the node correctly for activeNodeName: $activeNodeName',
			({ activeNodeName, workflowId, mockedWorkflow, expectedRename, expectedCalledWith }) => {
				const { applyDefaultExecuteWorkflowNodeName } = useWorkflowResourcesLocator(routerMock);

				ndvStoreMock.activeNodeName = activeNodeName;
				workflowsListStoreMock.getWorkflowById.mockReturnValue(mockedWorkflow);

				applyDefaultExecuteWorkflowNodeName(workflowId);

				expect(workflowsListStoreMock.getWorkflowById).toHaveBeenCalledWith(workflowId);
				expect(renameNodeMock).toHaveBeenCalledWith(expectedCalledWith, expectedRename);
			},
		);

		it('should not rename the node for invalid workflowId', () => {
			const { applyDefaultExecuteWorkflowNodeName } = useWorkflowResourcesLocator(routerMock);
			const workflowId = 123;

			applyDefaultExecuteWorkflowNodeName(workflowId);

			expect(renameNodeMock).not.toHaveBeenCalled();
		});

		it('should not rename the node for workflowId: workflow-id with null mockedWorkflow', () => {
			const { applyDefaultExecuteWorkflowNodeName } = useWorkflowResourcesLocator(routerMock);
			const workflowId = 'workflow-id';
			const activeNodeName = 'Execute Workflow';

			ndvStoreMock.activeNodeName = activeNodeName;
			workflowsListStoreMock.getWorkflowById.mockReturnValue(null as unknown as IWorkflowDb);

			applyDefaultExecuteWorkflowNodeName(workflowId);

			expect(workflowsListStoreMock.getWorkflowById).toHaveBeenCalledWith(workflowId);
			expect(renameNodeMock).not.toHaveBeenCalled();
		});

		it('should not rename the node for workflowId: workflow-id with activeNodeName: Some Other Node', () => {
			const { applyDefaultExecuteWorkflowNodeName } = useWorkflowResourcesLocator(routerMock);
			const workflowId = 'workflow-id';
			const activeNodeName = 'Some Other Node';
			const mockedWorkflow = createTestWorkflow({ name: 'Test Workflow' });

			ndvStoreMock.activeNodeName = activeNodeName;
			workflowsListStoreMock.getWorkflowById.mockReturnValue(mockedWorkflow);

			applyDefaultExecuteWorkflowNodeName(workflowId);

			expect(workflowsListStoreMock.getWorkflowById).not.toHaveBeenCalled();
			expect(renameNodeMock).not.toHaveBeenCalled();
		});
	});

	describe('pagination functionality', () => {
		it('should initialize with correct default state', () => {
			const { hasMoreWorkflowsToLoad, workflowsResources } =
				useWorkflowResourcesLocator(routerMock);

			expect(workflowsResources.value).toEqual([]);
			expect(hasMoreWorkflowsToLoad.value).toBe(false);
		});

		it('should populate next workflows page correctly', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Workflow 1' },
				{ id: '2', name: 'Workflow 2' },
			] as any;

			workflowsListStoreMock.fetchWorkflowsPage.mockResolvedValue(mockWorkflows);
			workflowsListStoreMock.totalWorkflowCount = 100;

			const { populateNextWorkflowsPage, workflowsResources, hasMoreWorkflowsToLoad } =
				useWorkflowResourcesLocator(routerMock);

			await populateNextWorkflowsPage();

			expect(workflowsListStoreMock.fetchWorkflowsPage).toHaveBeenCalledWith(
				undefined, // projectId
				1, // page
				40, // pageSize
				'updatedAt:desc', // sort
				{ triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] }, // filter
			);

			expect(workflowsResources.value).toEqual([
				{
					name: 'Workflow 1',
					value: '1',
					url: expect.any(String) as string,
					isArchived: false,
					active: false,
				},
				{
					name: 'Workflow 2',
					value: '2',
					url: expect.any(String) as string,
					isArchived: false,
					active: false,
				},
			]);

			expect(hasMoreWorkflowsToLoad.value).toBe(true);
		});

		it('should handle search filtering with pagination reset', async () => {
			const mockFilteredWorkflows = [{ id: '3', name: 'Filtered Workflow' }] as any;

			workflowsListStoreMock.fetchWorkflowsPage.mockResolvedValue(mockFilteredWorkflows);

			const { onSearchFilter, workflowsResources } = useWorkflowResourcesLocator(routerMock);

			// Pre-populate some workflows
			workflowsResources.value = [
				{ name: 'Old Workflow', value: 'old', url: '/old', isArchived: false, active: true },
			];

			await onSearchFilter('test search');

			expect(workflowsListStoreMock.fetchWorkflowsPage).toHaveBeenCalledWith(
				undefined,
				1,
				40,
				'updatedAt:desc',
				{ query: 'test search', triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] },
			);

			// Should reset workflows array and populate with filtered results
			expect(workflowsResources.value).toEqual([
				{
					name: 'Filtered Workflow',
					value: '3',
					url: expect.any(String) as string,
					isArchived: false,
					active: false,
				},
			]);
		});

		it('should calculate hasMore correctly based on total count', async () => {
			workflowsListStoreMock.fetchWorkflowsPage.mockResolvedValue([
				{ id: '1', name: 'Workflow 1' },
			] as any);
			workflowsListStoreMock.totalWorkflowCount = 1; // Only 1 total, so no more after first load

			const { populateNextWorkflowsPage, hasMoreWorkflowsToLoad } =
				useWorkflowResourcesLocator(routerMock);

			await populateNextWorkflowsPage();

			expect(hasMoreWorkflowsToLoad.value).toBe(false);
		});

		describe('callable sub-workflows', () => {
			const setUpParentWorkflow = (scopes: Scope[]) => {
				workflowsStoreMock.workflowId = 'parent-wf-id';
				workflowsStoreMock.isNewWorkflow = false;
				documentScopes.value = scopes;
			};

			it('should list callable sub-workflows when the user can update a saved parent', async () => {
				setUpParentWorkflow(['workflow:read', 'workflow:update']);
				workflowsListStoreMock.fetchCallableSubworkflowsPage.mockResolvedValue({
					count: 3,
					data: [
						{ id: '1', name: 'Team Sub', active: true, isArchived: false, projectName: 'Team' },
						{ id: '2', name: 'Personal Sub', active: false, isArchived: true },
					],
				});

				const { onSearchFilter, workflowsResources, hasMoreWorkflowsToLoad, getWorkflowName } =
					useWorkflowResourcesLocator(routerMock);
				await onSearchFilter('sub');

				expect(workflowsListStoreMock.fetchCallableSubworkflowsPage).toHaveBeenCalledWith(
					'parent-wf-id',
					1,
					40,
					'sub',
				);
				expect(workflowsListStoreMock.fetchWorkflowsPage).not.toHaveBeenCalled();
				expect(workflowsResources.value).toEqual([
					{
						name: 'Team — Team Sub',
						value: '1',
						url: expect.any(String) as string,
						isArchived: false,
						active: true,
					},
					{
						name: 'Personal Sub',
						value: '2',
						url: expect.any(String) as string,
						isArchived: true,
						active: false,
					},
				]);
				expect(hasMoreWorkflowsToLoad.value).toBe(true);
				expect(getWorkflowName('1')).toBe('Team — Team Sub');
				// Callable rows can belong to workflows the user cannot read, so they
				// must stay out of the workflows cache.
				expect(workflowsListStoreMock.addWorkflow).not.toHaveBeenCalled();
				expect(workflowsListStoreMock.setWorkflows).not.toHaveBeenCalled();
			});

			it('should list readable workflows when the user cannot update the parent', async () => {
				setUpParentWorkflow(['workflow:read']);
				workflowsListStoreMock.fetchWorkflowsPage.mockResolvedValue([]);

				const { populateNextWorkflowsPage } = useWorkflowResourcesLocator(routerMock);
				await populateNextWorkflowsPage();

				expect(workflowsListStoreMock.fetchCallableSubworkflowsPage).not.toHaveBeenCalled();
				expect(workflowsListStoreMock.fetchWorkflowsPage).toHaveBeenCalledWith(
					undefined,
					1,
					40,
					'updatedAt:desc',
					{ triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] },
				);
			});

			it('should list readable workflows when the parent is not saved', async () => {
				setUpParentWorkflow(['workflow:read', 'workflow:update']);
				workflowsStoreMock.isNewWorkflow = true;
				workflowsListStoreMock.fetchWorkflowsPage.mockResolvedValue([]);

				const { populateNextWorkflowsPage } = useWorkflowResourcesLocator(routerMock);
				await populateNextWorkflowsPage();

				expect(workflowsListStoreMock.fetchCallableSubworkflowsPage).not.toHaveBeenCalled();
				expect(workflowsListStoreMock.fetchWorkflowsPage).toHaveBeenCalled();
			});
		});

		it('should handle multiple page loads correctly', async () => {
			const firstPageWorkflows = [
				{ id: '1', name: 'Workflow 1' },
				{ id: '2', name: 'Workflow 2' },
			] as any;
			const secondPageWorkflows = [
				{ id: '3', name: 'Workflow 3' },
				{ id: '4', name: 'Workflow 4' },
			] as any;

			workflowsListStoreMock.fetchWorkflowsPage
				.mockResolvedValueOnce(firstPageWorkflows)
				.mockResolvedValueOnce(secondPageWorkflows);
			workflowsListStoreMock.totalWorkflowCount = 100;

			const { populateNextWorkflowsPage, workflowsResources } =
				useWorkflowResourcesLocator(routerMock);

			// Load first page
			await populateNextWorkflowsPage();
			expect(workflowsResources.value).toHaveLength(2);
			expect(workflowsListStoreMock.fetchWorkflowsPage).toHaveBeenCalledWith(
				undefined,
				1,
				40,
				'updatedAt:desc',
				{ triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] },
			);

			// Load second page
			await populateNextWorkflowsPage();
			expect(workflowsResources.value).toHaveLength(4);
			expect(workflowsListStoreMock.fetchWorkflowsPage).toHaveBeenCalledWith(
				undefined,
				2,
				40,
				'updatedAt:desc',
				{ triggerNodeTypes: ['n8n-nodes-base.executeWorkflowTrigger'] },
			);

			// Verify workflows from both pages are present
			expect(workflowsResources.value.map((w) => w.name)).toEqual([
				'Workflow 1',
				'Workflow 2',
				'Workflow 3',
				'Workflow 4',
			]);
		});
	});

	describe('workflowDbToResourceMapper', () => {
		it('should map WorkflowListResource correctly', () => {
			routerMock.resolve = vi.fn().mockReturnValue({ href: '/workflow/test-id' });

			const { workflowDbToResourceMapper } = useWorkflowResourcesLocator(routerMock);

			const workflow = {
				id: 'test-id',
				name: 'Test Workflow',
			} as any;

			const result = workflowDbToResourceMapper(workflow);

			expect(result).toEqual({
				name: 'Test Workflow',
				value: 'test-id',
				url: '/workflow/test-id',
				isArchived: false,
				active: false,
			});
		});

		it('should map IWorkflowDb with archived status correctly', () => {
			routerMock.resolve = vi.fn().mockReturnValue({ href: '/workflow/test-id' });

			const { workflowDbToResourceMapper } = useWorkflowResourcesLocator(routerMock);

			const workflow: IWorkflowDb = {
				id: 'test-id',
				name: 'Archived Workflow',
				isArchived: true,
			} as IWorkflowDb;

			const result = workflowDbToResourceMapper(workflow);

			expect(result).toEqual({
				name: 'Archived Workflow',
				value: 'test-id',
				url: '/workflow/test-id',
				isArchived: true,
				active: false,
			});
		});
	});

	describe('utility functions', () => {
		it('should generate correct workflow URL', () => {
			routerMock.resolve = vi.fn().mockReturnValue({ href: '/workflow/test-workflow-id' });

			const { getWorkflowUrl } = useWorkflowResourcesLocator(routerMock);
			const url = getWorkflowUrl('test-workflow-id');

			expect(routerMock.resolve as any).toHaveBeenCalledWith({
				name: 'NodeViewExisting',
				params: { workflowId: 'test-workflow-id' },
			});
			expect(url).toBe('/workflow/test-workflow-id');
		});

		it('should get workflow name from store', () => {
			const mockWorkflow = { id: 'test-id', name: 'Test Name' } as IWorkflowDb;
			workflowsListStoreMock.getWorkflowById.mockReturnValue(mockWorkflow);

			const { getWorkflowName } = useWorkflowResourcesLocator(routerMock);
			const name = getWorkflowName('test-id');

			expect(name).toBe('Test Name');
			expect(workflowsListStoreMock.getWorkflowById).toHaveBeenCalledWith('test-id');
		});

		it('should return workflow ID when workflow not found in store', () => {
			workflowsListStoreMock.getWorkflowById.mockReturnValue(null as any);

			const { getWorkflowName } = useWorkflowResourcesLocator(routerMock);
			const name = getWorkflowName('missing-id');

			expect(name).toBe('missing-id');
		});
	});
});
