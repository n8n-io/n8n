import { ref, type MaybeRefOrGetter, toValue } from 'vue';
import { v4 as uuid } from 'uuid';
import { useSessionStorage } from '@vueuse/core';

interface ItemMetadata {
	id: string;
	stableIndex: number;
}

/**
 * Composable to manage state for fixed collection items
 * Tracks item IDs, stable indexes, and expanded states
 * @param key - Storage key for scoping state (should be nodeId + parameterPath)
 */
export function useFixedCollectionItemState(key: MaybeRefOrGetter<string>) {
	// Store metadata (id and stableIndex) for each item
	const itemMetadata = ref<Record<string, ItemMetadata[]>>({});

	// Store only expanded item IDs in session storage to minimize space
	const expandedItemIds = useSessionStorage<Set<string>>(
		`n8n-fixed-collection-expanded-${toValue(key)}`,
		() => new Set<string>(),
		{
			serializer: {
				read: (value) => new Set(value.split(',').filter(Boolean)),
				write: (value) => Array.from(value).join(','),
			},
		},
	);

	const getItemId = (propertyName: string, index: number): string => {
		if (!itemMetadata.value[propertyName]) {
			itemMetadata.value[propertyName] = [];
		}

		if (!itemMetadata.value[propertyName][index]) {
			// Calculate the next stable index (highest current index + 1)
			const existingIndexes = itemMetadata.value[propertyName]
				.map((item) => item?.stableIndex)
				.filter((idx) => idx !== undefined);
			const maxIndex = existingIndexes.length > 0 ? Math.max(...existingIndexes) : -1;

			itemMetadata.value[propertyName][index] = {
				id: uuid(),
				stableIndex: maxIndex + 1,
			};
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
		const id = getItemId(propertyName, index);
		return expandedItemIds.value.has(id);
	};

	const setExpandedState = (propertyName: string, index: number, value: boolean) => {
		const id = getItemId(propertyName, index);

		if (value) {
			expandedItemIds.value.add(id);
		} else {
			expandedItemIds.value.delete(id);
		}
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
			if (metadata?.id) {
				expandedItemIds.value.delete(metadata.id);
			}
		}
	};

	const cleanupProperty = (propertyName: string) => {
		// Clean up item metadata and remove IDs from expanded set
		if (itemMetadata.value[propertyName]) {
			const idsToRemove = itemMetadata.value[propertyName].map((item) => item.id);
			idsToRemove.forEach((id) => expandedItemIds.value.delete(id));
			delete itemMetadata.value[propertyName];
		}

		// Also remove the property name itself if used as an ID (for single values)
		expandedItemIds.value.delete(propertyName);
	};

	const trimArrays = (propertyName: string, targetLength: number) => {
		if (
			itemMetadata.value[propertyName] &&
			itemMetadata.value[propertyName].length > targetLength
		) {
			itemMetadata.value[propertyName] = itemMetadata.value[propertyName].slice(0, targetLength);
		}
	};

	const reorderItems = (propertyName: string, oldIndex: number, newIndex: number) => {
		// Reorder item metadata to maintain stable identity
		if (itemMetadata.value[propertyName]) {
			const metadata = [...itemMetadata.value[propertyName]];
			const [movedMetadata] = metadata.splice(oldIndex, 1);
			metadata.splice(newIndex, 0, movedMetadata);
			itemMetadata.value[propertyName] = metadata;
		}
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
	};
}
