import type { IExecutionResponse, TargetItem } from '@/Interface';
import {
	getPairedItemId,
	getSourceItems,
	getPairedItemsMapping,
	MAX_ITEM_COUNT_FOR_PAIRING,
} from '../pairedItemUtils';

const MOCK_EXECUTION: Partial<IExecutionResponse> = {
	data: {
		startData: {},
		resultData: {
			runData: {
				'When clicking ‘Test workflow’': [
					{
						startTime: 1706027170005,
						executionTime: 0,
						source: [],
						executionStatus: 'success',
						data: { main: [[{ json: {}, pairedItem: { item: 0 } }]] },
					},
				],
				DebugHelper: [
					{
						startTime: 1706027170005,
						executionTime: 1,
						source: [{ previousNode: 'When clicking ‘Test workflow’' }],
						executionStatus: 'success',
						data: {
							main: [
								[
									{
										json: {
											uid: '54563b92-e4d9-425d-826d-9fe471196a28',
											email: 'Jon_Ebert@yahoo.com',
											firstname: 'April',
											lastname: 'Aufderhar',
											password: '+xziPGNy',
										},
										pairedItem: { item: 0 },
									},
									{
										json: {
											uid: '3d3ee69e-f013-478c-8f5b-7723f508c02b',
											email: 'Jeffery_Wehner@yahoo.com',
											firstname: 'Amelia',
											lastname: 'Mante',
											password: '2DJR~2owf',
										},
										pairedItem: { item: 0 },
									},
								],
							],
						},
					},
				],
				If: [
					{
						startTime: 1706027170006,
						executionTime: 1,
						source: [{ previousNode: 'DebugHelper' }],
						executionStatus: 'success',
						data: {
							main: [
								[
									{
										json: {
											uid: '54563b92-e4d9-425d-826d-9fe471196a28',
											email: 'Jon_Ebert@yahoo.com',
											firstname: 'April',
											lastname: 'Aufderhar',
											password: '+xziPGNy',
										},
										pairedItem: { item: 0 },
									},
								],
								[
									{
										json: {
											uid: '3d3ee69e-f013-478c-8f5b-7723f508c02b',
											email: 'Jeffery_Wehner@yahoo.com',
											firstname: 'Amelia',
											lastname: 'Mante',
											password: '2DJR~2owf',
										},
										pairedItem: { item: 1 },
									},
								],
							],
						},
					},
				],
				'Edit Fields': [
					{
						startTime: 1706027170008,
						executionTime: 0,
						source: [{ previousNode: 'If', previousNodeOutput: 1 }],
						executionStatus: 'success',
						data: {
							main: [
								[
									{
										json: {
											uid: '3d3ee69e-f013-478c-8f5b-7723f508c02b',
											email: 'Jeffery_Wehner@yahoo.com',
											firstname: 'Amelia',
											lastname: 'Mante',
											password: '2DJR~2owf',
										},
										pairedItem: { item: 0 },
									},
								],
							],
						},
					},
					{
						startTime: 1706027170009,
						executionTime: 0,
						source: [{ previousNode: 'If' }],
						executionStatus: 'success',
						data: {
							main: [
								[
									{
										json: {
											uid: '54563b92-e4d9-425d-826d-9fe471196a28',
											email: 'Jon_Ebert@yahoo.com',
											firstname: 'April',
											lastname: 'Aufderhar',
											password: '+xziPGNy',
										},
										pairedItem: { item: 0 },
									},
								],
							],
						},
					},
				],
				'Edit Fields1': [
					{
						startTime: 1706027170008,
						executionTime: 0,
						source: [{ previousNode: 'Edit Fields' }],
						executionStatus: 'success',
						data: {
							main: [
								[
									{
										json: {
											uid: '3d3ee69e-f013-478c-8f5b-7723f508c02b',
											email: 'Jeffery_Wehner@yahoo.com',
											firstname: 'Amelia',
											lastname: 'Mante',
											password: '2DJR~2owf',
										},
										pairedItem: { item: 0 },
									},
								],
							],
						},
					},
					{
						startTime: 1706027170010,
						executionTime: 0,
						source: [{ previousNode: 'Edit Fields', previousNodeRun: 1 }],
						executionStatus: 'success',
						data: {
							main: [
								[
									{
										json: {
											uid: '54563b92-e4d9-425d-826d-9fe471196a28',
											email: 'Jon_Ebert@yahoo.com',
											firstname: 'April',
											lastname: 'Aufderhar',
											password: '+xziPGNy',
										},
										pairedItem: { item: 0 },
									},
								],
							],
						},
					},
				],
			},
			pinData: {},
			lastNodeExecuted: 'Edit Fields1',
		},
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: {},
		},
	},
	mode: 'manual',
	startedAt: new Date('2024-01-23T16:26:10.003Z'),
	stoppedAt: new Date('2024-01-23T16:26:10.011Z'),
	status: 'success',
	finished: true,
};

