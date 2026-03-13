import type { MockInstance } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	displayForm,
	executionFilterToQueryFilter,
	waitingNodeTooltip,
	getExecutionErrorMessage,
	getExecutionErrorToastConfiguration,
	findTriggerNodeToAutoSelect,
	buildExecutionResponseFromSchema,
	generatePlaceholderValue,
	generateFakeDataFromSchema,
} from './executions.utils';
import type {
	INode,
	IRunData,
	IPinData,
	ExecutionError,
	INodeTypeDescription,
	Workflow,
} from 'n8n-workflow';
import { type INodeUi, type IWorkflowDb } from '@/Interface';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CORE_NODES_CATEGORY,
	FORM_TRIGGER_NODE_TYPE,
	GITHUB_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from '@/app/constants';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import type { VNode } from 'vue';

const WAIT_NODE_TYPE = 'waitNode';

const windowOpenSpy = vi.spyOn(window, 'open');

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		formWaitingUrl: 'http://localhost:5678/form-waiting',
		webhookWaitingUrl: 'http://localhost:5678/webhook-waiting',
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		activeExecutionId: '123',
	}),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: {
		baseText: (key: string, options?: { interpolate?: { error?: string; details?: string } }) => {
			const texts: { [key: string]: string } = {
				'ndv.output.waitNodeWaiting.description.timer': 'Waiting for execution to resume...',
				'ndv.output.waitNodeWaiting.description.form': 'Waiting for form submission: ',
				'ndv.output.waitNodeWaiting.description.webhook': 'Waiting for webhook call: ',
				'ndv.output.githubNodeWaitingForWebhook': 'Waiting for webhook call: ',
				'ndv.output.sendAndWaitWaitingApproval': 'Waiting for approval...',
				'pushConnection.executionError': `Execution error${options?.interpolate?.error}`,
				'pushConnection.executionError.details': `Details: ${options?.interpolate?.details}`,
			};
			return texts[key] || key;
		},
	},
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (type: string) => {
			const nodeTypes: Record<string, { waitingNodeTooltip?: string }> = {
				'n8n-nodes-base.wait': {
					waitingNodeTooltip:
						'={{$node.parameters.resume === "form" ? "Waiting for form submission: <a href=\\"" + $execution.resumeFormUrl + "\\" target=\\"_blank\\">" + $execution.resumeFormUrl + "</a>" : $node.parameters.resume === "webhook" ? "Waiting for webhook call: <a href=\\"" + $execution.resumeUrl + "\\" target=\\"_blank\\">" + $execution.resumeUrl + "</a>" : "Waiting for execution to resume..."}}',
				},
				'n8n-nodes-base.form': {
					waitingNodeTooltip:
						'Waiting for form submission: <a href="{{$execution.resumeFormUrl}}" target="_blank">{{$execution.resumeFormUrl}}</a>',
				},
				'n8n-nodes-base.sendWait': {
					waitingNodeTooltip: 'Waiting for approval...',
				},
				[GITHUB_NODE_TYPE]: {
					waitingNodeTooltip:
						'Waiting for webhook call: <a href="{{$execution.resumeUrl}}" target="_blank">{{$execution.resumeUrl}}</a>',
				},
			};
			return nodeTypes[type] || null;
		},
	}),
}));

