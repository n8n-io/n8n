import type { InstanceAiNodesAttachment } from '@n8n/api-types';

import {
	countSentNodes,
	readNodesAttachment,
	toNodesComposerAttachment,
} from '../assistantNodeAttachments';

function nodes(workflowId: string, ...names: string[]): InstanceAiNodesAttachment {
	return {
		type: 'nodes',
		workflowId,
		sets: [{ nodes: names.map((name) => ({ id: `id-${name}`, name })) }],
	};
}

describe('assistantNodeAttachments', () => {
	describe('toNodesComposerAttachment', () => {
		it('stages the nodes of a workflow with one chip that sends them as an attachment', () => {
			const attachment = nodes('wf-1', 'Webhook', 'Slack');

			const staged = toNodesComposerAttachment(attachment, []);

			expect(staged).toEqual({
				chip: { id: 'nodes:wf-1', label: expect.any(String), icon: 'layers' },
				clientContextPatch: { attachments: [attachment] },
			});
			expect(readNodesAttachment(staged)).toEqual(attachment);
		});

		it('joins the nodes that the chip of the same workflow stages', () => {
			const first = toNodesComposerAttachment(nodes('wf-1', 'Webhook'), []);
			const other = toNodesComposerAttachment(nodes('wf-2', 'Gmail'), []);

			const joined = toNodesComposerAttachment(nodes('wf-1', 'Slack'), [other, first]);

			expect(readNodesAttachment(joined)?.sets).toEqual([
				...nodes('wf-1', 'Webhook').sets,
				...nodes('wf-1', 'Slack').sets,
			]);
		});
	});

	describe('readNodesAttachment', () => {
		it('reads nothing from a chip that does not stage nodes', () => {
			expect(
				readNodesAttachment({
					chip: { id: 'wf-1' },
					clientContextPatch: { attachments: [nodes('wf-1', 'Webhook')] },
				}),
			).toBeUndefined();
			expect(
				readNodesAttachment({
					chip: { id: 'nodes:wf-1' },
					clientContextPatch: { attachments: [{ type: 'nodes' }] },
				}),
			).toBeUndefined();
		});
	});

	describe('countSentNodes', () => {
		it('counts the nodes of every nodes attachment', () => {
			expect(
				countSentNodes({
					attachments: [
						nodes('wf-1', 'Webhook', 'Slack'),
						{ type: 'workflow', id: 'wf-2' },
						nodes('wf-3', 'Gmail'),
					],
				}),
			).toBe(3);
		});

		it('counts no nodes without valid attachments', () => {
			expect(countSentNodes(undefined)).toBe(0);
			expect(countSentNodes({ attachments: [{ type: 'nodes' }] })).toBe(0);
		});
	});
});
