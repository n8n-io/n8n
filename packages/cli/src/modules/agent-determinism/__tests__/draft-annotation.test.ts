import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { FALLBACK_NODE_NAME } from '../agent-determinism.constants';
import { annotateDraft } from '../draft-annotation';

describe('annotateDraft', () => {
	it('should give every node a unique name', () => {
		const draft = {
			name: 'Draft',
			nodes: [
				{
					id: '1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2.1,
					position: [0, 0],
				},
				{
					id: '2',
					name: FALLBACK_NODE_NAME,
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 3,
					position: [0, 600],
				},
			],
			connections: {},
		} as WorkflowJSON;

		const names = annotateDraft(draft).nodes.map((node) => node.name);

		expect(new Set(names).size).toBe(names.length);
	});
});
