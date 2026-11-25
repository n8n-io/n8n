import {
	MAX_INSTANCE_AI_ATTACHMENTS_PER_MESSAGE,
	type InstanceAiAttachment,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import type { ChatInputTokenQueryEnd } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { chatTokensToPlainText, type ChatToken } from '@n8n/utils/chat-tokens';
import { computed, ref, watch, type MaybeRefOrGetter, type Ref } from 'vue';

import { useAssistantAtMentionsTelemetry } from '@/features/ai/assistant-at-mentions/assistantAtMentions.telemetry';
import type {
	AssistantMentionCloseReason,
	AssistantMentionCounts,
	AssistantMentionPickerOpenMetrics,
	AssistantMentionSelection,
	AssistantMentionTriggerSource,
	WorkflowArtifactReference,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';
import { useAssistantMentionAvailability } from '@/features/ai/assistant-at-mentions/composables/useAssistantMentionAvailability';
import { useIsAssistantAtMentionsEnabled } from '@/features/ai/assistant-at-mentions/composables/useIsAssistantAtMentionsEnabled';
import { chatResourceTokenIcon } from '@/features/ai/shared/utils/chatResourceTokens';

import {
	countMentions,
	countStagedAttachments,
	readChipAttachments,
	type StagedChip,
} from './assistantMentionAttachments';
import {
	mentionAttachmentsOf,
	mentionHrefsOf,
	mentionToken,
	withoutAttachedResources,
	type PickedMention,
} from './assistantMentionTokens';

/** The key code that browsers report for a key press during IME composition. */
const IME_COMPOSITION_KEYCODE = 229;

/** The token commands of the composer. */
interface TokenEditor {
	insertToken: (token: ChatToken) => void;
	removeEmptyTrigger: () => boolean;
	dismissTrigger: () => void;
	getTriggerRect: () => DOMRect | undefined;
}

/** A place on screen that the picker opens next to, such as the typed `@`. */
export interface MentionMenuAnchor {
	getBoundingClientRect: () => DOMRect;
	/** The menu follows this element when it scrolls. */
	contextElement?: Element;
}

/** The parts of the chat panel that the mentions use. */
interface MentionPanel {
	readonly composerAttachments: readonly StagedChip[];
	getInputElement: () => HTMLElement | undefined;
	getTokenEditor: () => TokenEditor | undefined;
}

/** The exposed methods of the mention picker. */
interface MentionPicker {
	handleExternalKeydown: (event: KeyboardEvent) => boolean;
	getOpenMetrics: () => AssistantMentionPickerOpenMetrics;
	flushEmptySearch: () => void;
}

/**
 * The @-mention picker of the Assistant agent composer. A pick stays in the
 * composer text as an inline token. The host binds `draft` to the panel draft,
 * turns on the panel tokens with `tokenOptions`, and forwards the token queries
 * of the composer. `attachmentsFor` gives the attachments that a sent text
 * carries, for the client context of the message.
 */
export function useAssistantAgentMentions(options: {
	/** No thread yet on the empty view. */
	threadId: MaybeRefOrGetter<string | undefined>;
	projectId: () => string | undefined;
	/** A host gate on top of the feature flag, for example while an agent is picked. */
	enabled?: () => boolean;
	/** The composer text, when the host keeps it. */
	draft?: Ref<string>;
	panel: () => MentionPanel | null | undefined;
	picker: () => MentionPicker | null | undefined;
	/** The thread's workflow tabs, which the picker lists first with their nodes. */
	artifacts: () => readonly WorkflowArtifactReference[];
	/** Attachments that the next message sends besides the mentions. */
	reservedAttachmentCount: () => number;
	/** The resources among those attachments. A mention of one of them adds nothing. */
	reservedResources?: () => readonly InstanceAiAttachment[];
	/** The composer does not take a pick, for example while a message is sent. */
	isBlocked: () => boolean;
}) {
	const i18n = useI18n();
	const toast = useToast();
	const telemetry = useAssistantAtMentionsTelemetry({ threadId: options.threadId });
	const isFlagEnabled = useIsAssistantAtMentionsEnabled();
	const isEnabled = computed(() => isFlagEnabled.value && (options.enabled?.() ?? true));
	const availability = useAssistantMentionAvailability({
		enabled: isEnabled,
		projectId: options.projectId,
		artifacts: options.artifacts,
	});
	const canUseMentions = computed(
		() => isEnabled.value && availability.isAvailable.value && !options.isBlocked(),
	);

	/** The composer text. The host binds it to the panel draft. */
	const draft = options.draft ?? ref('');
	const menuOpen = ref(false);
	const query = ref('');
	// How the current open started, so the outcome reports the source the open reported.
	let openSource: AssistantMentionTriggerSource | undefined;

	/**
	 * A typed open shows the picker at the `@`, where the user writes. A button
	 * open has no anchor, and the host places the picker. The last place stays
	 * while the `@` leaves the text, so the menu does not jump as it closes.
	 */
	const menuAnchor = ref<MentionMenuAnchor>();
	function anchorAtTrigger(): MentionMenuAnchor {
		let last = new DOMRect();
		return {
			contextElement: options.panel()?.getInputElement(),
			getBoundingClientRect: () => {
				last = options.panel()?.getTokenEditor()?.getTriggerRect() ?? last;
				return last;
			},
		};
	}

	/**
	 * Every pick of this composer, by token target. A pick stays here after its
	 * token leaves the text, so an undo that brings the token back still sends it.
	 */
	const picked = new Map<string, PickedMention>();
	/** The targets in the draft, to tell when the user deletes a token. */
	let draftHrefs = new Set<string>();

	const tokenOptions = computed(() => ({
		trigger: canUseMentions.value,
		icon: chatResourceTokenIcon,
	}));

	function markOpened(source: AssistantMentionTriggerSource): void {
		if (openSource !== undefined) return;
		openSource = source;
		menuAnchor.value = source === 'typed' ? anchorAtTrigger() : undefined;
		menuOpen.value = true;
		telemetry.trackPickerOpened(source);
	}

	function close(reason: AssistantMentionCloseReason = 'closed_menu'): void {
		if (openSource !== undefined) {
			// Synchronous on purpose: the picker still shows what the user looked at.
			const picker = options.picker();
			picker?.flushEmptySearch();
			const metrics = picker?.getOpenMetrics();
			if (metrics) telemetry.trackPickerDismissed({ source: openSource, reason }, metrics);
		}
		openSource = undefined;
		menuOpen.value = false;
		query.value = '';
	}

	/** The composer reports the `@query` that the caret is in, or its end. */
	function handleTokenQuery(next: string | undefined, end?: ChatInputTokenQueryEnd): void {
		if (next !== undefined) {
			if (!canUseMentions.value) return;
			query.value = next;
			markOpened('typed');
			return;
		}
		if (openSource !== 'typed') return;
		close(end === 'deleted' ? 'deleted_trigger' : 'moved_caret');
	}

	function openFromButton(): void {
		if (!canUseMentions.value) return;
		query.value = '';
		markOpened('button');
	}

	function handleMenuOpenChange(open: boolean): void {
		if (open) {
			if (!menuOpen.value) openFromButton();
			return;
		}
		if (!menuOpen.value) return;
		const tokenEditor = options.panel()?.getTokenEditor();
		// A picker closed right after a typed `@` leaves no stray `@` in the draft.
		if (openSource === 'typed' && !tokenEditor?.removeEmptyTrigger()) {
			tokenEditor?.dismissTrigger();
		}
		close('closed_menu');
	}

	/** The attachments that a text with mention tokens sends. */
	function attachmentsFor(text: string): InstanceAiResourceAttachment[] {
		return mentionAttachmentsOf(text, picked);
	}

	function showLimitError(): void {
		toast.showError(
			new Error(i18n.baseText('instanceAi.mentions.attachmentLimitMessage')),
			i18n.baseText('instanceAi.mentions.attachmentLimitTitle'),
		);
	}

	function handleSelect(selection: AssistantMentionSelection): void {
		const panel = options.panel();
		const tokenEditor = panel?.getTokenEditor();
		if (!panel || !tokenEditor) return;
		const { item, attachment } = selection;
		const token = mentionToken(item);

		// A repeated mention adds no attachment, and node mentions join their workflow's.
		// A mention of a staged or reserved resource is sent once, with that resource.
		const withPick = new Map(picked).set(token.href, { item, attachment });
		const sentCount = withoutAttachedResources(
			mentionAttachmentsOf(`${draft.value} [@${token.label}](${token.href})`, withPick),
			[
				...panel.composerAttachments.flatMap(readChipAttachments),
				...(options.reservedResources?.() ?? []),
			],
		).length;
		if (
			sentCount +
				countStagedAttachments(panel.composerAttachments) +
				options.reservedAttachmentCount() >
			MAX_INSTANCE_AI_ATTACHMENTS_PER_MESSAGE
		) {
			showLimitError();
			return;
		}

		picked.set(token.href, { item, attachment });
		const existingArtifact =
			item.kind === 'agent'
				? undefined
				: options.artifacts().find((artifact) => artifact.id === item.workflowId);
		telemetry.trackMentionSelected(selection, existingArtifact);
		if (selection.truncated) {
			toast.showError(
				new Error(i18n.baseText('instanceAi.nodeContext.truncated.message')),
				i18n.baseText('instanceAi.nodeContext.truncated.title'),
			);
		}
		tokenEditor.insertToken(token);
		close('selected');
	}

	// A token the user deletes counts as a removed mention. A sent text leaves the
	// draft through `handleSent`, so its tokens are not counted.
	watch(draft, (text) => {
		const hrefs = new Set(mentionHrefsOf(text));
		for (const href of draftHrefs) {
			const removed = picked.get(href);
			if (!hrefs.has(href) && removed) telemetry.trackMentionRemoved(removed.item.kind);
		}
		draftHrefs = hrefs;
	});

	/** The panel accepted a message with this text. Call it before the panel clears the draft. */
	function handleSent(text: string): void {
		for (const href of mentionHrefsOf(text)) draftHrefs.delete(href);
	}

	/** The mentions that a sent text carries, by kind. */
	function sentMentionCounts(text: string): AssistantMentionCounts {
		return countMentions(
			mentionHrefsOf(text).flatMap((href) => {
				const mention = picked.get(href);
				return mention ? [mention.item] : [];
			}),
		);
	}

	/**
	 * The workflow of the first mention that a sent text carries. Its tab opens
	 * once the message is sent, not when the mention is picked.
	 */
	function firstSentMentionedWorkflow(text: string): { id: string; name: string } | undefined {
		for (const attachment of mentionAttachmentsOf(text, picked)) {
			if (attachment.type === 'workflow') {
				return { id: attachment.id, name: attachment.name ?? attachment.id };
			}
			if (attachment.type === 'nodes') {
				return {
					id: attachment.workflowId,
					name: attachment.workflowName ?? attachment.workflowId,
				};
			}
		}
		return undefined;
	}

	function handleEmptySearch(searchQuery: string): void {
		telemetry.trackEmptySearch(searchQuery, { artifactCount: options.artifacts().length });
	}

	function isComposerInput(event: Event): boolean {
		const input = options.panel()?.getInputElement();
		return input !== undefined && event.target === input;
	}

	/** Arrows and Enter move through the open picker, so Enter does not send. */
	function handleKeydown(event: KeyboardEvent): void {
		if (!menuOpen.value || !isComposerInput(event)) return;
		const handled = options.picker()?.handleExternalKeydown(event) ?? false;
		const hasModifier = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
		const isComposing = event.isComposing || event.keyCode === IME_COMPOSITION_KEYCODE;
		if (handled || event.key !== 'Enter' || hasModifier || isComposing) return;
		event.preventDefault();
		event.stopPropagation();
	}

	watch(canUseMentions, (enabled) => {
		if (!enabled && menuOpen.value) close('unavailable');
	});

	// The picks belong to the project that they were picked in. A new project keeps
	// the words of the draft, but its mentions become plain `@label` text.
	watch(options.projectId, (projectId, previousProjectId) => {
		if (previousProjectId === undefined || projectId === previousProjectId) return;
		if (menuOpen.value) close('unavailable');
		draft.value = chatTokensToPlainText(draft.value);
		picked.clear();
	});

	return {
		isEnabled,
		canUseMentions,
		tokenOptions,
		draft,
		menuOpen,
		menuAnchor,
		query,
		handleTokenQuery,
		handleMenuOpenChange,
		handleSelect,
		handleEmptySearch,
		handleKeydown,
		handleSent,
		attachmentsFor,
		sentMentionCounts,
		firstSentMentionedWorkflow,
		close,
	};
}
