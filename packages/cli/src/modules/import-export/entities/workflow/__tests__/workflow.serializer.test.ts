import type { WorkflowEntity } from '@n8n/db';

import { WorkflowSerializer } from '../workflow.serializer';

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

describe('WorkflowSerializer', () => {
	const serializer = new WorkflowSerializer();

	it('serializes node.credentials as id/name reference only, never inline secret data', () => {
		// Workflow nodes only ever carry credential REFERENCES ({ id, name }), never the secret
		// `data` payload — which lives in the CredentialsEntity. Any field outside id/name in the
		// serialized output would indicate a leaked secret payload.
		const workflow = makeWorkflow({
			nodes: [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: { slackApi: { id: 'cred-abc', name: 'My Slack' } },
				},
			],
		});

		const serialized = serializer.serialize(workflow);

		expect(serialized.nodes[0].credentials!.slackApi).toEqual({
			id: 'cred-abc',
			name: 'My Slack',
		});
		expect(Object.keys(serialized.nodes[0].credentials!.slackApi).sort()).toEqual(['id', 'name']);
	});
});
