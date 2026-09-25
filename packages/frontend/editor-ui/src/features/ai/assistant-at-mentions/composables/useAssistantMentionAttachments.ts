import {
	MAX_INSTANCE_AI_ATTACHMENTS_PER_MESSAGE,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { onScopeDispose, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

import type {
	AssistantMentionArtifactReference,
	AssistantMentionItem,
	AssistantMentionSelection,
} from '../assistantAtMentions.types';
import { mergeNodeSets } from '@/features/ai/instanceAi/utils/buildNodesAttachment';

type NodesAttachment = Extract<InstanceAiResourceAttachment, { type: 'nodes' }>;

interface SelectedMentionRecord {
	item: AssistantMentionItem;
	referenceId: string;
}

export type AssistantMentionAttachmentSelectionResult =
	| { status: 'added'; truncated: boolean }
	| { status: 'duplicate'; truncated: false }
	| { status: 'limit'; truncated: false };

export interface AssistantMentionAttachmentSubmission {
	accept(): void;
	restore(): void;
}

export type AssistantMentionAttachmentSubmissionSnapshot = readonly string[];

export function useAssistantMentionAttachments(options: {
	files: Ref<File[]>;
	resources: Ref<InstanceAiResourceAttachment[]>;
	projectId: MaybeRefOrGetter<string | undefined>;
	reservedAttachmentCount: MaybeRefOrGetter<number>;
	onReferenceAdded: (reference: AssistantMentionArtifactReference) => void;
	onReferenceRemoved: (referenceId: string) => void;
	onCleared?: () => void;
}) {
	let referenceSequence = 0;
	const selectedRecords = new Map<string, SelectedMentionRecord>();
	const ownedRecords = new Map<string, SelectedMentionRecord>();

	function addReference(item: AssistantMentionItem): SelectedMentionRecord {
		const record = {
			item,
			referenceId: `${item.key}:${++referenceSequence}`,
		};
		selectedRecords.set(item.key, record);
		ownedRecords.set(record.referenceId, record);
		options.onReferenceAdded({
			referenceId: record.referenceId,
			workflowId: item.workflowId,
			workflowName: item.workflowName,
		});
		return record;
	}

	function releaseReference(record: SelectedMentionRecord): void {
		if (!ownedRecords.delete(record.referenceId)) return;
		options.onReferenceRemoved(record.referenceId);
	}

	function setMatchesMention(set: NodesAttachment['sets'][number], item: AssistantMentionItem) {
		if (item.kind === 'node') {
			return set.nodes.length === 1 && set.nodes[0]?.id === item.entityId;
		}
		return item.kind === 'group' && set.canvasGroupId === item.entityId;
	}

	function attachmentContainsMention(item: AssistantMentionItem): boolean {
		if (item.kind === 'workflow') {
			return options.resources.value.some(
				(attachment) => attachment.type === 'workflow' && attachment.id === item.workflowId,
			);
		}

		return options.resources.value.some(
			(attachment) =>
				attachment.type === 'nodes' &&
				attachment.workflowId === item.workflowId &&
				attachment.sets.some((set) => setMatchesMention(set, item)),
		);
	}

	function reconcileSelectedRecords(): void {
		for (const [mentionKey, record] of selectedRecords) {
			if (attachmentContainsMention(record.item)) continue;
			selectedRecords.delete(mentionKey);
			releaseReference(record);
		}
	}

	function attachmentAddsResource(attachment: InstanceAiResourceAttachment): boolean {
		if (attachment.type === 'workflow') {
			return !options.resources.value.some(
				(current) => current.type === 'workflow' && current.id === attachment.id,
			);
		}
		if (attachment.type === 'nodes') {
			return !options.resources.value.some(
				(current) => current.type === 'nodes' && current.workflowId === attachment.workflowId,
			);
		}
		return true;
	}

	function addAttachment(attachment: InstanceAiResourceAttachment): void {
		if (attachment.type === 'workflow') {
			if (
				options.resources.value.some(
					(current) => current.type === 'workflow' && current.id === attachment.id,
				)
			)
				return;
			options.resources.value = [...options.resources.value, attachment];
			return;
		}

		if (attachment.type === 'nodes') {
			const index = options.resources.value.findIndex(
				(current) => current.type === 'nodes' && current.workflowId === attachment.workflowId,
			);
			if (index !== -1) {
				const current = options.resources.value[index];
				if (current.type !== 'nodes') return;
				options.resources.value[index] = {
					...current,
					workflowName: attachment.workflowName ?? current.workflowName,
					sets: mergeNodeSets(current.sets, attachment.sets),
				};
				return;
			}
		}

		options.resources.value = [...options.resources.value, attachment];
	}

	function select(selection: AssistantMentionSelection): AssistantMentionAttachmentSelectionResult {
		if (selectedRecords.has(selection.item.key)) {
			return { status: 'duplicate', truncated: false };
		}

		if (
			attachmentAddsResource(selection.attachment) &&
			options.files.value.length +
				options.resources.value.length +
				toValue(options.reservedAttachmentCount) >=
				MAX_INSTANCE_AI_ATTACHMENTS_PER_MESSAGE
		) {
			return { status: 'limit', truncated: false };
		}

		addAttachment(selection.attachment);
		if (!attachmentContainsMention(selection.item)) {
			return { status: 'limit', truncated: false };
		}

		addReference(selection.item);
		return { status: 'added', truncated: selection.truncated };
	}

	function updateResource(index: number, attachment: NodesAttachment): void {
		options.resources.value[index] = attachment;
		reconcileSelectedRecords();
	}

	function removeResource(index: number): void {
		options.resources.value = options.resources.value.filter((_, itemIndex) => itemIndex !== index);
		reconcileSelectedRecords();
	}

	function clearForProjectChange(): void {
		const records = [...selectedRecords.values()];
		if (records.length === 0) return;

		const nextResources: InstanceAiResourceAttachment[] = [];
		for (const attachment of options.resources.value) {
			if (attachment.type === 'workflow') {
				if (
					!records.some(({ item }) => item.kind === 'workflow' && item.workflowId === attachment.id)
				) {
					nextResources.push(attachment);
				}
				continue;
			}
			if (attachment.type !== 'nodes') {
				nextResources.push(attachment);
				continue;
			}

			const matchingRecords = records.filter(
				({ item }) => item.workflowId === attachment.workflowId && item.kind !== 'workflow',
			);
			const sets = attachment.sets.filter(
				(set) => !matchingRecords.some(({ item }) => setMatchesMention(set, item)),
			);
			if (sets.length > 0) nextResources.push({ ...attachment, sets });
		}
		options.resources.value = nextResources;

		selectedRecords.clear();
		for (const record of records) releaseReference(record);
		options.onCleared?.();
	}

	function snapshotSubmission(): AssistantMentionAttachmentSubmissionSnapshot {
		return [...selectedRecords.values()].map(({ referenceId }) => referenceId);
	}

	function detachSubmission(
		referenceIds: AssistantMentionAttachmentSubmissionSnapshot = snapshotSubmission(),
	): AssistantMentionAttachmentSubmission {
		const records = referenceIds
			.map((referenceId) => ownedRecords.get(referenceId))
			.filter((record) => record !== undefined);
		for (const record of records) {
			if (selectedRecords.get(record.item.key) === record) {
				selectedRecords.delete(record.item.key);
			}
		}

		let settled = false;
		return {
			accept() {
				if (settled) return;
				settled = true;
				for (const record of records) releaseReference(record);
			},
			restore() {
				if (settled) return;
				settled = true;
				for (const record of records) {
					if (selectedRecords.has(record.item.key)) {
						releaseReference(record);
						continue;
					}
					if (attachmentContainsMention(record.item)) {
						selectedRecords.set(record.item.key, record);
					} else {
						releaseReference(record);
					}
				}
			},
		};
	}

	watch(
		() => toValue(options.projectId),
		(projectId, previousProjectId) => {
			if (previousProjectId !== undefined && projectId !== previousProjectId) {
				clearForProjectChange();
			}
		},
	);

	onScopeDispose(() => {
		for (const record of ownedRecords.values()) releaseReference(record);
	});

	return {
		select,
		updateResource,
		removeResource,
		clearForProjectChange,
		snapshotSubmission,
		detachSubmission,
	};
}
