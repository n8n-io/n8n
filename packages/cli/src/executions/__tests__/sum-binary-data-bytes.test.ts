import type { IBinaryData, IRunExecutionData, ITaskData } from 'n8n-workflow';

import { sumBinaryDataBytes } from '../sum-binary-data-bytes';

const binary = (over: Partial<IBinaryData>): IBinaryData =>
	({ data: '', mimeType: 'application/octet-stream', ...over }) as IBinaryData;

/** Build run data with one node whose runs/connections/items carry the given binary maps. */
const runDataWith = (
	binaryMaps: Array<Record<string, IBinaryData>>,
	connection = 'main',
): IRunExecutionData =>
	({
		resultData: {
			runData: {
				Node: [
					{
						data: {
							[connection]: [binaryMaps.map((b) => ({ json: {}, binary: b }))],
						},
					} as unknown as ITaskData,
				],
			},
		},
	}) as unknown as IRunExecutionData;

describe('sumBinaryDataBytes', () => {
	it('returns 0 when there is no binary data', () => {
		expect(sumBinaryDataBytes(runDataWith([{}]))).toBe(0);
	});

	it('returns 0 for run data with no runData', () => {
		expect(sumBinaryDataBytes({ resultData: {} } as unknown as IRunExecutionData)).toBe(0);
	});

	it('returns 0 when data is undefined (callers force it with `!`)', () => {
		expect(sumBinaryDataBytes(undefined as unknown as IRunExecutionData)).toBe(0);
	});

	it('sums bytes across multiple items and binary keys', () => {
		const data = runDataWith([
			{ a: binary({ id: '1', bytes: 100 }), b: binary({ id: '2', bytes: 50 }) },
			{ a: binary({ id: '3', bytes: 25 }) },
		]);
		expect(sumBinaryDataBytes(data)).toBe(175);
	});

	it('counts each unique stored blob once (dedupes by id)', () => {
		const data = runDataWith([
			{ a: binary({ id: 'shared', bytes: 100 }) },
			{ b: binary({ id: 'shared', bytes: 100 }) },
		]);
		expect(sumBinaryDataBytes(data)).toBe(100);
	});

	it('ignores inline binary (no id) — it is counted by jsonSizeBytes instead', () => {
		const data = runDataWith([{ a: binary({ bytes: 30 }) }, { b: binary({ bytes: 30 }) }]);
		expect(sumBinaryDataBytes(data)).toBe(0);
	});

	it('treats missing bytes as 0', () => {
		const data = runDataWith([{ a: binary({ id: '1' }), b: binary({ id: '2', bytes: 40 }) }]);
		expect(sumBinaryDataBytes(data)).toBe(40);
	});

	it('counts binary on non-main connections', () => {
		const data = runDataWith([{ a: binary({ id: '1', bytes: 70 }) }], 'ai_tool');
		expect(sumBinaryDataBytes(data)).toBe(70);
	});
});
