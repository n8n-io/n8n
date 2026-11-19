import {
	MAX_INSTANCE_AI_ATTACHMENTS_PER_MESSAGE,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useAssistantAtMentionsTelemetry } from '@/features/ai/assistant-at-mentions/assistantAtMentions.telemetry';
import type {
	AssistantMentionCounts,
	AssistantMentionItem,
	AssistantMentionPickerOpenMetrics,
	AssistantMentionSelection,
	WorkflowArtifactReference,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { useAssistantAtMentions } from '@/features/ai/assistant-at-mentions/composables/useAssistantAtMentions';
import { useAssistantMentionAvailability } from '@/features/ai/assistant-at-mentions/composables/useAssistantMentionAvailability';
import { useIsAssistantAtMentionsEnabled } from '@/features/ai/assistant-at-mentions/composables/useIsAssistantAtMentionsEnabled';
import type { AgentChatComposerAttachment } from '@/features/agents/utils/composer-attachments';

import {
	countMentions,
	countStagedAttachments,
	mentionKeysOf,
	readChipAttachments,
	stagedMentionKeys,
	toMentionComposerAttachment,
	type StagedChip,
} from './assistantMentionAttachments';
import { toNodesComposerAttachment } from './assistantNodeAttachments';

/** The key code that browsers report for a key press during IME composition. */
const IME_COMPOSITION_KEYCODE = 229;

/** The parts of the chat panel that the mentions use. */
interface MentionPanel {
	readonly composerAttachments: readonly StagedChip[];
	addComposerAttachment: (
		chip: AgentChatComposerAttachment['chip'],
		clientContextPatch?: Record<string, unknown>,
	) => void;
	removeComposerAttachment: (id: string) => void;
	getInputElement: () => HTMLTextAreaElement | undefined;
}

/** The exposed methods of the mention picker. */
interface MentionPicker {
	handleExternalKeydown: (event: KeyboardEvent) => boolean;
	getOpenMetrics: () => AssistantMentionPickerOpenMetrics;
	flushEmptySearch: () => void;
}

/**
 * The @-mention picker of the Assistant agent composer. The host binds `draft`
 * to the panel draft and forwards the composer events. Each pick stages a
 * composer chip, which sends the resource in the client context of the next
 * message, as the composer of the current runtime does.
 */
export function useAssistantAgentMentions(options: {
	threadId: string;
	projectId: () => string;
	panel: () => MentionPanel | null | undefined;
	picker: () => MentionPicker | null | undefined;
	/** The thread's workflow tabs, which the picker lists first with their nodes. */
	artifacts: () => readonly WorkflowArtifactReference[];
	/** Attachments that the next message sends besides the staged chips. */
	reservedAttachmentCount: () => number;
	/** The composer does not take a pick, for example while a message is sent. */
	isBlocked: () => boolean;
}) {
	const i18n = useI18n();
	const toast = useToast();
	const telemetry = useAssistantAtMentionsTelemetry({ threadId: options.threadId });
	const isFlagEnabled = useIsAssistantAtMentionsEnabled();
	const availability = useAssistantMentionAvailability({
		enabled: isFlagEnabled,
		projectId: options.projectId,
		artifacts: options.artifacts,
	});
	const canUseMentions = computed(
		() => isFlagEnabled.value && availability.isAvailable.value && !options.isBlocked(),
	);

	/** The composer text. The host binds it to the panel draft. */
	const draft = ref('');
	const mentions = useAssistantAtMentions({
		text: draft,
		enabled: canUseMentions,
		getInputElement: () => options.panel()?.getInputElement(),
		onOpened: telemetry.trackPickerOpened,
		onClosed: (info) => {
			// Synchronous on purpose: the picker still shows what the user looked at.
			const picker = options.picker();
			picker?.flushEmptySearch();
			const metrics = picker?.getOpenMetrics();
			if (metrics) telemetry.trackPickerDismissed(info, metrics);
		},
	});

	const staged = computed(() => options.panel()?.composerAttachments ?? []);
	const excludedKeys = computed(() => stagedMentionKeys(staged.value));
	const excludedWorkflowIds = computed(() =>
		staged.value
			.flatMap(readChipAttachments)
			.flatMap((attachment) => (attachment.type === 'workflow' ? [attachment.id] : [])),
	);

	/** The mentions that each staged chip holds. Other chips, such as canvas nodes, have none. */
	const mentionsByChip = new Map<string, AssistantMentionItem[]>();

	// A sent chip leaves the composer, so its mentions go too. A nodes chip that
	// lost some of its nodes keeps only the mentions it still holds.
	watch(staged, (chips) => {
		const keys = new Set(stagedMentionKeys(chips));
		const chipIds = new Set(chips.map(({ chip }) => chip.id));
		for (const [chipId, items] of mentionsByChip) {
			if (!chipIds.has(chipId)) {
				mentionsByChip.delete(chipId);
				continue;
			}
			const kept = items.filter((item) => keys.has(item.key));
			for (const item of items) {
				if (!kept.includes(item)) telemetry.trackMentionRemoved(item.kind);
			}
			mentionsByChip.set(chipId, kept);
		}
	});

	function toComposerAttachment(
		attachment: InstanceAiResourceAttachment,
		chips: readonly StagedChip[],
	): AgentChatComposerAttachment | undefined {
		if (attachment.type === 'nodes') return toNodesComposerAttachment(attachment, chips);
		if (attachment.type === 'workflow' || attachment.type === 'agent') {
			return toMentionComposerAttachment(attachment);
		}
		return undefined;
	}

	function showLimitError(): void {
		toast.showError(
			new Error(i18n.baseText('instanceAi.mentions.attachmentLimitMessage')),
			i18n.baseText('instanceAi.mentions.attachmentLimitTitle'),
		);
	}

	async function handleSelect(selection: AssistantMentionSelection): Promise<void> {
		const panel = options.panel();
		if (!panel) return;
		const { item, attachment } = selection;
		const existingArtifact =
			item.kind === 'agent'
				? undefined
				: options.artifacts().find((artifact) => artifact.id === item.workflowId);
		// A pick of a staged mention stages nothing, but it still ends this open.
		if (excludedKeys.value.includes(item.key)) {
			telemetry.trackMentionSelected(selection, existingArtifact);
			await mentions.clearActiveRange();
			return;
		}

		const chips = panel.composerAttachments;
		const next = toComposerAttachment(attachment, chips);
		if (!next) return;
		// Nodes join the chip of their workflow, which sends one attachment.
		const addsAttachment = !chips.some(({ chip }) => chip.id === next.chip.id);
		if (
			addsAttachment &&
			countStagedAttachments(chips) + options.reservedAttachmentCount() >=
				MAX_INSTANCE_AI_ATTACHMENTS_PER_MESSAGE
		) {
			showLimitError();
			return;
		}

		panel.addComposerAttachment(next.chip, next.clientContextPatch);
		mentionsByChip.set(next.chip.id, [...(mentionsByChip.get(next.chip.id) ?? []), item]);
		telemetry.trackMentionSelected(selection, existingArtifact);
		if (selection.truncated) {
			toast.showError(
				new Error(i18n.baseText('instanceAi.nodeContext.truncated.message')),
				i18n.baseText('instanceAi.nodeContext.truncated.title'),
			);
		}
		await mentions.clearActiveRange();
	}

	/** The user removed a whole chip from the composer. */
	function handleChipRemoved(chipId: string): void {
		for (const item of mentionsByChip.get(chipId) ?? []) telemetry.trackMentionRemoved(item.kind);
		mentionsByChip.delete(chipId);
		options.panel()?.removeComposerAttachment(chipId);
	}

	/**
	 * The staged mentions that a message sends. A send without the composer
	 * chips, such as the answer to a question card, sends none of them.
	 */
	function sentMentionCounts(
		sent: readonly InstanceAiResourceAttachment[],
	): AssistantMentionCounts {
		const sentKeys = new Set(mentionKeysOf(sent));
		return countMentions(
			[...mentionsByChip.values()].flat().filter(({ key }) => sentKeys.has(key)),
		);
	}

	/**
	 * The workflow of the first mention that a sent message carried. Its tab
	 * opens once the message is sent, not when the mention is picked.
	 */
	function firstSentMentionedWorkflow(
		sent: readonly InstanceAiResourceAttachment[],
	): { id: string; name: string } | undefined {
		const sentWorkflowIds = new Set(
			sent.flatMap((attachment) =>
				attachment.type === 'workflow'
					? [attachment.id]
					: attachment.type === 'nodes'
						? [attachment.workflowId]
						: [],
			),
		);
		for (const item of [...mentionsByChip.values()].flat()) {
			if (item.kind !== 'agent' && sentWorkflowIds.has(item.workflowId)) {
				return { id: item.workflowId, name: item.workflowName };
			}
		}
		return undefined;
	}

	function handleEmptySearch(query: string): void {
		telemetry.trackEmptySearch(query, { artifactCount: options.artifacts().length });
	}

	function isComposerInput(event: Event): boolean {
		const input = options.panel()?.getInputElement();
		return input !== undefined && event.target === input;
	}

	/** Arrows and Enter move through the open picker, so Enter does not send. */
	function handleKeydown(event: KeyboardEvent): void {
		if (!mentions.menuOpen.value || !isComposerInput(event)) return;
		const handled = options.picker()?.handleExternalKeydown(event) ?? false;
		const hasModifier = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
		const isComposing = event.isComposing || event.keyCode === IME_COMPOSITION_KEYCODE;
		if (handled || event.key !== 'Enter' || hasModifier || isComposing) return;
		event.preventDefault();
		event.stopPropagation();
	}

	function handlePointerDown(event: Event): void {
		if (isComposerInput(event)) mentions.saveSelection();
	}

	function handleCaretMove(event: Event): void {
		if (isComposerInput(event)) void mentions.handleCaretMove();
	}

	watch(canUseMentions, (enabled, wasEnabled) => {
		if (enabled && !wasEnabled) void mentions.handleTextChange(draft.value);
	});

	return {
		isEnabled: isFlagEnabled,
		canUseMentions,
		draft,
		menuOpen: mentions.menuOpen,
		query: mentions.query,
		excludedKeys,
		excludedWorkflowIds,
		handleTextChange: async (value: string) => await mentions.handleTextChange(value),
		handleMenuOpenChange: mentions.handleMenuOpenChange,
		handleSelect,
		handleChipRemoved,
		handleEmptySearch,
		handleKeydown,
		handlePointerDown,
		handleCaretMove,
		sentMentionCounts,
		firstSentMentionedWorkflow,
		close: mentions.close,
	};
}
