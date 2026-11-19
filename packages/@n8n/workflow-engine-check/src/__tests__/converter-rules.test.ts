import type { IConnections, INode } from 'n8n-workflow';

import {
	checkEngineV2Eligibility,
	type EngineV2ReasonCode,
	type EngineV2ReasonKind,
} from '../index';

const trigger: INode = {
	id: 'trigger-id',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

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

const executeWorkflow = (parameters: INode['parameters'], typeVersion = 1.2) =>
	node({ type: 'n8n-nodes-base.executeWorkflow', typeVersion, parameters });

const splitInBatches = (parameters: INode['parameters'], typeVersion = 3) =>
	node({ type: 'n8n-nodes-base.splitInBatches', typeVersion, parameters });

const loopBody = node({ id: 'body-id', name: 'Body' });

/** Trigger -> node over `main`. A Split In Batches node also gets a body that returns to it. */
function check(target: INode, extraConnections: IConnections = {}) {
	const nodes = [trigger, target];
	const connections: IConnections = {
		[trigger.name]: { main: [[{ node: target.name, type: 'main', index: 0 }]] },
	};
	if (target.type === 'n8n-nodes-base.splitInBatches') {
		nodes.push(loopBody);
		connections[target.name] = { main: [[], [{ node: loopBody.name, type: 'main', index: 0 }]] };
		connections[loopBody.name] = { main: [[{ node: target.name, type: 'main', index: 0 }]] };
	}
	for (const [name, byType] of Object.entries(extraConnections)) {
		connections[name] = { ...connections[name], ...byType };
	}
	return checkEngineV2Eligibility({ nodes, connections, settings: {} });
}

const toolConnection: IConnections = {
	Node: { ai_tool: [[{ node: 'Trigger', type: 'ai_tool', index: 0 }]] },
};

describe('converter rules', () => {
	it.each<{
		shape: string;
		target: INode;
		connections?: IConnections;
		code: EngineV2ReasonCode;
		kind: EngineV2ReasonKind;
	}>([
		{
			shape: 'a node with onError continueErrorOutput',
			target: node({ onError: 'continueErrorOutput' }),
			code: 'CONTINUE_ERROR_OUTPUT',
			kind: 'temporary',
		},
		{
			shape: 'a node with Retry On Fail',
			target: node({ retryOnFail: true }),
			code: 'RETRY_ON_FAIL',
			kind: 'temporary',
		},
		{
			shape: 'a node with Always Output Data',
			target: node({ alwaysOutputData: true }),
			code: 'ALWAYS_OUTPUT_DATA',
			kind: 'temporary',
		},
		{
			shape: 'a node with Execute Once',
			target: node({ executeOnce: true }),
			code: 'EXECUTE_ONCE',
			kind: 'temporary',
		},
		{
			shape: 'a Merge node in chooseBranch mode',
			target: merge(3, 'chooseBranch'),
			code: 'MERGE_CHOOSE_BRANCH',
			kind: 'temporary',
		},
		{
			shape: 'a Merge v2 node with an expression mode',
			target: merge(2, '={{ "append" }}'),
			code: 'MERGE_MODE_EXPRESSION',
			kind: 'permanent',
		},
		{
			shape: 'a Split In Batches node of version 2',
			target: splitInBatches({ batchSize: 10 }, 2),
			code: 'SPLIT_IN_BATCHES_VERSION',
			kind: 'temporary',
		},
		{
			shape: 'a Split In Batches node with options from an expression',
			target: splitInBatches({ options: '={{ {} }}' }),
			code: 'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION',
			kind: 'permanent',
		},
		{
			shape: 'a Split In Batches node with the reset option',
			target: splitInBatches({ options: { reset: true } }),
			code: 'SPLIT_IN_BATCHES_RESET',
			kind: 'temporary',
		},
		{
			shape: 'a Split In Batches node with a batch size expression',
			target: splitInBatches({ batchSize: '={{ 5 }}' }),
			code: 'SPLIT_IN_BATCHES_BATCH_SIZE',
			kind: 'permanent',
		},
		{
			shape: 'a Split In Batches node with a batch size of 0',
			target: splitInBatches({ batchSize: 0 }),
			code: 'SPLIT_IN_BATCHES_BATCH_SIZE',
			kind: 'invalid',
		},
		{
			shape: 'a Split In Batches node with a fractional batch size',
			target: splitInBatches({ batchSize: 2.5 }),
			code: 'SPLIT_IN_BATCHES_BATCH_SIZE',
			kind: 'invalid',
		},
		{
			shape: 'a reachable node with a non-main connection',
			target: node({}),
			connections: toolConnection,
			code: 'NON_MAIN_CONNECTION',
			kind: 'temporary',
		},
		{
			// The converter checks connection types before it removes disabled nodes.
			shape: 'a reachable disabled node with a non-main connection',
			target: node({ disabled: true }),
			connections: toolConnection,
			code: 'NON_MAIN_CONNECTION',
			kind: 'temporary',
		},
		{
			shape: 'an Execute Sub-workflow node that runs once for each item',
			target: executeWorkflow({ mode: 'each' }),
			code: 'SUB_WORKFLOW_FOR_EACH_ITEM',
			kind: 'permanent',
		},
		{
			shape: 'an Execute Sub-workflow v1 node that loads a local file',
			target: executeWorkflow({ source: 'localFile' }, 1),
			code: 'SUB_WORKFLOW_NOT_IN_DATABASE',
			kind: 'permanent',
		},
		{
			shape: 'an Execute Sub-workflow v1 node that loads a URL',
			target: executeWorkflow({ source: 'url' }, 1),
			code: 'SUB_WORKFLOW_NOT_IN_DATABASE',
			kind: 'permanent',
		},
		{
			shape: 'an Execute Sub-workflow node with a sub-workflow defined below',
			target: executeWorkflow({ source: 'parameter' }),
			code: 'SUB_WORKFLOW_NOT_IN_DATABASE',
			kind: 'permanent',
		},
	])(
		'blocks $shape with code $code and kind $kind, naming the node',
		({ target, connections, code, kind }) => {
			expect(check(target, connections)).toEqual({
				eligible: false,
				reasons: [
					{
						code,
						kind,
						severity: 'blocking',
						nodeId: 'node-id',
						nodeName: 'Node',
						message: expect.stringContaining('"Node"'),
					},
				],
			});
		},
	);

	it.each<{ shape: string; target: INode; connections?: IConnections }>([
		{
			shape: 'a node with onError continueRegularOutput',
			target: node({ onError: 'continueRegularOutput' }),
		},
		{
			shape: 'a node with the execution settings explicitly off',
			target: node({ retryOnFail: false, alwaysOutputData: false, executeOnce: false }),
		},
		{
			shape: 'a disabled node with Retry On Fail',
			target: node({ retryOnFail: true, disabled: true }),
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
			shape: 'an Execute Sub-workflow node that runs once with all items',
			target: executeWorkflow({ mode: 'once', source: 'database' }),
		},
		{ shape: 'an Execute Sub-workflow node with default settings', target: executeWorkflow({}) },
		{
			shape: 'a disabled Merge node in chooseBranch mode',
			target: { ...merge(3, 'chooseBranch'), disabled: true },
		},
	])('allows $shape', ({ target, connections }) => {
		expect(check(target, connections)).toEqual({ eligible: true, reasons: [] });
	});

	it('ignores nodes that no trigger reaches, as the converter roots the graph at the trigger', () => {
		const unreachable = node({ onError: 'continueErrorOutput' });
		// An AI sub-node only has non-main connections, so no trigger reaches it over main.
		const subNode = node({ id: 'model-id', name: 'Model', type: 'n8n-nodes-base.noOp' });

		expect(
			checkEngineV2Eligibility({
				nodes: [trigger, unreachable, subNode],
				connections: {
					Model: { ai_languageModel: [[{ node: 'Node', type: 'ai_languageModel', index: 0 }]] },
				},
				settings: {},
			}),
		).toEqual({ eligible: true, reasons: [] });
	});

	it('checks every node when no trigger is enabled, as the converter does not root the graph then', () => {
		const target = node({ onError: 'continueErrorOutput' });

		expect(
			checkEngineV2Eligibility({ nodes: [target], connections: {}, settings: {} }).reasons,
		).toEqual([expect.objectContaining({ code: 'CONTINUE_ERROR_OUTPUT', nodeName: 'Node' })]);
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

	it('suggests a migration instead of engine v1 for a permanent reason', () => {
		const [reason] = check(executeWorkflow({ mode: 'each' })).reasons;

		expect(reason.message).toContain('Loop Over Items');
		expect(reason.message).not.toContain('engine v1');
	});

	it('names the connection type in the non-main connection reason', () => {
		const [reason] = check(node({}), toolConnection).reasons;

		expect(reason.message).toContain('"ai_tool"');
	});

	it('does not apply the node rules to a trigger, as the converter turns it into a trigger step', () => {
		const erroringTrigger: INode = { ...trigger, onError: 'continueErrorOutput' };

		expect(
			checkEngineV2Eligibility({ nodes: [erroringTrigger], connections: {}, settings: {} }),
		).toEqual({ eligible: true, reasons: [] });
	});

	describe('several enabled triggers', () => {
		const secondTrigger: INode = { ...trigger, id: 'second-id', name: 'Second Trigger' };

		it('reports no reason, because the dispatcher names the trigger that fired', () => {
			expect(
				checkEngineV2Eligibility({
					nodes: [trigger, secondTrigger],
					connections: {},
					settings: {},
				}),
			).toEqual({ eligible: true, reasons: [] });
		});

		it('checks a node that only the second trigger reaches', () => {
			const target = node({ onError: 'continueErrorOutput' });

			expect(
				checkEngineV2Eligibility({
					nodes: [trigger, secondTrigger, target],
					connections: {
						[secondTrigger.name]: { main: [[{ node: target.name, type: 'main', index: 0 }]] },
					},
					settings: {},
				}).reasons,
			).toEqual([expect.objectContaining({ code: 'CONTINUE_ERROR_OUTPUT', nodeName: 'Node' })]);
		});
	});
});
