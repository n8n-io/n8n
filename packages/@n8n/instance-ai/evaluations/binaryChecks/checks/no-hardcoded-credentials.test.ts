import { noHardcodedCredentials } from './no-hardcoded-credentials';
import type { WorkflowNodeResponse, WorkflowResponse } from '../../clients/n8n-client';

function workflow(...nodes: WorkflowNodeResponse[]): WorkflowResponse {
	return { id: 'w', name: 'w', active: false, versionId: 'v', nodes, connections: {} };
}

describe('noHardcodedCredentials', () => {
	it('fails when a Set node assigns a hardcoded credential value', async () => {
		const result = await noHardcodedCredentials.run(
			workflow({
				name: 'Workflow Configuration',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: { assignments: [{ name: 'youtubeApiKey', value: 'AIzaSyD-hardcoded' }] },
				},
			}),
			{ prompt: '' },
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Workflow Configuration');
	});

	it('passes when a Set node assigns only non-secret fields', async () => {
		const result = await noHardcodedCredentials.run(
			workflow({
				name: 'Build Payload',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: { assignments: [{ name: 'company', value: 'Acme' }] },
				},
			}),
			{ prompt: '' },
		);

		expect(result.pass).toBe(true);
	});

	// HTTP coverage moved wholesale to `secrets_use_credentials_not_parameters`, so
	// one mistake costs one check rather than two.
	it('is not applicable to a workflow whose only candidate is an HTTP Request node', async () => {
		const result = await noHardcodedCredentials.run(
			workflow({
				name: 'Call API',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'Authorization', value: 'Bearer abc' }] },
				},
			}),
			{ prompt: '' },
		);

		expect(result.applicable).toBe(false);
	});
});
