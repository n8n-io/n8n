import type { CRDTArray, CRDTDoc, CRDTMap, DeepChangeEvent } from '../types';
import { ChangeAction } from '../types';
import { YjsProvider } from './yjs';

describe('YjsProvider', () => {
	describe('CRDTMap basic operations', () => {
		let doc: CRDTDoc;
		let map: CRDTMap<string>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			map = doc.getMap<string>('test-map');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should set and get values', () => {
			map.set('key1', 'value1');

			expect(map.get('key1')).toBe('value1');
			expect(map.get('nonexistent')).toBeUndefined();
		});

		it('should delete values', () => {
			map.set('key1', 'value1');
			expect(map.has('key1')).toBe(true);

			map.delete('key1');
			expect(map.has('key1')).toBe(false);
			expect(map.get('key1')).toBeUndefined();
		});

		it('should check key existence with has()', () => {
			expect(map.has('key1')).toBe(false);
			map.set('key1', 'value1');
			expect(map.has('key1')).toBe(true);
		});

		it('should iterate keys', () => {
			map.set('a', '1');
			map.set('b', '2');
			map.set('c', '3');

			const keys = Array.from(map.keys());
			expect(keys).toContain('a');
			expect(keys).toContain('b');
			expect(keys).toContain('c');
			expect(keys).toHaveLength(3);
		});

		it('should iterate values', () => {
			map.set('a', '1');
			map.set('b', '2');

			const values = Array.from(map.values());
			expect(values).toContain('1');
			expect(values).toContain('2');
			expect(values).toHaveLength(2);
		});

		it('should iterate entries', () => {
			map.set('a', '1');
			map.set('b', '2');

			const entries = Array.from(map.entries());
			expect(entries).toContainEqual(['a', '1']);
			expect(entries).toContainEqual(['b', '2']);
			expect(entries).toHaveLength(2);
		});

		it('should convert to JSON', () => {
			map.set('a', '1');
			map.set('b', '2');

			expect(map.toJSON()).toEqual({ a: '1', b: '2' });
		});

		it('should share underlying data for the same name', () => {
			const map1 = doc.getMap('test-map');
			const map2 = doc.getMap('test-map');

			map1.set('key', 'value');
			expect(map2.get('key')).toBe('value');
		});

		it('should batch changes in transact()', () => {
			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
				map.set('c', '3');
			});

			expect(map.toJSON()).toEqual({ a: '1', b: '2', c: '3' });
		});
	});

	describe('CRDTMap onDeepChange', () => {
		let doc: CRDTDoc;
		let map: CRDTMap<unknown>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			map = doc.getMap('test-map');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should emit add event when adding a key', () => {
			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key1', 'value1');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: ['key1'],
				action: ChangeAction.add,
				value: 'value1',
			});
		});

		it('should emit update event when updating a key', () => {
			map.set('key1', 'value1');

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key1', 'value2');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: ['key1'],
				action: ChangeAction.update,
				value: 'value2',
				oldValue: 'value1',
			});
		});

		it('should emit delete event when deleting a key', () => {
			map.set('key1', 'value1');

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.delete('key1');

			expect(changes).toHaveLength(1);
			expect(changes[0]).toEqual({
				path: ['key1'],
				action: ChangeAction.delete,
				oldValue: 'value1',
			});
		});

		it('should emit multiple changes in a single batch for transact', () => {
			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			doc.transact(() => {
				map.set('a', '1');
				map.set('b', '2');
			});

			expect(changes).toHaveLength(2);
			expect(changes).toContainEqual({
				path: ['a'],
				action: ChangeAction.add,
				value: '1',
			});
			expect(changes).toContainEqual({
				path: ['b'],
				action: ChangeAction.add,
				value: '2',
			});
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: DeepChangeEvent[] = [];
			const unsubscribe = map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			map.set('key1', 'value1');
			expect(changes).toHaveLength(1);

			unsubscribe();

			map.set('key2', 'value2');
			expect(changes).toHaveLength(1); // No new changes
		});

		it('should emit correct path for nested object changes (full replace)', () => {
			map.set('node-1', { position: { x: 100, y: 200 } });

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			// Update the entire node (top-level change)
			map.set('node-1', { position: { x: 150, y: 200 } });

			expect(changes).toHaveLength(1);
			expect(changes[0].path).toEqual(['node-1']);
			expect(changes[0].action).toBe(ChangeAction.update);
			expect(changes[0].value).toEqual({ position: { x: 150, y: 200 } });
		});

		it('should emit deep path when nested map is modified via get()', () => {
			// Set up nested object structure
			map.set('node-1', { position: { x: 100, y: 200 } });

			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			// Get nested maps via public API and modify
			const nodeMap = map.get('node-1') as CRDTMap<unknown>;
			const positionMap = nodeMap.get('position') as CRDTMap<unknown>;
			positionMap.set('x', 150);

			expect(changes).toHaveLength(1);
			expect(changes[0].path).toEqual(['node-1', 'position', 'x']);
			expect(changes[0].action).toBe(ChangeAction.update);
			expect(changes[0].value).toBe(150);
			expect(changes[0].oldValue).toBe(100);
		});

		it('should allow building nested structures incrementally', () => {
			const changes: DeepChangeEvent[] = [];
			map.onDeepChange((changeEvents) => changes.push(...changeEvents));

			// Start with empty object, build up structure
			map.set('node-1', {});
			const nodeMap = map.get('node-1') as CRDTMap<unknown>;

			nodeMap.set('parameters', {});
			const params = nodeMap.get('parameters') as CRDTMap<unknown>;

			params.set('url', 'https://example.com');
			params.set('method', 'POST');
			params.set('body', { data: { nested: 'value' } });

			// Modify deeply nested value
			const body = params.get('body') as CRDTMap<unknown>;
			const data = body.get('data') as CRDTMap<unknown>;
			data.set('nested', 'updated');

			// Should have 6 changes: node-1, parameters, url, method, body, nested update
			expect(changes).toHaveLength(6);

			// Verify the deep update
			const lastChange = changes[5];
			expect(lastChange.path).toEqual(['node-1', 'parameters', 'body', 'data', 'nested']);
			expect(lastChange.action).toBe(ChangeAction.update);
			expect(lastChange.value).toBe('updated');
			expect(lastChange.oldValue).toBe('value');
		});
	});

	describe('CRDTArray basic operations', () => {
		let doc: CRDTDoc;
		let arr: CRDTArray<string>;

		beforeEach(() => {
			const provider = new YjsProvider();
			doc = provider.createDoc('test');
			arr = doc.getArray<string>('test-array');
		});

		afterEach(() => {
			doc.destroy();
		});

		it('should push and get values', () => {
			arr.push('a', 'b', 'c');

			expect(arr.get(0)).toBe('a');
			expect(arr.get(1)).toBe('b');
			expect(arr.get(2)).toBe('c');
			expect(arr.get(3)).toBeUndefined();
		});

		it('should report correct length', () => {
			expect(arr.length).toBe(0);

			arr.push('a');
			expect(arr.length).toBe(1);

			arr.push('b', 'c');
			expect(arr.length).toBe(3);
		});

		it('should insert at index', () => {
			arr.push('a', 'c');
			arr.insert(1, 'b');

			expect(arr.toArray()).toEqual(['a', 'b', 'c']);
		});

		it('should insert multiple items at index', () => {
			arr.push('a', 'd');
			arr.insert(1, 'b', 'c');

			expect(arr.toArray()).toEqual(['a', 'b', 'c', 'd']);
		});

		it('should delete single element', () => {
			arr.push('a', 'b', 'c');
			arr.delete(1);

			expect(arr.toArray()).toEqual(['a', 'c']);
		});

		it('should delete multiple elements', () => {
			arr.push('a', 'b', 'c', 'd');
			arr.delete(1, 2);

			expect(arr.toArray()).toEqual(['a', 'd']);
		});

		it('should convert to array', () => {
			arr.push('a', 'b', 'c');

			expect(arr.toArray()).toEqual(['a', 'b', 'c']);
		});

		it('should convert to JSON (same as toArray)', () => {
			arr.push('a', 'b', 'c');

			expect(arr.toJSON()).toEqual(['a', 'b', 'c']);
		});

		it('should share underlying data for the same name', () => {
			const arr1 = doc.getArray<string>('test-array');
			const arr2 = doc.getArray<string>('test-array');

			arr1.push('value');
			expect(arr2.get(0)).toBe('value');
		});

		it('should handle nested objects', () => {
			const objArr = doc.getArray<{ name: string }>('obj-array');
			objArr.push({ name: 'first' }, { name: 'second' });

			expect(objArr.toArray()).toEqual([{ name: 'first' }, { name: 'second' }]);

			// Get nested object as CRDTMap
			const first = objArr.get(0) as CRDTMap<string>;
			expect(first.get('name')).toBe('first');
		});

		it('should handle nested arrays', () => {
			const nestedArr = doc.getArray<string[]>('nested-array');
			nestedArr.push(['a', 'b'], ['c', 'd']);

			expect(nestedArr.toArray()).toEqual([
				['a', 'b'],
				['c', 'd'],
			]);

			// Get nested array as CRDTArray
			const inner = nestedArr.get(0) as CRDTArray<string>;
			expect(inner.get(0)).toBe('a');
			expect(inner.length).toBe(2);
		});
	});
});
