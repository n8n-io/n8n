import { CRDTEngine, createCRDTProvider } from './index';
import type { CRDTArray, CRDTDoc, CRDTMap } from './types';
import { seedValueDeep, toJSON, getNestedValue, setNestedValue } from './utils';

describe('Utils', () => {
	let doc: CRDTDoc;

	beforeEach(() => {
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });
		doc = provider.createDoc('test-utils');
	});

	afterEach(() => {
		doc.destroy();
	});

	describe('seedValueDeep', () => {
		it('should return primitives as-is', () => {
			expect(seedValueDeep(doc, 'hello')).toBe('hello');
			expect(seedValueDeep(doc, 42)).toBe(42);
			expect(seedValueDeep(doc, true)).toBe(true);
			expect(seedValueDeep(doc, false)).toBe(false);
			expect(seedValueDeep(doc, null)).toBe(null);
			expect(seedValueDeep(doc, undefined)).toBe(undefined);
		});

		it('should convert plain object to CRDTMap', () => {
			const result = seedValueDeep(doc, { name: 'test', value: 123 });

			expect(result).toBeDefined();
			expect(typeof (result as CRDTMap).get).toBe('function');

			// Attach to document to verify values persist
			const root = doc.getMap('test');
			root.set('data', result as CRDTMap);
			const attached = root.get('data') as CRDTMap<string | number>;

			expect(attached.get('name')).toBe('test');
			expect(attached.get('value')).toBe(123);
		});

		it('should convert plain array to CRDTArray', () => {
			const result = seedValueDeep(doc, [1, 2, 3]);

			expect(result).toBeDefined();
			expect(typeof (result as CRDTArray).get).toBe('function');

			// Attach to document to verify values persist
			const root = doc.getMap('test');
			root.set('data', result as CRDTArray);
			const attached = root.get('data') as CRDTArray<number>;

			expect(attached.get(0)).toBe(1);
			expect(attached.get(1)).toBe(2);
			expect(attached.get(2)).toBe(3);
			expect(attached.length).toBe(3);
		});

		it('should handle nested objects', () => {
			const result = seedValueDeep(doc, {
				user: {
					name: 'Alice',
					settings: {
						theme: 'dark',
					},
				},
			});

			// Attach to document
			const root = doc.getMap('test');
			root.set('data', result as CRDTMap);
			const map = root.get('data') as CRDTMap;

			const user = map.get('user') as CRDTMap;
			expect(user.get('name')).toBe('Alice');

			const settings = user.get('settings') as CRDTMap;
			expect(settings.get('theme')).toBe('dark');
		});

		it('should handle nested arrays', () => {
			const result = seedValueDeep(doc, {
				items: [
					{ id: 1, name: 'first' },
					{ id: 2, name: 'second' },
				],
			});

			// Attach to document
			const root = doc.getMap('test');
			root.set('data', result as CRDTMap);
			const map = root.get('data') as CRDTMap;

			const items = map.get('items') as CRDTArray;
			expect(items.length).toBe(2);

			const first = items.get(0) as CRDTMap;
			expect(first.get('id')).toBe(1);
			expect(first.get('name')).toBe('first');

			const second = items.get(1) as CRDTMap;
			expect(second.get('id')).toBe(2);
			expect(second.get('name')).toBe('second');
		});

		it('should handle arrays containing arrays', () => {
			const result = seedValueDeep(doc, [
				[1, 2],
				[3, 4],
			]);

			// Attach to document
			const root = doc.getMap('test');
			root.set('data', result as CRDTArray);
			const arr = root.get('data') as CRDTArray;

			expect(arr.length).toBe(2);

			const inner1 = arr.get(0) as CRDTArray<number>;
			expect(inner1.get(0)).toBe(1);
			expect(inner1.get(1)).toBe(2);

			const inner2 = arr.get(1) as CRDTArray<number>;
			expect(inner2.get(0)).toBe(3);
			expect(inner2.get(1)).toBe(4);
		});

		it('should handle empty objects', () => {
			const result = seedValueDeep(doc, {});

			expect(result).toBeDefined();
			expect(typeof (result as CRDTMap).get).toBe('function');
		});

		it('should handle empty arrays', () => {
			const result = seedValueDeep(doc, []);

			expect(result).toBeDefined();
			expect((result as CRDTArray).length).toBe(0);
		});

		it('should handle mixed nested structures', () => {
			const result = seedValueDeep(doc, {
				name: 'workflow',
				nodes: [
					{
						id: 'node1',
						params: {
							values: [10, 20, 30],
						},
					},
				],
			});

			// Attach to document
			const root = doc.getMap('test');
			root.set('data', result as CRDTMap);
			const map = root.get('data') as CRDTMap;

			expect(map.get('name')).toBe('workflow');

			const nodes = map.get('nodes') as CRDTArray;
			const node = nodes.get(0) as CRDTMap;
			expect(node.get('id')).toBe('node1');

			const params = node.get('params') as CRDTMap;
			const values = params.get('values') as CRDTArray<number>;
			expect(values.get(0)).toBe(10);
			expect(values.get(1)).toBe(20);
			expect(values.get(2)).toBe(30);
		});
	});

	describe('toJSON', () => {
		it('should return primitives as-is', () => {
			expect(toJSON('hello')).toBe('hello');
			expect(toJSON(42)).toBe(42);
			expect(toJSON(true)).toBe(true);
			expect(toJSON(false)).toBe(false);
			expect(toJSON(null)).toBe(null);
			expect(toJSON(undefined)).toBe(undefined);
		});

		it('should convert CRDTMap to plain object', () => {
			// Use named root map (attached to document)
			const map = doc.getMap<string | number>('testMap');
			map.set('name', 'test');
			map.set('value', 123);

			const result = toJSON(map);

			expect(result).toEqual({ name: 'test', value: 123 });
		});

		it('should convert CRDTArray to plain array', () => {
			// Use named root array (attached to document)
			const arr = doc.getArray<number>('testArray');
			arr.push(1, 2, 3);

			const result = toJSON(arr);

			expect(result).toEqual([1, 2, 3]);
		});

		it('should handle objects with toJSON method', () => {
			const obj = {
				toJSON: () => ({ converted: true }),
			};

			const result = toJSON(obj);

			expect(result).toEqual({ converted: true });
		});

		it('should return plain objects as-is', () => {
			const obj = { name: 'plain', value: 42 };

			const result = toJSON(obj);

			expect(result).toBe(obj);
		});

		it('should return plain arrays as-is', () => {
			const arr = [1, 2, 3];

			const result = toJSON(arr);

			expect(result).toBe(arr);
		});
	});

	describe('seedValueDeep and toJSON roundtrip', () => {
		it('should roundtrip simple objects', () => {
			const original = { name: 'test', value: 42 };
			const seeded = seedValueDeep(doc, original);

			// Attach to document before roundtrip
			const root = doc.getMap('roundtrip');
			root.set('data', seeded as CRDTMap);
			const attached = root.get('data') as CRDTMap;

			const result = toJSON(attached);

			expect(result).toEqual(original);
		});

		it('should roundtrip nested structures', () => {
			const original = {
				workflow: {
					name: 'My Workflow',
					nodes: [
						{ id: 'node1', type: 'trigger' },
						{ id: 'node2', type: 'action' },
					],
					settings: {
						timezone: 'UTC',
						saveExecutionProgress: true,
					},
				},
			};

			const seeded = seedValueDeep(doc, original);

			// Attach to document before roundtrip
			const root = doc.getMap('roundtrip');
			root.set('data', seeded as CRDTMap);
			const attached = root.get('data') as CRDTMap;

			const result = toJSON(attached);

			expect(result).toEqual(original);
		});

		it('should roundtrip arrays with mixed types', () => {
			const original = ['string', 42, true, null, { nested: 'object' }];
			const seeded = seedValueDeep(doc, original);

			// Attach to document before roundtrip
			const root = doc.getMap('roundtrip');
			root.set('data', seeded as CRDTArray);
			const attached = root.get('data') as CRDTArray;

			const result = toJSON(attached);

			expect(result).toEqual(original);
		});
	});

	describe('getNestedValue', () => {
		it('should get a value at a shallow path', () => {
			const root = doc.getMap<string>('test');
			root.set('name', 'Alice');

			expect(getNestedValue(root, ['name'])).toBe('Alice');
		});

		it('should get a value at a deep path', () => {
			const root = doc.getMap('test');
			const seeded = seedValueDeep(doc, {
				user: {
					profile: {
						name: 'Bob',
					},
				},
			});
			root.set('data', seeded as CRDTMap);
			const data = root.get('data') as CRDTMap;

			expect(getNestedValue(data, ['user', 'profile', 'name'])).toBe('Bob');
		});

		it('should return undefined for non-existent path', () => {
			const root = doc.getMap<string>('test');
			root.set('name', 'Alice');

			expect(getNestedValue(root, ['nonexistent'])).toBeUndefined();
			expect(getNestedValue(root, ['name', 'nested'])).toBeUndefined();
		});

		it('should handle empty path', () => {
			const root = doc.getMap<string>('test');
			root.set('name', 'Alice');

			expect(getNestedValue(root, [])).toBe(root);
		});

		it('should work with plain objects', () => {
			const obj = { user: { name: 'Charlie' } };

			expect(getNestedValue(obj, ['user', 'name'])).toBe('Charlie');
		});

		it('should work with plain arrays', () => {
			const obj = { items: ['a', 'b', 'c'] };

			expect(getNestedValue(obj, ['items', '1'])).toBe('b');
		});

		it('should return undefined for null/undefined in path', () => {
			const root = doc.getMap('test');
			root.set('nullValue', null);

			expect(getNestedValue(root, ['nullValue', 'nested'])).toBeUndefined();
		});

		it('should handle CRDTArray indices', () => {
			const root = doc.getMap('test');
			const items = doc.createArray<string>();
			items.push('first', 'second', 'third');
			root.set('items', items);

			expect(getNestedValue(root, ['items', '1'])).toBe('second');
		});
	});

	describe('setNestedValue', () => {
		it('should set a value at a shallow path', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, ['name'], 'Alice');

			expect(root.get('name')).toBe('Alice');
		});

		it('should set a value at a deep path, creating intermediate maps', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, ['user', 'profile', 'name'], 'Bob');

			const user = root.get('user') as CRDTMap;
			expect(user).toBeDefined();

			const profile = user.get('profile') as CRDTMap;
			expect(profile).toBeDefined();

			expect(profile.get('name')).toBe('Bob');
		});

		it('should overwrite existing values', () => {
			const root = doc.getMap('test');
			root.set('name', 'Old');

			setNestedValue(doc, root, ['name'], 'New');

			expect(root.get('name')).toBe('New');
		});

		it('should deep-seed objects when setting', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, ['config'], { theme: 'dark', fontSize: 14 });

			const config = root.get('config') as CRDTMap;
			expect(config.get('theme')).toBe('dark');
			expect(config.get('fontSize')).toBe(14);
		});

		it('should deep-seed arrays when setting', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, ['items'], [1, 2, 3]);

			const items = root.get('items') as CRDTArray<number>;
			expect(items.length).toBe(3);
			expect(items.get(0)).toBe(1);
			expect(items.get(1)).toBe(2);
			expect(items.get(2)).toBe(3);
		});

		it('should do nothing for empty path', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, [], 'value');

			expect([...root.keys()].length).toBe(0);
		});

		it('should navigate through existing maps', () => {
			const root = doc.getMap('test');
			const user = doc.createMap<string>();
			user.set('existing', 'value');
			root.set('user', user);

			setNestedValue(doc, root, ['user', 'name'], 'Alice');

			const updatedUser = root.get('user') as CRDTMap<string>;
			expect(updatedUser.get('existing')).toBe('value');
			expect(updatedUser.get('name')).toBe('Alice');
		});

		it('should stop if path encounters a non-map value', () => {
			const root = doc.getMap('test');
			root.set('primitive', 'string');

			// This should silently fail since 'primitive' is not a map
			setNestedValue(doc, root, ['primitive', 'nested'], 'value');

			// The primitive should remain unchanged
			expect(root.get('primitive')).toBe('string');
		});
	});

	describe('getNestedValue and setNestedValue roundtrip', () => {
		it('should get what was set', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, ['a', 'b', 'c'], 'deep value');

			expect(getNestedValue(root, ['a', 'b', 'c'])).toBe('deep value');
		});

		it('should work with complex nested structures', () => {
			const root = doc.getMap('test');

			setNestedValue(doc, root, ['workflow', 'nodes', 'node1'], {
				id: 'node1',
				type: 'trigger',
				params: { interval: 60 },
			});

			const node = getNestedValue(root, ['workflow', 'nodes', 'node1']) as CRDTMap;
			expect(toJSON(node)).toEqual({
				id: 'node1',
				type: 'trigger',
				params: { interval: 60 },
			});
		});
	});
});
