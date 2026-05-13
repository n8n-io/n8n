import { setActivePinia, createPinia } from 'pinia';
import * as workflowsApi from '@/app/api/workflows';
import { DUPLICATE_POSTFFIX, MAX_WORKFLOW_NAME_LENGTH } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { IWorkflowDb, IWorkflowSettings } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

import type { ExecutionSummary, INodeTypeDescription } from 'n8n-workflow';
import { useUIStore } from '@/app/stores/ui.store';
import * as apiUtils from '@n8n/rest-api-client';
import { createTestWorkflow, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { WorkflowHistory } from '@n8n/rest-api-client';

vi.mock('@/app/api/workflows', () => ({
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
	getNewWorkflow: vi.fn(),
	getLastSuccessfulExecution: vi.fn(),
}));

const getNodeType = vi.fn((_nodeTypeName: string): Partial<INodeTypeDescription> | null => ({
	inputs: [],
	group: [],
	webhooks: [],
	properties: [],
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
		getAllNodeTypes: () => ({
			nodeTypes: {},
			init: async () => {},
			getByNameAndVersion: () => undefined,
		}),
	})),
}));

const track = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		useLocalStorage: vi.fn().mockReturnValue({ value: undefined }),
	};
});

vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: vi.fn(() => ({
		preferences: {
			branchReadOnly: false,
		},
	})),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: vi.fn((scopes: string[] = []) => ({
		workflow: {
			update: scopes.includes('workflow:update'),
			read: scopes.includes('workflow:read') || scopes.includes('workflow:update'),
		},
	})),
}));

