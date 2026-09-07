import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { trimItems, runQuery, queryItems, MAX_ITEMS, MAX_OUTPUT_CHARS } from '../agent-data-utils';

const item = (json: IDataObject): INodeExecutionData => ({ json });

describe('trimItems', () => {
	it('returns an empty, untruncated result for no items', () => {
		expect(trimItems([])).toEqual({ items: [], truncated: false });
	});

	it('returns safe items untruncated when under the caps', () => {
		const { items, truncated } = trimItems([item({ a: 1 }), item({ b: 2 })]);
		expect(items).toEqual([{ json: { a: 1 } }, { json: { b: 2 } }]);
		expect(truncated).toBe(false);
	});

	it('replaces binary with key-name stubs', () => {
		const withBinary: INodeExecutionData = {
			json: { name: 'f' },
			binary: { data: { data: 'AAAA', mimeType: 'application/pdf' } },
		};
		const { items } = trimItems([withBinary]);
		expect(items).toEqual([{ json: { name: 'f' }, binary: ['data'] }]);
	});

	it('caps item count at MAX_ITEMS and flags truncation', () => {
		const many = Array.from({ length: MAX_ITEMS + 15 }, (_, i) => item({ i }));
		const { items, truncated } = trimItems(many);
		expect(items).toHaveLength(MAX_ITEMS);
		expect(truncated).toBe(true);
	});

	it('substitutes a bounded preview when the first item exceeds the size cap', () => {
		const { items, truncated } = trimItems([item({ blob: 'x'.repeat(MAX_OUTPUT_CHARS + 10_000) })]);
		expect(items).toHaveLength(1);
		expect((items[0] as { itemTruncated?: boolean }).itemTruncated).toBe(true);
		expect((items[0] as { jsonPreview?: string }).jsonPreview).toHaveLength(MAX_OUTPUT_CHARS);
		expect(truncated).toBe(true);
	});
});

describe('runQuery', () => {
	it('returns the matched value untruncated when small', () => {
		expect(runQuery([{ id: 1 }, { id: 2 }], '[*].id')).toEqual({
			result: [1, 2],
			truncated: false,
		});
	});

	it('returns an error payload for a no-match query', () => {
		const result = runQuery([{ a: 1 }], '[0].missing') as { error: string };
		expect(result.error).toContain('matched no data');
	});

	it('returns an error payload for an unsafe query', () => {
		const result = runQuery([{ a: 1 }], '[0].__proto__') as { error: string };
		expect(result.error).toContain('Query failed');
	});

	it('truncates an oversized result to a string preview', () => {
		const big = [{ blob: 'y'.repeat(MAX_OUTPUT_CHARS + 10_000) }];
		const result = runQuery(big, '[0].blob') as { result: unknown; truncated: boolean };
		expect(typeof result.result).toBe('string');
		expect((result.result as string).length).toBe(MAX_OUTPUT_CHARS);
		expect(result.truncated).toBe(true);
	});
});

describe('queryItems', () => {
	it('queries against the wrapped { json } item shape', () => {
		expect(queryItems([item({ id: 1 }), item({ id: 2 })], '[*].json.id')).toEqual({
			result: [1, 2],
			truncated: false,
		});
	});

	it('exposes binary key names under the binary wrapper', () => {
		const withBinary: INodeExecutionData = {
			json: { name: 'f' },
			binary: { data: { data: 'AAAA', mimeType: 'application/pdf' } },
		};
		expect(queryItems([withBinary], '[0].binary')).toEqual({
			result: ['data'],
			truncated: false,
		});
	});
});
