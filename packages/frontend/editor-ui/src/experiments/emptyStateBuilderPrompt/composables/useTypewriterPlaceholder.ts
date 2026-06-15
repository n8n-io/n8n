import { ref, onUnmounted, watch, type Ref, computed } from 'vue';
import type { WorkflowSuggestion } from '../constants';

const TYPING_SPEED_MS = 40;
const BACKSPACE_SPEED_MS = 25;
const PAUSE_AT_FULL_TEXT_MS = 1500;
const PAUSE_AFTER_BACKSPACE_MS = 300;
const PREFIX = 'Build ';

export function useTypewriterPlaceholder(
	suggestions: Ref<WorkflowSuggestion[]>,
	isInputEmpty: Ref<boolean>,
) {
	const currentIndex = ref(0);
	const displayedSuffix = ref('');
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const currentSuggestion = computed(() => {
		const list = suggestions.value;
		if (list.length === 0) return '';
		return list[currentIndex.value % list.length]?.summary ?? '';
	});

	const placeholder = computed(() => PREFIX + displayedSuffix.value);

	function clearTimer() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function typeNextChar() {
		if (!isInputEmpty.value) return;
		if (suggestions.value.length === 0) return;

		const target = currentSuggestion.value;
		if (displayedSuffix.value.length < target.length) {
			displayedSuffix.value = target.slice(0, displayedSuffix.value.length + 1);
			timeoutId = setTimeout(typeNextChar, TYPING_SPEED_MS);
		} else {
			timeoutId = setTimeout(startBackspace, PAUSE_AT_FULL_TEXT_MS);
		}
	}

	function startBackspace() {
		backspaceChar();
	}

	function backspaceChar() {
		if (!isInputEmpty.value) return;
		if (suggestions.value.length === 0) return;

		if (displayedSuffix.value.length > 0) {
			displayedSuffix.value = displayedSuffix.value.slice(0, -1);
			timeoutId = setTimeout(backspaceChar, BACKSPACE_SPEED_MS);
		} else {
			currentIndex.value = (currentIndex.value + 1) % suggestions.value.length;
			timeoutId = setTimeout(typeNextChar, PAUSE_AFTER_BACKSPACE_MS);
		}
	}

	function startAnimation() {
		clearTimer();
		typeNextChar();
	}

	function stopAnimation() {
		clearTimer();
	}

	watch(
		isInputEmpty,
		(empty) => {
			if (empty) {
				startAnimation();
			} else {
				stopAnimation();
			}
		},
		{ immediate: true },
	);

	onUnmounted(() => {
		clearTimer();
	});

	return { placeholder };
}