describe('displayForm', () => {
	const getTestUrlMock = vi.fn();
	let fetchMock: MockInstance;
	const successResponse = {
		ok: true,
	} as unknown as Response;

	beforeAll(() => {
		fetchMock = vi.spyOn(global, 'fetch');
	});

	afterAll(() => {
		fetchMock.mockRestore();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should not call openPopUpWindow if node has already run or is pinned', async () => {
		const nodes: INode[] = [
			{
				id: '1',
				name: 'Node1',
				typeVersion: 1,
				type: FORM_TRIGGER_NODE_TYPE,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node2',
				typeVersion: 1,
				type: WAIT_NODE_TYPE,
				position: [0, 0],
				parameters: {},
			},
		];

		const runData: IRunData = { Node1: [] };
		const pinData: IPinData = { Node2: [{ json: { data: {} } }] };

		fetchMock.mockResolvedValue(successResponse);

		await displayForm({
			nodes,
			runData,
			pinData,
			destinationNode: undefined,
			triggerNode: undefined,
			directParentNodes: [],
			source: undefined,
			getTestUrl: getTestUrlMock,
		});

		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('should not call openPopUpWindow if node has run data and is not a form trigger node', async () => {
		const nodes: INode[] = [
			{
				id: '1',
				name: 'RegularNode',
				typeVersion: 1,
				type: 'n8n-nodes-base.httpRequest',
				position: [0, 0],
				parameters: {},
			},
		];

		const runData: IRunData = { RegularNode: [] };
		const pinData: IPinData = {};

		fetchMock.mockResolvedValue(successResponse);

		await displayForm({
			nodes,
			runData,
			pinData,
			destinationNode: undefined,
			triggerNode: undefined,
			directParentNodes: [],
			source: undefined,
			getTestUrl: getTestUrlMock,
		});

		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('should call openPopUpWindow for form trigger node even if it has run data', async () => {
		const nodes: INode[] = [
			{
				id: '1',
				name: 'FormTrigger',
				typeVersion: 1,
				type: FORM_TRIGGER_NODE_TYPE,
				position: [0, 0],
				parameters: {},
			},
		];

		const runData: IRunData = { FormTrigger: [] };
		const pinData: IPinData = {};

		getTestUrlMock.mockReturnValue('http://test-url.com');
		fetchMock.mockResolvedValue(successResponse);

		await displayForm({
			nodes,
			runData,
			pinData,
			destinationNode: undefined,
			triggerNode: undefined,
			directParentNodes: [],
			source: undefined,
			getTestUrl: getTestUrlMock,
		});

		expect(windowOpenSpy).toHaveBeenCalled();
	});

	it('should skip nodes if destinationNode does not match and node is not a directParentNode', async () => {
		const nodes: INode[] = [
			{
				id: '1',
				name: 'Node1',
				typeVersion: 1,
				type: FORM_TRIGGER_NODE_TYPE,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Node2',
				typeVersion: 1,
				type: WAIT_NODE_TYPE,
				position: [0, 0],
				parameters: {},
			},
		];

		fetchMock.mockResolvedValue(successResponse);
		await displayForm({
			nodes,
			runData: undefined,
			pinData: {},
			destinationNode: 'Node3',
			triggerNode: undefined,
			directParentNodes: ['Node4'],
			source: undefined,
			getTestUrl: getTestUrlMock,
		});

		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('should not open pop-up if source is "RunData.ManualChatMessage"', async () => {
		const nodes: INode[] = [
			{
				id: '1',
				name: 'Node1',
				typeVersion: 1,
				type: FORM_TRIGGER_NODE_TYPE,
				position: [0, 0],
				parameters: {},
			},
		];

		getTestUrlMock.mockReturnValue('http://test-url.com');

		fetchMock.mockResolvedValue(successResponse);

		await displayForm({
			nodes,
			runData: undefined,
			pinData: {},
			destinationNode: undefined,
			triggerNode: undefined,
			directParentNodes: [],
			source: 'RunData.ManualChatMessage',
			getTestUrl: getTestUrlMock,
		});

		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	describe('with trigger node', () => {
		const nodes: INode[] = [
			createTestNode({ name: 'Node1', type: FORM_TRIGGER_NODE_TYPE }),
			createTestNode({ name: 'Node2', type: CHAT_TRIGGER_NODE_TYPE }),
		];

		beforeEach(() => {
			getTestUrlMock.mockReturnValue('http://test-url.com');
		});

		it('should open pop-up if the trigger node is a form node', async () => {
			fetchMock.mockResolvedValue(successResponse);
			await displayForm({
				nodes,
				runData: undefined,
				pinData: {},
				destinationNode: undefined,
				triggerNode: 'Node1',
				directParentNodes: [],
				source: undefined,
				getTestUrl: getTestUrlMock,
			});

			expect(windowOpenSpy).toHaveBeenCalled();
		});

		it('should not open pop-up if the trigger node is a form node but webhook url is not live', async () => {
			fetchMock.mockResolvedValue({ ok: false });
			await displayForm({
				nodes,
				runData: undefined,
				pinData: {},
				destinationNode: undefined,
				triggerNode: 'Node1',
				directParentNodes: [],
				source: undefined,
				getTestUrl: getTestUrlMock,
			});

			expect(windowOpenSpy).not.toHaveBeenCalled();
		});

		it('should not open pop-up if the trigger node is a form node but fetch of webhook url throws', async () => {
			fetchMock.mockRejectedValue(new Error());
			await displayForm({
				nodes,
				runData: undefined,
				pinData: {},
				destinationNode: undefined,
				triggerNode: 'Node1',
				directParentNodes: [],
				source: undefined,
				getTestUrl: getTestUrlMock,
			});

			expect(windowOpenSpy).not.toHaveBeenCalled();
		});

		it("should not open pop-up if the trigger node is specified and it isn't a form node", async () => {
			fetchMock.mockResolvedValue(successResponse);
			await displayForm({
				nodes,
				runData: undefined,
				pinData: {},
				destinationNode: undefined,
				triggerNode: 'Node2',
				directParentNodes: [],
				source: undefined,
				getTestUrl: getTestUrlMock,
			});

			expect(windowOpenSpy).not.toHaveBeenCalled();
		});
	});
});

describe('executionFilterToQueryFilter()', () => {
	it('adds "new" to the filter', () => {
		expect(executionFilterToQueryFilter({ status: 'new' }).status).toStrictEqual(
			expect.arrayContaining(['new']),
		);
	});
});

describe('waitingNodeTooltip', () => {
	const mockWorkflow = {
		expression: {
			getSimpleParameterValue: (
				node: INodeUi,
				template: string,
				_mode: string,
				additionalData: { $execution: { resumeFormUrl: string; resumeUrl: string } },
			) => {
				if (template.startsWith('={{')) {
					const resume = node.parameters?.resume;
					if (resume === 'form') {
						return `Waiting for form submission: <a href="${additionalData.$execution.resumeFormUrl}" target="_blank">${additionalData.$execution.resumeFormUrl}</a>`;
					} else if (resume === 'webhook') {
						return `Waiting for webhook call: <a href="${additionalData.$execution.resumeUrl}" target="_blank">${additionalData.$execution.resumeUrl}</a>`;
					} else {
						return 'Waiting for execution to resume...';
					}
				}

				let result = template;
				result = result.replace(
					/\{\{(\$execution\.resumeFormUrl)\}\}/g,
					additionalData.$execution.resumeFormUrl,
				);
				result = result.replace(
					/\{\{(\$execution\.resumeUrl)\}\}/g,
					additionalData.$execution.resumeUrl,
				);
				return result;
			},
		},
	} as unknown as Workflow;

	it('should return empty string for null or undefined node', () => {
		expect(waitingNodeTooltip(null)).toBe('');
		expect(waitingNodeTooltip(undefined)).toBe('');
	});

	it('should return default waiting message for time resume types', () => {
		const node: INodeUi = {
			id: '1',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				resume: 'timeInterval',
			},
		};

		expect(waitingNodeTooltip(node, mockWorkflow)).toBe('Waiting for execution to resume...');
	});

	it('should return form submission message with URL for form resume type', () => {
		const node: INodeUi = {
			id: '1',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				resume: 'form',
			},
		};

		const expectedUrl = 'http://localhost:5678/form-waiting/123';
		expect(waitingNodeTooltip(node, mockWorkflow)).toBe(
			`Waiting for form submission: <a href="${expectedUrl}" target="_blank">${expectedUrl}</a>`,
		);
	});

	it('should include webhook suffix in URL when provided', () => {
		const node: INodeUi = {
			id: '1',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				resume: 'webhook',
				options: {
					webhookSuffix: 'test-suffix',
				},
			},
		};

		const expectedUrl = 'http://localhost:5678/webhook-waiting/123';
		expect(waitingNodeTooltip(node, mockWorkflow)).toBe(
			`Waiting for webhook call: <a href="${expectedUrl}" target="_blank">${expectedUrl}</a>`,
		);
	});

	it('should handle form node type', () => {
		const node: INodeUi = {
			id: '1',
			name: 'Form',
			type: 'n8n-nodes-base.form',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const expectedUrl = 'http://localhost:5678/form-waiting/123';
		expect(waitingNodeTooltip(node, mockWorkflow)).toBe(
			`Waiting for form submission: <a href="${expectedUrl}" target="_blank">${expectedUrl}</a>`,
		);
	});

	it('should handle send and wait operation', () => {
		const node: INodeUi = {
			id: '1',
			name: 'SendWait',
			type: 'n8n-nodes-base.sendWait',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				operation: 'sendAndWait',
			},
		};

		expect(waitingNodeTooltip(node, mockWorkflow)).toBe('Waiting for approval...');
	});

	it('should handle GitHub dispatchAndWait operation', () => {
		const node: INodeUi = {
			id: '1',
			name: 'GitHub',
			type: GITHUB_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				operation: 'dispatchAndWait',
			},
		};

		const expectedUrl = 'http://localhost:5678/webhook-waiting/123';
		expect(waitingNodeTooltip(node, mockWorkflow)).toBe(
			`Waiting for webhook call: <a href="${expectedUrl}" target="_blank">${expectedUrl}</a>`,
		);
	});

	it('should ignore object-type webhook suffix', () => {
		const node: INodeUi = {
			id: '1',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				resume: 'webhook',
				options: {
					webhookSuffix: { some: 'object' },
				},
			},
		};

		const expectedUrl = 'http://localhost:5678/webhook-waiting/123';
		expect(waitingNodeTooltip(node, mockWorkflow)).toBe(
			`Waiting for webhook call: <a href="${expectedUrl}" target="_blank">${expectedUrl}</a>`,
		);
	});

	it('should return raw waitingNodeTooltip when no workflow is provided', () => {
		const node: INodeUi = {
			id: '1',
			name: 'SendWait',
			type: 'n8n-nodes-base.sendWait',
			typeVersion: 1,
			position: [0, 0],
			parameters: {
				operation: 'sendAndWait',
			},
		};

		// Test without workflow - should return the raw tooltip string
		expect(waitingNodeTooltip(node)).toBe('Waiting for approval...');
	});
});

const executionErrorFactory = (error: Record<string, unknown>) =>
	error as unknown as ExecutionError;

describe('getExecutionErrorMessage', () => {
	it('returns error.message when lastNodeExecuted and error are present', () => {
		const result = getExecutionErrorMessage({
			error: executionErrorFactory({ message: 'Node failed' }),
			lastNodeExecuted: 'Node1',
		});
		expect(result).toBe('Node failed');
	});

	it('uses fallback translation when only error.message is provided', () => {
		const result = getExecutionErrorMessage({
			error: executionErrorFactory({ message: 'Something went wrong' }),
		});
		expect(result).toBe('Execution error.Details: Something went wrong');
	});

	it('includes node name if error.node is a string', () => {
		const result = getExecutionErrorMessage({
			error: executionErrorFactory({ message: 'Failed', node: 'MyNode' }),
		});
		expect(result).toBe('Execution error.Details: MyNode: Failed');
	});

	it('includes node.name if error.node is an object', () => {
		const result = getExecutionErrorMessage({
			error: executionErrorFactory({ message: 'Crashed', node: { name: 'Step1' } }),
		});
		expect(result).toBe('Execution error.Details: Step1: Crashed');
	});

	it('uses default fallback when no error or lastNodeExecuted', () => {
		const result = getExecutionErrorMessage({});
		expect(result).toBe('Execution error!');
	});
});

describe('getExecutionErrorToastConfiguration', () => {
	it('returns config for SubworkflowOperationError', () => {
		const result = getExecutionErrorToastConfiguration({
			error: executionErrorFactory({
				name: 'SubworkflowOperationError',
				message: 'Subworkflow failed',
				description: 'Workflow XYZ failed',
			}),
			lastNodeExecuted: 'NodeA',
		});

		expect(result).toEqual({
			title: 'Subworkflow failed',
			message: 'Workflow XYZ failed',
		});
	});

	it('returns config for configuration-node error with node name', () => {
		const result = getExecutionErrorToastConfiguration({
			error: executionErrorFactory({
				name: 'NodeOperationError',
				message: 'Node failed',
				description: 'Bad configuration',
				functionality: 'configuration-node',
				node: { name: 'TestNode' },
			}),
		});
		expect(result.title).toBe('Error in sub-node ‘TestNode‘');
		expect((result.message as VNode).props).toEqual({
			errorMessage: 'Bad configuration',
			nodeName: 'TestNode',
		});
	});

	it('returns config for configuration-node error without node name', () => {
		const result = getExecutionErrorToastConfiguration({
			error: executionErrorFactory({
				name: 'NodeApiError',
				message: 'API failed',
				description: 'Missing credentials',
				functionality: 'configuration-node',
				node: {},
			}),
		});

		expect(result.title).toBe('Problem executing workflow');
		expect((result.message as VNode).props).toEqual({
			errorMessage: 'Missing credentials',
			nodeName: '',
		});
	});

	it('returns generic config when error type is not special', () => {
		const result = getExecutionErrorToastConfiguration({
			error: executionErrorFactory({
				name: 'UnknownError',
				message: 'Something broke',
			}),
			lastNodeExecuted: 'NodeX',
		});

		expect(result).toEqual({
			title: 'Problem in node ‘NodeX‘',
			message: 'Something broke',
		});
	});

	it('returns generic config without lastNodeExecuted', () => {
		const result = getExecutionErrorToastConfiguration({
			error: executionErrorFactory({
				name: 'UnknownError',
				message: 'Something broke',
			}),
		});
		expect(result).toEqual({
			title: 'Problem executing workflow',
			message: 'Execution error.Details: Something broke',
		});
	});
});

describe(findTriggerNodeToAutoSelect, () => {
	const APP_TRIGGER_TYPE = 'app trigger';

	function getNodeType(type: string): INodeTypeDescription {
		return mockNodeTypeDescription({
			name: type,
			codex: { categories: type === APP_TRIGGER_TYPE ? [] : [CORE_NODES_CATEGORY] },
		});
	}

	it('should return the first enabled node', () => {
		expect(
			findTriggerNodeToAutoSelect(
				[
					createTestNode({ name: 'A', disabled: true }),
					createTestNode({ name: 'B', disabled: false }),
					createTestNode({ name: 'C', disabled: false }),
				],
				getNodeType,
			),
		).toEqual(expect.objectContaining({ name: 'B' }));
	});

	it('should prioritize form trigger node than other node types', () => {
		expect(
			findTriggerNodeToAutoSelect(
				[
					createTestNode({ name: 'A', type: MANUAL_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'B', type: FORM_TRIGGER_NODE_TYPE }),
				],
				getNodeType,
			),
		).toEqual(expect.objectContaining({ name: 'B' }));
	});

	it('should prioritize an app trigger than a scheduled trigger', () => {
		expect(
			findTriggerNodeToAutoSelect(
				[
					createTestNode({ name: 'A', type: SCHEDULE_TRIGGER_NODE_TYPE }),
					createTestNode({ name: 'B', type: APP_TRIGGER_TYPE }),
				],
				getNodeType,
			),
		).toEqual(expect.objectContaining({ name: 'B' }));
	});
});

describe('buildExecutionResponseFromSchema', () => {
	const mockWorkflow = {
		id: 'test-workflow',
		name: 'Test Workflow',
		nodes: [
			createTestNode({ name: 'Start', type: MANUAL_TRIGGER_NODE_TYPE }),
			createTestNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
		],
		connections: {},
	} as unknown as IWorkflowDb;

	it('builds execution response with all nodes success', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {
				Start: { executionStatus: 'success', executionTime: 10 },
				'HTTP Request': { executionStatus: 'success', executionTime: 200 },
			},
			executionStatus: 'success',
		});

		expect(result.id).toBe('preview');
		expect(result.finished).toBe(true);
		expect(result.mode).toBe('manual');
		expect(result.status).toBe('success');
		expect(result.workflowData).toBe(mockWorkflow);

		const runData = result.data?.resultData.runData;
		expect(runData).toBeDefined();
		expect(runData?.Start).toHaveLength(1);
		expect(runData?.Start[0].executionStatus).toBe('success');
		expect(runData?.Start[0].executionTime).toBe(10);
		expect(runData?.Start[0].data).toBeUndefined();
		expect(runData?.['HTTP Request'][0].executionStatus).toBe('success');
		expect(runData?.['HTTP Request'][0].executionTime).toBe(200);
		expect(runData?.['HTTP Request'][0].data).toBeUndefined();
	});

	it('builds execution response with node error', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {
				Start: { executionStatus: 'success', executionTime: 5 },
				'HTTP Request': {
					executionStatus: 'error',
					error: { message: 'Connection refused', name: 'NodeApiError' },
				},
			},
			executionStatus: 'error',
			lastNodeExecuted: 'HTTP Request',
		});

		expect(result.finished).toBe(false);
		expect(result.status).toBe('error');

		const runData = result.data?.resultData.runData;
		expect(runData?.['HTTP Request'][0].error).toBeDefined();
		expect(runData?.['HTTP Request'][0].error?.message).toBe('Connection refused');
		expect(result.data?.resultData.lastNodeExecuted).toBe('HTTP Request');
	});

	it('builds execution response with mixed statuses', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {
				Start: { executionStatus: 'success', executionTime: 5 },
				'HTTP Request': { executionStatus: 'canceled' },
			},
			executionStatus: 'canceled',
		});

		const runData = result.data?.resultData.runData;
		expect(runData?.Start[0].executionStatus).toBe('success');
		expect(runData?.['HTTP Request'][0].executionStatus).toBe('canceled');
		expect(runData?.['HTTP Request'][0].executionTime).toBe(0);
	});

	it('builds execution response with empty schema', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {},
			executionStatus: 'success',
		});

		expect(result.data?.resultData.runData).toEqual({});
		expect(result.finished).toBe(true);
	});

	it('builds execution response with top-level execution error', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {
				Start: { executionStatus: 'success' },
			},
			executionStatus: 'error',
			executionError: { message: 'Workflow timed out', name: 'WorkflowOperationError' },
		});

		expect(result.data?.resultData.error).toBeDefined();
		expect(result.data?.resultData.error?.message).toBe('Workflow timed out');
		expect(result.finished).toBe(false);
	});

	it('includes fake data when outputSchema is provided', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {
				'HTTP Request': {
					executionStatus: 'success',
					executionTime: 100,
					outputSchema: {
						itemCount: 2,
						fields: [
							{ name: 'id', type: 'number' },
							{ name: 'name', type: 'string' },
						],
					},
				},
			},
			executionStatus: 'success',
		});

		const taskData = result.data?.resultData.runData?.['HTTP Request']?.[0];
		expect(taskData?.data).toBeDefined();
		expect(taskData?.data?.main).toHaveLength(1);
		expect(taskData?.data?.main[0]).toHaveLength(2);
		expect(taskData?.data?.main[0]?.[0].json).toEqual({ id: 0, name: '' });
	});

	it('omits data when outputSchema has empty fields', () => {
		const result = buildExecutionResponseFromSchema({
			workflow: mockWorkflow,
			nodeExecutionSchema: {
				Start: {
					executionStatus: 'success',
					outputSchema: { fields: [] },
				},
			},
			executionStatus: 'success',
		});

		expect(result.data?.resultData.runData?.Start?.[0].data).toBeUndefined();
	});
});

