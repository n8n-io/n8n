import nock from 'nock';
import { expect, test } from 'vitest';

import { mockNode, runWorkflow } from 'n8n-test';

import workflowJson from './workflow-with-subworkflow.json';

test('workflow with subworkflow mocked', async () => {
	nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

	const sub = mockNode(workflowJson, 'Execute sub-workflow', { subworkflowOutput: 'sfoutput' });

	const result = await runWorkflow(workflowJson);

	expect(result.subworkflowOutput).toBe('sfoutput');
	// The real Edit Fields node ran upstream: its output is what the mocked node received.
	expect(sub.input()).toMatchObject({ 'test-output': 'Hello world' });
});

test('the same workflow cannot run without the mock', async () => {
	nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

	// Sub-workflow execution needs a live n8n instance; the test harness cannot satisfy it.
	await expect(runWorkflow(workflowJson)).rejects.toThrowError();
});
