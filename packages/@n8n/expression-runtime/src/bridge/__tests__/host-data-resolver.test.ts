import { describe, expect, it, vi } from 'vitest';

import type { WorkflowData } from '../../types';
import { HostDataResolver } from '../host-data-resolver';

describe('HostDataResolver', () => {
	it('reuses a parameter result when reading its array elements', () => {
		const ids = [10, 20];
		const readIds = vi.fn(() => ids);
		const resolver = new HostDataResolver({
			$parameter: {
				get ids() {
					return readIds();
				},
			},
		});

		const path: readonly string[] = Object.freeze(['$parameter', 'ids']);
		expect(resolver.resolve(path)).toBe(ids);
		expect(resolver.resolve(['$parameter', 'ids', '0'])).toBe(10);
		expect(resolver.resolve(['$parameter', 'ids', '1'])).toBe(20);
		expect(readIds).toHaveBeenCalledTimes(1);
	});

	it('reuses a node parameter value when its parent getter returns a new proxy', () => {
		const readIds = vi.fn(() => [{ id: 10 }, { id: 20 }]);
		const readParameters = vi.fn(
			() =>
				new Proxy(
					{},
					{
						get: (_, key) => (key === 'ids' ? readIds() : undefined),
					},
				),
		);
		const resolver = new HostDataResolver({
			$node: {
				A: {
					get parameter() {
						return readParameters();
					},
				},
			},
		});
		const path = ['$node', 'A', 'parameter', 'ids'];

		expect(resolver.resolve(path)).toEqual([{ id: 10 }, { id: 20 }]);
		expect(resolver.resolve([...path, '0', 'id'])).toBe(10);
		expect(resolver.resolve([...path, '1', 'id'])).toBe(20);
		expect(readParameters).toHaveBeenCalledTimes(1);
		expect(readIds).toHaveBeenCalledTimes(1);

		const ids = resolver['pathCacheRoot']?.children
			?.get('$node')
			?.children?.get('A')
			?.children?.get('parameter')
			?.children?.get('ids');
		expect(ids?.children).toBeUndefined();
	});

	it('reuses a getter result across paths with the same prefix', () => {
		const readJson = vi.fn(() => ({ name: 'Ada', age: 30 }));
		const resolver = new HostDataResolver({
			get $json() {
				return readJson();
			},
		});

		expect(resolver.resolve(['$json', 'name'])).toBe('Ada');
		expect(resolver.resolve(['$json', 'age'])).toBe(30);
		expect(readJson).toHaveBeenCalledTimes(1);
	});

	it('reuses the last $item() result until the index changes', () => {
		const item = vi.fn((index: number) => ({ $json: { index } }));
		const resolver = new HostDataResolver({ $item: item });

		for (const index of [0, 1, 0]) {
			expect(resolver.resolve(['$item', String(index), '$json', 'index'])).toBe(index);
			expect(resolver.resolve(['$item', String(index), '$json', 'index'])).toBe(index);
		}

		expect(item.mock.calls).toEqual([[0], [1], [0]]);
	});

	it('retains only the last item and its parameter value when reading many indices', () => {
		let parameterReads = 0;
		const resolver = new HostDataResolver({
			$item: (index: number) => ({
				$parameter: {
					get ids() {
						parameterReads++;
						return [index];
					},
				},
			}),
		});

		for (let index = 0; index < 10_000; index++) {
			const path = ['$item', String(index), '$parameter', 'ids'];
			expect(resolver.resolve(path)).toEqual([index]);
			expect(resolver.resolve([...path, '0'])).toBe(index);
		}

		const item = resolver['pathCacheRoot']?.children?.get('$item');
		expect(item?.children?.size).toBe(1);
		expect(parameterReads).toBe(10_000);
		const ids = item?.children?.get('9999')?.children?.get('$parameter')?.children?.get('ids');
		expect(ids?.value).toEqual([9999]);
		expect(ids?.children).toBeUndefined();

		expect(resolver.resolve(['$item', '0', '$parameter', 'ids', '0'])).toBe(0);
		expect(parameterReads).toBe(10_001);
	});

	it('calls $() once for each node name', () => {
		const node = vi.fn((name: string) => ({ json: { name } }));
		const resolver = new HostDataResolver({ $: node } as unknown as WorkflowData);

		for (let repeat = 0; repeat < 2; repeat++) {
			expect(resolver.resolve(['$', 'A', 'json', 'name'])).toBe('A');
			expect(resolver.resolve(['$', 'B', 'json', 'name'])).toBe('B');
		}

		expect(node.mock.calls).toEqual([['A'], ['B']]);
	});

	it('keeps nested function properties as values', () => {
		const nested = vi.fn();
		const item = vi.fn(() => ({ nested }));
		const resolver = new HostDataResolver({ $item: item });

		expect(resolver.resolve(['$item', '0', 'nested'])).toBe(nested);
		expect(nested).not.toHaveBeenCalled();
	});

	it.each([null, undefined])('stops at %s before the end of a path', (value) => {
		const resolver = new HostDataResolver({ $json: { value } });

		expect(resolver.resolve(['$json', 'value', 'nested'])).toBe(value);
	});

	it('reads properties of primitive values', () => {
		const resolver = new HostDataResolver({ $json: { name: 'Ada' } });

		expect(resolver.resolve(['$json', 'name', 'length'])).toBe(3);
		expect(resolver.resolve(['$json', 'name', '0'])).toBe('A');
	});

	it('reuses intermediate primitive values when reading their properties', () => {
		const readName = vi.fn(() => 'Ada');
		const resolver = new HostDataResolver({
			$json: {
				get name() {
					return readName();
				},
			},
		});

		expect(resolver.resolve(['$json', 'name', 'length'])).toBe(3);
		expect(resolver.resolve(['$json', 'name', '0'])).toBe('A');
		expect(readName).toHaveBeenCalledTimes(1);
	});

	it('reads primitive leaves again', () => {
		let current = 0;
		const resolver = new HostDataResolver({
			$json: {
				get count() {
					return current++;
				},
			},
		});

		expect(resolver.resolve(['$json', 'count'])).toBe(0);
		expect(resolver.resolve(['$json', 'count'])).toBe(1);
	});

	it('reads null leaves again', () => {
		const readValue = vi.fn(() => null);
		const resolver = new HostDataResolver({
			$json: {
				get value() {
					return readValue();
				},
			},
		});

		expect(resolver.resolve(['$json', 'value'])).toBeNull();
		expect(resolver.resolve(['$json', 'value'])).toBeNull();
		expect(readValue).toHaveBeenCalledTimes(2);
	});

	it('retries a getter after it throws', () => {
		const value = { ready: true };
		const read = vi
			.fn()
			.mockImplementationOnce(() => {
				throw new Error('not ready');
			})
			.mockReturnValue(value);
		const resolver = new HostDataResolver({
			get $json() {
				return read();
			},
		});

		expect(() => resolver.resolve(['$json'])).toThrow('not ready');
		expect(resolver.resolve(['$json'])).toBe(value);
		expect(resolver.resolve(['$json', 'ready'])).toBe(true);
		expect(read).toHaveBeenCalledTimes(2);
	});

	it('keeps only the first two path steps for the call', () => {
		const items = Array.from({ length: 100 }, (_, index) => ({ a: { b: index } }));
		const resolver = new HostDataResolver({ $json: { items } });

		for (const index of items.keys()) {
			expect(resolver.resolve(['$json', 'items', String(index), 'a', 'b'])).toBe(index);
		}

		const json = resolver['pathCacheRoot']?.children?.get('$json');
		expect([...(json?.children?.keys() ?? [])]).toEqual(['items']);
		expect(json?.children?.get('items')?.children).toBeUndefined();
	});

	it('keeps the caches of overlapping calls independent', () => {
		let current = 'outer';
		const data = {
			get $json() {
				return { value: current };
			},
		};
		const outer = new HostDataResolver(data);
		expect(outer.resolve(['$json', 'value'])).toBe('outer');

		current = 'inner';
		const inner = new HostDataResolver(data);
		expect(inner.resolve(['$json', 'value'])).toBe('inner');
		inner.dispose();

		expect(outer.resolve(['$json', 'value'])).toBe('outer');
		outer.dispose();
		const next = new HostDataResolver(data);
		expect(next.resolve(['$json', 'value'])).toBe('inner');
	});

	it('returns the original data for host calls and empty paths', () => {
		const data = { $json: { value: 42 } };
		const resolver = new HostDataResolver(data);

		expect(resolver.getData()).toBe(data);
		expect(resolver.resolve([])).toBe(data);
	});

	it('releases cached values and rejects reads after disposal', () => {
		const resolver = new HostDataResolver({
			get $json() {
				return { value: 42 };
			},
		});
		expect(resolver.resolve(['$json', 'value'])).toBe(42);

		resolver.dispose();

		expect(resolver['pathCacheRoot']).toBeUndefined();
		expect(() => resolver.getData()).toThrow('Host callback called after its expression finished');
		expect(() => resolver.resolve(['$json', 'value'])).toThrow(
			'Host callback called after its expression finished',
		);
	});
});