describe('pairedItemUtils', () => {
	describe('getPairedItemId', () => {
		it('should return the correct paired item ID', () => {
			const node = 'myNode';
			const run = 1;
			const output = 2;
			const item = 3;
			const expectedPairedItemId = 'myNode_r1_o2_i3';

			const pairedItemId = getPairedItemId(node, run, output, item);

			expect(pairedItemId).toEqual(expectedPairedItemId);
		});
	});

	describe('getSourceItems', () => {
		it('should return the source items for the given target item', () => {
			const target: TargetItem = { nodeName: 'If', runIndex: 0, outputIndex: 0, itemIndex: 0 };
			const expected: TargetItem[] = [
				{ nodeName: 'DebugHelper', runIndex: 0, itemIndex: 0, outputIndex: 0 },
			];

			const actual = getSourceItems(MOCK_EXECUTION, target);
			expect(actual).toEqual(expected);
		});

		it('should return the source items for the given target item across outputs', () => {
			const target: TargetItem = { nodeName: 'If', runIndex: 0, outputIndex: 1, itemIndex: 0 };
			const expected: TargetItem[] = [
				{ nodeName: 'DebugHelper', runIndex: 0, itemIndex: 1, outputIndex: 0 },
			];

			const actual = getSourceItems(MOCK_EXECUTION, target);
			expect(actual).toEqual(expected);
		});

		it('should return the source items for the given target item across runs', () => {
			const target: TargetItem = {
				nodeName: 'Edit Fields1',
				runIndex: 1,
				outputIndex: 0,
				itemIndex: 0,
			};
			const expected: TargetItem[] = [
				{ nodeName: 'Edit Fields', runIndex: 1, itemIndex: 0, outputIndex: 0 },
			];

			const actual = getSourceItems(MOCK_EXECUTION, target);
			expect(actual).toEqual(expected);
		});
	});

	describe('getPairedItemsMapping', () => {
		it('should return the mapping of paired items', () => {
			const actual = getPairedItemsMapping(MOCK_EXECUTION);
			const expected = {
				DebugHelper_r0_o0_i0: new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'If_r0_o0_i0',
					'Edit Fields_r1_o0_i0',
					'Edit Fields1_r1_o0_i0',
				]),
				DebugHelper_r0_o0_i1: new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'If_r0_o1_i0',
					'Edit Fields_r0_o0_i0',
					'Edit Fields1_r0_o0_i0',
				]),
				'Edit Fields1_r0_o0_i0': new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'DebugHelper_r0_o0_i1',
					'If_r0_o1_i0',
					'Edit Fields_r0_o0_i0',
				]),
				'Edit Fields1_r1_o0_i0': new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'DebugHelper_r0_o0_i0',
					'If_r0_o0_i0',
					'Edit Fields_r1_o0_i0',
				]),
				'Edit Fields_r0_o0_i0': new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'DebugHelper_r0_o0_i1',
					'If_r0_o1_i0',
					'Edit Fields1_r0_o0_i0',
				]),
				'Edit Fields_r1_o0_i0': new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'DebugHelper_r0_o0_i0',
					'If_r0_o0_i0',
					'Edit Fields1_r1_o0_i0',
				]),
				If_r0_o0_i0: new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'DebugHelper_r0_o0_i0',
					'Edit Fields_r1_o0_i0',
					'Edit Fields1_r1_o0_i0',
				]),
				If_r0_o1_i0: new Set([
					'When clicking ‘Test workflow’_r0_o0_i0',
					'DebugHelper_r0_o0_i1',
					'Edit Fields_r0_o0_i0',
					'Edit Fields1_r0_o0_i0',
				]),
				'When clicking ‘Test workflow’_r0_o0_i0': new Set([
					'DebugHelper_r0_o0_i0',
					'DebugHelper_r0_o0_i1',
					'If_r0_o0_i0',
					'If_r0_o1_i0',
					'Edit Fields_r0_o0_i0',
					'Edit Fields_r1_o0_i0',
					'Edit Fields1_r0_o0_i0',
					'Edit Fields1_r1_o0_i0',
				]),
			};
			expect(actual).toEqual(expected);
		});

		it('should skip mapping if execution has more than max items overall', () => {
			const mockExecution: Partial<IExecutionResponse> = {
				data: {
					startData: {},
					resultData: {
						runData: {
							Start: [
								{
									startTime: 1706027170005,
									executionTime: 0,
									source: [],
									executionStatus: 'success',
									data: {
										main: [[]],
									},
								},
							],
							DebugHelper: [
								{
									startTime: 1706027170005,
									executionTime: 1,
									source: [{ previousNode: 'Start' }],
									executionStatus: 'success',
									data: {
										main: [[]],
									},
								},
							],
						},
						pinData: {},
						lastNodeExecuted: 'DebugHelper',
					},
					executionData: {
						contextData: {},
						nodeExecutionStack: [],
						metadata: {},
						waitingExecution: {},
						waitingExecutionSource: {},
					},
				},
				mode: 'manual',
				startedAt: new Date('2024-01-23T16:26:10.003Z'),
				stoppedAt: new Date('2024-01-23T16:26:10.011Z'),
				status: 'success',
				finished: true,
			};

			for (let i = 0; i < MAX_ITEM_COUNT_FOR_PAIRING / 2; i++) {
				mockExecution.data?.resultData.runData.Start[0].data?.main[0]?.push({
					json: {},
					pairedItem: { item: 0 },
				});
			}

			for (let i = 0; i < MAX_ITEM_COUNT_FOR_PAIRING / 2; i++) {
				mockExecution.data?.resultData.runData.DebugHelper[0]?.data?.main[0]?.push({
					json: {
						uid: '3d3ee69e-f013-478c-8f5b-7723f508c02b',
						email: 'Jeffery_Wehner@yahoo.com',
						firstname: 'Amelia',
						lastname: 'Mante',
						password: '2DJR~2owf',
					},
					pairedItem: { item: 0 },
				});
			}

			const actual = getPairedItemsMapping(mockExecution);
			expect(Object.keys(actual).length).toEqual(MAX_ITEM_COUNT_FOR_PAIRING / 2 + 1);

			mockExecution.data?.resultData.runData.Start[0].data?.main?.[0]?.push({
				json: {},
				pairedItem: { item: 0 },
			});

			expect(getPairedItemsMapping(mockExecution)).toEqual({});
		});
	});
});
