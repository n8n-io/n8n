import { ref, type MaybeRefOrGetter, toValue, watch } from 'vue';
import { v4 as uuid } from 'uuid';

interface ItemMetadata {
	id: string;
	stableIndex: number;
}

/**
 * Composable to manage state for fixed collection items
 * Tracks item IDs, stable indexes, and expanded states
 * Uses stable indexes for persistence to survive component remounts
 * @param key - Storage key for scoping state (should be nodeId + parameterPath)
 */
export function useFixedCollectionItemState(
	key: MaybeRefOrGetter<string>,
	{ defaultWrapperExpanded = false } = {},
) {
	const storageKey = toValue(key);
	const expandedStorageKey = `n8n-fixed-collection-expanded-${storageKey}`;
	const wrapperStorageKey = `n8n-fixed-collection-wrapper-${storageKey}`;
	const stableIndexesStorageKey = `n8n-fixed-collection-stable-indexes-${storageKey}`;

	const itemMetadata = ref<Record<string, ItemMetadata[]>>({});

	const loadStableIndexes = (): Record<string, number[]> => {
		const stored = sessionStorage.getItem(stableIndexesStorageKey);
		if (!stored) return {};
		try {
			return JSON.parse(stored);
		} catch {
			return {};
		}
	};

	const saveStableIndexes = (indexes: Record<string, number[]>) => {
		sessionStorage.setItem(stableIndexesStorageKey, JSON.stringify(indexes));
	};

	const loadExpandedStableIndexes = (): Set<string> => {
		const stored = sessionStorage.getItem(expandedStorageKey);
		if (!stored) return new Set<string>();
		return new Set(stored.split(',').filter(Boolean));
	};

	const saveExpandedStableIndexes = (expandedKeys: Set<string>) => {
		sessionStorage.setItem(expandedStorageKey, Array.from(expandedKeys).join(','));
	};

	const expandedStableIndexes = ref<Set<string>>(loadExpandedStableIndexes());

	const loadWrapperExpanded = () => {
		const stored = sessionStorage.getItem(wrapperStorageKey);
		// If user has a stored preference, use it; otherwise use the default
		return stored !== null ? stored === 'true' : defaultWrapperExpanded;
	};

	const saveWrapperExpanded = (value: boolean) => {
		sessionStorage.setItem(wrapperStorageKey, String(value));
	};

	const wrapperExpanded = ref<boolean>(loadWrapperExpanded());

	const getItemId = (propertyName: string, index: number): string => {
		if (!itemMetadata.value[propertyName]) {
			itemMetadata.value[propertyName] = [];
		}

		if (!itemMetadata.value[propertyName][index]) {
			const storedIndexes = loadStableIndexes();
			const propertyStableIndexes = storedIndexes[propertyName] || [];

			let stableIndex: number;
			let isNewItem = false;
			if (propertyStableIndexes[index] !== undefined) {
				stableIndex = propertyStableIndexes[index];
			} else {
				const existingIndexes = itemMetadata.value[propertyName]
					.map((item) => item?.stableIndex)
					.filter((idx) => idx !== undefined);
				const maxIndex = existingIndexes.length > 0 ? Math.max(...existingIndexes) : -1;
				stableIndex = maxIndex + 1;
				isNewItem = true;
			}

			itemMetadata.value[propertyName][index] = {
				id: uuid(),
				stableIndex,
			};

			if (isNewItem) {
				const allStableIndexes = loadStableIndexes();
				allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
				saveStableIndexes(allStableIndexes);
			}
		}

		return itemMetadata.value[propertyName][index].id;
	};

	const getItemStableIndex = (propertyName: string, index: number): number => {
		if (!itemMetadata.value[propertyName]?.[index]) {
			getItemId(propertyName, index);
		}

		return itemMetadata.value[propertyName][index].stableIndex;
	};

	const getExpandedState = (propertyName: string, index: number): boolean => {
		const stableIndex = getItemStableIndex(propertyName, index);
		const expandedKey = `${propertyName}:${stableIndex}`;
		return expandedStableIndexes.value.has(expandedKey);
	};

	const setExpandedState = (propertyName: string, index: number, value: boolean) => {
		const stableIndex = getItemStableIndex(propertyName, index);
		const expandedKey = `${propertyName}:${stableIndex}`;

		if (value) {
			expandedStableIndexes.value.add(expandedKey);
		} else {
			expandedStableIndexes.value.delete(expandedKey);
		}

		saveExpandedStableIndexes(expandedStableIndexes.value);
	};

	const initExpandedState = (propertyName: string, items: unknown[], multipleValues: boolean) => {
		if (!itemMetadata.value[propertyName]) {
			itemMetadata.value[propertyName] = [];
		}

		if (multipleValues) {
			items.forEach((_, index) => {
				getItemId(propertyName, index);
			});
		}
	};

	const cleanupItem = (propertyName: string, index: number) => {
		if (itemMetadata.value[propertyName]) {
			const metadata = itemMetadata.value[propertyName][index];
			itemMetadata.value[propertyName].splice(index, 1);

			if (metadata?.stableIndex !== undefined) {
				const expandedKey = `${propertyName}:${metadata.stableIndex}`;
				expandedStableIndexes.value.delete(expandedKey);
				saveExpandedStableIndexes(expandedStableIndexes.value);
			}

			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};

	const cleanupProperty = (propertyName: string) => {
		if (itemMetadata.value[propertyName]) {
			const stableIndexesToRemove = itemMetadata.value[propertyName].map(
				(item) => item.stableIndex,
			);
			stableIndexesToRemove.forEach((stableIndex) => {
				const expandedKey = `${propertyName}:${stableIndex}`;
				expandedStableIndexes.value.delete(expandedKey);
			});
			delete itemMetadata.value[propertyName];
		}

		const allStableIndexes = loadStableIndexes();
		delete allStableIndexes[propertyName];
		saveStableIndexes(allStableIndexes);

		saveExpandedStableIndexes(expandedStableIndexes.value);
	};

	const trimArrays = (propertyName: string, targetLength: number) => {
		if (
			itemMetadata.value[propertyName] &&
			itemMetadata.value[propertyName].length > targetLength
		) {
			itemMetadata.value[propertyName] = itemMetadata.value[propertyName].slice(0, targetLength);

			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};

	const reorderItems = (propertyName: string, oldIndex: number, newIndex: number) => {
		if (itemMetadata.value[propertyName]) {
			const metadata = [...itemMetadata.value[propertyName]];
			const [movedMetadata] = metadata.splice(oldIndex, 1);
			metadata.splice(newIndex, 0, movedMetadata);
			itemMetadata.value[propertyName] = metadata;

			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = metadata.map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};

	watch(wrapperExpanded, (newValue) => {
		saveWrapperExpanded(newValue);
	});

	return {
		getItemId,
		getItemStableIndex,
		getExpandedState,
		setExpandedState,
		initExpandedState,
		cleanupItem,
		cleanupProperty,
		trimArrays,
		reorderItems,
		wrapperExpanded,
	};
}
