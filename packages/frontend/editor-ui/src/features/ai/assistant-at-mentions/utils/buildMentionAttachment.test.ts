import { describe, expect, it } from 'vitest';

import type { AssistantWorkflowMentionItem } from '../assistantAtMentions.types';
import { projectWorkflowArtifact } from '../composables/useArtifactMentionIndex';
import { buildMentionAttachment } from './buildMentionAttachment';
import { buildAgentMentionItem } from './buildMentionItems';

function mention(
	overrides: Partial<AssistantWorkflowMentionItem> = {},
): AssistantWorkflowMentionItem {
	return {
		key: 'workflow:w1:w1',
		kind: 'workflow',
		source: 'artifacts',
		label: 'Orders',
		breadcrumbs: ['Orders'],
		workflowId: 'w1',
		entityId: 'w1',
		workflowName: 'Orders',
		...overrides,
	};
}

describe('buildMentionAttachment', () => {
	it('builds an agent attachment with the project of the agent', () => {
		const item = buildAgentMentionItem({ id: 'a1', name: 'Support agent', projectId: 'p1' });

		expect(item).toMatchObject({ key: 'agent:a1', kind: 'agent', source: 'agents' });
		expect(buildMentionAttachment(item)).toEqual({
			item,
			attachment: { type: 'agent', id: 'a1', name: 'Support agent', projectId: 'p1' },
			truncated: false,
		});
	});

	it('builds a workflow attachment', () => {
		expect(buildMentionAttachment(mention())?.attachment).toEqual({
			type: 'workflow',
			id: 'w1',
			name: 'Orders',
		});
	});

	it('builds a one-node attachment with parent workflow metadata', () => {
		expect(
			buildMentionAttachment(
				mention({ key: 'node:w1:n1', kind: 'node', entityId: 'n1', label: 'Validate' }),
			)?.attachment,
		).toEqual({
			type: 'nodes',
			workflowId: 'w1',
			workflowName: 'Orders',
			sets: [{ nodes: [{ id: 'n1', name: 'Validate' }] }],
		});
	});

	it('builds a group attachment from current index members and caps it at 50 nodes', () => {
		const nodes = Array.from({ length: 55 }, (_, index) => ({
			id: `n${index}`,
			name: `Node ${index}`,
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
		}));
		const index = projectWorkflowArtifact({
			id: 'w1',
			name: 'Orders',
			versionId: 'v1',
			nodes,
			nodeGroups: [{ id: 'g1', name: 'Fulfilment', nodeIds: nodes.map(({ id }) => id) }],
		});

		const selection = buildMentionAttachment(
			mention({ key: 'group:w1:g1', kind: 'group', entityId: 'g1', label: 'Fulfilment' }),
			index,
		);

		expect(selection?.truncated).toBe(true);
		expect(selection?.attachment).toMatchObject({
			type: 'nodes',
			workflowId: 'w1',
			workflowName: 'Orders',
			sets: [{ canvasGroupId: 'g1', canvasGroupName: 'Fulfilment' }],
		});
		if (selection?.attachment.type !== 'nodes') throw new Error('Expected nodes attachment');
		expect(selection.attachment.sets[0].nodes).toHaveLength(50);
	});
});
