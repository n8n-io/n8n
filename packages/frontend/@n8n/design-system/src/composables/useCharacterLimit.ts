import { computed, type ComputedRef, type Ref } from 'vue';

interface UseCharacterLimitOptions {
	value: Ref<string>;
	maxLength: Ref<number>;
}

interface UseCharacterLimitReturn {
	characterCount: ComputedRef<number>;
	remainingCharacters: ComputedRef<number>;
	isOverLimit: ComputedRef<boolean>;
	isAtLimit: ComputedRef<boolean>;
}

export function useCharacterLimit({
	value,
	maxLength,
}: UseCharacterLimitOptions): UseCharacterLimitReturn {
	const characterCount = computed(() => value.value.length);

	const remainingCharacters = computed(() => maxLength.value - characterCount.value);

	const isOverLimit = computed(() => characterCount.value > maxLength.value);

	const isAtLimit = computed(() => characterCount.value >= maxLength.value);

	return {
		characterCount,
		remainingCharacters,
		isOverLimit,
		isAtLimit,
	};
}
