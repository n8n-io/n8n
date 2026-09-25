import { nextTick, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

import type {
	AssistantMentionCloseInfo,
	AssistantMentionCloseReason,
	AssistantMentionTriggerSource,
} from '../assistantAtMentions.types';

interface MentionRange {
	origin: 'typed' | 'button';
	start: number;
	queryStart: number;
	end: number;
}

/**
 * Characters that open the mention picker when typed. Japanese IMEs, and CJK
 * IMEs in full-width mode, emit the fullwidth `＠` (U+FF20) for the `@` key.
 */
const MENTION_TRIGGER_CHARACTERS = new Set(['@', '＠']);

export function isMentionTrigger(character: string | undefined): boolean {
	return character !== undefined && MENTION_TRIGGER_CHARACTERS.has(character);
}

function findLastMentionTriggerIndex(text: string): number {
	for (let index = text.length - 1; index >= 0; index--) {
		if (isMentionTrigger(text[index])) return index;
	}
	return -1;
}

export function useAssistantAtMentions(options: {
	text: Ref<string>;
	enabled: MaybeRefOrGetter<boolean>;
	getInputElement: () => HTMLTextAreaElement | undefined;
	onOpened?: (source: AssistantMentionTriggerSource) => void;
	/** Fires once per open, synchronously, before the menu state is cleared. */
	onClosed?: (info: AssistantMentionCloseInfo) => void;
}) {
	const menuOpen = ref(false);
	const query = ref('');
	const activeRange = ref<MentionRange>();
	const savedSelection = ref({ start: 0, end: 0 });
	const dismissedTypedTriggerIndex = ref<number>();
	let updatingTextInternally = false;
	// How the current open started. A typed `@` can replace a button range while the
	// picker stays open, so the outcome must report the source the open reported.
	let openSource: AssistantMentionTriggerSource | undefined;

	function updateText(value: string): void {
		updatingTextInternally = true;
		options.text.value = value;
		updatingTextInternally = false;
	}

	function markOpened(source: AssistantMentionTriggerSource): void {
		if (menuOpen.value) return;
		openSource = source;
		menuOpen.value = true;
		options.onOpened?.(source);
	}

	function close(
		rememberTypedTrigger = false,
		reason: AssistantMentionCloseReason = 'closed_menu',
	): void {
		const range = activeRange.value;
		if (rememberTypedTrigger && range?.origin === 'typed') {
			dismissedTypedTriggerIndex.value = range.start;
		}
		// The range, not `menuOpen`, marks an open picker: the host's v-model may have
		// already flipped `menuOpen` before the menu's close reaches this function.
		if (range) options.onClosed?.({ source: openSource ?? range.origin, reason });
		openSource = undefined;
		menuOpen.value = false;
		query.value = '';
		activeRange.value = undefined;
	}

	function saveSelection(): void {
		const input = options.getInputElement();
		if (!input) return;
		savedSelection.value = {
			start: input.selectionStart,
			end: input.selectionEnd,
		};
	}

	function openTypedRange(triggerIndex: number, caret: number, initialQuery = ''): void {
		activeRange.value = {
			origin: 'typed',
			start: triggerIndex,
			queryStart: triggerIndex + 1,
			end: caret,
		};
		dismissedTypedTriggerIndex.value = undefined;
		query.value = initialQuery;
		markOpened('typed');
	}

	function openFromButton(): void {
		if (!toValue(options.enabled)) return;
		saveSelection();
		activeRange.value = {
			origin: 'button',
			start: savedSelection.value.start,
			queryStart: savedSelection.value.start,
			end: savedSelection.value.end,
		};
		query.value = '';
		markOpened('button');
	}

	async function handleTextChange(value: string, caretOverride?: number): Promise<void> {
		updateText(value);
		if (
			dismissedTypedTriggerIndex.value !== undefined &&
			!isMentionTrigger(value[dismissedTypedTriggerIndex.value])
		) {
			dismissedTypedTriggerIndex.value = undefined;
		}
		if (!toValue(options.enabled)) {
			close(false, 'unavailable');
			return;
		}

		await nextTick();
		const input = options.getInputElement();
		const caret = caretOverride ?? input?.selectionEnd ?? value.length;
		savedSelection.value = { start: caret, end: caret };
		const valueBeforeCaret = value.slice(0, caret);
		const possibleTriggerIndex = findLastMentionTriggerIndex(valueBeforeCaret);
		const triggerIndex =
			possibleTriggerIndex === 0 || /\s/.test(valueBeforeCaret[possibleTriggerIndex - 1] ?? '')
				? possibleTriggerIndex
				: -1;
		const range = activeRange.value;
		if (triggerIndex >= 0 && (!range || range.origin !== 'typed' || range.start !== triggerIndex)) {
			if (dismissedTypedTriggerIndex.value === triggerIndex && !range) return;
			openTypedRange(triggerIndex, caret, value.slice(triggerIndex + 1, caret));
			return;
		}

		if (range) {
			const triggerExists = range.origin === 'button' || isMentionTrigger(value[range.start]);
			const beforeRange = range.origin === 'typed' ? caret <= range.start : caret < range.start;
			if (!triggerExists) {
				close(false, 'deleted_trigger');
				return;
			}
			if (beforeRange) {
				close(false, 'moved_caret');
				return;
			}

			range.end = caret;
			query.value = value.slice(range.queryStart, caret);
			return;
		}
	}

	async function handleCaretMove(): Promise<void> {
		await nextTick();
		saveSelection();
		const range = activeRange.value;
		if (!range) return;

		const selection = savedSelection.value;
		const beforeRange =
			range.origin === 'typed' ? selection.start <= range.start : selection.start < range.start;
		if (beforeRange || selection.start > range.end || selection.end > range.end) {
			close(false, 'moved_caret');
		}
	}

	async function replaceActiveRange(label: string): Promise<void> {
		const range = activeRange.value;
		const start = range?.start ?? savedSelection.value.start;
		const end = range?.end ?? savedSelection.value.end;
		const insertedText = `"${label}"`;
		updateText(options.text.value.slice(0, start) + insertedText + options.text.value.slice(end));
		close(false, 'selected');

		await nextTick();
		const caret = start + insertedText.length;
		const input = options.getInputElement();
		input?.focus({ preventScroll: true });
		input?.setSelectionRange(caret, caret);
		savedSelection.value = { start: caret, end: caret };
	}

	/**
	 * Dismissing the menu right after typing `@` would leave a stray trigger in the
	 * draft. Remove it, along with any whitespace typed after it, and put the caret
	 * back where it was. Returns false when there is nothing to remove: a button
	 * range, a query after the trigger, or a trigger the text no longer holds.
	 */
	function removeEmptyTypedTrigger(): boolean {
		const range = activeRange.value;
		const text = options.text.value;
		if (
			!range ||
			range.origin !== 'typed' ||
			text[range.start] !== '@' ||
			text.slice(range.queryStart, range.end).trim() !== ''
		) {
			return false;
		}

		updateText(text.slice(0, range.start) + text.slice(range.end));
		close();
		void nextTick(() => {
			const input = options.getInputElement();
			// The re-rendered value moves the caret to the end. Restore it only while
			// the input is focused: a dismissal by outside click has moved focus away.
			if (input && document.activeElement === input) {
				input.setSelectionRange(range.start, range.start);
			}
			savedSelection.value = { start: range.start, end: range.start };
		});
		return true;
	}

	function handleMenuOpenChange(open: boolean): void {
		if (!open) {
			if (!removeEmptyTypedTrigger()) close(true);
			return;
		}
		if (!activeRange.value) openFromButton();
	}

	watch(
		() => toValue(options.enabled),
		(enabled) => {
			if (!enabled) close(false, 'unavailable');
		},
	);
	watch(
		options.text,
		() => {
			if (!updatingTextInternally) dismissedTypedTriggerIndex.value = undefined;
		},
		{ flush: 'sync' },
	);

	return {
		menuOpen,
		query,
		saveSelection,
		openFromButton,
		handleTextChange,
		handleCaretMove,
		handleMenuOpenChange,
		replaceActiveRange,
		close,
	};
}
