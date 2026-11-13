import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

const baseUrl = 'https://api.brevo.com';
const credentials = { sendInBlueApi: { apiKey: 'test-key' } };

const workflow = (
	resource: string,
	parameters: Record<string, string>,
): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			id: '1',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: 'Brevo',
			type: 'n8n-nodes-base.sendInBlue',
			typeVersion: 1,
			position: [200, 0],
			credentials: { sendInBlueApi: { id: '1', name: 'Brevo' } },
			parameters: { resource, operation: 'delete', ...parameters },
		},
	],
	connections: { Trigger: { main: [[{ node: 'Brevo', type: 'main', index: 0 }]] } },
});

describe('Brevo Node', () => {
	const harness = new NodeTestHarness();

	const cases: Array<{
		description: string;
		resource: string;
		parameters: Record<string, string>;
		path: string;
	}> = [
		{
			description: 'should delete a sender by id',
			resource: 'sender',
			parameters: { id: '42' },
			path: '/v3/senders/42',
		},
		{
			description: 'should send the sender id as one path segment',
			resource: 'sender',
			parameters: { id: 'a/b' },
			path: '/v3/senders/a%2Fb',
		},
		{
			description: 'should delete an attribute by name',
			resource: 'attribute',
			parameters: { deleteAttributeCategory: 'normal', deleteAttributeName: 'FIRSTNAME' },
			path: '/v3/contacts/attributes/normal/FIRSTNAME',
		},
		{
			description: 'should send the attribute name and category as one path segment each',
			resource: 'attribute',
			parameters: { deleteAttributeCategory: 'a/b', deleteAttributeName: 'c/d' },
			path: '/v3/contacts/attributes/a%2Fb/c%2Fd',
		},
		{
			description: 'should delete a contact by email',
			resource: 'contact',
			parameters: { identifier: 'jane@acme.com' },
			path: '/v3/contacts/jane%40acme.com',
		},
		{
			description: 'should send the contact identifier as one path segment',
			resource: 'contact',
			parameters: { identifier: 'a/b' },
			path: '/v3/contacts/a%2Fb',
		},
	];

	for (const { description, resource, parameters, path } of cases) {
		harness.setupTest({
			description,
			input: { workflowData: workflow(resource, parameters) },
			output: { nodeData: { Brevo: [[{ json: { success: true } }]] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [{ method: 'delete', path, statusCode: 204, responseBody: '' }],
			},
		});
	}

	harness.setupTest({
		description: 'should reject a dot segment as the contact identifier',
		input: { workflowData: workflow('contact', { identifier: '..' }) },
		output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
		credentials,
	});
});