describe('generatePlaceholderValue', () => {
	it('returns empty string for string type', () => {
		expect(generatePlaceholderValue({ name: 'x', type: 'string' })).toBe('');
	});

	it('returns 0 for number type', () => {
		expect(generatePlaceholderValue({ name: 'x', type: 'number' })).toBe(0);
	});

	it('returns false for boolean type', () => {
		expect(generatePlaceholderValue({ name: 'x', type: 'boolean' })).toBe(false);
	});

	it('returns empty object for object type with no fields', () => {
		expect(generatePlaceholderValue({ name: 'x', type: 'object' })).toEqual({});
	});

	it('returns nested object for object type with fields', () => {
		expect(
			generatePlaceholderValue({
				name: 'address',
				type: 'object',
				fields: [
					{ name: 'street', type: 'string' },
					{ name: 'zip', type: 'number' },
				],
			}),
		).toEqual({ street: '', zip: 0 });
	});

	it('returns empty array for array type with no itemSchema', () => {
		expect(generatePlaceholderValue({ name: 'x', type: 'array' })).toEqual([]);
	});

	it('returns array with one element matching itemSchema', () => {
		expect(
			generatePlaceholderValue({
				name: 'tags',
				type: 'array',
				itemSchema: [
					{ name: 'id', type: 'number' },
					{ name: 'label', type: 'string' },
				],
			}),
		).toEqual([{ id: 0, label: '' }]);
	});

	it('truncates at max nesting depth', () => {
		let field: {
			name: string;
			type: 'object';
			fields: Array<{ name: string; type: 'object'; fields?: unknown[] }>;
		} = {
			name: 'level0',
			type: 'object',
			fields: [{ name: 'leaf', type: 'object' }],
		};
		for (let i = 1; i < 7; i++) {
			field = { name: `level${i}`, type: 'object', fields: [field] };
		}
		const result = generatePlaceholderValue(field as never);
		expect(result).toBeDefined();
	});
});

