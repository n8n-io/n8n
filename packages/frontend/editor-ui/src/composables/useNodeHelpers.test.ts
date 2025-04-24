import { setActivePinia } from 'pinia';
import type { INode, INodeTypeDescription, Workflow } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { createTestNode } from '@/__tests__/mocks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { CUSTOM_API_CALL_KEY } from '@/constants';
import { mockedStore } from '@/__tests__/utils';
import { mock } from 'vitest-mock-extended';
import type { ExecutionStatus, IRunData } from 'n8n-workflow';

describe('useNodeHelpers()', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
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
