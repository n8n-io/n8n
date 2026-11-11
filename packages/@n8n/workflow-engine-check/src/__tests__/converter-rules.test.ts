import type { IConnections, INode, INodeTypeDescription } from 'n8n-workflow';

import { checkEngineV2Eligibility, type EngineV2ReasonCode } from '../index';

const trigger: INode = {
	id: 'trigger-id',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const nodeTypes: INodeTypeDescription[] = [];

function node(overrides: Partial<INode>): INode {
	return {
		id: 'node-id',
		name: 'Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [200, 0],
		parameters: {},
		...overrides,
	};
}

const merge = (typeVersion: number, mode: string) =>
	node({ type: 'n8n-nodes-base.merge', typeVersion, parameters: { mode } });

const splitInBatches = (parameters: INode['parameters'], typeVersion = 3) =>
	node({ type: 'n8n-nodes-base.splitInBatches', typeVersion, parameters });

/** Trigger -> node over `main`. */
function check(target: INode, extraConnections: IConnections = {}) {
	return checkEngineV2Eligibility(
		{
			nodes: [trigger, target],
			connections: {
				[trigger.name]: { main: [[{ node: target.name, type: 'main', index: 0 }]] },
				...extraConnections,
			},
			settings: {},
		},
		nodeTypes,
	);
}

const toolConnection: IConnections = {
	Node: { ai_tool: [[{ node: 'Trigger', type: 'ai_tool', index: 0 }]] },
};

describe('converter rules', () => {
	it.each<{ shape: string; target: INode; connections?: IConnections; code: EngineV2ReasonCode }>([
		{
			shape: 'a node with onError continueErrorOutput',
			target: node({ onError: 'continueErrorOutput' }),
			code: 'CONTINUE_ERROR_OUTPUT',
		},
		{
			shape: 'a Merge node in chooseBranch mode',
			target: merge(3, 'chooseBranch'),
			code: 'MERGE_CHOOSE_BRANCH',
		},
		{
			shape: 'a Merge v2 node with an expression mode',
			target: merge(2, '={{ "append" }}'),
			code: 'MERGE_MODE_EXPRESSION',
		},
		{
			shape: 'a Split In Batches node of version 2',
			target: splitInBatches({ batchSize: 10 }, 2),
			code: 'SPLIT_IN_BATCHES_VERSION',
		},
		{
			shape: 'a Split In Batches node with options from an expression',
			target: splitInBatches({ options: '={{ {} }}' }),
			code: 'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION',
		},
		{
			shape: 'a Split In Batches node with the reset option',
			target: splitInBatches({ options: { reset: true } }),
			code: 'SPLIT_IN_BATCHES_RESET',
		},
		{
			shape: 'a Split In Batches node with a batch size expression',
			target: splitInBatches({ batchSize: '={{ 5 }}' }),
			code: 'SPLIT_IN_BATCHES_BATCH_SIZE',
		},
		{
			shape: 'a Split In Batches node with a batch size of 0',
			target: splitInBatches({ batchSize: 0 }),
			code: 'SPLIT_IN_BATCHES_BATCH_SIZE',
		},
		{
			shape: 'a Split In Batches node with a fractional batch size',
			target: splitInBatches({ batchSize: 2.5 }),
			code: 'SPLIT_IN_BATCHES_BATCH_SIZE',
		},
		{
			shape: 'a reachable node with a non-main connection',
			target: node({}),
			connections: toolConnection,
			code: 'NON_MAIN_CONNECTION',
		},
	])('blocks $shape with code $code, naming the node', ({ target, connections, code }) => {
		expect(check(target, connections)).toEqual({
			eligible: false,
			reasons: [
				{
					code,
					severity: 'blocking',
					nodeId: 'node-id',
					nodeName: 'Node',
					message: expect.stringContaining('"Node"'),
				},
			],
		});
	});

	it.each<{ shape: string; target: INode; connections?: IConnections }>([
		{
			shape: 'a node with onError continueRegularOutput',
			target: node({ onError: 'continueRegularOutput' }),
		},
		{ shape: 'a Merge node in append mode', target: merge(3, 'append') },
		// Merge v1 predates chooseBranch, so the converter allows an expression mode there.
		{ shape: 'a Merge v1 node with an expression mode', target: merge(1, '={{ "append" }}') },
		{
			shape: 'a Split In Batches v3 node with a literal batch size',
			target: splitInBatches({ batchSize: 10 }),
		},
		{ shape: 'a Split In Batches v3 node without a batch size', target: splitInBatches({}) },
		{
			shape: 'a Split In Batches v3 node with reset off',
			target: splitInBatches({ options: { reset: false } }),
		},
		{
			shape: 'a disabled node with onError continueErrorOutput',
			target: node({ onError: 'continueErrorOutput', disabled: true }),
		},
		{
			shape: 'a disabled Merge node in chooseBranch mode',
			target: { ...merge(3, 'chooseBranch'), disabled: true },
		},
		{
			shape: 'a disabled node with a non-main connection',
			target: node({ disabled: true }),
			connections: toolConnection,
		},
	])('allows $shape', ({ target, connections }) => {
		expect(check(target, connections)).toEqual({ eligible: true, reasons: [] });
	});

	it('ignores nodes that no trigger reaches, as the converter roots the graph at the trigger', () => {
		const unreachable = node({ onError: 'continueErrorOutput' });
		// An AI sub-node only has non-main connections, so no trigger reaches it over main.
		const subNode = node({ id: 'model-id', name: 'Model', type: 'n8n-nodes-base.noOp' });

		expect(
			checkEngineV2Eligibility(
				{
					nodes: [trigger, unreachable, subNode],
					connections: {
						Model: { ai_languageModel: [[{ node: 'Node', type: 'ai_languageModel', index: 0 }]] },
					},
					settings: {},
				},
				nodeTypes,
			),
		).toEqual({ eligible: true, reasons: [] });
	});

	it('reports only the version for a Split In Batches node of another version', () => {
		const { reasons } = check(
			splitInBatches({ batchSize: '={{ 5 }}', options: { reset: true } }, 1),
		);

		expect(reasons.map((reason) => reason.code)).toEqual(['SPLIT_IN_BATCHES_VERSION']);
	});

	it('reports every converter refusal, not only the first', () => {
		const { reasons } = check(
			splitInBatches({ batchSize: 0, options: { reset: true } }),
			toolConnection,
		);

		expect(reasons.map((reason) => reason.code)).toEqual([
			'SPLIT_IN_BATCHES_RESET',
			'SPLIT_IN_BATCHES_BATCH_SIZE',
			'NON_MAIN_CONNECTION',
		]);
	});

	describe('several live triggers', () => {
		const secondTrigger: INode = { ...trigger, id: 'second-id', name: 'Second Trigger' };

		it('warns, because the converter needs the caller to name the trigger that fired', () => {
			expect(
				checkEngineV2Eligibility(
					{ nodes: [trigger, secondTrigger], connections: {}, settings: {} },
					nodeTypes,
				),
			).toEqual({
				eligible: true,
				reasons: [{ code: 'MULTIPLE_TRIGGERS', severity: 'warning', message: expect.any(String) }],
			});
		});

		it('does not warn when only one trigger is enabled', () => {
			expect(
				checkEngineV2Eligibility(
					{ nodes: [trigger, { ...secondTrigger, disabled: true }], connections: {}, settings: {} },
					nodeTypes,
				),
			).toEqual({ eligible: true, reasons: [] });
		});
	});
});
