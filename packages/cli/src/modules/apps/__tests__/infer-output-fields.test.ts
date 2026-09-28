import type { JSONSchema7 } from 'json-schema';
import type { IDataObject, IRunExecutionData } from 'n8n-workflow';

import { inferOutputSchema, OUTPUT_SAMPLE_LIMIT, sampleOutputItems } from '../infer-output-fields';

const itemsSchema = (
	properties: Record<string, JSONSchema7>,
	required?: string[],
): JSONSchema7 => ({
	type: 'array',
	items: { type: 'object', properties, ...(required ? { required } : {}) },
});

describe('inferOutputSchema', () => {
	it('maps each value to its JSON Schema type', () => {
		expect(
			inferOutputSchema([
				{ text: 'a', count: 1, flag: true, items: [1, 2], meta: { a: 1 }, nothing: null },
			]),
		).toEqual(
			itemsSchema(
				{
					text: { type: 'string' },
					count: { type: 'number' },
					flag: { type: 'boolean' },
					items: { type: 'array' },
					meta: { type: 'object' },
					nothing: { type: 'null' },
				},
				['text', 'count', 'flag', 'items', 'meta', 'nothing'],
			),
		);
	});

	it('adds null to the type when any item has null for the key', () => {
		expect(inferOutputSchema([{ count: 1 }, { count: null }])).toEqual(
			itemsSchema({ count: { type: ['number', 'null'] } }, ['count']),
		);
	});

	it('leaves a key out of required when some item lacks it', () => {
		expect(inferOutputSchema([{ reply: 'a', count: 1 }, { reply: 'b' }])).toEqual(
			itemsSchema({ reply: { type: 'string' }, count: { type: 'number' } }, ['reply']),
		);
	});

	it('treats an undefined value as a missing key', () => {
		expect(inferOutputSchema([{ reply: 'a' }, { reply: undefined }])).toEqual(
			itemsSchema({ reply: { type: 'string' } }),
		);
	});

	it('falls back to an empty schema when items disagree on a type', () => {
		expect(inferOutputSchema([{ id: 1 }, { id: 'x' }])).toEqual(itemsSchema({ id: {} }, ['id']));
	});

	it('does not descend into nested objects or arrays', () => {
		expect(inferOutputSchema([{ meta: { deep: { deeper: 1 } }, rows: [{ a: 1 }] }])).toEqual(
			itemsSchema({ meta: { type: 'object' }, rows: { type: 'array' } }, ['meta', 'rows']),
		);
	});

	it('returns null for no items', () => {
		expect(inferOutputSchema([])).toBeNull();
	});

	it('samples only the first 50 items', () => {
		const items: IDataObject[] = Array.from({ length: OUTPUT_SAMPLE_LIMIT }, () => ({ a: 1 }));
		items.push({ a: 1, late: 'x' });

		expect(inferOutputSchema(items)).toEqual(itemsSchema({ a: { type: 'number' } }, ['a']));
	});

	it('emits key names and types only, never item values', () => {
		const secret = 'sk-live-0123456789';
		const result = inferOutputSchema([{ token: secret, nested: { token: secret } }]);

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
