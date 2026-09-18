import {
	buildDraftMention,
	buildMentionAttachment,
	buildMentionKey,
} from './buildMentionAttachment';
import type { InstanceAiMentionNode } from './instanceAiMentions.types';

function mentionNode(index = 1): InstanceAiMentionNode {
	return {
		id: `node-${index}`,
		name: `Node ${index}`,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
	};
}

describe('buildMentionAttachment', () => {
	it('builds a workflow attachment', () => {
		expect(
			buildMentionAttachment({
				kind: 'workflow',
				workflowId: 'workflow-1',
				workflowName: 'Support triage',
			}),
		).toEqual({ type: 'workflow', id: 'workflow-1', name: 'Support triage' });
	});

	it('builds one node with icon metadata', () => {
		expect(
			buildMentionAttachment({
				kind: 'node',
				workflowId: 'workflow-1',
				workflowName: 'Support triage',
				node: mentionNode(),
			}),
		).toEqual({
			type: 'nodes',
			workflowId: 'workflow-1',
			workflowName: 'Support triage',
			sets: [{ selectionKind: 'nodes', nodes: [mentionNode()] }],
		});
	});

	it.each([1, 3, 50])('builds a whole %i-node canvas group in member order', (count) => {
		const nodes = Array.from({ length: count }, (_, index) => mentionNode(index));

		const attachment = buildMentionAttachment({
			kind: 'canvas-group',
			workflowId: 'workflow-1',
			workflowName: 'Support triage',
			groupId: 'group-1',
			groupName: 'Handle failures',
			nodes,
		});

		expect(attachment).toMatchObject({
			type: 'nodes',
			sets: [
				{
					selectionKind: 'canvas-group',
					canvasGroupId: 'group-1',
					canvasGroupName: 'Handle failures',
					nodes,
				},
			],
		});
	});

	it('rejects a 51-node canvas group', () => {
		expect(() =>
			buildMentionAttachment({
				kind: 'canvas-group',
				workflowId: 'workflow-1',
				workflowName: 'Support triage',
				groupId: 'group-1',
				groupName: 'Handle failures',
				nodes: Array.from({ length: 51 }, (_, index) => mentionNode(index)),
			}),
		).toThrow('between 1 and 50 nodes');
	});

	it('builds stable composite keys', () => {
		expect(buildMentionKey({ kind: 'workflow', workflowId: 'workflow-1' })).toBe(
			'workflow:workflow-1',
		);
		expect(buildMentionKey({ kind: 'node', workflowId: 'workflow-1', nodeId: 'node-1' })).toBe(
			'node:workflow-1:node-1',
		);
		expect(
			buildMentionKey({
				kind: 'canvas-group',
				workflowId: 'workflow-1',
				groupId: 'group-1',
			}),
		).toBe('canvas-group:workflow-1:group-1');
	});

	it('keeps separate draft attachments for separate mentions', () => {
		const first = buildDraftMention(
			{
				kind: 'node',
				workflowId: 'workflow-1',
				workflowName: 'Support triage',
				node: mentionNode(1),
			},
			'typed',
		);
		const second = buildDraftMention(
			{
				kind: 'node',
				workflowId: 'workflow-1',
				workflowName: 'Support triage',
				node: mentionNode(2),
			},
			'button',
		);

		expect(first.attachment).not.toBe(second.attachment);
		expect([first.key, second.key]).toEqual(['node:workflow-1:node-1', 'node:workflow-1:node-2']);
	});
});
