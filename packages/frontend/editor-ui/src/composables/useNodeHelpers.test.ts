import { setActivePinia } from 'pinia';
import type {
	ExecutionStatus,
	IRunData,
	INode,
	INodeTypeDescription,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { createTestNode, createMockEnterpriseSettings } from '@/__tests__/mocks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { CUSTOM_API_CALL_KEY, EnterpriseEditionFeature } from '@/constants';
import { mockedStore } from '@/__tests__/utils';
import { mock } from 'vitest-mock-extended';
import { faker } from '@faker-js/faker';
import type { INodeUi, IUsedCredential } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

describe('useNodeHelpers()', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('isNodeExecutable()', () => {
		it('should return true if the node is null but explicitly executable', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const result = isNodeExecutable(null, true, []);
			expect(result).toBe(true);
		});

		it('should return false if node has no Main input and is not trigger or tool', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const node: INodeUi = {
				id: 'node-id',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = {
				id: 'workflow-id',
				getNode: () => node,
			};

			mockedStore(useWorkflowsStore).getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue({});
			mockedStore(useNodeTypesStore).isTriggerNode = vi.fn().mockReturnValue(false);
			mockedStore(useNodeTypesStore).isToolNode = vi.fn().mockReturnValue(false);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([NodeConnectionTypes.AiDocument]);

			const result = isNodeExecutable(node, true, []);
			expect(result).toBe(false);
		});

		it('should return true if node has Main input and is marked executable', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const node: INodeUi = {
				id: 'node-id',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = {
				getNode: () => node,
			};

			mockedStore(useWorkflowsStore).getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue({});
			mockedStore(useNodeTypesStore).isTriggerNode = vi.fn().mockReturnValue(false);
			mockedStore(useNodeTypesStore).isToolNode = vi.fn().mockReturnValue(false);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([NodeConnectionTypes.Main]);

			const result = isNodeExecutable(node, true, []);
			expect(result).toBe(true);
		});

		it('should return true if node has foreign credentials even if not marked executable', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const node: INodeUi = {
				id: 'node-id',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = {
				getNode: () => node,
			};

			mockedStore(useWorkflowsStore).getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue({});
			mockedStore(useNodeTypesStore).isTriggerNode = vi.fn().mockReturnValue(false);
			mockedStore(useNodeTypesStore).isToolNode = vi.fn().mockReturnValue(false);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([NodeConnectionTypes.Main]);

			const result = isNodeExecutable(node, false, ['foreign-cred-id']);
			expect(result).toBe(true);
		});

		it('should return true for trigger nodes regardless of inputs', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const triggerNode: INodeUi = {
				id: 'node-id',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = {
				getNode: () => triggerNode,
			};

			mockedStore(useWorkflowsStore).getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue({});
			mockedStore(useNodeTypesStore).isTriggerNode = vi.fn().mockReturnValue(true);
			mockedStore(useNodeTypesStore).isToolNode = vi.fn().mockReturnValue(false);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([]);

			const result = isNodeExecutable(triggerNode, true, []);
			expect(result).toBe(true);
		});

		it('should return true for tool nodes regardless of inputs', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const toolNode: INodeUi = {
				id: 'node-id',
				name: 'Tool Node',
				type: 'n8n-nodes-base.ai-tool',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = {
				getNode: () => toolNode,
			};

			mockedStore(useWorkflowsStore).getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue({});
			mockedStore(useNodeTypesStore).isTriggerNode = vi.fn().mockReturnValue(false);
			mockedStore(useNodeTypesStore).isToolNode = vi.fn().mockReturnValue(true);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([]);

			const result = isNodeExecutable(toolNode, true, []);
			expect(result).toBe(true);
		});

		it('should return true if node is structurally valid and has foreign credentials, even if not executable', () => {
			const { isNodeExecutable } = useNodeHelpers();

			const node: INodeUi = {
				id: 'node-id',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = {
				getNode: () => node,
			};

			mockedStore(useWorkflowsStore).getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue({});
			mockedStore(useNodeTypesStore).isTriggerNode = vi.fn().mockReturnValue(false);
			mockedStore(useNodeTypesStore).isToolNode = vi.fn().mockReturnValue(false);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
			vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([NodeConnectionTypes.Main]);

			const result = isNodeExecutable(node, false, ['cred-1']);
			expect(result).toBe(true);
		});
	});

	describe('getForeignCredentialsIfSharingEnabled()', () => {
		it('should return an empty array when user has the wrong license', () => {
			const { getForeignCredentialsIfSharingEnabled } = useNodeHelpers();

			const credentialWithoutAccess: IUsedCredential = {
				id: faker.string.alphanumeric(10),
				credentialType: 'generic',
				name: faker.lorem.words(2),
				currentUserHasAccess: false,
			};

			mockedStore(useSettingsStore).isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.Sharing]: false,
			});
			mockedStore(useWorkflowsStore).usedCredentials = {
				[credentialWithoutAccess.id]: credentialWithoutAccess,
			};

			const result = getForeignCredentialsIfSharingEnabled({
				[credentialWithoutAccess.id]: {
					id: credentialWithoutAccess.id,
					name: credentialWithoutAccess.name,
				},
			});
			expect(result).toEqual([]);
		});

		it('should return an empty array when credentials are undefined', () => {
			const { getForeignCredentialsIfSharingEnabled } = useNodeHelpers();

			mockedStore(useSettingsStore).isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.Sharing]: true,
			});

			const result = getForeignCredentialsIfSharingEnabled(undefined);
			expect(result).toEqual([]);
		});

		it('should return an empty array when user has access to all credentials', () => {
			const { getForeignCredentialsIfSharingEnabled } = useNodeHelpers();

			const credentialWithAccess1: IUsedCredential = {
				id: faker.string.alphanumeric(10),
				credentialType: 'generic',
				name: faker.lorem.words(2),
				currentUserHasAccess: true,
			};

			const credentialWithAccess2: IUsedCredential = {
				id: faker.string.alphanumeric(10),
				credentialType: 'generic',
				name: faker.lorem.words(2),
				currentUserHasAccess: true,
			};

			mockedStore(useSettingsStore).isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.Sharing]: true,
			});
			mockedStore(useWorkflowsStore).usedCredentials = {
				[credentialWithAccess1.id]: credentialWithAccess1,
				[credentialWithAccess2.id]: credentialWithAccess2,
			};

			const result = getForeignCredentialsIfSharingEnabled({
				[credentialWithAccess1.id]: {
					id: credentialWithAccess1.id,
					name: credentialWithAccess1.name,
				},
				[credentialWithAccess2.id]: {
					id: credentialWithAccess2.id,
					name: credentialWithAccess2.name,
				},
			});
			expect(result).toEqual([]);
		});

		it('should return an array of foreign credentials', () => {
			const { getForeignCredentialsIfSharingEnabled } = useNodeHelpers();

			const credentialWithAccess: IUsedCredential = {
				id: faker.string.alphanumeric(10),
				credentialType: 'generic',
				name: faker.lorem.words(2),
				currentUserHasAccess: true,
			};

			const credentialWithoutAccess: IUsedCredential = {
				id: faker.string.alphanumeric(10),
				credentialType: 'generic',
				name: faker.lorem.words(2),
				currentUserHasAccess: false,
			};

			mockedStore(useSettingsStore).isEnterpriseFeatureEnabled = createMockEnterpriseSettings({
				[EnterpriseEditionFeature.Sharing]: true,
			});
			mockedStore(useWorkflowsStore).usedCredentials = {
				[credentialWithAccess.id]: credentialWithAccess,
				[credentialWithoutAccess.id]: credentialWithoutAccess,
			};

			const result = getForeignCredentialsIfSharingEnabled({
				[credentialWithAccess.id]: {
					id: credentialWithAccess.id,
					name: credentialWithAccess.name,
				},
				[credentialWithoutAccess.id]: {
					id: credentialWithoutAccess.id,
					name: credentialWithoutAccess.name,
				},
			});
			expect(result).toEqual([credentialWithoutAccess.id]);
		});
	});

	describe('isCustomApiCallSelected', () => {
		test('should return `true` when resource includes `CUSTOM_API_CALL_KEY`', () => {
			const nodeValues = {
				parameters: { resource: CUSTOM_API_CALL_KEY },
			};
			expect(useNodeHelpers().isCustomApiCallSelected(nodeValues)).toBe(true);
		});

		test('should return `true` when operation includes `CUSTOM_API_CALL_KEY`', () => {
			const nodeValues = {
				parameters: {
					operation: CUSTOM_API_CALL_KEY,
				},
			};
			expect(useNodeHelpers().isCustomApiCallSelected(nodeValues)).toBe(true);
		});

		test('should return `false` when neither resource nor operation includes `CUSTOM_API_CALL_KEY`', () => {
			const nodeValues = {
				parameters: {
					resource: 'users',
					operation: 'get',
				},
			};
			expect(useNodeHelpers().isCustomApiCallSelected(nodeValues)).toBe(false);
		});
	});

	describe('getNodeInputData()', () => {
		it('should return an empty array when node is null', () => {
			const { getNodeInputData } = useNodeHelpers();

			const result = getNodeInputData(null);
			expect(result).toEqual([]);
		});

		it('should return an empty array when runData is not available', () => {
			mockedStore(useWorkflowsStore).getWorkflowRunData = null;
			const { getNodeInputData } = useNodeHelpers();
			const node = createTestNode({
				name: 'test',
				type: 'test',
			});

			const result = getNodeInputData(node);
			expect(result).toEqual([]);
		});

		it('should return an empty array when taskData is unavailable', () => {
			const nodeName = 'Code';
			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [],
			});
			const { getNodeInputData } = useNodeHelpers();
			const node = createTestNode({
				name: nodeName,
				type: 'test',
			});

			const result = getNodeInputData(node);
			expect(result).toEqual([]);
		});

		it('should return an empty array when taskData.data is unavailable', () => {
			const nodeName = 'Code';
			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [{ data: undefined }],
			});
			const { getNodeInputData } = useNodeHelpers();
			const node = createTestNode({
				name: nodeName,
				type: 'test',
			});

			const result = getNodeInputData(node);
			expect(result).toEqual([]);
		});

		it('should return input data from inputOverride', () => {
			const nodeName = 'Code';
			const data = [{ json: { hello: 'world' } }];
			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [
					{
						inputOverride: {
							main: [data],
						},
					},
				],
			});
			const { getNodeInputData } = useNodeHelpers();
			const node = createTestNode({
				name: nodeName,
				type: 'test',
			});

			const result = getNodeInputData(node, 0, 0, 'input');
			expect(result).toEqual(data);
		});

		it.each(['example', 'example.withdot', 'example.with.dots', 'example.with.dots and spaces'])(
			'should return input data for "%s" node name, with given connection type and output index',
			(nodeName) => {
				const data = [{ json: { hello: 'world' } }];
				mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
					[nodeName]: [{ data: { main: [data] } }],
				});
				const { getNodeInputData } = useNodeHelpers();
				const node = createTestNode({
					name: nodeName,
					type: 'test',
				});

				const result = getNodeInputData(node);
				expect(result).toEqual(data);
			},
		);
	});

	describe('getLastRunIndexWithData()', () => {
		const mockData = [{ json: { hello: 'world' } }];
		it('should return the last runIndex with data', () => {
			const nodeName = 'Test Node';
			const { getLastRunIndexWithData } = useNodeHelpers();

			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [{ data: { main: [mockData] } }, { data: { main: [mockData] } }],
			});
			expect(getLastRunIndexWithData(nodeName)).toEqual(1);
		});

		it('should return -1 when there are no runs', () => {
			const nodeName = 'Test Node';
			const { getLastRunIndexWithData } = useNodeHelpers();

			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [],
			});
			expect(getLastRunIndexWithData(nodeName)).toEqual(-1);
		});

		it('should return -1 when there is no runData', () => {
			const nodeName = 'Test Node';
			const { getLastRunIndexWithData } = useNodeHelpers();

			mockedStore(useWorkflowsStore).getWorkflowRunData = null;
			expect(getLastRunIndexWithData(nodeName)).toEqual(-1);
		});

		it('should work with custom outputIndex', () => {
			const nodeName = 'Test Node';
			const { getLastRunIndexWithData } = useNodeHelpers();

			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [
					{ data: { main: [mockData, []] } },
					{ data: { main: [mockData, []] } },
					{ data: { main: [mockData, mockData] } },
					{ data: { main: [[], mockData] } },
					{ data: { main: [[], []] } },
				],
			});
			expect(getLastRunIndexWithData(nodeName, 1)).toEqual(3);
		});

		it('should work with custom connectionType', () => {
			const nodeName = 'Test Node';
			const { getLastRunIndexWithData } = useNodeHelpers();

			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [
					{ data: { main: [mockData], ai_tool: [mockData] } },
					{ data: { ai_tool: [mockData] } },
					{ data: { main: [mockData] } },
				],
			});
			expect(getLastRunIndexWithData(nodeName, 0, 'ai_tool')).toEqual(1);
		});
	});

	describe('hasNodeExecuted()', () => {
		it('should return false when runData is not available', () => {
			const nodeName = 'Test Node';
			mockedStore(useWorkflowsStore).getWorkflowRunData = null;
			const { hasNodeExecuted } = useNodeHelpers();
			expect(hasNodeExecuted(nodeName)).toBe(false);
		});

		it.each<{ status?: ExecutionStatus; expected: boolean }>([
			{ status: undefined, expected: false },
			{ status: 'waiting', expected: false },
			{ status: 'running', expected: false },
			{ status: 'error', expected: true },
			{ status: 'success', expected: true },
		])('should return $expected when execution status is $status', ({ status, expected }) => {
			const nodeName = 'Test Node';

			mockedStore(useWorkflowsStore).getWorkflowRunData = mock<IRunData>({
				[nodeName]: [{ executionStatus: status }],
			});
			const { hasNodeExecuted } = useNodeHelpers();
			expect(hasNodeExecuted(nodeName)).toBe(expected);
		});
	});

	describe('assignNodeId()', () => {
		it('should assign a unique id to the node', () => {
			const { assignNodeId } = useNodeHelpers();
			const node = createTestNode({
				id: '',
			});

			assignNodeId(node);
			expect(node.id).not.toBe('');
			expect(node.id).toMatch(/\w+(-\w+)+/);
		});
	});

	describe('assignWebhookId', () => {
		it('should assign a unique id to the webhook', () => {
			const { assignWebhookId } = useNodeHelpers();
			const webhook = createTestNode({
				id: '',
			});

			assignWebhookId(webhook);
			expect(webhook.webhookId).not.toBe('');
			expect(webhook.webhookId).toMatch(/\w+(-\w+)+/);
		});
	});

	describe('isSingleExecution', () => {
		let isSingleExecution: ReturnType<typeof useNodeHelpers>['isSingleExecution'];
		beforeEach(() => {
			isSingleExecution = useNodeHelpers().isSingleExecution;
		});

		test('should determine based on node parameters if it would be executed once', () => {
			expect(isSingleExecution('n8n-nodes-base.code', {})).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.code', { mode: 'runOnceForEachItem' })).toEqual(
				false,
			);
			expect(isSingleExecution('n8n-nodes-base.executeWorkflow', {})).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.executeWorkflow', { mode: 'each' })).toEqual(false);
			expect(isSingleExecution('n8n-nodes-base.crateDb', {})).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.crateDb', { operation: 'update' })).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.timescaleDb', {})).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.timescaleDb', { operation: 'update' })).toEqual(
				true,
			);
			expect(isSingleExecution('n8n-nodes-base.microsoftSql', {})).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.microsoftSql', { operation: 'update' })).toEqual(
				true,
			);
			expect(isSingleExecution('n8n-nodes-base.microsoftSql', { operation: 'delete' })).toEqual(
				true,
			);
			expect(isSingleExecution('n8n-nodes-base.questDb', {})).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.mongoDb', { operation: 'insert' })).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.mongoDb', { operation: 'update' })).toEqual(true);
			expect(isSingleExecution('n8n-nodes-base.redis', {})).toEqual(true);
		});
	});

	describe('getNodeHints', () => {
		let getNodeHints: ReturnType<typeof useNodeHelpers>['getNodeHints'];
		beforeEach(() => {
			getNodeHints = useNodeHelpers().getNodeHints;
		});

		//TODO: Add more tests here when hints are added to some node types
		test('should return node hints if present in node type', () => {
			const testType = {
				hints: [
					{
						message: 'TEST HINT',
					},
				],
			} as INodeTypeDescription;

			const workflow = {} as unknown as Workflow;

			const node: INode = {
				name: 'Test Node Hints',
			} as INode;
			const nodeType = testType;

			const hints = getNodeHints(workflow, node, nodeType);

			expect(hints).toHaveLength(1);
			expect(hints[0].message).toEqual('TEST HINT');
		});
		test('should not include hint if displayCondition is false', () => {
			const testType = {
				hints: [
					{
						message: 'TEST HINT',
						displayCondition: 'FALSE DISPLAY CONDITION EXPESSION',
					},
				],
			} as INodeTypeDescription;

			const workflow = {
				expression: {
					getSimpleParameterValue(
						_node: string,
						_parameter: string,
						_mode: string,
						_additionalData = {},
					) {
						return false;
					},
				},
			} as unknown as Workflow;

			const node: INode = {
				name: 'Test Node Hints',
			} as INode;
			const nodeType = testType;

			const hints = getNodeHints(workflow, node, nodeType);

			expect(hints).toHaveLength(0);
		});
		test('should include hint if displayCondition is true', () => {
			const testType = {
				hints: [
					{
						message: 'TEST HINT',
						displayCondition: 'TRUE DISPLAY CONDITION EXPESSION',
					},
				],
			} as INodeTypeDescription;

			const workflow = {
				expression: {
					getSimpleParameterValue(
						_node: string,
						_parameter: string,
						_mode: string,
						_additionalData = {},
					) {
						return true;
					},
				},
			} as unknown as Workflow;

			const node: INode = {
				name: 'Test Node Hints',
			} as INode;
			const nodeType = testType;

			const hints = getNodeHints(workflow, node, nodeType);

			expect(hints).toHaveLength(1);
		});
	});
});
