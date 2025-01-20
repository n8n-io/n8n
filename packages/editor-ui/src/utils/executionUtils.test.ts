import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	displayForm,
	openFormPopupWindow,
	executionFilterToQueryFilter,
	waitingNodeTooltip,
} from './executionUtils';
import type { INode, IRunData, IPinData } from 'n8n-workflow';
import { type INodeUi } from '../Interface';

const FORM_TRIGGER_NODE_TYPE = 'formTrigger';
const WAIT_NODE_TYPE = 'waitNode';

vi.mock('./executionUtils', async () => {
	const actual = await vi.importActual('./executionUtils');
	return {
		...actual,
		openFormPopupWindow: vi.fn(),
	};
});

vi.mock('@/stores/root.store', () => ({
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
		baseText: (key: string) => {
			const texts: { [key: string]: string } = {
				'ndv.output.waitNodeWaiting': 'Waiting for execution to resume...',
				'ndv.output.waitNodeWaitingForFormSubmission': 'Waiting for form submission: ',
				'ndv.output.waitNodeWaitingForWebhook': 'Waiting for webhook call: ',
				'ndv.output.sendAndWaitWaitingApproval': 'Waiting for approval...',
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
			directParentNodes: [],
			source: undefined,
			getTestUrl: getTestUrlMock,
		});

		expect(openFormPopupWindow).not.toHaveBeenCalled();
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
			directParentNodes: ['Node4'],
			source: undefined,
			getTestUrl: getTestUrlMock,
		});

		expect(openFormPopupWindow).not.toHaveBeenCalled();
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
			directParentNodes: [],
			source: 'RunData.ManualChatMessage',
			getTestUrl: getTestUrlMock,
		});

		expect(openFormPopupWindow).not.toHaveBeenCalled();
	});

	describe('executionFilterToQueryFilter()', () => {
		it('adds "new" to the filter', () => {
			expect(executionFilterToQueryFilter({ status: 'new' }).status).toStrictEqual(
				expect.arrayContaining(['new']),
			);
		});
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
