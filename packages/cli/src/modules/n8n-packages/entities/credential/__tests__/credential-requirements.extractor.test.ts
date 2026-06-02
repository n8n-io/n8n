import type { WorkflowEntity } from '@n8n/db';

import { CredentialRequirementsExtractor } from '../credential-requirements.extractor';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf-abc1234567',
		name: 'My Workflow',
		nodes: [],
		connections: {},
		versionId: 'v1',
		active: false,
		isArchived: false,
		settings: undefined,
		parentFolder: null,
		...overrides,
	} as unknown as WorkflowEntity;
}

describe('CredentialRequirementsExtractor', () => {
	const extractor = new CredentialRequirementsExtractor();

	it('returns no requirements for a workflow with no credentialled nodes', () => {
		const workflow = makeWorkflow({
			id: 'wf-no-creds',
			nodes: [
				{
					id: 'n1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('emits one requirement per node credential slot, keyed by credential type', () => {
		// node.credentials is { [credentialTypeKey]: { id, name } } — the
		// type comes from the map key, not the value.
		const workflow = makeWorkflow({
			id: 'wf-creds',
			nodes: [
				{
					id: 'n1',
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						httpHeaderAuth: { id: 'cred-1', name: 'Header credential' },
						httpBasicAuth: { id: 'cred-2', name: 'Basic credential' },
					},
				},
			],
		});

		expect(extractor.extract(workflow)).toEqual(
			expect.arrayContaining([
				{
					workflowId: 'wf-creds',
					credentialId: 'cred-1',
					credentialName: 'Header credential',
					credentialType: 'httpHeaderAuth',
				},
				{
					workflowId: 'wf-creds',
					credentialId: 'cred-2',
					credentialName: 'Basic credential',
					credentialType: 'httpBasicAuth',
				},
			]),
		);
		expect(extractor.extract(workflow)).toHaveLength(2);
	});

	it('dedupes when the same credential id appears in two nodes of one workflow', () => {
		const workflow = makeWorkflow({
			id: 'wf-dup',
			nodes: [
				{
					id: 'n1',
					name: 'HTTP A',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						httpHeaderAuth: { id: 'cred-shared', name: 'Shared' },
					},
				},
				{
					id: 'n2',
					name: 'HTTP B',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						httpHeaderAuth: { id: 'cred-shared', name: 'Shared' },
					},
				},
			],
		});

		expect(extractor.extract(workflow)).toEqual([
			{
				workflowId: 'wf-dup',
				credentialId: 'cred-shared',
				credentialName: 'Shared',
				credentialType: 'httpHeaderAuth',
			},
		]);
	});

	it('skips slots that have no credential id selected yet', () => {
		const workflow = makeWorkflow({
			id: 'wf-blank-slot',
			nodes: [
				{
					id: 'n1',
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						httpHeaderAuth: { id: null as unknown as string, name: '' },
					},
				},
			],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('returns an empty list when the workflow has no nodes array at all', () => {
		// Defensive guard for older/partially-hydrated workflow rows where
		// `nodes` may be absent rather than empty.
		const workflow = makeWorkflow({ id: 'wf-no-nodes', nodes: undefined as unknown as [] });

		expect(extractor.extract(workflow)).toEqual([]);
	});
});
