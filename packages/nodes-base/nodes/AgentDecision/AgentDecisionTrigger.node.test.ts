import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData, ITriggerFunctions } from 'n8n-workflow';

import { AgentDecisionTrigger } from './AgentDecisionTrigger.node';

const node = new AgentDecisionTrigger();

it('emits the example request when the workflow is tested manually', async () => {
	const context = mock<ITriggerFunctions>();
	context.getMode.mockReturnValue('manual');
	const request = {
		toolName: 'send_email',
		arguments: { to: ['reviewer@example.com'], body: { text: 'Review this message' } },
	};
	context.getNodeParameter.mockReturnValue(JSON.stringify(request));
	const trigger = await node.trigger.call(context);
	expect(context.emit).not.toHaveBeenCalled();
	await trigger.manualTriggerFunction?.();
	expect(context.emit).toHaveBeenCalledWith([[{ json: request }]]);
});

it('does not emit example data when the trigger is activated', async () => {
	const context = mock<ITriggerFunctions>();
	context.getMode.mockReturnValue('trigger');
	expect(await node.trigger.call(context)).toEqual({});
	expect(context.getNodeParameter).not.toHaveBeenCalled();
	expect(context.emit).not.toHaveBeenCalled();
});

it.each(['[]', 'null', '123', '"text"', '{invalid'])(
	'rejects a manual test request that is not a JSON object: %s',
	async (example) => {
		const context = mock<ITriggerFunctions>();
		context.getMode.mockReturnValue('manual');
		context.getNodeParameter.mockReturnValue(example);
		context.getNode.mockReturnValue(mock<INode>({ name: 'Agent decision' }));
		const trigger = await node.trigger.call(context);
		await expect(trigger.manualTriggerFunction?.()).rejects.toThrow(
			example === '{invalid'
				? 'Test request is not valid JSON'
				: 'Set Test request to a JSON object',
		);
		expect(context.emit).not.toHaveBeenCalled();
	},
);

it('passes the complete Agent request through without using test data', async () => {
	const context = mock<IExecuteFunctions>();
	const input: INodeExecutionData[] = [
		{
			json: {
				requestId: 'run:call',
				agentId: 'agent',
				toolName: 'send_email',
				description: 'Send an order confirmation email.',
				arguments: {
					to: ['reviewer@example.com', 'owner@example.com'],
					body: { text: 'Order confirmed', attachments: [{ fileId: 'document' }] },
				},
				requestedAt: '2026-01-01T12:00:00.000Z',
			},
		},
	];
	context.getInputData.mockReturnValue(input);
	expect(await node.execute.call(context)).toEqual([input]);
	expect(context.getNodeParameter).not.toHaveBeenCalled();
});
