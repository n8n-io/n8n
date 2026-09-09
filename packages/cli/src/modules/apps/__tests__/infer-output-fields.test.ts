import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

import { inferOutputFields, OUTPUT_SAMPLE_LIMIT, sampleOutputItems } from '../infer-output-fields';

const field = (
	name: string,
	type: string,
	extra: Partial<{ nullable: boolean; optional: boolean }> = {},
) => ({
	name,
	type,
	nullable: false,
	optional: false,
	...extra,
});

describe('inferOutputFields', () => {
	it('maps each value to its kind', () => {
		expect(
			inferOutputFields([
				{ text: 'a', count: 1, flag: true, items: [1, 2], meta: { a: 1 }, nothing: null },
			]),
		).toEqual([
			field('text', 'string'),
			field('count', 'number'),
			field('flag', 'boolean'),
			field('items', 'array'),
			field('meta', 'object'),
			field('nothing', 'null', { nullable: true }),
		]);
	});

	it('marks a key nullable when any item has null for it', () => {
		expect(inferOutputFields([{ count: 1 }, { count: null }])).toEqual([
			field('count', 'number', { nullable: true }),
		]);
	});

	it('marks a key optional when some item lacks it', () => {
		expect(inferOutputFields([{ reply: 'a', count: 1 }, { reply: 'b' }])).toEqual([
			field('reply', 'string'),
			field('count', 'number', { optional: true }),
		]);
	});

	it('treats an undefined value as a missing key', () => {
		expect(inferOutputFields([{ reply: 'a' }, { reply: undefined }])).toEqual([
			field('reply', 'string', { optional: true }),
		]);
	});

	it('falls back to unknown when items disagree on a kind', () => {
		expect(inferOutputFields([{ id: 1 }, { id: 'x' }])).toEqual([field('id', 'unknown')]);
	});

	it('does not descend into nested objects or arrays', () => {
		expect(inferOutputFields([{ meta: { deep: { deeper: 1 } }, rows: [{ a: 1 }] }])).toEqual([
			field('meta', 'object'),
			field('rows', 'array'),
		]);
	});

	it('returns unknown for no items', () => {
		expect(inferOutputFields([])).toBe('unknown');
	});

	it('samples only the first 50 items', () => {
		const items: IDataObject[] = Array.from({ length: OUTPUT_SAMPLE_LIMIT }, () => ({ a: 1 }));
		items.push({ a: 1, late: 'x' });

		expect(inferOutputFields(items)).toEqual([field('a', 'number')]);
	});

	it('emits key names and kinds only, never item values', () => {
		const secret = 'sk-live-0123456789';
		const result = inferOutputFields([{ token: secret, nested: { token: secret } }]);

		expect(JSON.stringify(result)).not.toContain(secret);
	});
});

describe('sampleOutputItems', () => {
	const runData = (lastNodeExecuted: string | undefined, runs: unknown[]): IRunExecutionData =>
		({
			resultData: {
				lastNodeExecuted,
				runData: { Reply: runs },
			},
		}) as unknown as IRunExecutionData;

	it('returns the json of the first main output of the last run of the last node', () => {
		const data = runData('Reply', [
			{ data: { main: [[{ json: { first: true } }]] } },
			{ data: { main: [[{ json: { reply: 'a' } }, { json: { reply: 'b' } }], [{ json: {} }]] } },
		]);

		expect(sampleOutputItems(data)).toEqual([{ reply: 'a' }, { reply: 'b' }]);
	});

	it('returns no items without a last node, run data, or execution data', () => {
		expect(sampleOutputItems(undefined)).toEqual([]);
		expect(sampleOutputItems(runData(undefined, []))).toEqual([]);
		expect(sampleOutputItems(runData('Other', []))).toEqual([]);
		expect(sampleOutputItems(runData('Reply', [{ data: { main: [] } }]))).toEqual([]);
	});
});
