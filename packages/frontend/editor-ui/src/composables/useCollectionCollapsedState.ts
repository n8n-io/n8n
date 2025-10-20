import type { MaybeRefOrGetter } from 'vue';
import { ref, watch, toValue } from 'vue';
import type { CollapsedDefaultState } from '@/types/collection-parameter.types';

interface CollapsedStateOptions<T> {
	items: MaybeRefOrGetter<T[]>;
	keyGenerator: (item: T, index: number) => string;
	defaultCollapsed?: MaybeRefOrGetter<CollapsedDefaultState>;
}

export function useCollectionCollapsedState<T>(options: CollapsedStateOptions<T>) {
	const collapsedItems = ref<Record<string, boolean>>({});

	const getDefaultState = (index: number): boolean => {
		const collapsed = toValue(options.defaultCollapsed) ?? 'first-expanded';
		if (collapsed === 'all') return false; // false = collapsed
		if (collapsed === 'none') return true; // true = expanded
		return index === 0; // first-expanded
	};

	const initialize = () => {
		const items = toValue(options.items);
		const previousKeys = new Set(Object.keys(collapsedItems.value));
		const hasExisting = previousKeys.size > 0;
		const newState: Record<string, boolean> = {};

		items.forEach((item, index) => {
			const key = options.keyGenerator(item, index);
			const isNew = hasExisting && !previousKeys.has(key);
			newState[key] = collapsedItems.value[key] ?? (isNew ? true : getDefaultState(index));
		});

		collapsedItems.value = newState;
	};

	watch(() => toValue(options.items), initialize, { immediate: true });

	return { collapsedItems, initialize };
}
