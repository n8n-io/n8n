import type { InstanceAiResourceAttachment } from '@n8n/api-types';
import { effectScope, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { AssistantMentionSelection } from '../assistantAtMentions.types';
import { useAssistantMentionAttachments } from './useAssistantMentionAttachments';

function workflowSelection(): AssistantMentionSelection {
	return {
		item: {
			key: 'workflow:w1:w1',
			kind: 'workflow',
			source: 'workflows',
			label: 'Orders',
			breadcrumbs: ['Orders'],
			workflowId: 'w1',
			entityId: 'w1',
			workflowName: 'Orders',
		},
		attachment: { type: 'workflow', id: 'w1', name: 'Orders' },
		truncated: false,
	};
}

function nodeSelection(): AssistantMentionSelection {
	return {
		item: {
			key: 'node:w1:n1',
			kind: 'node',
			source: 'artifacts',
			label: 'Validate',
			breadcrumbs: ['Orders', 'Validate'],
			workflowId: 'w1',
			entityId: 'n1',
			workflowName: 'Orders',
		},
		attachment: {
			type: 'nodes',
			workflowId: 'w1',
			workflowName: 'Orders',
			sets: [{ nodes: [{ id: 'n1', name: 'Validate' }] }],
		},
		truncated: false,
	};
}

function agentSelection(): AssistantMentionSelection {
	return {
		item: {
			key: 'agent:a1',
			kind: 'agent',
			source: 'agents',
			label: 'Support agent',
			breadcrumbs: ['Support agent'],
			entityId: 'a1',
			projectId: 'project-1',
		},
		attachment: { type: 'agent', id: 'a1', name: 'Support agent', projectId: 'project-1' },
		truncated: false,
	};
}

function setup(options: { reservedAttachmentCount?: number } = {}) {
	const scope = effectScope();
	const files = ref<File[]>([]);
	const resources = ref<InstanceAiResourceAttachment[]>([]);
	const projectId = ref('project-1');
	const onMentionRemoved = vi.fn();
	const onCleared = vi.fn();
	let mentions!: ReturnType<typeof useAssistantMentionAttachments>;
	scope.run(() => {
		mentions = useAssistantMentionAttachments({
			files,
			resources,
			projectId,
			reservedAttachmentCount: options.reservedAttachmentCount ?? 0,
			onMentionRemoved,
			onCleared,
		});
	});
	return {
		scope,
		files,
		resources,
		projectId,
		onMentionRemoved,
		onCleared,
		mentions,
	};
}

describe('useAssistantMentionAttachments', () => {
	it('adds a structured attachment once per mention', () => {
		const { mentions, resources, scope } = setup();

		expect(mentions.select(workflowSelection())).toEqual({ status: 'added', truncated: false });
		expect(mentions.select(workflowSelection())).toEqual({
			status: 'duplicate',
			truncated: false,
		});
		expect(resources.value).toEqual([{ type: 'workflow', id: 'w1', name: 'Orders' }]);
		scope.stop();
	});

	it('stages a mentioned agent once, counts it, and drops it when its chip is removed', () => {
		const { mentions, resources, onMentionRemoved, scope } = setup();

		expect(mentions.select(agentSelection())).toEqual({ status: 'added', truncated: false });
		expect(mentions.select(agentSelection())).toEqual({ status: 'duplicate', truncated: false });
		expect(resources.value).toEqual([
			{ type: 'agent', id: 'a1', name: 'Support agent', projectId: 'project-1' },
		]);
		expect(mentions.snapshotCounts()).toEqual({
			total: 1,
			workflow: 0,
			node: 0,
			group: 0,
			agent: 1,
		});
		expect(mentions.snapshotMentionedWorkflowIds()).toEqual([]);

		mentions.removeResource(0);

		expect(resources.value).toEqual([]);
		expect(onMentionRemoved).toHaveBeenCalledWith('agent');
		scope.stop();
	});

	it('propagates the group truncation result', () => {
		const { mentions, scope } = setup();
		const selection = workflowSelection();
		selection.truncated = true;

		expect(mentions.select(selection)).toEqual({ status: 'added', truncated: true });
		scope.stop();
	});

	it('keeps child context when the workflow attachment is removed', () => {
		const { mentions, resources, onMentionRemoved, scope } = setup();
		mentions.select(workflowSelection());
		mentions.select(nodeSelection());

		mentions.removeResource(0);

		expect(resources.value).toEqual([nodeSelection().attachment]);
		expect(onMentionRemoved).toHaveBeenCalledExactlyOnceWith('workflow');
		// The removed mention is a draft again, not a duplicate.
		expect(mentions.select(workflowSelection())).toEqual({ status: 'added', truncated: false });
		scope.stop();
	});

	it('snapshots counts before merged attachments are submitted', () => {
		const { mentions, scope } = setup();
		mentions.select(workflowSelection());
		mentions.select(nodeSelection());

		expect(mentions.snapshotCounts()).toEqual({
			total: 2,
			workflow: 1,
			node: 1,
			group: 0,
			agent: 0,
		});
		// Both mentions point at the same workflow: one tab, listed once.
		expect(mentions.snapshotMentionedWorkflowIds()).toEqual(['w1']);
		scope.stop();
	});

	it('lets a sent mention be picked again, and restores one after a refused send', () => {
		const { mentions, resources, scope } = setup();
		mentions.select(workflowSelection());

		// The composer clears the attachments with the send and puts them back on a refusal.
		const restoreRefused = mentions.detachSubmission();
		resources.value = [];
		expect(mentions.snapshotCounts().total).toBe(0);
		resources.value = [workflowSelection().attachment];
		restoreRefused();
		expect(mentions.select(workflowSelection())).toEqual({
			status: 'duplicate',
			truncated: false,
		});
		expect(mentions.snapshotCounts().total).toBe(1);

		mentions.detachSubmission();
		resources.value = [];
		expect(mentions.select(workflowSelection())).toEqual({ status: 'added', truncated: false });
		expect(resources.value).toHaveLength(1);
		scope.stop();
	});

	it('does not restore a mention whose attachment is gone or picked again since', () => {
		const { mentions, resources, scope } = setup();
		mentions.select(workflowSelection());
		mentions.select(nodeSelection());
		const restore = mentions.detachSubmission();
		resources.value = [];

		// Picked again before the refusal came back: that pick is the live one.
		mentions.select(workflowSelection());
		restore();
		restore();

		expect(mentions.snapshotCounts()).toEqual({
			total: 1,
			workflow: 1,
			node: 0,
			group: 0,
			agent: 0,
		});
		expect(mentions.select(nodeSelection())).toEqual({ status: 'added', truncated: false });
		scope.stop();
	});

	it('detaches only the mentions captured before submission work starts', () => {
		const { mentions, scope } = setup();
		mentions.select(workflowSelection());
		const snapshot = mentions.snapshotSubmission();
		mentions.select(nodeSelection());

		mentions.detachSubmission(snapshot);

		expect(mentions.snapshotCounts()).toEqual({
			total: 1,
			workflow: 0,
			node: 1,
			group: 0,
			agent: 0,
		});
		scope.stop();
	});

	it('clears mention context when the project changes', async () => {
		const { mentions, resources, projectId, onMentionRemoved, onCleared, scope } = setup();
		mentions.select(workflowSelection());
		projectId.value = 'project-2';
		await nextTick();

		expect(resources.value).toEqual([]);
		expect(onCleared).toHaveBeenCalledOnce();
		expect(onMentionRemoved).not.toHaveBeenCalled();
		expect(mentions.snapshotCounts().total).toBe(0);
		scope.stop();
	});

	it('reserves host attachment slots when enforcing the message limit', () => {
		const { mentions, resources, scope } = setup({
			reservedAttachmentCount: 10,
		});

		expect(mentions.select(workflowSelection())).toEqual({ status: 'limit', truncated: false });
		expect(resources.value).toEqual([]);
		expect(mentions.snapshotCounts().total).toBe(0);
		scope.stop();
	});
});
