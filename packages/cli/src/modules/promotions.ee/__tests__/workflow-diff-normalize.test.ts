import { workflowChangeIsCredentialNameOnly } from '../workflow-diff-normalize';

function workflow(options: { credentialName?: string; url?: string } = {}): string {
	const node: Record<string, unknown> = {
		id: 'n1',
		name: 'HTTP',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: options.url ? { url: options.url } : {},
	};
	if (options.credentialName !== undefined) {
		node.credentials = { slackApi: { id: 'c1', name: options.credentialName } };
	}
	return JSON.stringify({ nodes: [node] });
}

describe('workflowChangeIsCredentialNameOnly', () => {
	it('is true when only the embedded credential name differs', () => {
		expect(
			workflowChangeIsCredentialNameOnly(
				workflow({ credentialName: 'Old name' }),
				workflow({ credentialName: 'New name' }),
			),
		).toBe(true);
	});

	it('is false when content differs beyond the credential name', () => {
		expect(
			workflowChangeIsCredentialNameOnly(
				workflow({ credentialName: 'Old name' }),
				workflow({ credentialName: 'New name', url: 'https://example.test' }),
			),
		).toBe(false);
	});

	it('is false when a credential is added or removed', () => {
		expect(
			workflowChangeIsCredentialNameOnly(workflow(), workflow({ credentialName: 'Any' })),
		).toBe(false);
	});

	it('is false for a malformed workflow rather than throwing', () => {
		expect(
			workflowChangeIsCredentialNameOnly('{"nodes":[null]}', workflow({ credentialName: 'Any' })),
		).toBe(false);
		expect(
			workflowChangeIsCredentialNameOnly('not json', workflow({ credentialName: 'Any' })),
		).toBe(false);
	});
});
