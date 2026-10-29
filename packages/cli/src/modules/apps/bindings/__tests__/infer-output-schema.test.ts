import type { IRunExecutionData } from 'n8n-workflow';

import { inferOutputSchema, OUTPUT_SAMPLE_LIMIT, sampleOutputItems } from '../infer-output-schema';

function runData(lastNodeExecuted: string, runs: Record<string, unknown[]>) {
	return { resultData: { lastNodeExecuted, runData: runs } } as unknown as IRunExecutionData;
}

describe('sampleOutputItems', () => {
	it('reads the items of the last run of the node that ran last', () => {
		const data = runData('Format', {
			Start: [{ data: { main: [[{ json: { ignored: true } }]] } }],
			Format: [
				{ data: { main: [[{ json: { run: 1 } }]] } },
				{ data: { main: [[{ json: { run: 2 } }]] } },
			],
		});

		expect(sampleOutputItems(data)).toEqual([{ run: 2 }]);
	});

	it('returns no items when nothing ran', () => {
		expect(sampleOutputItems(undefined)).toEqual([]);
		expect(sampleOutputItems(runData('Missing', {}))).toEqual([]);
	});
});

describe('inferOutputSchema', () => {
	it('returns null for an empty sample', () => {
		expect(inferOutputSchema([])).toBeNull();
	});

	it('types each key and requires only the keys that every item has', () => {
		expect(
			inferOutputSchema([
				{ id: 1, name: 'a', tags: ['x'] },
				{ id: 2, meta: { deep: true } },
			]),
		).toEqual({
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'number' },
					name: { type: 'string' },
					tags: { type: 'array' },
					meta: { type: 'object' },
				},
				required: ['id'],
			},
		});
	});

	it('gives a nullable type for one kind and null, and an open schema for two kinds', () => {
		const schema = inferOutputSchema([
			{ note: 'a', value: 1 },
			{ note: null, value: 'one' },
		]);

		expect(schema?.items).toMatchObject({
			properties: { note: { type: ['string', 'null'] }, value: {} },
		});
	});

	it('types a key that is always null as null', () => {
		expect(inferOutputSchema([{ gone: null }])?.items).toMatchObject({
			properties: { gone: { type: 'null' } },
		});
	});

	it('skips undefined values', () => {
		expect(inferOutputSchema([{ id: 1, maybe: undefined }])?.items).toEqual({
			type: 'object',
			properties: { id: { type: 'number' } },
			required: ['id'],
		});
	});

	it('samples only the first items', () => {
		const items = Array.from({ length: OUTPUT_SAMPLE_LIMIT }, (_, id) => ({ id }));
		items.push({ id: 0, late: 'x' } as never);

		expect(inferOutputSchema(items)?.items?.properties).not.toHaveProperty('late');
	});

	it('never copies values into the schema', () => {
		expect(JSON.stringify(inferOutputSchema([{ token: 'secret-value' }]))).not.toContain(
			'secret-value',
		);
	});
});
