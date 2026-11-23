import { mock } from 'vitest-mock-extended';
import { NodeOperationError, type IExecuteFunctions, type INode } from 'n8n-workflow';

import { AgentDecisionResponse } from './AgentDecisionResponse.node';

const node = new AgentDecisionResponse();

function context(parameters: Array<{ approved: unknown; reason?: unknown }>) {
	const ctx = mock<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(mock<INode>({ name: 'Respond to agent' }));
	ctx.getInputData.mockReturnValue(parameters.map(() => ({ json: {} })));
	ctx.getNodeParameter.mockImplementation(
		(name: string, index: number, fallback?: unknown) =>
			((name === 'approved' ? parameters[index].approved : parameters[index].reason) ??
				fallback) as never,
	);
	return ctx;
}

it('returns one decision for each item with its paired item', async () => {
	const result = await node.execute.call(
		context([{ approved: true, reason: 'Looks good' }, { approved: false }]),
	);

	expect(result).toEqual([
		[
			{ json: { approved: true, reason: 'Looks good' }, pairedItem: { item: 0 } },
			{ json: { approved: false, reason: '' }, pairedItem: { item: 1 } },
		],
	]);
});

it.each([
	['approved', { approved: 'yes' }, 'Approved must be a boolean'],
	['reason', { approved: true, reason: { text: 'no' } }, 'Reason must be a string'],
	['numeric reason', { approved: true, reason: 42 }, 'Reason must be a string'],
])('rejects an item with an invalid %s', async (_label, invalid, message) => {
	const promise = node.execute.call(context([{ approved: true }, invalid]));

	await expect(promise).rejects.toThrow(message);
	await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
	await expect(promise).rejects.toMatchObject({ context: { itemIndex: 1 } });
});
