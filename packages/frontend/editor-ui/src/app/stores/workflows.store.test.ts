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

import type { IConnection, IConnections, INodeTypeDescription } from 'n8n-workflow';
import { useUIStore } from '@/app/stores/ui.store';
import * as apiUtils from '@n8n/rest-api-client';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
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
const communityNodeType = vi.fn();
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
		communityNodeType,
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
		expect(workflowsStore.workflow.id).toBe('');
	});

	describe('workflowValidationIssues', () => {
		it('collects issues only from connected, enabled nodes', () => {
			const connections: IConnections = {
				Start: {
					main: [
						[
							{
								node: 'Fetch',
								type: 'main',
								index: 0,
							},
						],
					],
				},
			};

			workflowsStore.workflow.nodes = [
				{
					id: 'start',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
				},
				{
					id: 'fetch',
					name: 'Fetch',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					parameters: {},
					issues: {
						parameters: {
							url: ['Missing URL', 'Invalid URL.'],
						},
						credentials: {
							httpBasicAuth: ['Credentials not set'],
						},
					},
					position: [300, 0],
				},
				{
					id: 'orphan',
					name: 'Disconnected',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					parameters: {},
					issues: {
						parameters: { field: ['Should be ignored'] },
					},
					position: [0, 400],
				},
				{
					id: 'disabled',
					name: 'Disabled Node',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					disabled: true,
					parameters: {},
					issues: {
						parameters: { field: ['Disabled issue'] },
					},
					position: [0, 600],
				},
			];
			workflowsStore.workflow.connections = connections;

			const issues = workflowsStore.workflowValidationIssues;
			expect(issues).toEqual([
				{ node: 'Fetch', type: 'parameters', value: ['Missing URL', 'Invalid URL.'] },
				{ node: 'Fetch', type: 'credentials', value: ['Credentials not set'] },
			]);
		});
	});

	describe('formatIssueMessage', () => {
		it('joins array entries and trims trailing period', () => {
			const message = workflowsStore.formatIssueMessage(['Missing URL', 'Invalid value.']);
			expect(message).toBe('Missing URL, Invalid value');
		});

		it('returns string representation for non-array values', () => {
			expect(workflowsStore.formatIssueMessage('Simple issue.')).toBe('Simple issue.');
		});
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

	describe('workflowTriggerNodes', () => {
		it('should return only nodes that are triggers', () => {
			getNodeType.mockImplementation(
				(nodeTypeName: string) =>
					({
						group: nodeTypeName === 'triggerNode' ? ['trigger'] : [],
						inputs: [],
						webhooks: [],
						properties: [],
					}) as Partial<INodeTypeDescription> | null,
			);

			workflowsStore.workflow.nodes = [
				{ type: 'triggerNode', typeVersion: '1' },
				{ type: 'nonTriggerNode', typeVersion: '1' },
			] as unknown as IWorkflowDb['nodes'];

			expect(workflowsStore.workflowTriggerNodes).toHaveLength(1);
			expect(workflowsStore.workflowTriggerNodes[0].type).toBe('triggerNode');
		});

		it('should return empty array when no nodes are triggers', () => {
			workflowsStore.workflow.nodes = [
				{ type: 'nonTriggerNode1', typeVersion: '1' },
				{ type: 'nonTriggerNode2', typeVersion: '1' },
			] as unknown as IWorkflowDb['nodes'];

			expect(workflowsStore.workflowTriggerNodes).toHaveLength(0);
		});
	});

	describe('currentWorkflowHasWebhookNode', () => {
		it('should return true when a node has a webhookId', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', webhookId: 'webhook1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasWebhookNode = workflowsStore.currentWorkflowHasWebhookNode;
			expect(hasWebhookNode).toBe(true);
		});

		it('should return false when no nodes have a webhookId', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasWebhookNode = workflowsStore.currentWorkflowHasWebhookNode;
			expect(hasWebhookNode).toBe(false);
		});

		it('should return false when there are no nodes', () => {
			workflowsStore.workflow.nodes = [];

			const hasWebhookNode = workflowsStore.currentWorkflowHasWebhookNode;
			expect(hasWebhookNode).toBe(false);
		});
	});

	describe('nodesIssuesExist', () => {
		it('should return true when a node has issues and connected', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', issues: { error: ['Error message'] } },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			workflowsStore.workflow.connections = {
				Node1: { main: [[{ node: 'Node2' } as IConnection]] },
			};

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(true);
		});

		it('should return false when node has issues but it is not connected', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', issues: { error: ['Error message'] } },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(false);
		});

		it('should return false when no nodes have issues', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			workflowsStore.workflow.connections = {
				Node1: { main: [[{ node: 'Node2' } as IConnection]] },
			};

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(false);
		});

		it('should return false when there are no nodes', () => {
			workflowsStore.workflow.nodes = [];

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(false);
		});
	});

	describe('isNodeInOutgoingNodeConnections()', () => {
		it('should return false when no outgoing connections from root node', () => {
			workflowsStore.workflow.connections = {};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(false);
		});

		it('should return true when search node is directly connected to root node', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(true);
		});

		it('should return true when search node is indirectly connected to root node', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(true);
		});

		it('should return false when search node is not connected to root node', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'AnotherNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(false);
		});

		it('should return true if connection is indirect within `depth`', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode', 2);
			expect(result).toBe(true);
		});

		it('should return false if connection is indirect beyond `depth`', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode', 1);
			expect(result).toBe(false);
		});

		it('should return false if depth is 0', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode', 0);
			expect(result).toBe(false);
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
			workflowsStore.workflow.id = '1';

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
			workflowsStore.workflow.id = '1';

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
			workflowsStore.workflow.id = '1';
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
			workflowsStore.workflow.id = '1';
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

	describe('findNodeByPartialId', () => {
		test.each([
			[[], 'D', undefined],
			[['A', 'B', 'C'], 'D', undefined],
			[['A', 'B', 'C'], 'B', 1],
			[['AA', 'BB', 'CC'], 'B', 1],
			[['AA', 'BB', 'BC'], 'B', 1],
			[['AA', 'BB', 'BC'], 'BC', 2],
		] as Array<[string[], string, number | undefined]>)(
			'with input %s , %s returns node with index %s',
			(ids, id, expectedIndex) => {
				workflowsStore.workflow.nodes = ids.map((x) => ({ id: x }) as never);

				expect(workflowsStore.findNodeByPartialId(id)).toBe(
					workflowsStore.workflow.nodes[expectedIndex ?? -1],
				);
			},
		);
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
				workflowsStore.workflow.nodes = ids.map((x) => ({ id: x }) as never);

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
			workflowsStore.workflow.active = true;
			workflowsStore.workflow.id = workflowId;
			workflowsStore.workflow.versionId = versionId;

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
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
			workflowsStore.workflow.id = workflowId;
			workflowsStore.workflow.versionId = versionId;

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
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
			workflowsStore.workflow.active = false;
			workflowsStore.workflow.id = workflowId;
			workflowsStore.workflow.versionId = versionId;

			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
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
			workflowsStore.workflow.id = 'w1';
			workflowsStore.workflow.versionId = 'v1';
			workflowsStore.workflow.settings = {
				executionOrder: 'v1',
				timezone: 'UTC',
			};

			// Also populate the document store since updateWorkflowSetting reads from it
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
			expect(workflowsStore.workflow.versionId).toBe('v1');
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

	describe('assignCredentialToMatchingNodes', () => {
		beforeEach(() => {
			// Reset mock
			getNodeType.mockReset();
		});

		it("should assign credential to nodes that support it but don't have it set", () => {
			const credential = { id: 'cred-1', name: 'Test Credential' };
			const credentialType = 'slackApi';

			// Set up nodes with different scenarios
			workflowsStore.workflow.nodes = [
				createTestNode({
					name: 'Current Node',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'Slack Node 1',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'Slack Node 2',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
			];

			// Mock getNodeType to return node type with credential support
			getNodeType.mockReturnValue({
				credentials: [{ name: 'slackApi', required: true }],
				inputs: [],
				group: [],
				webhooks: [],
				properties: [],
			});

			// Simulate setting credential on the first node
			const result = workflowsStore.assignCredentialToMatchingNodes({
				credentials: credential,
				type: credentialType,
				currentNodeName: 'Current Node',
			});

			expect(result).toBe(2); // Should update 2 nodes (excluding current node)
			expect(workflowsStore.workflow.nodes[1].credentials).toEqual({
				slackApi: credential,
			});
			expect(workflowsStore.workflow.nodes[2].credentials).toEqual({
				slackApi: credential,
			});
		});

		it('should not overwrite existing credentials of the same type', () => {
			const newCredential = { id: 'cred-new', name: 'New Credential' };
			const existingCredential = { id: 'cred-old', name: 'Existing Credential' };
			const credentialType = 'slackApi';

			workflowsStore.workflow.nodes = [
				createTestNode({
					name: 'Current Node',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'Node With Existing Cred',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					credentials: {
						slackApi: existingCredential,
					},
				}),
				createTestNode({
					name: 'Node Without Cred',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
			];

			getNodeType.mockReturnValue({
				credentials: [{ name: 'slackApi', required: true }],
				inputs: [],
				group: [],
				webhooks: [],
				properties: [],
			});

			// Simulate assigning new credential to the first node
			const result = workflowsStore.assignCredentialToMatchingNodes({
				credentials: newCredential,
				type: credentialType,
				currentNodeName: 'Current Node',
			});

			expect(result).toBe(1); // Only 1 node updated (the one without credentials)
			expect(workflowsStore.workflow.nodes[1].credentials?.slackApi).toEqual(existingCredential); // Unchanged
			expect(workflowsStore.workflow.nodes[2].credentials?.slackApi).toEqual(newCredential); // Updated
		});

		it("should not affect nodes that don't support the credential type", () => {
			const credential = { id: 'cred-1', name: 'Test Credential' };
			const credentialType = 'slackApi';

			workflowsStore.workflow.nodes = [
				createTestNode({
					name: 'Current Node',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'Slack Node',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'HTTP Node',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
				}),
			];

			// Mock getNodeType to return different credentials for different node types
			getNodeType.mockImplementation((nodeType: string) => {
				if (nodeType === 'n8n-nodes-base.slack') {
					return {
						credentials: [{ name: 'slackApi', required: true }],
						inputs: [],
						group: [],
						webhooks: [],
						properties: [],
					};
				}
				return {
					credentials: [{ name: 'httpBasicAuth', required: false }],
					inputs: [],
					group: [],
					webhooks: [],
					properties: [],
				};
			});

			// Simulate assigning credential to the first node
			const result = workflowsStore.assignCredentialToMatchingNodes({
				credentials: credential,
				type: credentialType,
				currentNodeName: 'Current Node',
			});

			expect(result).toBe(1); // Only the Slack node updated
			expect(workflowsStore.workflow.nodes[1].credentials?.slackApi).toEqual(credential);
			expect(workflowsStore.workflow.nodes[2].credentials).toBeUndefined(); // HTTP node unchanged
		});

		it('should handle nodes with no credential support', () => {
			const credential = { id: 'cred-1', name: 'Test Credential' };
			const credentialType = 'slackApi';

			workflowsStore.workflow.nodes = [
				createTestNode({
					name: 'Current Node',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'Node Without Creds Support',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
				}),
			];

			getNodeType.mockImplementation((nodeType: string) => {
				if (nodeType === 'n8n-nodes-base.slack') {
					return {
						credentials: [{ name: 'slackApi', required: true }],
						inputs: [],
						group: [],
						webhooks: [],
						properties: [],
					};
				}
				// Return node type without credentials field
				return {
					inputs: [],
					group: [],
					webhooks: [],
					properties: [],
				};
			});

			// Simulate assigning credential to the first node
			const result = workflowsStore.assignCredentialToMatchingNodes({
				credentials: credential,
				type: credentialType,
				currentNodeName: 'Current Node',
			});

			expect(result).toBe(0); // No nodes updated
			expect(workflowsStore.workflow.nodes[1].credentials).toBeUndefined();
		});

		it('should not assign credential to nodes where displayOptions do not match current parameters', () => {
			const credential = { id: 'cred-1', name: 'Header Auth Credential' };
			const credentialType = 'httpHeaderAuth';

			workflowsStore.workflow.nodes = [
				createTestNode({
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
				}),
				createTestNode({
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					parameters: { authentication: 'none' },
				}),
			];

			getNodeType.mockImplementation((nodeType: string) => {
				if (nodeType === 'n8n-nodes-base.httpRequest') {
					return {
						credentials: [{ name: 'httpHeaderAuth', required: false }],
						inputs: [],
						group: [],
						webhooks: [],
						properties: [],
					};
				}
				// Webhook supports httpHeaderAuth but only when authentication = 'headerAuth'
				return {
					credentials: [
						{
							name: 'httpHeaderAuth',
							required: false,
							displayOptions: { show: { authentication: ['headerAuth'] } },
						},
					],
					inputs: [],
					group: [],
					webhooks: [],
					properties: [
						{
							displayName: 'Authentication',
							name: 'authentication',
							type: 'options',
							default: 'none',
							options: [
								{ name: 'None', value: 'none' },
								{ name: 'Header Auth', value: 'headerAuth' },
							],
						},
					],
				};
			});

			const result = workflowsStore.assignCredentialToMatchingNodes({
				credentials: credential,
				type: credentialType,
				currentNodeName: 'HTTP Request',
			});

			expect(result).toBe(0); // Webhook should NOT get the credential (authentication is 'none')
			expect(workflowsStore.workflow.nodes[1].credentials).toBeUndefined();
		});

		it('should return 0 when there are no matching nodes', () => {
			const credential = { id: 'cred-1', name: 'Test Credential' };
			const credentialType = 'slackApi';

			workflowsStore.workflow.nodes = [
				createTestNode({
					name: 'Current Node',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
				}),
			];

			getNodeType.mockReturnValue({
				credentials: [{ name: 'slackApi', required: true }],
				inputs: [],
				group: [],
				webhooks: [],
				properties: [],
			});

			// Simulate assigning credential to the first node
			const result = workflowsStore.assignCredentialToMatchingNodes({
				credentials: credential,
				type: credentialType,
				currentNodeName: 'Current Node',
			});

			expect(result).toBe(0); // No nodes to update (only current node exists)
		});
	});

	describe('getWebhookUrl', () => {
		it('should return undefined when node does not exist', async () => {
			workflowsStore.workflow.nodes = [];

			const result = await workflowsStore.getWebhookUrl('non-existent-node', 'test');

			expect(result).toBeUndefined();
		});

		it('should return undefined when node type does not exist', async () => {
			const testNode = createTestNode({ id: 'node-1', name: 'Webhook Node' });
			workflowsStore.workflow.nodes = [testNode];
			getNodeType.mockReturnValue(null);

			const result = await workflowsStore.getWebhookUrl('node-1', 'test');

			expect(result).toBeUndefined();
		});

		it('should return undefined when node type has no webhooks', async () => {
			const testNode = createTestNode({ id: 'node-1', name: 'Webhook Node' });
			workflowsStore.workflow.nodes = [testNode];
			getNodeType.mockReturnValue({
				inputs: [],
				group: [],
				webhooks: [],
				properties: [],
			});

			const result = await workflowsStore.getWebhookUrl('node-1', 'test');

			expect(result).toBeUndefined();
		});

		it('should return webhook URL for test type', async () => {
			const testNode = createTestNode({
				id: 'node-1',
				name: 'Webhook Node',
				type: 'n8n-nodes-base.webhook',
			});
			workflowsStore.workflow.nodes = [testNode];
			getNodeType.mockReturnValue({
				inputs: [],
				group: [],
				webhooks: [{ name: 'default', httpMethod: 'GET', path: 'webhook' }],
				properties: [],
			});

			const result = await workflowsStore.getWebhookUrl('node-1', 'test');

			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
			expect(result).toContain('webhook');
		});

		it('should return webhook URL for production type', async () => {
			const testNode = createTestNode({
				id: 'node-1',
				name: 'Webhook Node',
				type: 'n8n-nodes-base.webhook',
			});
			workflowsStore.workflow.nodes = [testNode];
			getNodeType.mockReturnValue({
				inputs: [],
				group: [],
				webhooks: [{ name: 'default', httpMethod: 'POST', path: 'webhook' }],
				properties: [],
			});

			const result = await workflowsStore.getWebhookUrl('node-1', 'production');

			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
			expect(result).toContain('webhook');
		});

		it('should use the first webhook when node has multiple webhooks', async () => {
			workflowsStore.workflow.id = 'test-workflow-id';
			const testNode = createTestNode({
				id: 'node-1',
				name: 'Webhook Node',
				type: 'n8n-nodes-base.webhook',
			});
			workflowsStore.workflow.nodes = [testNode];
			getNodeType.mockReturnValue({
				inputs: [],
				group: [],
				webhooks: [
					{ name: 'default', httpMethod: 'GET', path: 'webhook1' },
					{ name: 'default', httpMethod: 'POST', path: 'webhook2' },
				],
				properties: [],
			});

			const result = await workflowsStore.getWebhookUrl('node-1', 'test');

			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
			expect(result).toContain('webhook1');
		});
	});

	describe('getNodeTypes() - getByNameAndVersion', () => {
		beforeEach(() => {
			setActivePinia(createPinia());
			workflowsStore = useWorkflowsStore();
		});

		it('should return node type for core nodes', () => {
			const mockNodeType = mockNodeTypeDescription({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
			});

			getNodeType.mockReturnValue(mockNodeType);

			const nodeTypes = workflowsStore.getNodeTypes();
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-base.httpRequest', 1);

			expect(result).toBeDefined();
			expect(result?.description.name).toBe('n8n-nodes-base.httpRequest');
		});

		it('should fallback to community node type when core node not found', () => {
			const mockCommunityNodeDescription = mockNodeTypeDescription({
				name: 'n8n-nodes-test.test',
				displayName: 'Test Node',
			});

			getNodeType.mockReturnValue(null);

			communityNodeType.mockReturnValue({
				name: 'n8n-nodes-test.test',
				packageName: 'n8n-nodes-test',
				checksum: 'test-checksum',
				npmVersion: '1.0.0',
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				numberOfStars: 0,
				numberOfDownloads: 0,
				authorGithubUrl: '',
				authorName: '',
				description: '',
				displayName: 'Test Node',
				isOfficialNode: false,
				nodeDescription: mockCommunityNodeDescription,
				isInstalled: false,
			});

			const nodeTypes = workflowsStore.getNodeTypes();
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-test.test');

			expect(result).toBeDefined();
			expect(result?.description.name).toBe('n8n-nodes-test.test');
		});

		it('should return undefined when node type is not found', () => {
			getNodeType.mockReturnValue(null);

			communityNodeType.mockReturnValue(undefined);

			const nodeTypes = workflowsStore.getNodeTypes();
			const result = nodeTypes.getByNameAndVersion('non-existent-node');

			expect(result).toBeUndefined();
		});

		it('should use community node description when available and core node is null', () => {
			const mockCommunityNodeDescription = mockNodeTypeDescription({
				name: 'n8n-nodes-community.customNode',
				displayName: 'Custom Community Node',
				inputs: ['main'],
				outputs: ['main'],
			});

			getNodeType.mockReturnValue(null);

			communityNodeType.mockReturnValue({
				name: 'n8n-nodes-community.customNode',
				packageName: 'n8n-nodes-community',
				checksum: 'test-checksum',
				npmVersion: '1.0.0',
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				numberOfStars: 10,
				numberOfDownloads: 100,
				authorGithubUrl: '',
				authorName: '',
				description: '',
				displayName: 'Custom Community Node',
				isOfficialNode: false,
				nodeDescription: mockCommunityNodeDescription,
				isInstalled: true,
			});

			const nodeTypes = workflowsStore.getNodeTypes();
			const result = nodeTypes.getByNameAndVersion('n8n-nodes-community.customNode');

			expect(result).toBeDefined();
			expect(result?.description.name).toBe('n8n-nodes-community.customNode');
			expect(result?.description.displayName).toBe('Custom Community Node');
		});
	});
});
