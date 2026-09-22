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

function setup(options: { reservedAttachmentCount?: number } = {}) {
	const scope = effectScope();
	const files = ref<File[]>([]);
	const resources = ref<InstanceAiResourceAttachment[]>([]);
	const projectId = ref('project-1');
	const onReferenceAdded = vi.fn();
	const onReferenceRemoved = vi.fn();
	const onCleared = vi.fn();
	let mentions!: ReturnType<typeof useAssistantMentionAttachments>;
	scope.run(() => {
		mentions = useAssistantMentionAttachments({
			files,
			resources,
			projectId,
			reservedAttachmentCount: options.reservedAttachmentCount ?? 0,
			onReferenceAdded,
			onReferenceRemoved,
			onCleared,
		});
	});
	return {
		scope,
		files,
		resources,
		projectId,
		onReferenceAdded,
		onReferenceRemoved,
		onCleared,
		mentions,
	};
}

describe('useAssistantMentionAttachments', () => {
	it('adds a structured attachment and one transient reference per mention', () => {
		const { mentions, resources, onReferenceAdded, scope } = setup();

		expect(mentions.select(workflowSelection())).toEqual({ status: 'added', truncated: false });
		expect(mentions.select(workflowSelection())).toEqual({
			status: 'duplicate',
			truncated: false,
		});
		expect(resources.value).toEqual([{ type: 'workflow', id: 'w1', name: 'Orders' }]);
		expect(onReferenceAdded).toHaveBeenCalledOnce();
		scope.stop();
	});

	it('keeps child context when the workflow attachment is removed', () => {
		const { mentions, resources, onReferenceRemoved, scope } = setup();
		mentions.select(workflowSelection());
		mentions.select(nodeSelection());

		mentions.removeResource(0);

		expect(resources.value).toEqual([nodeSelection().attachment]);
		expect(onReferenceRemoved).toHaveBeenCalledTimes(1);
		scope.stop();
	});

	it('restores submitted references after failure and releases them after acceptance', () => {
		const { mentions, resources, onReferenceRemoved, scope } = setup();
		mentions.select(workflowSelection());
		const failedSubmission = mentions.detachSubmission();
		failedSubmission.restore();
		failedSubmission.accept();
		expect(onReferenceRemoved).not.toHaveBeenCalled();

		const acceptedSubmission = mentions.detachSubmission();
		acceptedSubmission.accept();
		expect(onReferenceRemoved).toHaveBeenCalledTimes(1);
		expect(resources.value).toHaveLength(1);
		scope.stop();
	});

	it('clears mention context when the project changes', async () => {
		const { mentions, resources, projectId, onReferenceRemoved, onCleared, scope } = setup();
		mentions.select(workflowSelection());
		projectId.value = 'project-2';
		await nextTick();

		expect(resources.value).toEqual([]);
		expect(onReferenceRemoved).toHaveBeenCalledOnce();
		expect(onCleared).toHaveBeenCalledOnce();
		scope.stop();
	});

	it('reserves host attachment slots when enforcing the message limit', () => {
		const { mentions, resources, onReferenceAdded, scope } = setup({
			reservedAttachmentCount: 10,
		});

		expect(mentions.select(workflowSelection())).toEqual({ status: 'limit', truncated: false });
		expect(resources.value).toEqual([]);
		expect(onReferenceAdded).not.toHaveBeenCalled();
		scope.stop();
	});
});
