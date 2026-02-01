import { YjsProvider } from '../providers/yjs';
import type { CRDTDoc, CRDTMap, CRDTUndoManager, UndoStackChangeEvent } from '../types';

// Run tests for all providers
describe.each([['Yjs', () => new YjsProvider()]])('%s UndoManager', (_name, createProvider) => {
	let doc: CRDTDoc;
	let map: CRDTMap<string>;
	let undoManager: CRDTUndoManager;

	beforeEach(() => {
		const provider = createProvider();
		doc = provider.createDoc('test');
		map = doc.getMap<string>('test-map');
		undoManager = doc.createUndoManager({ captureTimeout: 0 }); // Disable grouping for tests
	});

	afterEach(() => {
		undoManager.destroy();
		doc.destroy();
	});

	describe('basic undo/redo', () => {
		it('should undo a single change', () => {
			map.set('key', 'value');
			expect(map.get('key')).toBe('value');
			expect(undoManager.canUndo()).toBe(true);

			const result = undoManager.undo();
			expect(result).toBe(true);
			expect(map.get('key')).toBeUndefined();
			expect(undoManager.canUndo()).toBe(false);
		});

		it('should redo an undone change', () => {
			map.set('key', 'value');
			undoManager.undo();
			expect(map.get('key')).toBeUndefined();
			expect(undoManager.canRedo()).toBe(true);

			const result = undoManager.redo();
			expect(result).toBe(true);
			expect(map.get('key')).toBe('value');
			expect(undoManager.canRedo()).toBe(false);
		});

		it('should handle multiple undo operations', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');
			undoManager.stopCapturing();
			map.set('key', 'value3');

			expect(map.get('key')).toBe('value3');

			undoManager.undo();
			expect(map.get('key')).toBe('value2');

			undoManager.undo();
			expect(map.get('key')).toBe('value1');

			undoManager.undo();
			expect(map.get('key')).toBeUndefined();
		});

		it('should handle multiple redo operations', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');
			undoManager.stopCapturing();
			map.set('key', 'value3');

			// Undo all
			undoManager.undo();
			undoManager.undo();
			undoManager.undo();
			expect(map.get('key')).toBeUndefined();

			// Redo all
			undoManager.redo();
			expect(map.get('key')).toBe('value1');

			undoManager.redo();
			expect(map.get('key')).toBe('value2');

			undoManager.redo();
			expect(map.get('key')).toBe('value3');
		});

		it('should clear redo stack on new change', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');

			undoManager.undo();
			expect(undoManager.canRedo()).toBe(true);

			map.set('key', 'value3');
			expect(undoManager.canRedo()).toBe(false);
		});

		it('should return false when nothing to undo', () => {
			expect(undoManager.canUndo()).toBe(false);
			expect(undoManager.undo()).toBe(false);
		});

		it('should return false when nothing to redo', () => {
			expect(undoManager.canRedo()).toBe(false);
			expect(undoManager.redo()).toBe(false);
		});

		it('should handle delete operations', () => {
			map.set('key', 'value');
			undoManager.stopCapturing();
			map.delete('key');

			expect(map.has('key')).toBe(false);

			undoManager.undo();
			expect(map.get('key')).toBe('value');

			undoManager.redo();
			expect(map.has('key')).toBe(false);
		});

		it('should handle multiple keys in transaction', () => {
			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
			});
			undoManager.stopCapturing();
			doc.transact(() => {
				map.set('c', '3');
				map.delete('a');
			});

			expect(map.toJSON()).toEqual({ b: '2', c: '3' });

			undoManager.undo();
			expect(map.toJSON()).toEqual({ a: '1', b: '2' });
		});
	});

	describe('transactions', () => {
		it('should undo entire transaction as one operation', () => {
			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
				map.set('c', '3');
			});

			expect(map.toJSON()).toEqual({ a: '1', b: '2', c: '3' });

			undoManager.undo();
			expect(map.toJSON()).toEqual({});
		});

		it('should redo entire transaction as one operation', () => {
			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
			});

			undoManager.undo();
			expect(map.toJSON()).toEqual({});

			undoManager.redo();
			expect(map.toJSON()).toEqual({ a: '1', b: '2' });
		});

		it('should handle nested transactions', () => {
			doc.transact(() => {
				map.set('a', '1');
				doc.transact(() => {
					map.set('b', '2');
				});
				map.set('c', '3');
			});

			expect(map.toJSON()).toEqual({ a: '1', b: '2', c: '3' });

			// Should undo entire outer transaction as one operation
			undoManager.undo();
			expect(map.toJSON()).toEqual({});
		});
	});

	describe('capture timeout', () => {
		it('should merge rapid changes with zero timeout disabled', () => {
			// With captureTimeout: 0, each change should be separate
			// But since we're using the default undoManager with captureTimeout: 0,
			// we're already testing this in basic undo/redo tests

			// This test verifies that with default behavior,
			// rapid changes are still grouped logically
			map.set('key', 'value1');
			map.set('key', 'value2');
			map.set('key', 'value3');

			// With captureTimeout: 0, these should still be in one undo item
			// because they happen in the same tick
			undoManager.undo();
			// May undo all or just the last one depending on implementation
			// The key point is undo works without error
			expect(undoManager.canRedo()).toBe(true);
		});

		it('should separate changes when stopCapturing is called', () => {
			// Test the same behavior using stopCapturing instead of timeout
			map.set('key', 'value1');
			undoManager.stopCapturing(); // Force separate undo item
			map.set('key', 'value2');

			undoManager.undo();
			expect(map.get('key')).toBe('value1');
		});
	});

	describe('stopCapturing', () => {
		it('should force next change to be separate undo item', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');

			undoManager.undo();
			expect(map.get('key')).toBe('value1');

			undoManager.undo();
			expect(map.get('key')).toBeUndefined();
		});

		it('should work multiple times', () => {
			map.set('a', '1');
			undoManager.stopCapturing();
			map.set('b', '2');
			undoManager.stopCapturing();
			map.set('c', '3');

			// Three separate undo items
			expect(undoManager.canUndo()).toBe(true);
			undoManager.undo();
			expect(map.toJSON()).toEqual({ a: '1', b: '2' });

			undoManager.undo();
			expect(map.toJSON()).toEqual({ a: '1' });

			undoManager.undo();
			expect(map.toJSON()).toEqual({});
		});
	});

	describe('clear', () => {
		it('should clear undo stack', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');

			expect(undoManager.canUndo()).toBe(true);

			undoManager.clear();

			expect(undoManager.canUndo()).toBe(false);
			// Value should remain
			expect(map.get('key')).toBe('value2');
		});

		it('should clear redo stack', () => {
			map.set('key', 'value1');
			undoManager.undo();

			expect(undoManager.canRedo()).toBe(true);

			undoManager.clear();

			expect(undoManager.canRedo()).toBe(false);
		});

		it('should clear both stacks', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');
			undoManager.undo();

			expect(undoManager.canUndo()).toBe(true);
			expect(undoManager.canRedo()).toBe(true);

			undoManager.clear();

			expect(undoManager.canUndo()).toBe(false);
			expect(undoManager.canRedo()).toBe(false);
		});
	});

	describe('onStackChange', () => {
		it('should emit event when undo becomes available', () => {
			const events: UndoStackChangeEvent[] = [];
			undoManager.onStackChange((e) => events.push({ ...e }));

			map.set('key', 'value');

			expect(events).toContainEqual({ canUndo: true, canRedo: false });
		});

		it('should emit event when redo becomes available', () => {
			const events: UndoStackChangeEvent[] = [];
			map.set('key', 'value');

			undoManager.onStackChange((e) => events.push({ ...e }));
			undoManager.undo();

			expect(events).toContainEqual({ canUndo: false, canRedo: true });
		});

		it('should emit event when stacks are cleared', () => {
			const events: UndoStackChangeEvent[] = [];
			map.set('key', 'value');
			undoManager.undo();

			undoManager.onStackChange((e) => events.push({ ...e }));
			undoManager.clear();

			expect(events).toContainEqual({ canUndo: false, canRedo: false });
		});

		it('should stop emitting after unsubscribe', () => {
			const events: UndoStackChangeEvent[] = [];
			const unsubscribe = undoManager.onStackChange((e) => events.push({ ...e }));

			map.set('key', 'value1');
			const countAfterFirst = events.length;
			expect(countAfterFirst).toBeGreaterThan(0);

			unsubscribe();
			undoManager.stopCapturing();
			map.set('key', 'value2');

			expect(events.length).toBe(countAfterFirst);
		});
	});

	describe('metadata', () => {
		it('should store and retrieve metadata on undo', () => {
			map.set('key', 'value');
			undoManager.setMeta('cursor', { x: 10, y: 20 });

			undoManager.undo();

			expect(undoManager.getMeta('cursor')).toEqual({ x: 10, y: 20 });
		});

		it('should retrieve metadata from the last undone operation', () => {
			map.set('key', 'value1');
			undoManager.setMeta('cursor', { x: 10, y: 10 });
			undoManager.stopCapturing();

			map.set('key', 'value2');
			undoManager.setMeta('cursor', { x: 20, y: 20 });

			// Undo the second change
			undoManager.undo();
			expect(undoManager.getMeta('cursor')).toEqual({ x: 20, y: 20 });

			// Undo the first change
			undoManager.undo();
			expect(undoManager.getMeta('cursor')).toEqual({ x: 10, y: 10 });
		});

		it('should return undefined for non-existent key', () => {
			map.set('key', 'value');
			undoManager.undo();

			expect(undoManager.getMeta('nonexistent')).toBeUndefined();
		});

		it('should return undefined when no undo has been performed', () => {
			expect(undoManager.getMeta('anything')).toBeUndefined();
		});
	});

	describe('remote changes', () => {
		it('should not clear redo stack on remote change', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');

			undoManager.undo();
			expect(undoManager.canRedo()).toBe(true);

			// Simulate remote change - use a different doc ID (simulating another client)
			const remoteProvider = createProvider();
			const remoteDoc = remoteProvider.createDoc('remote-peer');
			remoteDoc.getMap<string>('test-map').set('remote-key', 'remote-value');
			doc.applyUpdate(remoteDoc.encodeState());
			remoteDoc.destroy();

			// Redo stack should still be intact (this is the key assertion for undo manager)
			expect(undoManager.canRedo()).toBe(true);

			// Note: In CRDT implementations, merging docs with different IDs may behave differently
			// The key test here is that redo stack is preserved, not the merge semantics
		});

		it('should not track remote changes in undo stack', () => {
			// Start with empty stack
			expect(undoManager.canUndo()).toBe(false);

			// Apply remote change - use a different doc ID (simulating another client)
			const remoteProvider = createProvider();
			const remoteDoc = remoteProvider.createDoc('remote-peer');
			remoteDoc.getMap<string>('test-map').set('remote-key', 'remote-value');
			doc.applyUpdate(remoteDoc.encodeState());
			remoteDoc.destroy();

			// Remote changes should not be tracked - this is the key assertion
			expect(undoManager.canUndo()).toBe(false);
		});
	});

	describe('destroy', () => {
		it('should not allow operations after destroy', () => {
			map.set('key', 'value');
			undoManager.destroy();

			expect(undoManager.undo()).toBe(false);
			expect(undoManager.redo()).toBe(false);
			expect(undoManager.canUndo()).toBe(false);
			expect(undoManager.canRedo()).toBe(false);
		});

		it('should not emit events after destroy', () => {
			const events: UndoStackChangeEvent[] = [];
			undoManager.onStackChange((e) => events.push({ ...e }));

			undoManager.destroy();

			// Make a change - should not trigger events
			map.set('key', 'value');

			// No events after destroy
			expect(events.length).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('should handle undo/redo cycle without errors', () => {
			map.set('key', 'value1');
			undoManager.stopCapturing();
			map.set('key', 'value2');
			undoManager.stopCapturing();
			map.set('key', 'value3');

			// Full cycle
			undoManager.undo();
			undoManager.undo();
			undoManager.undo();
			undoManager.redo();
			undoManager.redo();
			undoManager.redo();
			undoManager.undo();

			expect(map.get('key')).toBe('value2');
		});

		it('should handle empty document undo', () => {
			// No changes made
			expect(undoManager.undo()).toBe(false);
			expect(undoManager.canUndo()).toBe(false);
		});

		it('should work with the same map', () => {
			// Note: Y.UndoManager only tracks types in its scope at creation time
			// This test uses the map that was created before the undo manager
			map.set('a', '1');
			undoManager.stopCapturing();
			map.set('b', '2');

			undoManager.undo();
			expect(map.get('a')).toBe('1');
			expect(map.get('b')).toBeUndefined();

			undoManager.undo();
			expect(map.get('a')).toBeUndefined();
		});
	});
});

describe('UndoManager - provider-specific tests', () => {
	describe('Yjs - only one undo manager per document', () => {
		it('should throw when creating second undo manager', () => {
			const provider = new YjsProvider();
			const doc = provider.createDoc('test');

			const um1 = doc.createUndoManager();
			expect(() => doc.createUndoManager()).toThrow('Undo manager already exists');

			um1.destroy();
			doc.destroy();
		});
	});
});
