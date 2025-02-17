import { onKeyDown, onKeyUp } from '@vueuse/core';
import type { KeyFilter } from '@vueuse/core';
import { ref, unref } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export function useShortKeyPress(
	key: KeyFilter,
	fn: () => void,
	{
		dedupe = true,
		threshold = 300,
		disabled = false,
	}: {
		dedupe?: boolean;
		threshold?: number;
		disabled?: MaybeRefOrGetter<boolean>;
	},
) {
	const keyDownTime = ref<number | null>(null);

	onKeyDown(
		key,
		() => {
			if (unref(disabled)) return;

			keyDownTime.value = Date.now();
		},
		{
			dedupe,
		},
	);

	onKeyUp(key, () => {
		if (unref(disabled) || !keyDownTime.value) return;

		const isShortPress = Date.now() - keyDownTime.value < threshold;
		if (isShortPress) {
			fn();
		}
	});
}
