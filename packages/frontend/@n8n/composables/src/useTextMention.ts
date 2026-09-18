import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

export type TextMentionOrigin = 'typed' | 'button';

export interface MentionTextEdit {
	value: string;
	selectionStart: number;
	selectionEnd: number;
}

export interface TextMentionRange {
	start: number;
	end: number;
}

export interface UseTextMentionOptions<TResult> {
	results: MaybeRefOrGetter<readonly TResult[]>;
	getResultId: (result: TResult) => string;
	isResultDisabled?: (result: TResult) => boolean;
}

export type TextMentionKeyAction<TResult> = { type: 'select'; result: TResult } | { type: 'close' };

function findTypedMentionRange(value: string, caret: number): TextMentionRange | undefined {
	const prefix = value.slice(0, caret);
	let trigger = prefix.lastIndexOf('@');
	while (trigger >= 0) {
		const startsAfterBoundary = trigger === 0 || /\s/.test(prefix[trigger - 1]);
		const query = prefix.slice(trigger + 1);
		if (startsAfterBoundary && !/[\r\n]/.test(query)) {
			return { start: trigger, end: caret };
		}
		trigger = prefix.lastIndexOf('@', trigger - 1);
	}
	return undefined;
}

export function useTextMention<TResult>(options: UseTextMentionOptions<TResult>) {
	const isOpen = ref(false);
	const origin = ref<TextMentionOrigin>();
	const query = ref('');
	const activeRange = ref<TextMentionRange>();
	const highlightedId = ref<string>();
	const isComposing = ref(false);

	const results = computed(() => toValue(options.results));
	const isDisabled = (result: TResult) => options.isResultDisabled?.(result) ?? false;
	const selectableResults = computed(() => results.value.filter((result) => !isDisabled(result)));
	const highlightedResult = computed(() =>
		results.value.find(
			(result) => !isDisabled(result) && options.getResultId(result) === highlightedId.value,
		),
	);
	const highlightedIndex = computed(() =>
		highlightedResult.value ? results.value.indexOf(highlightedResult.value) : -1,
	);

	function resetHighlight(): void {
		if (!isOpen.value) {
			highlightedId.value = undefined;
			return;
		}
		if (highlightedResult.value) return;
		highlightedId.value = selectableResults.value[0]
			? options.getResultId(selectableResults.value[0])
			: undefined;
	}

	watch(results, resetHighlight, { immediate: true, deep: true });

	function close(): void {
		isOpen.value = false;
		origin.value = undefined;
		query.value = '';
		activeRange.value = undefined;
		highlightedId.value = undefined;
	}

	function handleTextInput(value: string, selectionStart: number, selectionEnd: number): void {
		if (isComposing.value) return;
		if (selectionStart !== selectionEnd) {
			close();
			return;
		}

		const range = findTypedMentionRange(value, selectionStart);
		if (!range) {
			close();
			return;
		}

		isOpen.value = true;
		origin.value = 'typed';
		activeRange.value = range;
		query.value = value.slice(range.start + 1, range.end);
		resetHighlight();
	}

	function handleSelectionChange(
		value: string,
		selectionStart: number,
		selectionEnd: number,
	): void {
		if (!isOpen.value || origin.value !== 'typed') return;
		const currentRange = activeRange.value;
		if (
			!currentRange ||
			selectionStart !== selectionEnd ||
			selectionStart <= currentRange.start ||
			selectionStart > currentRange.end
		) {
			close();
			return;
		}

		const range = findTypedMentionRange(value, selectionStart);
		if (range?.start !== currentRange.start) {
			close();
			return;
		}

		activeRange.value = range;
		query.value = value.slice(range.start + 1, range.end);
	}

	function openFromButton(selectionStart: number, selectionEnd: number): void {
		isOpen.value = true;
		origin.value = 'button';
		query.value = '';
		activeRange.value = {
			start: Math.max(0, selectionStart),
			end: Math.max(0, selectionEnd),
		};
		resetHighlight();
	}

	function setQuery(value: string): void {
		query.value = value;
		resetHighlight();
	}

	function setHighlightedId(id: string): void {
		const result = results.value.find((candidate) => options.getResultId(candidate) === id);
		if (result && !isDisabled(result)) highlightedId.value = id;
	}

	function moveHighlight(direction: 1 | -1): void {
		const selectable = selectableResults.value;
		if (selectable.length === 0) {
			highlightedId.value = undefined;
			return;
		}

		const currentIndex = selectable.findIndex(
			(result) => options.getResultId(result) === highlightedId.value,
		);
		const nextIndex =
			currentIndex < 0
				? direction === 1
					? 0
					: selectable.length - 1
				: (currentIndex + direction + selectable.length) % selectable.length;
		highlightedId.value = options.getResultId(selectable[nextIndex]);
	}

	function handleKeydown(event: KeyboardEvent): TextMentionKeyAction<TResult> | undefined {
		if (!isOpen.value || isComposing.value || event.isComposing) return undefined;

		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
			return undefined;
		}

		if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
			const result = highlightedResult.value;
			if (!result) return undefined;
			event.preventDefault();
			return { type: 'select', result };
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return { type: 'close' };
		}

		return undefined;
	}

	function applySelection(value: string, label: string): MentionTextEdit | undefined {
		const range = activeRange.value;
		if (!range) return undefined;

		const start = Math.min(range.start, value.length);
		const end = Math.max(start, Math.min(range.end, value.length));
		const insertion = `${label} `;
		const selection = start + insertion.length;
		const edit = {
			value: value.slice(0, start) + insertion + value.slice(end),
			selectionStart: selection,
			selectionEnd: selection,
		};
		close();
		return edit;
	}

	function startComposition(): void {
		isComposing.value = true;
	}

	function endComposition(value: string, selectionStart: number, selectionEnd: number): void {
		isComposing.value = false;
		handleTextInput(value, selectionStart, selectionEnd);
	}

	return {
		isOpen,
		origin,
		query,
		activeRange,
		highlightedId,
		highlightedResult,
		highlightedIndex,
		isComposing,
		handleTextInput,
		handleSelectionChange,
		openFromButton,
		setQuery,
		setHighlightedId,
		moveHighlight,
		handleKeydown,
		applySelection,
		startComposition,
		endComposition,
		close,
	};
}
