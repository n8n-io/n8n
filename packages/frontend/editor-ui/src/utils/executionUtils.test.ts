import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	displayForm,
	executionFilterToQueryFilter,
	waitingNodeTooltip,
	getExecutionErrorMessage,
	getExecutionErrorToastConfiguration,
} from './executionUtils';
import type { INode, IRunData, IPinData, ExecutionError } from 'n8n-workflow';
import { type INodeUi } from '../Interface';
import { CHAT_TRIGGER_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, GITHUB_NODE_TYPE } from '@/constants';
import { createTestNode } from '@/__tests__/mocks';
import type { VNode } from 'vue';

const WAIT_NODE_TYPE = 'waitNode';

const windowOpenSpy = vi.spyOn(window, 'open');

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		formWaitingUrl: 'http://localhost:5678/form-waiting',
		webhookWaitingUrl: 'http://localhost:5678/webhook-waiting',
	}),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		activeExecutionId: '123',
	}),
}));

vi.mock('@/plugins/i18n', () => ({
	i18n: {
		baseText: (key: string, options?: { interpolate?: { error?: string; details?: string } }) => {
			const texts: { [key: string]: string } = {
				'ndv.output.waitNodeWaiting': 'Waiting for execution to resume...',
				'ndv.output.waitNodeWaitingForFormSubmission': 'Waiting for form submission: ',
				'ndv.output.waitNodeWaitingForWebhook': 'Waiting for webhook call: ',
				'ndv.output.githubNodeWaitingForWebhook': 'Waiting for webhook call: ',
				'ndv.output.sendAndWaitWaitingApproval': 'Waiting for approval...',
				'pushConnection.executionError': `Execution error${options?.interpolate?.error}`,
				'pushConnection.executionError.details': `Details: ${options?.interpolate?.details}`,
			};
			return texts[key] || key;
		},
	},
}));

describe('displayForm', () => {
	const getTestUrlMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should not call openPopUpWindow if node has already run or is pinned', () => {
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

		displayForm({
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

	it('should skip nodes if destinationNode does not match and node is not a directParentNode', () => {
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

		displayForm({
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

	it('should not open pop-up if source is "RunData.ManualChatMessage"', () => {
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

		displayForm({
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

		it('should open pop-up if the trigger node is a form node', () => {
			displayForm({
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

		it("should not open pop-up if the trigger node is specified and it isn't a form node", () => {
			displayForm({
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

		expect(waitingNodeTooltip(node)).toBe('Waiting for execution to resume...');
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
		expect(waitingNodeTooltip(node)).toBe(
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

		const expectedUrl = 'http://localhost:5678/webhook-waiting/123/test-suffix';
		expect(waitingNodeTooltip(node)).toBe(
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
		expect(waitingNodeTooltip(node)).toBe(
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

		expect(waitingNodeTooltip(node)).toBe('Waiting for approval...');
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
		expect(waitingNodeTooltip(node)).toBe(
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
		expect(waitingNodeTooltip(node)).toBe(
			`Waiting for webhook call: <a href="${expectedUrl}" target="_blank">${expectedUrl}</a>`,
		);
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
