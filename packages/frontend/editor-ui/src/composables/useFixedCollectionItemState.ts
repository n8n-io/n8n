import { ref, type MaybeRefOrGetter, toValue } from 'vue';
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
export function useFixedCollectionItemState(key: MaybeRefOrGetter<string>) {
	const storageKey = toValue(key);
	const expandedStorageKey = `n8n-fixed-collection-expanded-${storageKey}`;
	const wrapperStorageKey = `n8n-fixed-collection-wrapper-${storageKey}`;
	const stableIndexesStorageKey = `n8n-fixed-collection-stable-indexes-${storageKey}`;

	// Store metadata (id and stableIndex) for each item
	const itemMetadata = ref<Record<string, ItemMetadata[]>>({});

	// Load stable indexes from session storage
	const loadStableIndexes = (): Record<string, number[]> => {
		const stored = sessionStorage.getItem(stableIndexesStorageKey);
		if (!stored) return {};
		try {
			return JSON.parse(stored);
		} catch {
			return {};
		}
	};

	// Save stable indexes to session storage
	const saveStableIndexes = (indexes: Record<string, number[]>) => {
		sessionStorage.setItem(stableIndexesStorageKey, JSON.stringify(indexes));
	};

	// Load expanded state using propertyName:stableIndex format
	const loadExpandedStableIndexes = (): Set<string> => {
		const stored = sessionStorage.getItem(expandedStorageKey);
		if (!stored) return new Set<string>();
		return new Set(stored.split(',').filter(Boolean));
	};

	// Save expanded state to session storage
	const saveExpandedStableIndexes = (expandedKeys: Set<string>) => {
		sessionStorage.setItem(expandedStorageKey, Array.from(expandedKeys).join(','));
	};

	// In-memory set of expanded items (format: "propertyName:stableIndex")
	const expandedStableIndexes = ref<Set<string>>(loadExpandedStableIndexes());

	// Load wrapper expanded state from session storage on init
	const loadWrapperExpanded = (): boolean | null => {
		const stored = sessionStorage.getItem(wrapperStorageKey);
		if (stored === null) return null; // Not set yet
		return stored === 'true';
	};

	// Save wrapper expanded state to session storage
	const saveWrapperExpanded = (value: boolean) => {
		sessionStorage.setItem(wrapperStorageKey, String(value));
	};

	// In-memory wrapper expanded state
	const wrapperExpanded = ref<boolean | null>(loadWrapperExpanded());

	const getItemId = (propertyName: string, index: number): string => {
		if (!itemMetadata.value[propertyName]) {
			itemMetadata.value[propertyName] = [];
		}

		if (!itemMetadata.value[propertyName][index]) {
			// Try to restore stable indexes from session storage
			const storedIndexes = loadStableIndexes();
			const propertyStableIndexes = storedIndexes[propertyName] || [];

			let stableIndex: number;
			let isNewItem = false;
			if (propertyStableIndexes[index] !== undefined) {
				// Restore from session storage
				stableIndex = propertyStableIndexes[index];
			} else {
				// Calculate the next stable index (highest current index + 1)
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

			// Only save to session storage if this is a new item (not restoring from storage)
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
			// This will create the metadata if it doesn't exist
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

		// Save to session storage on every expand/collapse
		saveExpandedStableIndexes(expandedStableIndexes.value);
	};

	const initExpandedState = (propertyName: string, items: unknown[], multipleValues: boolean) => {
		if (!itemMetadata.value[propertyName]) {
			itemMetadata.value[propertyName] = [];
		}

		// For single values (not multiple), use property name as ID
		if (!multipleValues) {
			// Keep existing expanded state from session storage, default to false
			// No action needed - state is already in session storage
		} else {
			// For multiple values, ensure all items have metadata generated
			items.forEach((_, index) => {
				getItemId(propertyName, index);
			});
		}
	};

	const cleanupItem = (propertyName: string, index: number) => {
		if (itemMetadata.value[propertyName]) {
			const metadata = itemMetadata.value[propertyName][index];
			itemMetadata.value[propertyName].splice(index, 1);

			// Remove from expanded set if it exists
			if (metadata?.stableIndex !== undefined) {
				const expandedKey = `${propertyName}:${metadata.stableIndex}`;
				expandedStableIndexes.value.delete(expandedKey);
				// Save after cleanup
				saveExpandedStableIndexes(expandedStableIndexes.value);
			}

			// Update stored stable indexes
			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};

	const cleanupProperty = (propertyName: string) => {
		// Clean up item metadata and remove expanded state
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

		// Remove from stored stable indexes
		const allStableIndexes = loadStableIndexes();
		delete allStableIndexes[propertyName];
		saveStableIndexes(allStableIndexes);

		// Save expanded state
		saveExpandedStableIndexes(expandedStableIndexes.value);
	};

	const trimArrays = (propertyName: string, targetLength: number) => {
		if (
			itemMetadata.value[propertyName] &&
			itemMetadata.value[propertyName].length > targetLength
		) {
			itemMetadata.value[propertyName] = itemMetadata.value[propertyName].slice(0, targetLength);

			// Update stored stable indexes
			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};

	const reorderItems = (propertyName: string, oldIndex: number, newIndex: number) => {
		// Reorder item metadata to maintain stable identity
		// Note: We do NOT update session storage here - stable indexes stay with their items
		// and the mapping is preserved in the metadata objects themselves
		if (itemMetadata.value[propertyName]) {
			const metadata = [...itemMetadata.value[propertyName]];
			const [movedMetadata] = metadata.splice(oldIndex, 1);
			metadata.splice(newIndex, 0, movedMetadata);
			itemMetadata.value[propertyName] = metadata;

			// Update stored stable indexes to reflect new order
			// This is necessary for restoration on remount
			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = metadata.map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};

	const getWrapperExpanded = () => {
		return wrapperExpanded.value;
	};

	const setWrapperExpanded = (value: boolean) => {
		wrapperExpanded.value = value;
		// Save to session storage on every expand/collapse
		saveWrapperExpanded(value);
	};

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
		getWrapperExpanded,
		setWrapperExpanded,
	};
}
