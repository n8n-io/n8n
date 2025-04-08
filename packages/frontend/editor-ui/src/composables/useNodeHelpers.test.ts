import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { createTestNode } from '@/__tests__/mocks';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { CUSTOM_API_CALL_KEY } from '@/constants';

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(),
}));

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

		it('should return an empty array when workflowsStore.getWorkflowExecution() is null', () => {
			vi.mocked(useWorkflowsStore).mockReturnValue({
				getWorkflowExecution: null,
			} as ReturnType<typeof useWorkflowsStore>);
			const { getNodeInputData } = useNodeHelpers();
			const node = createTestNode({
				name: 'test',
				type: 'test',
			});

			const result = getNodeInputData(node);
			expect(result).toEqual([]);
		});

		it('should return an empty array when workflowsStore.getWorkflowExecution() is null', () => {
			vi.mocked(useWorkflowsStore).mockReturnValue({
				getWorkflowExecution: null,
			} as ReturnType<typeof useWorkflowsStore>);
			const { getNodeInputData } = useNodeHelpers();
			const node = createTestNode({
				name: 'test',
				type: 'test',
			});

			const result = getNodeInputData(node);
			expect(result).toEqual([]);
		});

		it('should return an empty array when resultData is not available', () => {
			vi.mocked(useWorkflowsStore).mockReturnValue({
				getWorkflowExecution: {
					data: {
						resultData: null,
					},
				},
			} as unknown as ReturnType<typeof useWorkflowsStore>);
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
			vi.mocked(useWorkflowsStore).mockReturnValue({
				getWorkflowExecution: {
					data: {
						resultData: {
							runData: {
								[nodeName]: [],
							},
						},
					},
				},
			} as unknown as ReturnType<typeof useWorkflowsStore>);
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
			vi.mocked(useWorkflowsStore).mockReturnValue({
				getWorkflowExecution: {
					data: {
						resultData: {
							runData: {
								[nodeName]: [{ data: undefined }],
							},
						},
					},
				},
			} as unknown as ReturnType<typeof useWorkflowsStore>);
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
			const data = { hello: 'world' };
			vi.mocked(useWorkflowsStore).mockReturnValue({
				getWorkflowExecution: {
					data: {
						resultData: {
							runData: {
								[nodeName]: [
									{
										inputOverride: {
											main: [data],
										},
									},
								],
							},
						},
					},
				},
			} as unknown as ReturnType<typeof useWorkflowsStore>);
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
				const data = { hello: 'world' };
				vi.mocked(useWorkflowsStore).mockReturnValue({
					getWorkflowExecution: {
						data: {
							resultData: {
								runData: {
									[nodeName]: [
										{
											data: {
												main: [data],
											},
										},
									],
								},
							},
						},
					},
				} as unknown as ReturnType<typeof useWorkflowsStore>);
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
});
