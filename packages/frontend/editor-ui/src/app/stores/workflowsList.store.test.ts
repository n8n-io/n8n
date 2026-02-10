import { setActivePinia, createPinia } from 'pinia';
import * as workflowsApi from '@/app/api/workflows';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IWorkflowDb, WorkflowListResource, WorkflowResource } from '@/Interface';
import * as apiUtils from '@n8n/rest-api-client';
import { createTestWorkflow } from '@/__tests__/mocks';
import type { WorkflowHistory } from '@n8n/rest-api-client';

vi.mock('@/app/api/workflows', () => ({
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
	getWorkflowsAndFolders: vi.fn(),
	getWorkflowsWithNodesIncluded: vi.fn(),
	getActiveWorkflows: vi.fn(),
	workflowExists: vi.fn(),
}));

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		useLocalStorage: vi.fn().mockReturnValue({ value: undefined }),
	};
});

describe('useWorkflowsListStore', () => {
	let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsListStore = useWorkflowsListStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initial state', () => {
		it('should initialize with default state', () => {
			expect(workflowsListStore.totalWorkflowCount).toBe(0);
			expect(workflowsListStore.workflowsById).toEqual({});
			expect(workflowsListStore.activeWorkflows).toEqual([]);
		});
	});

	describe('allWorkflows', () => {
		it('should return sorted workflows by name', () => {
			workflowsListStore.setWorkflows([
				{ id: '3', name: 'Zeta' },
				{ id: '1', name: 'Alpha' },
				{ id: '2', name: 'Beta' },
			] as IWorkflowDb[]);

			const allWorkflows = workflowsListStore.allWorkflows;
			expect(allWorkflows[0].name).toBe('Alpha');
			expect(allWorkflows[1].name).toBe('Beta');
			expect(allWorkflows[2].name).toBe('Zeta');
		});

		it('should return empty array when no workflows are set', () => {
			workflowsListStore.setWorkflows([]);

			const allWorkflows = workflowsListStore.allWorkflows;
			expect(allWorkflows).toEqual([]);
		});
	});

	describe('getWorkflowById', () => {
		it('should return workflow by id', () => {
			const workflow = createTestWorkflow({ id: '123', name: 'Test Workflow' });
			workflowsListStore.addWorkflow(workflow);

			const result = workflowsListStore.getWorkflowById('123');
			expect(result.id).toBe('123');
			expect(result.name).toBe('Test Workflow');
		});

		it('should return undefined for non-existent workflow', () => {
			const result = workflowsListStore.getWorkflowById('non-existent');
			expect(result).toBeUndefined();
		});
	});

	describe('setWorkflows', () => {
		it('should set workflows and index by id', () => {
			const workflows = [
				{ id: '1', name: 'Workflow 1' },
				{ id: '2', name: 'Workflow 2' },
			] as IWorkflowDb[];

			workflowsListStore.setWorkflows(workflows);

			expect(Object.keys(workflowsListStore.workflowsById)).toHaveLength(2);
			expect(workflowsListStore.workflowsById['1'].name).toBe('Workflow 1');
			expect(workflowsListStore.workflowsById['2'].name).toBe('Workflow 2');
		});

		it('should replace existing workflows', () => {
			workflowsListStore.setWorkflows([{ id: '1', name: 'Old' }] as IWorkflowDb[]);
			workflowsListStore.setWorkflows([{ id: '2', name: 'New' }] as IWorkflowDb[]);

			expect(Object.keys(workflowsListStore.workflowsById)).toHaveLength(1);
			expect(workflowsListStore.workflowsById['1']).toBeUndefined();
			expect(workflowsListStore.workflowsById['2'].name).toBe('New');
		});

		it('should skip workflows without id', () => {
			workflowsListStore.setWorkflows([
				{ id: '1', name: 'Workflow 1' },
				{ id: '', name: 'No ID' },
			] as IWorkflowDb[]);

			expect(Object.keys(workflowsListStore.workflowsById)).toHaveLength(1);
			expect(workflowsListStore.workflowsById['1']).toBeDefined();
		});
	});

	describe('addWorkflow', () => {
		it('should add a new workflow', () => {
			const workflow = createTestWorkflow({ id: '123', name: 'New Workflow' });
			workflowsListStore.addWorkflow(workflow);

			expect(workflowsListStore.workflowsById['123']).toBeDefined();
			expect(workflowsListStore.workflowsById['123'].name).toBe('New Workflow');
		});

		it('should merge with existing workflow data', () => {
			workflowsListStore.addWorkflow(
				createTestWorkflow({ id: '123', name: 'Original', active: false }),
			);
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', name: 'Updated' }));

			expect(workflowsListStore.workflowsById['123'].name).toBe('Updated');
		});
	});

	describe('removeWorkflow', () => {
		it('should remove workflow by id', () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', name: 'To Remove' }));
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '456', name: 'To Keep' }));

			workflowsListStore.removeWorkflow('123');

			expect(workflowsListStore.workflowsById['123']).toBeUndefined();
			expect(workflowsListStore.workflowsById['456']).toBeDefined();
		});

		it('should handle removing non-existent workflow', () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', name: 'Existing' }));

			workflowsListStore.removeWorkflow('non-existent');

			expect(Object.keys(workflowsListStore.workflowsById)).toHaveLength(1);
		});
	});

	describe('updateWorkflowInCache', () => {
		it('should update existing workflow properties', () => {
			workflowsListStore.addWorkflow(
				createTestWorkflow({ id: '123', name: 'Original', active: false }),
			);

			workflowsListStore.updateWorkflowInCache('123', { name: 'Updated', active: true });

			expect(workflowsListStore.workflowsById['123'].name).toBe('Updated');
			expect(workflowsListStore.workflowsById['123'].active).toBe(true);
		});

		it('should not create workflow if it does not exist', () => {
			workflowsListStore.updateWorkflowInCache('non-existent', { name: 'New' });

			expect(workflowsListStore.workflowsById['non-existent']).toBeUndefined();
		});
	});

	describe('setWorkflowActiveInCache', () => {
		const mockActiveVersion: WorkflowHistory = {
			versionId: 'test-version-id',
			name: 'Test Version',
			authors: 'Test Author',
			description: 'A test workflow version',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			workflowPublishHistory: [],
		};

		it('should add workflow to activeWorkflows array', () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', active: false }));

			workflowsListStore.setWorkflowActiveInCache('123', mockActiveVersion);

			expect(workflowsListStore.activeWorkflows).toContain('123');
		});

		it('should not duplicate workflow in activeWorkflows', () => {
			workflowsListStore.activeWorkflows = ['123'];
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', active: true }));

			workflowsListStore.setWorkflowActiveInCache('123', mockActiveVersion);

			expect(workflowsListStore.activeWorkflows.filter((id) => id === '123')).toHaveLength(1);
		});

		it('should update cached workflow active state', () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', active: false }));

			workflowsListStore.setWorkflowActiveInCache('123', mockActiveVersion);

			expect(workflowsListStore.workflowsById['123'].active).toBe(true);
			expect(workflowsListStore.workflowsById['123'].activeVersionId).toBe('test-version-id');
			expect(workflowsListStore.workflowsById['123'].activeVersion).toEqual(mockActiveVersion);
		});
	});

	describe('setWorkflowInactiveInCache', () => {
		it('should remove workflow from activeWorkflows array', () => {
			workflowsListStore.activeWorkflows = ['123', '456'];
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', active: true }));

			workflowsListStore.setWorkflowInactiveInCache('123');

			expect(workflowsListStore.activeWorkflows).not.toContain('123');
			expect(workflowsListStore.activeWorkflows).toContain('456');
		});

		it('should update cached workflow active state', () => {
			workflowsListStore.activeWorkflows = ['123'];
			workflowsListStore.addWorkflow(
				createTestWorkflow({
					id: '123',
					active: true,
				}),
			);

			workflowsListStore.setWorkflowInactiveInCache('123');

			expect(workflowsListStore.workflowsById['123'].active).toBe(false);
			expect(workflowsListStore.workflowsById['123'].activeVersionId).toBeNull();
			expect(workflowsListStore.workflowsById['123'].activeVersion).toBeNull();
		});

		it('should handle workflow not in activeWorkflows', () => {
			workflowsListStore.activeWorkflows = ['456'];

			workflowsListStore.setWorkflowInactiveInCache('123');

			expect(workflowsListStore.activeWorkflows).toEqual(['456']);
		});
	});

	describe('fetchWorkflowsPage', () => {
		it('should fetch workflows and update store', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Workflow 1', resource: 'workflow' },
				{ id: '2', name: 'Workflow 2', resource: 'workflow' },
			] as WorkflowListResource[];
			vi.mocked(workflowsApi).getWorkflowsAndFolders.mockResolvedValue({
				count: 2,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.fetchWorkflowsPage();

			expect(workflowsApi.getWorkflowsAndFolders).toHaveBeenCalled();
			expect(workflowsListStore.totalWorkflowCount).toBe(2);
			expect(result).toEqual(mockWorkflows);
		});

		it('should filter out folders from cache', async () => {
			const mockData = [
				{ id: '1', name: 'Workflow 1', resource: 'workflow' },
				{ id: 'folder-1', name: 'Folder', resource: 'folder' },
			] as WorkflowListResource[];
			vi.mocked(workflowsApi).getWorkflowsAndFolders.mockResolvedValue({
				count: 2,
				data: mockData,
			});

			await workflowsListStore.fetchWorkflowsPage();

			expect(workflowsListStore.workflowsById['1']).toBeDefined();
			expect(workflowsListStore.workflowsById['folder-1']).toBeUndefined();
		});

		it('should pass pagination parameters', async () => {
			vi.mocked(workflowsApi).getWorkflowsAndFolders.mockResolvedValue({
				count: 0,
				data: [],
			});

			await workflowsListStore.fetchWorkflowsPage('project-1', 2, 25, 'name:asc');

			expect(workflowsApi.getWorkflowsAndFolders).toHaveBeenCalledWith(
				expect.any(Object),
				{ projectId: 'project-1' },
				{ skip: 25, take: 25, sortBy: 'name:asc' },
				undefined,
				undefined,
			);
		});

		it('should pass filter parameters', async () => {
			vi.mocked(workflowsApi).getWorkflowsAndFolders.mockResolvedValue({
				count: 0,
				data: [],
			});

			await workflowsListStore.fetchWorkflowsPage(undefined, 1, 10, undefined, {
				query: 'test',
				tags: ['tag1'],
				active: true,
				isArchived: false,
			});

			expect(workflowsApi.getWorkflowsAndFolders).toHaveBeenCalledWith(
				expect.any(Object),
				{
					query: 'test',
					tags: ['tag1'],
					active: true,
					isArchived: false,
					projectId: undefined,
				},
				expect.any(Object),
				undefined,
				undefined,
			);
		});
	});

	describe('searchWorkflows', () => {
		it('should search workflows with filters', async () => {
			const mockWorkflows = [{ id: '1', name: 'Test Workflow' }] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({ query: 'test' });

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				{ query: 'test' },
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should pass undefined filter when no meaningful values', async () => {
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: 0,
				data: [],
			});

			await workflowsListStore.searchWorkflows({});

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				undefined,
			);
		});

		it('should pass select fields', async () => {
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: 0,
				data: [],
			});

			await workflowsListStore.searchWorkflows({ select: ['id', 'name'] });

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				['id', 'name'],
			);
		});
	});

	describe('fetchAllWorkflows', () => {
		it('should fetch and set all workflows', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Workflow 1' },
				{ id: '2', name: 'Workflow 2' },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.fetchAllWorkflows();

			expect(result).toEqual(mockWorkflows);
			expect(Object.values(workflowsListStore.workflowsById)).toEqual(mockWorkflows);
		});
	});

	describe('fetchWorkflow', () => {
		it('should fetch single workflow and add to cache', async () => {
			const mockWorkflow = createTestWorkflow({ id: '123', name: 'Fetched Workflow' });
			vi.mocked(workflowsApi).getWorkflow.mockResolvedValue(mockWorkflow);

			const result = await workflowsListStore.fetchWorkflow('123');

			expect(workflowsApi.getWorkflow).toHaveBeenCalledWith(expect.any(Object), '123');
			expect(result.id).toBe('123');
			expect(workflowsListStore.workflowsById['123']).toBeDefined();
		});
	});

	describe('fetchWorkflowsWithNodesIncluded', () => {
		it('should fetch workflows containing specified node types', async () => {
			const mockWorkflows = [{ id: '1', name: 'Workflow with HTTP' }] as WorkflowResource[];
			vi.mocked(workflowsApi).getWorkflowsWithNodesIncluded.mockResolvedValue({
				count: 1,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.fetchWorkflowsWithNodesIncluded([
				'n8n-nodes-base.httpRequest',
			]);

			expect(workflowsApi.getWorkflowsWithNodesIncluded).toHaveBeenCalledWith(expect.any(Object), [
				'n8n-nodes-base.httpRequest',
			]);
			expect(result.data).toEqual(mockWorkflows);
		});
	});

	describe('fetchActiveWorkflows', () => {
		it('should fetch and store active workflow ids', async () => {
			const mockActiveIds = ['1', '2', '3'];
			vi.mocked(workflowsApi).getActiveWorkflows.mockResolvedValue(mockActiveIds);

			const result = await workflowsListStore.fetchActiveWorkflows();

			expect(workflowsApi.getActiveWorkflows).toHaveBeenCalled();
			expect(result).toEqual(mockActiveIds);
			expect(workflowsListStore.activeWorkflows).toEqual(mockActiveIds);
		});
	});

	describe('checkWorkflowExists', () => {
		it('should return true when workflow exists', async () => {
			vi.mocked(workflowsApi).workflowExists.mockResolvedValue({ exists: true });

			const result = await workflowsListStore.checkWorkflowExists('123');

			expect(workflowsApi.workflowExists).toHaveBeenCalledWith(expect.any(Object), '123');
			expect(result).toBe(true);
		});

		it('should return false when workflow does not exist', async () => {
			vi.mocked(workflowsApi).workflowExists.mockResolvedValue({ exists: false });

			const result = await workflowsListStore.checkWorkflowExists('non-existent');

			expect(result).toBe(false);
		});
	});

	describe('deleteWorkflow', () => {
		it('should call API and remove workflow from cache', async () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', name: 'To Delete' }));
			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockResolvedValue(undefined);

			await workflowsListStore.deleteWorkflow('123');

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.any(Object),
				'DELETE',
				'/workflows/123',
			);
			expect(workflowsListStore.workflowsById['123']).toBeUndefined();
		});
	});

	describe('archiveWorkflowInList', () => {
		it('should archive workflow and update cache', async () => {
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';

			workflowsListStore.addWorkflow(
				createTestWorkflow({
					id: '123',
					active: true,
					isArchived: false,
					versionId,
				}),
			);
			workflowsListStore.activeWorkflows = ['123'];

			vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue({
				versionId: updatedVersionId,
				checksum: 'checksum',
			});

			const result = await workflowsListStore.archiveWorkflowInList('123');

			expect(result.versionId).toBe(updatedVersionId);
			expect(workflowsListStore.workflowsById['123'].isArchived).toBe(true);
			expect(workflowsListStore.workflowsById['123'].versionId).toBe(updatedVersionId);
			expect(workflowsListStore.workflowsById['123'].active).toBe(false);
			expect(workflowsListStore.activeWorkflows).not.toContain('123');
		});

		it('should pass expectedChecksum to the API when provided', async () => {
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';
			const expectedChecksum = 'test-checksum-123';

			workflowsListStore.addWorkflow(
				createTestWorkflow({
					id: '123',
					active: true,
					isArchived: false,
					versionId,
				}),
			);
			workflowsListStore.activeWorkflows = ['123'];

			const makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue({
				versionId: updatedVersionId,
				checksum: 'checksum',
			});

			await workflowsListStore.archiveWorkflowInList('123', expectedChecksum);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				'/workflows/123/archive',
				{ expectedChecksum },
			);
		});

		it('should throw error if checksum is missing', async () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123' }));

			vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue({
				versionId: 'new-version',
			});

			await expect(workflowsListStore.archiveWorkflowInList('123')).rejects.toThrow(
				'Failed to archive workflow',
			);
		});
	});

	describe('unarchiveWorkflowInList', () => {
		it('should unarchive workflow and update cache', async () => {
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';

			workflowsListStore.addWorkflow(
				createTestWorkflow({
					id: '123',
					active: false,
					isArchived: true,
					versionId,
				}),
			);

			vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue({
				versionId: updatedVersionId,
				checksum: 'checksum',
			});

			const result = await workflowsListStore.unarchiveWorkflowInList('123');

			expect(result.versionId).toBe(updatedVersionId);
			expect(workflowsListStore.workflowsById['123'].isArchived).toBe(false);
			expect(workflowsListStore.workflowsById['123'].versionId).toBe(updatedVersionId);
		});

		it('should throw error if checksum is missing', async () => {
			workflowsListStore.addWorkflow(createTestWorkflow({ id: '123', isArchived: true }));

			vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue({
				versionId: 'new-version',
			});

			await expect(workflowsListStore.unarchiveWorkflowInList('123')).rejects.toThrow(
				'Failed to unarchive workflow',
			);
		});
	});
});
