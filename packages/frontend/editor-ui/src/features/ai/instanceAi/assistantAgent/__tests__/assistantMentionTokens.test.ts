import type {
	AssistantMentionItem,
	AssistantWorkflowMentionItem,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import {
	isMentionedInline,
	mentionAttachmentsOf,
	mentionHref,
	type PickedMention,
	withoutAttachedResources,
} from '../assistantMentionTokens';

const workflowItem: AssistantWorkflowMentionItem = {
	key: 'workflow:wf-1:wf-1',
	kind: 'workflow',
	source: 'workflows',
	label: 'Orders',
	breadcrumbs: ['Orders'],
	entityId: 'wf-1',
	workflowId: 'wf-1',
	workflowName: 'Orders',
};

const agentItem: AssistantMentionItem = {
	key: 'agent:agent-1',
	kind: 'agent',
	source: 'agents',
	label: 'Support bot',
	breadcrumbs: ['Support bot'],
	entityId: 'agent-1',
	projectId: 'project-1',
};

function nodeItem(nodeId: string): AssistantMentionItem {
	return {
		...workflowItem,
		key: `node:wf-1:${nodeId}`,
		kind: 'node',
		label: nodeId,
		entityId: nodeId,
	};
}

describe('assistantMentionTokens', () => {
	it('points a token at the resource of each kind', () => {
		expect(mentionHref(workflowItem)).toBe('n8n-resource://workflow/wf-1');
		expect(mentionHref(agentItem)).toBe('n8n-resource://agent/agent-1');
		expect(mentionHref(nodeItem('n 1'))).toBe('n8n-resource://node/wf-1/n%201');
	});

	it('sends one attachment for each resource that the text holds, in order', () => {
		const picked = new Map<string, PickedMention>([
			[
				mentionHref(agentItem),
				{
					item: agentItem,
					attachment: { type: 'agent', id: 'agent-1', name: 'Support bot', projectId: 'project-1' },
				},
			],
			[
				mentionHref(nodeItem('a')),
				{
					item: nodeItem('a'),
					attachment: { type: 'nodes', workflowId: 'wf-1', sets: [{ nodes: [{ id: 'a' }] }] },
				},
			],
			[
				mentionHref(nodeItem('b')),
				{
					item: nodeItem('b'),
					attachment: { type: 'nodes', workflowId: 'wf-1', sets: [{ nodes: [{ id: 'b' }] }] },
				},
			],
		]);
		const text =
			'Ask [@Support bot](n8n-resource://agent/agent-1) about [@a](n8n-resource://node/wf-1/a), ' +
			'[@b](n8n-resource://node/wf-1/b) and [@Orders](n8n-resource://workflow/wf-1), ' +
			'again [@Support bot](n8n-resource://agent/agent-1)';

		expect(mentionAttachmentsOf(text, picked)).toEqual([
			{ type: 'agent', id: 'agent-1', name: 'Support bot', projectId: 'project-1' },
			{
				type: 'nodes',
				workflowId: 'wf-1',
				sets: [{ nodes: [{ id: 'a' }] }, { nodes: [{ id: 'b' }] }],
			},
			// Not picked in this composer: rebuilt from the token.
			{ type: 'workflow', id: 'wf-1', name: 'Orders' },
		]);
		// The picks stay unchanged.
		expect(picked.get(mentionHref(nodeItem('a')))?.attachment).toEqual({
			type: 'nodes',
			workflowId: 'wf-1',
			sets: [{ nodes: [{ id: 'a' }] }],
		});
	});

	it('tells when the text shows a resource inline', () => {
		const text = 'Fix [@a](n8n-resource://node/wf-1/a) in [@Orders](n8n-resource://workflow/wf-1)';
		expect(isMentionedInline({ type: 'workflow', id: 'wf-1' }, text)).toBe(true);
		expect(isMentionedInline({ type: 'workflow', id: 'wf-2' }, text)).toBe(false);
		expect(
			isMentionedInline(
				{ type: 'nodes', workflowId: 'wf-1', sets: [{ nodes: [{ id: 'a' }] }] },
				text,
			),
		).toBe(true);
		expect(
			isMentionedInline({ type: 'agent', id: 'wf-1', projectId: 'project-1' }, 'Plain text'),
		).toBe(false);
	});

	it('shows a nodes attachment when a chip added nodes that the text does not mention', () => {
		const text = 'Fix [@b](n8n-resource://node/wf-1/b) and [@G](n8n-resource://group/wf-1/g-1)';
		const grouped = { nodes: [{ id: 'x' }], canvasGroupId: 'g-1' };
		expect(
			isMentionedInline(
				{ type: 'nodes', workflowId: 'wf-1', sets: [{ nodes: [{ id: 'b' }] }, grouped] },
				text,
			),
		).toBe(true);
		// Node a came from a composer chip, so the card still shows.
		expect(
			isMentionedInline(
				{
					type: 'nodes',
					workflowId: 'wf-1',
					sets: [{ nodes: [{ id: 'a' }] }, { nodes: [{ id: 'b' }] }],
				},
				text,
			),
		).toBe(false);
		expect(
			isMentionedInline(
				{ type: 'nodes', workflowId: 'wf-1', sets: [{ nodes: [{ id: 'a' }, { id: 'b' }] }] },
				text,
			),
		).toBe(false);
	});

	it('drops a nodes mention only when the same nodes are already attached', () => {
		const grouped = { nodes: [{ id: 'x' }], canvasGroupId: 'g-1' };
		const attached = {
			type: 'nodes' as const,
			workflowId: 'wf-1',
			sets: [{ nodes: [{ id: 'a' }] }, grouped],
		};
		// The same sets in another order are the same resource.
		const same = {
			type: 'nodes' as const,
			workflowId: 'wf-1',
			sets: [grouped, { nodes: [{ id: 'a' }] }],
		};
		const otherNodes = {
			type: 'nodes' as const,
			workflowId: 'wf-1',
			sets: [{ nodes: [{ id: 'b' }] }],
		};
		const otherWorkflow = { ...same, workflowId: 'wf-2' };

		expect(withoutAttachedResources([same, otherNodes, otherWorkflow], [attached])).toEqual([
			otherNodes,
			otherWorkflow,
		]);
	});

	it('drops a workflow or agent mention that is already attached', () => {
		const workflow = { type: 'workflow' as const, id: 'wf-1' };
		const agent = { type: 'agent' as const, id: 'ag-1', projectId: 'project-1' };
		const otherAgent = { ...agent, id: 'ag-2' };

		expect(withoutAttachedResources([workflow, agent, otherAgent], [workflow, agent])).toEqual([
			otherAgent,
		]);
	});
});
