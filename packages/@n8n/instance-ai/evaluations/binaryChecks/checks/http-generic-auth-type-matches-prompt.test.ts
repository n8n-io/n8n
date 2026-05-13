import { httpGenericAuthTypeMatchesPrompt } from './http-generic-auth-type-matches-prompt';
import type { WorkflowResponse } from '../../clients/n8n-client';

function workflowWithHttpRequest(parameters: Record<string, unknown>): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'HTTP auth test',
		active: false,
		nodes: [
			{
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				parameters: {},
			},
			{
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters,
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
			},
		},
	};
}

describe('httpGenericAuthTypeMatchesPrompt', () => {
	it('fails when prompt asks for Bearer but builder picks httpHeaderAuth', async () => {
		const workflow = workflowWithHttpRequest({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		});

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Call the GitHub API using a Bearer token',
		});

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('HTTP Request');
		expect(result.comment).toContain('httpBearerAuth');
	});

	it('fails when prompt mentions Authorization: Bearer header explicitly', async () => {
		const workflow = workflowWithHttpRequest({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		});

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Send a request with Authorization: Bearer <token>',
		});

		expect(result.pass).toBe(false);
	});

	it('passes when builder picks httpBearerAuth for a Bearer prompt', async () => {
		const workflow = workflowWithHttpRequest({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpBearerAuth',
		});

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Call the GitHub API using a Bearer token',
		});

		expect(result).toEqual({ pass: true });
	});

	it('passes when prompt specifies a custom header name and builder picks httpHeaderAuth', async () => {
		const workflow = workflowWithHttpRequest({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		});

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Call the Algolia API with an X-API-Key header',
		});

		expect(result).toEqual({ pass: true });
	});

	it('passes when the prompt has no auth signal at all', async () => {
		const workflow = workflowWithHttpRequest({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		});

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Fetch data from a public endpoint',
		});

		expect(result).toEqual({ pass: true });
	});

	it('ignores HTTP Request nodes that do not use generic credential type', async () => {
		const workflow = workflowWithHttpRequest({
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'githubApi',
		});

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Call the GitHub API using a Bearer token',
		});

		expect(result).toEqual({ pass: true });
	});

	it('ignores non-HTTP-Request nodes', async () => {
		const workflow: WorkflowResponse = {
			id: 'wf-2',
			name: 'Slack only',
			active: false,
			nodes: [
				{
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					parameters: {},
				},
				{
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					parameters: {
						authentication: 'genericCredentialType',
						genericAuthType: 'httpHeaderAuth',
					},
				},
			],
			connections: {},
		};

		const result = await httpGenericAuthTypeMatchesPrompt.run(workflow, {
			prompt: 'Send a Bearer-authenticated message',
		});

		expect(result).toEqual({ pass: true });
	});
});
