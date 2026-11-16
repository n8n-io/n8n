import { executeWorkflow, loadWorkflow } from '../src';
import formatName from './fixtures/format-name.json';
import lastNode from './fixtures/webhook-last-node.json';
import respond from './fixtures/webhook-respond.json';

test('captures the response of the Respond to Webhook node', async () => {
	const workflow = loadWorkflow(respond);

	const result = await executeWorkflow(workflow, { input: { body: { id: 'A-7' } } });

	expect(result.response).toEqual({
		status: 201,
		headers: { 'x-order-id': 'A-7' },
		body: { orderId: 'A-7', status: 'created' },
	});
});

test('captures the first item of the last node as the response', async () => {
	const workflow = loadWorkflow(lastNode);

	const result = await executeWorkflow(workflow, { input: { body: { quantity: 3 } } });

	expect(result.response).toEqual({
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

	expect(result.response?.body).toBe('ink');
});

test('has no response when the trigger is not a webhook', async () => {
	const workflow = loadWorkflow(formatName);

	const result = await executeWorkflow(workflow, { input: { first: 'Ada', last: 'Lovelace' } });

	expect(result.response).toBeUndefined();
});
