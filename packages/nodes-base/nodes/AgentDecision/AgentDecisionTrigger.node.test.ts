import { Container } from '@n8n/di';
import { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import {
	Workflow,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeTypes,
	type ITriggerFunctions,
} from 'n8n-workflow';

import { AgentDecisionTrigger } from './AgentDecisionTrigger.node';

const node = new AgentDecisionTrigger();
beforeEach(() => Container.set(AgentsConfig, mock<AgentsConfig>({ humanReviewEnabled: true })));
afterEach(() => Container.reset());

it('rejects activation and execution when human review is disabled', async () => {
	Container.set(AgentsConfig, mock<AgentsConfig>({ humanReviewEnabled: false }));
	await expect(node.trigger.call(mock<ITriggerFunctions>())).rejects.toThrow(
		'Human review is not enabled',
	);
	await expect(node.execute.call(mock<IExecuteFunctions>())).rejects.toThrow(
		'Human review is not enabled',
	);
});

it.each([
	{ name: 'no items', input: [] },
	{ name: 'an empty item', input: [{ json: {} }] },
])('fetches a test event for a manual run with $name', async ({ input }) => {
	const context = mock<IExecuteFunctions>();
	context.getMode.mockReturnValue('manual');
	context.getInputData.mockReturnValue(input);

	const output = await node.execute.call(context);

	expect(node.description.mockManualExecution).toBe(true);
	expect(node.description.properties.every((property) => property.type === 'notice')).toBe(true);
	expect(output).toEqual([
		[
			{
				json: {
					requestId: expect.any(String),
					agentId: expect.any(String),
					toolName: 'send_email',
					requester: { id: 'test-user', name: 'Alex Example', source: 'preview' },
					description: expect.any(String),
					toolInput: {
						to: ['customer@example.com'],
						subject: 'Order confirmation',
						body: { text: 'Your order is confirmed.' },
					},
					requestedAt: expect.any(String),
					expiresAt: expect.any(String),
				},
			},
		],
	]);
	expect(context.getNodeParameter).not.toHaveBeenCalled();
});

it('supports expressions for the test request tool input', async () => {
	const context = mock<IExecuteFunctions>();
	context.getMode.mockReturnValue('manual');
	context.getInputData.mockReturnValue([{ json: {} }]);
	const [items] = await node.execute.call(context);
	const workflow = new Workflow({
		nodes: [
			{
				id: 'review-step',
				name: 'Review step',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
			},
		],
		connections: {},
		active: false,
		nodeTypes: mock<INodeTypes>(),
	});
	await workflow.expression.acquireIsolate();
	try {
		for (const [expression, expected] of [
			['={{ $json.toolInput.subject }}', 'Order confirmation'],
			['={{ $json.toolInput.to[0] }}', 'customer@example.com'],
			['={{ $json.toolInput.body.text }}', 'Your order is confirmed.'],
		]) {
			expect(
				workflow.expression.getParameterValue(
					expression,
					null,
					0,
					0,
					'Review step',
					items,
					'manual',
					{},
				),
			).toBe(expected);
		}
	} finally {
		await workflow.expression.releaseIsolate();
	}
});

it('does not emit test data when the trigger is activated', async () => {
	const context = mock<ITriggerFunctions>();
	expect(await node.trigger.call(context)).toEqual({});
	expect(context.emit).not.toHaveBeenCalled();
});

it.each(['manual', 'integrated'] as const)(
	'passes the complete Agent request through in %s mode',
	async (mode) => {
		const context = mock<IExecuteFunctions>();
		const input: INodeExecutionData[] = [
			{
				json: {
					requestId: 'run:call',
					agentId: 'agent',
					toolName: 'send_email',
					description: 'Send an order confirmation email.',
					toolInput: {
						to: ['reviewer@example.com', 'owner@example.com'],
						body: { text: 'Order confirmed', attachments: [{ fileId: 'document' }] },
					},
					requestedAt: '2026-01-01T12:00:00.000Z',
				},
			},
		];
		context.getMode.mockReturnValue(mode);
		context.getInputData.mockReturnValue(input);

		expect((await node.execute.call(context))[0]).toBe(input);
		expect(context.getNodeParameter).not.toHaveBeenCalled();
	},
);

it('keeps redacted requests unchanged during manual execution', async () => {
	const context = mock<IExecuteFunctions>();
	const input = [{ json: { requestId: 'run:call', argumentsRedacted: true } }];
	context.getMode.mockReturnValue('manual');
	context.getInputData.mockReturnValue(input);

	expect((await node.execute.call(context))[0]).toBe(input);
});

it('does not replace binary input with test data', async () => {
	const context = mock<IExecuteFunctions>();
	const input = [
		{ json: {}, binary: { attachment: { data: 'dGVzdA==', mimeType: 'text/plain' } } },
	];
	context.getMode.mockReturnValue('manual');
	context.getInputData.mockReturnValue(input);

	expect((await node.execute.call(context))[0]).toBe(input);
});

it.each([{ input: [] }, { input: [{ json: {} }] }])(
	'does not invent a request outside manual mode: $input',
	async ({ input }) => {
		const context = mock<IExecuteFunctions>();
		context.getMode.mockReturnValue('integrated');
		context.getInputData.mockReturnValue(input);

		expect((await node.execute.call(context))[0]).toBe(input);
	},
);
