import { describe, it, expect, vi, beforeEach } from 'vitest';
import { displayForm, openPopUpWindow, executionFilterToQueryFilter } from '../executionUtils';
import type { INode, IRunData, IPinData } from 'n8n-workflow';

const FORM_TRIGGER_NODE_TYPE = 'formTrigger';
const WAIT_NODE_TYPE = 'waitNode';

vi.mock('../executionUtils', async () => {
	const actual = await vi.importActual('../executionUtils');
	return {
		...actual,
		openPopUpWindow: vi.fn(),
	};
});

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

		expect(openPopUpWindow).not.toHaveBeenCalled();
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

		expect(openPopUpWindow).not.toHaveBeenCalled();
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

		expect(openPopUpWindow).not.toHaveBeenCalled();
	});

	describe('executionFilterToQueryFilter()', () => {
		it('adds "new" to the filter', () => {
			expect(executionFilterToQueryFilter({ status: 'new' }).status).toStrictEqual(
				expect.arrayContaining(['new']),
			);
		});
	});
});
