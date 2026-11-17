import { configureNode, executeWorkflow, loadWorkflow, mockNode, WorkflowTestError } from '../src';
import formatName from './fixtures/format-name.json';
import lastNode from './fixtures/webhook-last-node.json';
import respond from './fixtures/webhook-respond.json';

test('captures the response of the Respond to Webhook node', async () => {
	const workflow = loadWorkflow(respond);

	const result = await executeWorkflow(workflow, { input: { body: { id: 'A-7' } } });

	expect(await result.response).toEqual({
		status: 201,
		headers: { 'x-order-id': 'A-7' },
		body: { orderId: 'A-7', status: 'created' },
	});
});

test('captures the first item of the last node as the response', async () => {
	const workflow = loadWorkflow(lastNode);

	const result = await executeWorkflow(workflow, { input: { body: { quantity: 3 } } });

	expect(await result.response).toEqual({
		status: 202,
		headers: { 'cache-control': 'no-store' },
		body: { total: 15 },
	});
});

test('reads the response property with a path that indexes into an array', async () => {
	const definition = structuredClone(lastNode);
	Object.assign(definition.nodes[0].parameters.options, {
		responsePropertyName: 'body.items[1].name',
	});
	Object.assign(definition.nodes[1].parameters, { includeOtherFields: true });
	const workflow = loadWorkflow(definition);

	const result = await executeWorkflow(workflow, {
		input: { body: { quantity: 3, items: [{ name: 'pen' }, { name: 'ink' }] } },
	});

	expect((await result.response)?.body).toBe('ink');
});

test('has no response when the trigger is not a webhook', async () => {
	const workflow = loadWorkflow(formatName);

	const result = await executeWorkflow(workflow, { input: { first: 'Ada', last: 'Lovelace' } });

	expect(await result.response).toBeUndefined();
});

test('reports an unsupported streaming response before a downstream node runs', async () => {
	const workflow = loadWorkflow(lastNode);
	configureNode(workflow.node('Webhook'), { parameters: { responseMode: 'streaming' } });
	const quote = vi.fn().mockReturnValue([{ total: 15 }]);
	mockNode(workflow.node('Quote'), quote);

	await expect(executeWorkflow(workflow)).rejects.toMatchObject({
		code: 'INVALID_OPTION',
		message: expect.stringContaining('streaming'),
	});
	expect(quote).not.toHaveBeenCalled();
});

test('captures an immediate response before a later node changes execution data', async () => {
	const workflow = loadWorkflow(lastNode);
	configureNode(workflow.node('Webhook'), {
		parameters: {
			responseMode: 'onReceived',
			options: { responseData: "={{ $execution.customData?.get('phase') ?? 'before' }}" },
		},
	});
	configureNode(workflow.node('Quote'), {
		parameters: {
			assignments: {
				assignments: [
					{
						id: 'phase',
						name: 'changed',
						value: "={{ $execution.customData.set('phase', 'after') ?? true }}",
						type: 'boolean',
					},
				],
			},
		},
	});

	const result = await executeWorkflow(workflow);

	expect(result.customData.phase).toBe('after');
	expect((await result.response)?.body).toBe('before');
});

test('keeps an immediate response when a later node fails', async () => {
	const workflow = loadWorkflow(lastNode);
	configureNode(workflow.node('Webhook'), {
		parameters: {
			responseMode: 'onReceived',
			options: { responseData: '={{ $now.toUTC().toISO() }}' },
		},
	});
	mockNode(workflow.node('Quote'), { error: { message: 'Quote is unavailable' } });

	const failure = await executeWorkflow(workflow, { now: '2026-01-05T09:30:00Z' }).catch(
		(error: unknown) => error,
	);

	expect(failure).toBeInstanceOf(WorkflowTestError);
	if (!(failure instanceof WorkflowTestError)) throw failure;
	expect((await failure.result?.response)?.body).toBe('2026-01-05T09:30:00.000Z');
});
