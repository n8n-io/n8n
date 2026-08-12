import nock from 'nock';
import { expect, test } from 'vitest';

import { runWorkflow } from 'n8n-test';

import workflowJson from './workflow.json';

test('workflow happy day', async () => {
	nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

	const output = await runWorkflow(workflowJson);

	// The workflow's "Edit Fields" node maps the HTTP response's `data` to `test-output`.
	expect(output['test-output']).toBe('Hello world');
});

test('workflow unhappy day', async () => {
	nock('https://test-endpoint.com').get('/test').reply(500);

	// The HTTP Request node's own 500 error surfaces, not just "some" rejection.
	await expect(runWorkflow(workflowJson)).rejects.toThrowError(
		'The service was not able to process your request',
	);
});

test('input becomes the trigger item and flows through', async () => {
	nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

	const output = await runWorkflow(workflowJson, { invokedBy: 'vitest' });

	// The workflow reads `invokedBy` off the trigger's item via a cross-node expression.
	expect(output.invokedBy).toBe('vitest');
});
