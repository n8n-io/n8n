import type { CRDTDoc, CRDTMap } from '../types';
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
});
