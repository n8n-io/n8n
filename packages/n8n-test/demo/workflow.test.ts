import nock from 'nock';
import { expect, test } from 'vitest';

import { runWorkflow } from 'n8n-test';

import workflowJson from './workflow.json';

test('workflow happy day', async () => {
	nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

	const output = await runWorkflow(workflowJson);

	expect(output['test-output']).toBe('Hello world');
});

test('workflow unhappy day', async () => {
	nock('https://test-endpoint.com').get('/test').reply(500);

	await expect(runWorkflow(workflowJson)).rejects.toThrowError();
});
