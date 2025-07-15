import { ref, watch, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import isFunction from 'lodash/isFunction';
import isString from 'lodash/isString';

interface UseTypedEffectParams {
	content?: string | number;
	typingEnabled?: boolean;
	typingStep?: number;
	typingInterval?: number;
	onPause?: () => void;
	onResume?: () => void;
}

interface UseTypedEffectReturn {
	isTyping: Ref<boolean>;
	typingIndex: Ref<number>;
	typedContent: Ref<string>;
}

/**
 * Typing effect Hook
 * @param content Content to display
 * @param typingEnabled Whether to enable typing effect
 * @param typingStep Number of characters to add each time
 * @param typingInterval Typing interval in milliseconds
 * @param onPause Callback when typing pauses
 * @param onResume Callback when typing resumes
 * @returns Object containing typedContent, isTyping state and typing index
 */
export default function useTypedEffect({
	content,
	typingEnabled,
	typingStep,
	typingInterval,
	onPause: externalOnPause,
	onResume: externalOnResume,
}: UseTypedEffectParams = {}): UseTypedEffectReturn {
	const typedContent = ref('');
	const typingIndex = ref(0);
	const isTyping = ref(false);
	const filterInterval = typingInterval || 50;
	const filterStep = typingStep || 2;

	// Check if content is string
	const isContentString = isString(content);
	const contentString = isContentString ? String(content) : '';

	// Reset typing effect
	const resetTyping = (): void => {
		if (isContentString) {
			typedContent.value = '';
			typingIndex.value = 0;
		}
	};

	// Reset typing effect when content changes
	watch(
		() => content,
		() => {
			resetTyping();
			if (!typingEnabled && isContentString) {
				typedContent.value = contentString; // Display all content directly
			}
		},
		{ immediate: true },
	);

	const onPause = (): void => {
		if (isFunction(externalOnPause)) {
			externalOnPause();
		}
	};

	const onResume = (): void => {
		if (isFunction(externalOnResume)) {
			externalOnResume();
		}
	};

	// Typing effect logic
	const { pause, resume } = useIntervalFn(
		() => {
			if (isContentString && typingEnabled && typingIndex.value < contentString.length) {
				typingIndex.value += filterStep;
				typedContent.value = contentString.slice(0, typingIndex.value);
				isTyping.value = typingIndex.value < contentString.length;
			} else {
				pause(); // Stop typing
				onPause();
			}
		},
		filterInterval,
		{ immediate: false },
	);

	// Control typing effect when typingEnabled changes
	watch(
		() => typingEnabled,
		(enabled) => {
			if (enabled && isContentString) {
				resume(); // Start typing effect
				onResume();
			} else {
				pause(); // Stop typing effect
			}
		},
		{ immediate: true },
	);

	// Stop typing effect when component is unmounted
	onUnmounted(() => {
		pause();
		onPause();
	});

	return {
		isTyping,
		typingIndex,
		typedContent,
	};
}
