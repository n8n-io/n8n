import type {
	IBinaryData,
	IExecuteData,
	INodeExecutionData,
	IRunExecutionData,
	ITaskData,
	ITaskDataConnections,
} from 'n8n-workflow';
import { BINARY_IN_JSON_PROPERTY, createRunExecutionData } from 'n8n-workflow';

import { sumBinaryDataBytes } from '../sum-binary-data-bytes';

const binary = (over: Partial<IBinaryData>): IBinaryData =>
	({ data: '', mimeType: 'application/octet-stream', ...over }) as IBinaryData;

const itemWith = (binaryMap: Record<string, IBinaryData>): INodeExecutionData => ({
	json: {},
	binary: binaryMap,
});

const mainWith = (items: INodeExecutionData[]): ITaskDataConnections => ({ main: [items] });

/** Branded run data with one node run whose main output holds the given binary maps. */
const runDataWith = (
	binaryMaps: Array<Record<string, IBinaryData>>,
	connection = 'main',
): IRunExecutionData =>
	createRunExecutionData({
		resultData: {
			runData: {
				Node: [{ data: { [connection]: [binaryMaps.map(itemWith)] } } as unknown as ITaskData],
			},
		},
	});

describe('sumBinaryDataBytes', () => {
	it('returns 0 when there is no binary data', () => {
		expect(sumBinaryDataBytes(runDataWith([{}]))).toBe(0);
	});

	it('returns 0 for empty run data', () => {
		expect(sumBinaryDataBytes(createRunExecutionData())).toBe(0);
	});

	it('returns 0 when data is undefined', () => {
		expect(sumBinaryDataBytes(undefined)).toBe(0);
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

	it('counts binary embedded in item json under _files', () => {
		const data = createRunExecutionData({
			resultData: {
				runData: {
					Node: [
						{
							data: {
								main: [
									[{ json: { [BINARY_IN_JSON_PROPERTY]: { f: binary({ id: '1', bytes: 80 }) } } }],
								],
							},
						} as unknown as ITaskData,
					],
				},
			},
		});
		expect(sumBinaryDataBytes(data)).toBe(80);
	});

	it('counts binary in a node run inputOverride', () => {
		const data = createRunExecutionData({
			resultData: {
				runData: {
					Node: [
						{
							data: { main: [[]] },
							inputOverride: mainWith([itemWith({ a: binary({ id: '1', bytes: 60 }) })]),
						} as unknown as ITaskData,
					],
				},
			},
		});
		expect(sumBinaryDataBytes(data)).toBe(60);
	});

	it('counts binary still sitting in the node execution stack', () => {
		const data = createRunExecutionData({
			executionData: {
				nodeExecutionStack: [
					{
						data: mainWith([itemWith({ a: binary({ id: '1', bytes: 90 }) })]),
					} as unknown as IExecuteData,
				],
			},
		});
		expect(sumBinaryDataBytes(data)).toBe(90);
	});

	it('counts binary in the waiting execution map', () => {
		const data = createRunExecutionData({
			executionData: {
				waitingExecution: {
					Node: { 0: mainWith([itemWith({ a: binary({ id: '1', bytes: 110 }) })]) },
				},
			},
		});
		expect(sumBinaryDataBytes(data)).toBe(110);
	});

	it('dedupes the same blob across run data and the execution stack', () => {
		const data = createRunExecutionData({
			resultData: {
				runData: {
					Node: [
						{
							data: mainWith([itemWith({ a: binary({ id: 'shared', bytes: 100 }) })]),
						} as unknown as ITaskData,
					],
				},
			},
			executionData: {
				nodeExecutionStack: [
					{
						data: mainWith([itemWith({ a: binary({ id: 'shared', bytes: 100 }) })]),
					} as unknown as IExecuteData,
				],
			},
		});
		expect(sumBinaryDataBytes(data)).toBe(100);
	});
});
