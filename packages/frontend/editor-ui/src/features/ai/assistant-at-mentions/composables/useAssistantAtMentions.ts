import { nextTick, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

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

export function useAssistantAtMentions(options: {
	text: Ref<string>;
	enabled: MaybeRefOrGetter<boolean>;
	getInputElement: () => HTMLTextAreaElement | undefined;
}) {
	const menuOpen = ref(false);
	const query = ref('');
	const activeRange = ref<MentionRange>();
	const savedSelection = ref({ start: 0, end: 0 });

	function close(): void {
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

	function openTypedRange(triggerIndex: number, caret: number): void {
		activeRange.value = {
			origin: 'typed',
			start: triggerIndex,
			queryStart: triggerIndex + 1,
			end: caret,
		};
		query.value = '';
		menuOpen.value = true;
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
		menuOpen.value = true;
	}

	async function handleTextChange(value: string, caretOverride?: number): Promise<void> {
		options.text.value = value;
		if (!toValue(options.enabled)) {
			close();
			return;
		}

		await nextTick();
		const input = options.getInputElement();
		const caret = caretOverride ?? input?.selectionEnd ?? value.length;
		savedSelection.value = { start: caret, end: caret };
		const triggerIndex = caret - 1;
		const followsWhitespace = triggerIndex === 0 || /\s/.test(value[triggerIndex - 1] ?? '');
		if (isMentionTrigger(value[triggerIndex]) && followsWhitespace) {
			openTypedRange(triggerIndex, caret);
			return;
		}

		const range = activeRange.value;
		if (range) {
			const triggerExists = range.origin === 'button' || isMentionTrigger(value[range.start]);
			const beforeRange = range.origin === 'typed' ? caret <= range.start : caret < range.start;
			if (!triggerExists || beforeRange) {
				close();
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
		if (beforeRange || selection.start > range.end || selection.end > range.end) close();
	}

	async function replaceActiveRange(label: string): Promise<void> {
		const range = activeRange.value;
		const start = range?.start ?? savedSelection.value.start;
		const end = range?.end ?? savedSelection.value.end;
		const insertedText = `"${label}"`;
		options.text.value =
			options.text.value.slice(0, start) + insertedText + options.text.value.slice(end);
		close();

		await nextTick();
		const caret = start + insertedText.length;
		const input = options.getInputElement();
		input?.focus({ preventScroll: true });
		input?.setSelectionRange(caret, caret);
		savedSelection.value = { start: caret, end: caret };
	}

	function handleMenuOpenChange(open: boolean): void {
		if (!open) {
			close();
			return;
		}
		if (!activeRange.value) openFromButton();
	}

	watch(
		() => toValue(options.enabled),
		(enabled) => {
			if (!enabled) close();
		},
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