describe('generateFakeDataFromSchema', () => {
	it('generates single item by default', () => {
		const result = generateFakeDataFromSchema({
			fields: [
				{ name: 'id', type: 'number' },
				{ name: 'name', type: 'string' },
			],
		});
		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({ id: 0, name: '' });
	});

	it('generates specified number of items', () => {
		const result = generateFakeDataFromSchema({
			itemCount: 3,
			fields: [{ name: 'active', type: 'boolean' }],
		});
		expect(result).toHaveLength(3);
		for (const item of result) {
			expect(item.json).toEqual({ active: false });
		}
	});

	it('clamps itemCount to max 10', () => {
		const result = generateFakeDataFromSchema({
			itemCount: 100,
			fields: [{ name: 'x', type: 'string' }],
		});
		expect(result).toHaveLength(10);
	});

	it('uses minimum of 1 item for itemCount <= 0', () => {
		const result = generateFakeDataFromSchema({
			itemCount: 0,
			fields: [{ name: 'x', type: 'string' }],
		});
		expect(result).toHaveLength(1);
	});

	it('generates items with complex nested schema', () => {
		const result = generateFakeDataFromSchema({
			fields: [
				{ name: 'id', type: 'number' },
				{
					name: 'profile',
					type: 'object',
					fields: [
						{ name: 'email', type: 'string' },
						{ name: 'verified', type: 'boolean' },
					],
				},
				{
					name: 'roles',
					type: 'array',
					itemSchema: [{ name: 'name', type: 'string' }],
				},
			],
		});
		expect(result[0].json).toEqual({
			id: 0,
			profile: { email: '', verified: false },
			roles: [{ name: '' }],
		});
	});

	it('returns items with empty json when fields array is empty', () => {
		const result = generateFakeDataFromSchema({ fields: [] });
		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({});
	});
});
