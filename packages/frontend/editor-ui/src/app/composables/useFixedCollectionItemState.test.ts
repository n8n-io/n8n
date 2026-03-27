import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useFixedCollectionItemState } from './useFixedCollectionItemState';
import { jsonParse } from 'n8n-workflow';

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
}));

vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		useSessionStorage: vi.fn((key, initialValue, options) => {
			const storage = ref(typeof initialValue === 'function' ? initialValue() : initialValue);

			const write = (value: unknown) => {
				const serialized = options?.serializer?.write?.(value) ?? JSON.stringify(value);
				sessionStorage.setItem(typeof key === 'string' ? key : key.value, serialized);
			};

			const read = () => {
				const stored = sessionStorage.getItem(typeof key === 'string' ? key : key.value);
				if (!stored) return typeof initialValue === 'function' ? initialValue() : initialValue;
				return options?.serializer?.read?.(stored) ?? jsonParse(stored);
			};

			storage.value = read();

			return {
				get value() {
					return storage.value;
				},
				set value(newValue) {
					storage.value = newValue;
					write(newValue);
				},
			};
		}),
	};
});

describe('useFixedCollectionItemState', () => {
	beforeEach(() => {
		sessionStorage.clear();
		vi.clearAllMocks();
	});

	describe('getItemId', () => {
		it('should generate a unique ID for each item', () => {
			const state = useFixedCollectionItemState('test-node');

			const id1 = state.getItemId('property1', 0);
			const id2 = state.getItemId('property1', 1);

			expect(id1).toBeDefined();
			expect(id2).toBeDefined();
			expect(id1).not.toBe(id2);
		});

		it('should return the same ID for the same property and index', () => {
			const state = useFixedCollectionItemState('test-node');

			const id1 = state.getItemId('property1', 0);
			const id2 = state.getItemId('property1', 0);

			expect(id1).toBe(id2);
		});

		it('should handle multiple properties independently', () => {
			const state = useFixedCollectionItemState('test-node');

			const id1 = state.getItemId('property1', 0);
			const id2 = state.getItemId('property2', 0);

			expect(id1).not.toBe(id2);
		});
	});

	describe('getItemStableIndex', () => {
		it('should generate stable indexes starting from 0', () => {
			const state = useFixedCollectionItemState('test-node');

			const index1 = state.getItemStableIndex('property1', 0);
			const index2 = state.getItemStableIndex('property1', 1);
			const index3 = state.getItemStableIndex('property1', 2);

			expect(index1).toBe(0);
			expect(index2).toBe(1);
			expect(index3).toBe(2);
		});

		it('should return the same stable index for the same property and index', () => {
			const state = useFixedCollectionItemState('test-node');

			const index1 = state.getItemStableIndex('property1', 0);
			const index2 = state.getItemStableIndex('property1', 0);

			expect(index1).toBe(index2);
		});

		it('should maintain stable indexes after reordering', () => {
			const state = useFixedCollectionItemState('test-node');

			const initialIndex0 = state.getItemStableIndex('property1', 0);
			const initialIndex1 = state.getItemStableIndex('property1', 1);
			const initialIndex2 = state.getItemStableIndex('property1', 2);

			state.reorderItems('property1', 0, 2);

			const afterIndex0 = state.getItemStableIndex('property1', 0);
			const afterIndex1 = state.getItemStableIndex('property1', 1);
			const afterIndex2 = state.getItemStableIndex('property1', 2);

			expect(afterIndex0).toBe(initialIndex1);
			expect(afterIndex1).toBe(initialIndex2);
			expect(afterIndex2).toBe(initialIndex0);
		});
	});

	describe('expanded state', () => {
		it('should default to not expanded', () => {
			const state = useFixedCollectionItemState('test-node');

			const isExpanded = state.getExpandedState('property1', 0);

			expect(isExpanded).toBe(false);
		});

		it('should set and get expanded state', () => {
			const state = useFixedCollectionItemState('test-node');

			state.setExpandedState('property1', 0, true);
			expect(state.getExpandedState('property1', 0)).toBe(true);

			state.setExpandedState('property1', 0, false);
			expect(state.getExpandedState('property1', 0)).toBe(false);
		});

		it('should maintain expanded state across multiple calls', () => {
			const state = useFixedCollectionItemState('test-node');

			state.setExpandedState('property1', 0, true);
			state.setExpandedState('property1', 1, false);

			expect(state.getExpandedState('property1', 0)).toBe(true);
			expect(state.getExpandedState('property1', 1)).toBe(false);

			state.setExpandedState('property1', 0, false);
			expect(state.getExpandedState('property1', 0)).toBe(false);
		});

		it('should handle expanded state for multiple items', () => {
			const state = useFixedCollectionItemState('test-node');

			state.setExpandedState('property1', 0, true);
			state.setExpandedState('property1', 1, false);
			state.setExpandedState('property1', 2, true);

			expect(state.getExpandedState('property1', 0)).toBe(true);
			expect(state.getExpandedState('property1', 1)).toBe(false);
			expect(state.getExpandedState('property1', 2)).toBe(true);
		});
	});

	describe('initExpandedState', () => {
		it('should initialize state for multiple values', () => {
			const state = useFixedCollectionItemState('test-node');

			const items = [{}, {}, {}];
			state.initExpandedState('property1', items, true);

			const id1 = state.getItemId('property1', 0);
			const id2 = state.getItemId('property1', 1);
			const id3 = state.getItemId('property1', 2);

			expect(id1).toBeDefined();
			expect(id2).toBeDefined();
			expect(id3).toBeDefined();
		});

		it('should handle single values', () => {
			const state = useFixedCollectionItemState('test-node');

			const items = [{}];
			state.initExpandedState('property1', items, false);

			expect(() => state.getItemId('property1', 0)).not.toThrow();
		});
	});

	describe('cleanupItem', () => {
		it('should remove item metadata and expanded state', () => {
			const state = useFixedCollectionItemState('test-node');

			state.getItemId('property1', 0);
			state.getItemId('property1', 1);
			state.getItemId('property1', 2);

			state.setExpandedState('property1', 1, true);

			state.cleanupItem('property1', 1);

			const newIndex1Id = state.getItemId('property1', 1);
			expect(newIndex1Id).toBeDefined();
		});

		it('should remove expanded state when cleaning up item', () => {
			const state = useFixedCollectionItemState('test-node');

			state.setExpandedState('property1', 0, true);
			expect(state.getExpandedState('property1', 0)).toBe(true);

			state.cleanupItem('property1', 0);

			const newItemIsExpanded = state.getExpandedState('property1', 0);
			expect(newItemIsExpanded).toBe(false);
		});
	});

	describe('cleanupProperty', () => {
		it('should remove all items for a property', () => {
			const state = useFixedCollectionItemState('test-node');

			state.getItemId('property1', 0);
			state.getItemId('property1', 1);
			state.setExpandedState('property1', 0, true);
			state.setExpandedState('property1', 1, true);

			const property2Id = state.getItemId('property2', 0);

			state.cleanupProperty('property1');

			const newProperty1Item = state.getItemId('property1', 0);
			expect(newProperty1Item).toBeDefined();
			expect(state.getExpandedState('property1', 0)).toBe(false);

			expect(state.getItemId('property2', 0)).toBe(property2Id);
		});
	});

	describe('trimArrays', () => {
		it('should trim arrays to target length', () => {
			const state = useFixedCollectionItemState('test-node');

			for (let i = 0; i < 5; i++) {
				state.getItemId('property1', i);
			}

			state.trimArrays('property1', 3);

			expect(state.getItemId('property1', 0)).toBeDefined();
			expect(state.getItemId('property1', 1)).toBeDefined();
			expect(state.getItemId('property1', 2)).toBeDefined();

			const newId3 = state.getItemId('property1', 3);
			expect(newId3).toBeDefined();
		});
	});

	describe('reorderItems', () => {
		it('should reorder item metadata correctly', () => {
			const state = useFixedCollectionItemState('test-node');

			const id0 = state.getItemId('property1', 0);
			const id1 = state.getItemId('property1', 1);
			const id2 = state.getItemId('property1', 2);

			state.reorderItems('property1', 0, 2);

			expect(state.getItemId('property1', 0)).toBe(id1);
			expect(state.getItemId('property1', 1)).toBe(id2);
			expect(state.getItemId('property1', 2)).toBe(id0);
		});

		it('should maintain expanded state after reordering', () => {
			const state = useFixedCollectionItemState('test-node');

			state.getItemId('property1', 0);
			state.getItemId('property1', 1);
			state.getItemId('property1', 2);

			state.setExpandedState('property1', 0, true);
			expect(state.getExpandedState('property1', 0)).toBe(true);

			state.reorderItems('property1', 0, 2);

			expect(state.getExpandedState('property1', 2)).toBe(true);
			expect(state.getExpandedState('property1', 0)).toBe(false);
		});
	});

	describe('session storage scoping', () => {
		it('should maintain separate state for different keys', () => {
			const state1 = useFixedCollectionItemState('node-1');
			const state2 = useFixedCollectionItemState('node-2');

			state1.setExpandedState('property1', 0, true);
			state2.setExpandedState('property1', 0, false);

			expect(state1.getExpandedState('property1', 0)).toBe(true);
			expect(state2.getExpandedState('property1', 0)).toBe(false);
		});

		it('should persist expanded state after reordering and remounting', () => {
			// Initial setup: create 4 items
			const state1 = useFixedCollectionItemState('test-node-persist');

			state1.getItemId('property1', 0); // Item 1
			state1.getItemId('property1', 1); // Item 2
			state1.getItemId('property1', 2); // Item 3
			state1.getItemId('property1', 3); // Item 4

			// Expand item at index 2 (Item 3)
			state1.setExpandedState('property1', 2, true);
			expect(state1.getExpandedState('property1', 2)).toBe(true);

			// Reorder: move item from index 2 to index 1 (between items 1 and 2)
			// New order should be: Item 1, Item 3 (expanded), Item 2, Item 4
			state1.reorderItems('property1', 2, 1);

			// Verify expanded state moved with the item
			expect(state1.getExpandedState('property1', 1)).toBe(true); // Item 3 is now at index 1
			expect(state1.getExpandedState('property1', 2)).toBe(false); // Item 2 is now at index 2

			// Simulate remount by creating a new instance with same key
			const state2 = useFixedCollectionItemState('test-node-persist');

			// Re-initialize items in the new reordered positions
			state2.getItemId('property1', 0); // Item 1
			state2.getItemId('property1', 1); // Item 3 (should restore as expanded)
			state2.getItemId('property1', 2); // Item 2
			state2.getItemId('property1', 3); // Item 4

			const stable0 = state2.getItemStableIndex('property1', 0);
			const stable1 = state2.getItemStableIndex('property1', 1);
			const stable2 = state2.getItemStableIndex('property1', 2);
			const stable3 = state2.getItemStableIndex('property1', 3);

			// After reorder, the stable indexes should be: [0, 2, 1, 3]
			// because Item 3 (stable index 2) was moved to position 1
			expect(stable0).toBe(0);
			expect(stable1).toBe(2); // This is the key: position 1 should have stable index 2 (Item 3)
			expect(stable2).toBe(1);
			expect(stable3).toBe(3);

			// Verify that Item 3 (now at index 1) is still expanded after remount
			// Since stable index 2 is at position 1, and "property1:2" is in expandedStableIndexes
			expect(state2.getExpandedState('property1', 1)).toBe(true);
			expect(state2.getExpandedState('property1', 0)).toBe(false);
			expect(state2.getExpandedState('property1', 2)).toBe(false);
			expect(state2.getExpandedState('property1', 3)).toBe(false);
		});
	});
});