describe('useWorkflowsStore', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		workflowsListStore = useWorkflowsListStore();
		uiStore = useUIStore();
		track.mockReset();
	});

	it('should initialize with default state', () => {
		expect(workflowsStore.workflowId).toBe('');
	});

	describe('allWorkflows', () => {
		it('should return sorted workflows by name', () => {
			const workflowsListStore = useWorkflowsListStore();
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
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.setWorkflows([]);

			const allWorkflows = workflowsListStore.allWorkflows;
			expect(allWorkflows).toEqual([]);
		});
	});

	describe('isWorkflowSaved', () => {
		it('should return undefined for a new workflow', () => {
			expect(workflowsStore.isWorkflowSaved[workflowsStore.workflowId]).toBeUndefined();
		});

		it('should return true for an existing workflow', () => {
			workflowsStore.setWorkflowId('123');
			// Add the workflow to workflowsById to simulate it being loaded from backend
			workflowsListStore.addWorkflow(
				createTestWorkflow({
					id: '123',
					name: 'Test Workflow',
					active: false,
					versionId: '1',
				}),
			);
			expect(workflowsStore.isWorkflowSaved['123']).toBe(true);
		});
	});

	describe('getWorkflowRunData', () => {
		it('should return null when no execution data is present', () => {
			workflowsStore.setWorkflowExecutionData(null);

			const runData = workflowsStore.getWorkflowRunData;
			expect(runData).toBeNull();
		});

		it('should return null when execution data does not contain resultData', () => {
			workflowsStore.setWorkflowExecutionData({ id: 'exec-1', data: {} } as IExecutionResponse);

			const runData = workflowsStore.getWorkflowRunData;
			expect(runData).toBeNull();
		});

		it('should return runData when execution data contains resultData', () => {
			const expectedRunData = { node1: [{}, {}], node2: [{}] };
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: expectedRunData } },
			} as unknown as IExecutionResponse);

			const runData = workflowsStore.getWorkflowRunData;
			expect(runData).toEqual(expectedRunData);
		});
	});

	describe('getWorkflowResultDataByNodeName()', () => {
		it('should return null when no workflow run data is present', () => {
			workflowsStore.setWorkflowExecutionData(null);

			const resultData = workflowsStore.getWorkflowResultDataByNodeName('Node1');
			expect(resultData).toBeNull();
		});

		it('should return null when node name is not present in workflow run data', () => {
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);

			const resultData = workflowsStore.getWorkflowResultDataByNodeName('Node1');
			expect(resultData).toBeNull();
		});

		it('should return result data when node name is present in workflow run data', () => {
			const expectedData = [{}, {}];
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: { Node1: expectedData } } },
			} as unknown as IExecutionResponse);

			const resultData = workflowsStore.getWorkflowResultDataByNodeName('Node1');
			expect(resultData).toEqual(expectedData);
		});
	});

	describe('fetchAllWorkflows()', () => {
		it('should fetch workflows successfully', async () => {
			const workflowsListStore = useWorkflowsListStore();
			const mockWorkflows = [{ id: '1', name: 'Test Workflow' }] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			await workflowsListStore.fetchAllWorkflows();

			expect(workflowsApi.getWorkflows).toHaveBeenCalled();
			expect(Object.values(workflowsListStore.workflowsById)).toEqual(mockWorkflows);
		});
	});

	describe('searchWorkflows()', () => {
		beforeEach(() => {
			vi.mocked(workflowsApi).getWorkflows.mockClear();
		});

		it('should search workflows with no filters', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Workflow 1', isArchived: false },
				{ id: '2', name: 'Workflow 2', isArchived: false },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({});

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should search workflows with query filter', async () => {
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

		it('should search workflows with isArchived filter set to false', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Active Workflow 1', isArchived: false },
				{ id: '2', name: 'Active Workflow 2', isArchived: false },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({ isArchived: false });

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				{ isArchived: false },
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should search workflows with isArchived filter set to true', async () => {
			const mockWorkflows = [
				{ id: '3', name: 'Archived Workflow 1', isArchived: true },
				{ id: '4', name: 'Archived Workflow 2', isArchived: true },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({ isArchived: true });

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				{ isArchived: true },
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should search workflows with multiple filters including isArchived', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Test Workflow', isArchived: false },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({
				query: 'test',
				isArchived: false,
				projectId: 'project-123',
				tags: ['tag1', 'tag2'],
				nodeTypes: ['n8n-nodes-base.httpRequest'],
			});

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				{
					query: 'test',
					isArchived: false,
					projectId: 'project-123',
					tags: ['tag1', 'tag2'],
					nodeTypes: ['n8n-nodes-base.httpRequest'],
				},
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should search workflows with select fields', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Workflow 1' },
				{ id: '2', name: 'Workflow 2' },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({
				select: ['id', 'name'],
			});

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				['id', 'name'],
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should handle empty filter object correctly', async () => {
			const mockWorkflows = [] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: 0,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({
				projectId: undefined,
				query: undefined,
				nodeTypes: undefined,
				tags: undefined,
				isArchived: undefined,
			});

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				undefined,
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});

		it('should pass isArchived as undefined when not specified', async () => {
			const mockWorkflows = [
				{ id: '1', name: 'Workflow 1', isArchived: false },
				{ id: '2', name: 'Workflow 2', isArchived: true },
			] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

			const result = await workflowsListStore.searchWorkflows({ query: 'workflow' });

			expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
				expect.any(Object),
				{ query: 'workflow', isArchived: undefined },
				undefined,
				undefined,
			);
			expect(result).toEqual(mockWorkflows);
		});
	});

	describe('setWorkflowActive()', () => {
		it('should set workflow as active in list cache and clear dirty state', async () => {
			const workflowsListStore = useWorkflowsListStore();
			uiStore.markStateDirty();
			workflowsListStore.workflowsById = { '1': { active: false } as IWorkflowDb };
			workflowsStore.setWorkflowId('1');

			const mockActiveVersion: WorkflowHistory = {
				versionId: 'test-version-id',
				name: 'Test Version',
				authors: 'Test Author',
				description: 'A test workflow version',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				workflowPublishHistory: [],
			};

			workflowsStore.setWorkflowActive('1', mockActiveVersion, true);

			expect(workflowsListStore.activeWorkflows).toContain('1');
			expect(workflowsListStore.workflowsById['1'].active).toBe(true);
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should not modify active workflows when workflow is already active', () => {
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.activeWorkflows = ['1'];
			workflowsListStore.workflowsById = { '1': { active: true } as IWorkflowDb };
			workflowsStore.setWorkflowId('1');

			const mockActiveVersion: WorkflowHistory = {
				versionId: 'test-version-id',
				name: 'Test Version',
				authors: 'Test Author',
				description: 'A test workflow version',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				workflowPublishHistory: [],
			};

			workflowsStore.setWorkflowActive('1', mockActiveVersion, true);

			expect(workflowsListStore.activeWorkflows).toEqual(['1']);
			expect(workflowsListStore.workflowsById['1'].active).toBe(true);
		});

		it('should not clear dirty state when targeting a different workflow', () => {
			const workflowsListStore = useWorkflowsListStore();
			uiStore.markStateDirty();
			workflowsStore.setWorkflowId('1');
			workflowsListStore.workflowsById = { '1': { active: false } as IWorkflowDb };

			const mockActiveVersion: WorkflowHistory = {
				versionId: 'test-version-id',
				name: 'Test Version',
				authors: 'Test Author',
				description: 'A test workflow version',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				workflowPublishHistory: [],
			};

			workflowsStore.setWorkflowActive('2', mockActiveVersion, true);
			expect(workflowsListStore.workflowsById['1'].active).toBe(false);
			expect(uiStore.stateIsDirty).toBe(true);
		});
	});

	describe('setWorkflowInactive()', () => {
		it('should set workflow as inactive when it exists', () => {
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.activeWorkflows = ['1', '2'];
			workflowsListStore.workflowsById = { '1': { active: true } as IWorkflowDb };
			workflowsStore.setWorkflowInactive('1');
			expect(workflowsListStore.workflowsById['1'].active).toBe(false);
			expect(workflowsListStore.activeWorkflows).toEqual(['2']);
		});

		it('should not modify active workflows when workflow is not active', () => {
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.workflowsById = { '2': { active: true } as IWorkflowDb };
			workflowsListStore.activeWorkflows = ['2'];
			workflowsStore.setWorkflowInactive('1');
			expect(workflowsListStore.activeWorkflows).toEqual(['2']);
			expect(workflowsListStore.workflowsById['2'].active).toBe(true);
		});

		it('should update list cache when targeting any workflow', () => {
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.activeWorkflows = ['1'];
			workflowsListStore.workflowsById = { '1': { active: true } as IWorkflowDb };
			workflowsStore.setWorkflowId('1');
			workflowsStore.setWorkflowInactive('1');
			expect(workflowsListStore.workflowsById['1'].active).toBe(false);
			expect(workflowsListStore.activeWorkflows).toEqual([]);
		});
	});

	describe('getDuplicateCurrentWorkflowName()', () => {
		it('should return the same name if appending postfix exceeds max length', async () => {
			const longName = 'a'.repeat(MAX_WORKFLOW_NAME_LENGTH - DUPLICATE_POSTFFIX.length + 1);
			const newName = await workflowsStore.getDuplicateCurrentWorkflowName(longName);
			expect(newName).toBe(longName);
		});

		it('should append postfix to the name if it does not exceed max length', async () => {
			const name = 'TestWorkflow';
			const expectedName = `${name}${DUPLICATE_POSTFFIX}`;
			vi.mocked(workflowsApi).getNewWorkflow.mockResolvedValue({
				name: expectedName,
				settings: {} as IWorkflowSettings,
			});
			const newName = await workflowsStore.getDuplicateCurrentWorkflowName(name);
			expect(newName).toBe(expectedName);
		});

		it('should handle API failure gracefully', async () => {
			const name = 'TestWorkflow';
			const expectedName = `${name}${DUPLICATE_POSTFFIX}`;
			vi.mocked(workflowsApi).getNewWorkflow.mockRejectedValue(new Error('API Error'));
			const newName = await workflowsStore.getDuplicateCurrentWorkflowName(name);
			expect(newName).toBe(expectedName);
		});
	});

	describe('getPartialIdForNode', () => {
		test.each([
			[[], 'Alphabet', 'Alphabet'],
			[['Alphabet'], 'Alphabet', 'Alphab'],
			[['Alphabet', 'Alphabeta'], 'Alphabeta', 'Alphabeta'],
			[['Alphabet', 'Alphabeta', 'Alphabetagamma'], 'Alphabet', 'Alphabet'],
			[['Alphabet', 'Alphabeta', 'Alphabetagamma'], 'Alphabeta', 'Alphabeta'],
			[['Alphabet', 'Alphabeta', 'Alphabetagamma'], 'Alphabetagamma', 'Alphabetag'],
		] as Array<[string[], string, string]>)(
			'with input %s , %s returns %s',
			(ids, id, expected) => {
				workflowsStore.setWorkflowId('test-wf');
				const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-wf'));
				workflowDocumentStore.setNodes(ids.map((x) => ({ id: x }) as never));

				expect(workflowsStore.getPartialIdForNode(id)).toBe(expected);
			},
		);
	});

	describe('archiveWorkflow', () => {
		it('should call the API to archive the workflow without checksum', async () => {
			const workflowsListStore = useWorkflowsListStore();
			const workflowId = '1';
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';

			workflowsListStore.workflowsById = {
				'1': { active: true, isArchived: false, versionId } as IWorkflowDb,
			};
			workflowsStore.setWorkflowId(workflowId);
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.setActiveState({
				activeVersionId: 'active-version',
				activeVersion: null,
			});
			workflowDocumentStore.setVersionData({ versionId, name: null, description: null });
			workflowDocumentStore.setIsArchived(false);

			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockImplementation(async () => ({
					versionId: updatedVersionId,
					checksum: 'checksum',
				}));

			await workflowsStore.archiveWorkflow(workflowId);

			expect(workflowsListStore.workflowsById['1'].active).toBe(false);
			expect(workflowsListStore.workflowsById['1'].isArchived).toBe(true);
			expect(workflowsListStore.workflowsById['1'].versionId).toBe(updatedVersionId);
			expect(workflowDocumentStore.isArchived).toBe(true);
			expect(workflowDocumentStore.versionId).toBe(updatedVersionId);
			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'POST',
				`/workflows/${workflowId}/archive`,
				{ expectedChecksum: undefined },
			);
		});

		it('should pass expectedChecksum to the API when provided', async () => {
			const workflowsListStore = useWorkflowsListStore();
			const workflowId = '1';
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';
			const expectedChecksum = 'test-checksum-123';

			workflowsListStore.workflowsById = {
				'1': { active: true, isArchived: false, versionId } as IWorkflowDb,
			};
			workflowsStore.setWorkflowId(workflowId);
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.setVersionData({ versionId, name: null, description: null });
			workflowDocumentStore.setIsArchived(false);

			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockImplementation(async () => ({
					versionId: updatedVersionId,
					checksum: 'checksum',
				}));

			await workflowsStore.archiveWorkflow(workflowId, expectedChecksum);

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'POST',
				`/workflows/${workflowId}/archive`,
				{ expectedChecksum },
			);
		});
	});

	describe('unarchiveWorkflow', () => {
		it('should call the API to unarchive the workflow', async () => {
			const workflowsListStore = useWorkflowsListStore();
			const workflowId = '1';
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';

			workflowsListStore.workflowsById = {
				'1': { active: false, isArchived: true, versionId } as IWorkflowDb,
			};
			workflowsStore.setWorkflowId(workflowId);
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
			workflowDocumentStore.setVersionData({ versionId, name: null, description: null });
			workflowDocumentStore.setIsArchived(true);

			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockImplementation(async () => ({
					versionId: updatedVersionId,
					checksum: 'checksum',
				}));

			await workflowsStore.unarchiveWorkflow(workflowId);

			expect(workflowsListStore.workflowsById['1'].active).toBe(false);
			expect(workflowsListStore.workflowsById['1'].isArchived).toBe(false);
			expect(workflowsListStore.workflowsById['1'].versionId).toBe(updatedVersionId);
			expect(workflowDocumentStore.isArchived).toBe(false);
			expect(workflowDocumentStore.versionId).toBe(updatedVersionId);
			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'POST',
				`/workflows/${workflowId}/unarchive`,
			);
		});
	});

	describe('updateWorkflowSetting', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('updates current workflow setting and store state', async () => {
			workflowsStore.setWorkflowId('w1');
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('w1'));
			workflowDocumentStore.setVersionData({ versionId: 'v1', name: null, description: null });
			workflowDocumentStore.setSettings({ executionOrder: 'v1', timezone: 'UTC' });

			const makeRestApiRequestSpy = vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue(
				createTestWorkflow({
					id: 'w1',
					versionId: 'v1',
					settings: {
						executionOrder: 'v1',
						timezone: 'UTC',
						executionTimeout: 10,
					},
					nodes: [],
					connections: {},
				}),
			);

			// Act
			const result = await workflowsStore.updateWorkflowSetting('w1', 'executionTimeout', 10);

			// Assert request payload
			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: expect.any(String) },
				'PATCH',
				'/workflows/w1',
				expect.objectContaining({
					versionId: 'v1',
					settings: expect.objectContaining({ executionTimeout: 10, timezone: 'UTC' }),
				}),
			);

			// Assert returned value and store updates
			expect(result.versionId).toBe('v1');
			expect(workflowDocumentStore.versionId).toBe('v1');
			expect(workflowDocumentStore.settings).toEqual({
				executionOrder: 'v1',
				binaryMode: 'separate',
				timezone: 'UTC',
				executionTimeout: 10,
			});
		});

		it('updates cached workflow without fetching when present in store', async () => {
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.workflowsById = {
				w2: createTestWorkflow({
					id: 'w2',
					name: 'Cached',
					versionId: 'v2',
					nodes: [],
					connections: {},
					active: false,
					isArchived: false,
					settings: { executionOrder: 'v1' },
				}),
			};

			const getWorkflowSpy = vi.spyOn(workflowsApi, 'getWorkflow');

			vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue(
				createTestWorkflow({
					id: 'w2',
					versionId: 'v3',
					nodes: [],
					connections: {},
					active: false,
					isArchived: false,
					settings: {
						executionOrder: 'v1',
						timezone: 'Europe/Berlin',
					},
				}),
			);

			await workflowsStore.updateWorkflowSetting('w2', 'timezone', 'Europe/Berlin');

			// Should not fetch since cached with versionId exists
			expect(getWorkflowSpy).not.toHaveBeenCalled();
			expect(workflowsListStore.workflowsById['w2'].versionId).toBe('v3');
			expect(workflowsListStore.workflowsById['w2'].settings).toEqual({
				executionOrder: 'v1',
				timezone: 'Europe/Berlin',
			});
		});

		it('fetches workflow when not cached and updates store', async () => {
			const workflowsListStore = useWorkflowsListStore();
			workflowsListStore.workflowsById = {} as Record<string, IWorkflowDb>;

			vi.mocked(workflowsApi).getWorkflow.mockResolvedValue(
				createTestWorkflow({
					id: 'w3',
					name: 'Fetched',
					versionId: 'v100',
					nodes: [],
					connections: {},
					active: false,
					isArchived: false,
					settings: { executionOrder: 'v1' },
				}),
			);

			vi.spyOn(apiUtils, 'makeRestApiRequest').mockResolvedValue(
				createTestWorkflow({
					id: 'w3',
					versionId: 'v101',
					nodes: [],
					connections: {},
					active: false,
					isArchived: false,
					settings: {
						executionOrder: 'v1',
						timezone: 'Asia/Tokyo',
					},
				}),
			);

			await workflowsStore.updateWorkflowSetting('w3', 'timezone', 'Asia/Tokyo');

			expect(workflowsApi.getWorkflow).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: expect.any(String) },
				'w3',
			);
			expect(workflowsListStore.workflowsById['w3'].versionId).toBe('v101');
			expect(workflowsListStore.workflowsById['w3'].settings).toEqual({
				executionOrder: 'v1',
				timezone: 'Asia/Tokyo',
			});
		});
	});

	describe('renameNodeSelectedAndExecution', () => {
		it('should rename node and update execution data', () => {
			const nodeName = 'Rename me';
			const newName = 'Renamed';

			workflowsStore.setWorkflowId('test-workflow-id');

			workflowsStore.setWorkflowExecutionData({
				id: 'exec-rename',
				data: {
					resultData: {
						runData: {
							"When clicking 'Test workflow'": [
								{
									startTime: 1747389900668,
									executionIndex: 0,
									source: [],
									hints: [],
									executionTime: 1,
									executionStatus: 'success',
									data: {},
								},
							],
							[nodeName]: [
								{
									startTime: 1747389900670,
									executionIndex: 2,
									source: [
										{
											previousNode: "When clicking 'Test workflow'",
										},
									],
									hints: [],
									executionTime: 1,
									executionStatus: 'success',
									data: {},
								},
							],
							'Edit Fields': [
								{
									startTime: 1747389900671,
									executionIndex: 3,
									source: [
										{
											previousNode: nodeName,
										},
									],
									hints: [],
									executionTime: 3,
									executionStatus: 'success',
									data: {},
								},
							],
						},
						pinData: {
							[nodeName]: [
								{
									json: {
										foo: 'bar',
									},
									pairedItem: [
										{
											item: 0,
											sourceOverwrite: {
												previousNode: "When clicking 'Test workflow'",
											},
										},
									],
								},
							],
							'Edit Fields': [
								{
									json: {
										bar: 'foo',
									},
									pairedItem: {
										item: 1,
										sourceOverwrite: {
											previousNode: nodeName,
										},
									},
								},
							],
						},
						lastNodeExecuted: 'Edit Fields',
					},
				},
			} as unknown as IExecutionResponse);

			workflowsStore.setWorkflowId('test-workflow-id');

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(workflowsStore.workflowId),
			);
			workflowDocumentStore.addNode({
				parameters: {},
				id: '554c7ff4-7ee2-407c-8931-e34234c5056a',
				name: nodeName,
				type: 'n8n-nodes-base.set',
				position: [680, 180],
				typeVersion: 3.4,
			});

			workflowDocumentStore.setPinData({
				[nodeName]: [
					{
						json: {
							foo: 'bar',
						},
						pairedItem: {
							item: 2,
							sourceOverwrite: {
								previousNode: "When clicking 'Test workflow'",
							},
						},
					},
				],
				'Edit Fields': [
					{
						json: {
							bar: 'foo',
						},
						pairedItem: [
							{
								item: 3,
								sourceOverwrite: {
									previousNode: nodeName,
								},
							},
						],
					},
				],
			});

			workflowsStore.renameNodeSelectedAndExecution({ old: nodeName, new: newName });

			expect(workflowDocumentStore.nodeMetadata[nodeName]).not.toBeDefined();
			expect(workflowDocumentStore.nodeMetadata[newName]).toEqual({});
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.runData[nodeName],
			).not.toBeDefined();
			expect(workflowsStore.workflowExecutionData?.data?.resultData.runData[newName]).toBeDefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.runData['Edit Fields'][0].source,
			).toEqual([
				{
					previousNode: newName,
				},
			]);
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.pinData?.[nodeName],
			).not.toBeDefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.pinData?.[newName],
			).toBeDefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.pinData?.['Edit Fields'][0]
					.pairedItem,
			).toEqual({
				item: 1,
				sourceOverwrite: {
					previousNode: newName,
				},
			});

			expect(workflowDocumentStore.pinData?.[nodeName]).not.toBeDefined();
			expect(workflowDocumentStore.pinData?.[newName]).toBeDefined();
			expect(workflowDocumentStore.pinData?.['Edit Fields'][0].pairedItem).toEqual([
				{
					item: 3,
					sourceOverwrite: {
						previousNode: newName,
					},
				},
			]);
		});
	});

	describe('fetchLastSuccessfulExecution', () => {
		beforeEach(() => {
			// Ensure currentView is set to a non-readonly view (VIEWS.WORKFLOW = 'NodeViewExisting')
			uiStore.currentView = 'NodeViewExisting';

			// Reset sourceControlStore mock to default
			vi.mocked(useSourceControlStore).mockReturnValue({
				preferences: {
					branchReadOnly: false,
				},
			} as ReturnType<typeof useSourceControlStore>);

			// Reset the API mock
			vi.mocked(workflowsApi).getLastSuccessfulExecution.mockReset();
		});

		it('should fetch and store the last successful execution', async () => {
			const mockExecution = createTestWorkflowExecutionResponse({
				id: 'execution-456',
				status: 'success',
			});

			const workflowId = 'workflow-123';
			const testWorkflow = createTestWorkflow({
				id: workflowId,
				scopes: ['workflow:update'],
			});

			workflowsStore.setWorkflowId(workflowId);
			// Add workflow to workflowsById to simulate it being loaded from backend
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);

			// Verify the mock is set up correctly
			expect(workflowDocumentStore.scopes).toContain('workflow:update');
			expect(workflowsStore.workflowId).toBe('workflow-123');
			expect(workflowDocumentStore.isArchived).toBe(false);

			vi.mocked(workflowsApi).getLastSuccessfulExecution.mockResolvedValue(mockExecution);

			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'workflow-123',
			);
			expect(workflowsStore.lastSuccessfulExecution).toEqual(mockExecution);
		});

		it('should handle null response from API', async () => {
			const testWorkflow = createTestWorkflow({
				id: 'workflow-123',
				scopes: ['workflow:update'],
			});

			workflowsStore.setWorkflowId(testWorkflow.id);
			// Add workflow to workflowsById to simulate it being loaded from backend
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(testWorkflow.id),
			);
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);

			vi.mocked(workflowsApi).getLastSuccessfulExecution.mockResolvedValue(null);

			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'workflow-123',
			);
			expect(workflowsStore.lastSuccessfulExecution).toBeNull();
		});

		it('should not throw error when API call fails', async () => {
			const testWorkflow = createTestWorkflow({
				id: 'workflow-123',
				scopes: ['workflow:update'],
			});

			workflowsStore.setWorkflowId(testWorkflow.id);
			// Add workflow to workflowsById to simulate it being loaded from backend
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId(testWorkflow.id),
			);
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);

			const error = new Error('API Error');
			vi.mocked(workflowsApi).getLastSuccessfulExecution.mockRejectedValue(error);

			// Should not throw
			await expect(workflowsStore.fetchLastSuccessfulExecution()).resolves.toBeUndefined();

			expect(workflowsApi.getLastSuccessfulExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'workflow-123',
			);
		});

		it('should not fetch when workflow is placeholder empty workflow', async () => {
			// workflowId defaults to '' which represents an empty placeholder workflow
			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('should not fetch when workflow is read-only', async () => {
			const testWorkflow = createTestWorkflow({
				id: 'workflow-123',
				scopes: ['workflow:update'],
			});
			workflowsStore.setWorkflowId(testWorkflow.id);
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId('workflow-123'),
			);
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);
			// Set currentView to a read-only view (not WORKFLOW, NEW_WORKFLOW, or EXECUTION_DEBUG)
			uiStore.currentView = 'execution';

			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('should not fetch when workflow is archived', async () => {
			const workflowId = 'workflow-123';
			const testWorkflow = createTestWorkflow({
				id: workflowId,
				scopes: ['workflow:update'],
			});
			workflowsStore.setWorkflowId(workflowId);
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);
			workflowDocumentStore.setIsArchived(true);

			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('should not fetch when user does not have update permissions', async () => {
			const testWorkflow = createTestWorkflow({
				id: 'workflow-123',
				scopes: ['workflow:read'],
			});
			workflowsStore.setWorkflowId(testWorkflow.id);
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId('workflow-123'),
			);
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);

			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});

		it('should not fetch when branch is read-only in source control', async () => {
			// Mock the source control store BEFORE reinitializing workflows store
			vi.mocked(useSourceControlStore).mockReturnValue({
				preferences: {
					branchReadOnly: true,
				},
			} as ReturnType<typeof useSourceControlStore>);

			// Create a fresh Pinia instance and reinitialize the workflows store to pick up the new mock
			setActivePinia(createPinia());
			workflowsStore = useWorkflowsStore();
			workflowsListStore = useWorkflowsListStore();

			const testWorkflow = createTestWorkflow({
				id: 'workflow-123',
				scopes: ['workflow:update'],
			});
			workflowsStore.setWorkflowId(testWorkflow.id);
			workflowsListStore.addWorkflow(testWorkflow);

			const workflowDocumentStore = useWorkflowDocumentStore(
				createWorkflowDocumentId('workflow-123'),
			);
			workflowDocumentStore.setScopes(testWorkflow.scopes ?? []);

			await workflowsStore.fetchLastSuccessfulExecution();

			expect(workflowsApi.getLastSuccessfulExecution).not.toHaveBeenCalled();
		});
	});

	describe('setWorkflowExecutionData', () => {
		it('should clear data when called with null', () => {
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: { node1: [] } } },
			} as unknown as IExecutionResponse);

			workflowsStore.setWorkflowExecutionData(null);

			expect(workflowsStore.workflowExecutionData).toBeNull();
		});

		it('should clear workflowExecutionStartedData when setting new data', () => {
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);

			workflowsStore.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'node1',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);
			expect(workflowsStore.workflowExecutionStartedData).toBeDefined();

			workflowsStore.setWorkflowExecutionData({
				id: 'exec-2',
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);

			expect(workflowsStore.workflowExecutionStartedData).toBeUndefined();
		});

		it('should update workflowExecutionResultDataLastUpdate timestamp', () => {
			const before = Date.now();
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);

			expect(workflowsStore.workflowExecutionResultDataLastUpdate).toBeGreaterThanOrEqual(before);
		});

		it('should recompute workflowExecutionPairedItemMappings', () => {
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: { node1: [] } } },
			} as unknown as IExecutionResponse);

			expect(workflowsStore.workflowExecutionPairedItemMappings).toEqual({});
		});

		it('should strip waiting task data when waitTill is set', () => {
			const execution = {
				id: 'exec-1',
				data: {
					waitTill: new Date(),
					resultData: {
						lastNodeExecuted: 'WaitNode',
						runData: {
							WaitNode: [{ executionStatus: 'waiting' }],
							OtherNode: [{ executionStatus: 'success' }],
						},
					},
				},
			} as unknown as IExecutionResponse;

			workflowsStore.setWorkflowExecutionData(execution);

			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.runData.WaitNode,
			).toBeUndefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.runData.OtherNode,
			).toBeDefined();
		});
	});

	describe('execution session setters', () => {
		it('setExecutionWaitingForWebhook updates the value', () => {
			expect(workflowsStore.executionWaitingForWebhook).toBe(false);
			workflowsStore.setExecutionWaitingForWebhook(true);
			expect(workflowsStore.executionWaitingForWebhook).toBe(true);
			workflowsStore.setExecutionWaitingForWebhook(false);
			expect(workflowsStore.executionWaitingForWebhook).toBe(false);
		});

		it('setIsInDebugMode updates the value', () => {
			expect(workflowsStore.isInDebugMode).toBe(false);
			workflowsStore.setIsInDebugMode(true);
			expect(workflowsStore.isInDebugMode).toBe(true);
			workflowsStore.setIsInDebugMode(false);
			expect(workflowsStore.isInDebugMode).toBe(false);
		});

		it('setChatPartialExecutionDestinationNode updates the value', () => {
			expect(workflowsStore.chatPartialExecutionDestinationNode).toBeNull();
			workflowsStore.setChatPartialExecutionDestinationNode('Some Node');
			expect(workflowsStore.chatPartialExecutionDestinationNode).toBe('Some Node');
			workflowsStore.setChatPartialExecutionDestinationNode(null);
			expect(workflowsStore.chatPartialExecutionDestinationNode).toBeNull();
		});

		it('setLastSuccessfulExecution updates the value independently of active execution', () => {
			const execution = { id: 'last-success' } as IExecutionResponse;
			workflowsStore.setWorkflowExecutionData({
				id: 'active-exec',
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);

			workflowsStore.setLastSuccessfulExecution(execution);

			expect(workflowsStore.lastSuccessfulExecution).toEqual(execution);
			expect(workflowsStore.workflowExecutionData?.id).not.toBe('last-success');
		});

		it('clearExecutionStartedData empties the started data', () => {
			workflowsStore.setWorkflowExecutionData({
				id: 'exec-1',
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse);

			workflowsStore.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'node1',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);
			expect(workflowsStore.workflowExecutionStartedData).toBeDefined();

			workflowsStore.clearExecutionStartedData();

			expect(workflowsStore.workflowExecutionStartedData).toBeUndefined();
		});
	});

	describe('currentWorkflowExecutions', () => {
		beforeEach(() => {
			workflowsStore.setWorkflowId('wf-1');
		});

		it('addToCurrentExecutions filters by workflowId', () => {
			workflowsStore.addToCurrentExecutions([
				{ id: '1', workflowId: 'wf-1' } as ExecutionSummary,
				{ id: '2', workflowId: 'other-wf' } as ExecutionSummary,
			]);

			expect(workflowsStore.currentWorkflowExecutions).toHaveLength(1);
			expect(workflowsStore.currentWorkflowExecutions[0].id).toBe('1');
		});

		it('addToCurrentExecutions deduplicates by id', () => {
			workflowsStore.addToCurrentExecutions([{ id: '1', workflowId: 'wf-1' } as ExecutionSummary]);
			workflowsStore.addToCurrentExecutions([
				{ id: '1', workflowId: 'wf-1' } as ExecutionSummary,
				{ id: '2', workflowId: 'wf-1' } as ExecutionSummary,
			]);

			expect(workflowsStore.currentWorkflowExecutions).toHaveLength(2);
			expect(workflowsStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['1', '2']);
		});

		it('clearCurrentWorkflowExecutions empties the list', () => {
			workflowsStore.setCurrentWorkflowExecutions([
				{ id: '1', workflowId: 'wf-1' } as ExecutionSummary,
				{ id: '2', workflowId: 'wf-1' } as ExecutionSummary,
			]);
			expect(workflowsStore.currentWorkflowExecutions).toHaveLength(2);

			workflowsStore.clearCurrentWorkflowExecutions();

			expect(workflowsStore.currentWorkflowExecutions).toEqual([]);
		});

		it('setCurrentWorkflowExecutions replaces the list', () => {
			workflowsStore.setCurrentWorkflowExecutions([
				{ id: '1', workflowId: 'wf-1' } as ExecutionSummary,
			]);
			workflowsStore.setCurrentWorkflowExecutions([
				{ id: '2', workflowId: 'wf-1' } as ExecutionSummary,
				{ id: '3', workflowId: 'wf-1' } as ExecutionSummary,
			]);

			expect(workflowsStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['2', '3']);
		});

		it('deleteExecution removes from the list', () => {
			const exec1 = { id: '1', workflowId: 'wf-1' } as ExecutionSummary;
			const exec2 = { id: '2', workflowId: 'wf-1' } as ExecutionSummary;
			workflowsStore.setCurrentWorkflowExecutions([exec1, exec2]);

			workflowsStore.deleteExecution(exec1);

			expect(workflowsStore.currentWorkflowExecutions).toEqual([exec2]);
		});
	});

	describe('activeExecutionId tri-state', () => {
		it('starts undefined (not tracking)', () => {
			expect(workflowsStore.activeExecutionId).toBeUndefined();
		});

		it('null indicates execution started but id pending', () => {
			workflowsStore.private.setActiveExecutionId(null);
			expect(workflowsStore.activeExecutionId).toBeNull();
		});

		it('string indicates known execution id', () => {
			workflowsStore.private.setActiveExecutionId('exec-1');
			expect(workflowsStore.activeExecutionId).toBe('exec-1');
		});

		it('rolls activeExecutionId into previousExecutionId on transition to a new id', () => {
			workflowsStore.private.setActiveExecutionId('exec-1');
			workflowsStore.private.setActiveExecutionId('exec-2');
			expect(workflowsStore.previousExecutionId).toBe('exec-1');
			expect(workflowsStore.activeExecutionId).toBe('exec-2');
		});

		it('does not update previousExecutionId when clearing to undefined', () => {
			workflowsStore.private.setActiveExecutionId('exec-1');
			workflowsStore.private.setActiveExecutionId(undefined);
			expect(workflowsStore.previousExecutionId).toBeUndefined();
			expect(workflowsStore.activeExecutionId).toBeUndefined();
		});
	});
});
