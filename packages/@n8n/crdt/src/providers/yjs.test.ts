import type { CRDTDoc, CRDTMap, DeepChangeEvent } from '../types';
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

		it('should return the same map instance for the same name', () => {
			const map1 = doc.getMap('test-map');
			const map2 = doc.getMap('test-map');

			expect(map1).toBe(map2);
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
				action: ChangeAction.Add,
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
				action: ChangeAction.Update,
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
				action: ChangeAction.Delete,
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
				action: ChangeAction.Add,
				value: '1',
			});
			expect(changes).toContainEqual({
				path: ['b'],
				action: ChangeAction.Add,
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
			expect(changes[0].action).toBe(ChangeAction.Update);
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
			expect(changes[0].action).toBe(ChangeAction.Update);
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
			expect(lastChange.action).toBe(ChangeAction.Update);
			expect(lastChange.value).toBe('updated');
			expect(lastChange.oldValue).toBe('value');
		});
	});
});
