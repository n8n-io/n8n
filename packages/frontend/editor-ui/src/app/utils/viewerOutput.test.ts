import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { getViewerExecutionOutput } from '@/app/utils/viewerOutput';

function createExecution(overrides: Partial<IExecutionResponse> = {}): IExecutionResponse {
	return {
		id: '1',
		finished: true,
		mode: 'manual',
		status: 'success',
		createdAt: new Date(),
		startedAt: new Date(),
		workflowId: 'wf-1',
		executedNode: undefined,
		data: {
			startData: {},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
		workflowData: {
			id: 'wf-1',
			name: 'WF',
			nodes: [],
			connections: {},
			active: false,
			settings: {},
			createdAt: 0,
			updatedAt: 0,
			versionId: 'v1',
		},
		...overrides,
	} as IExecutionResponse;
}

describe('viewerOutput utils', () => {
	it('returns null when there is no finished execution yet', () => {
		expect(getViewerExecutionOutput(null)).toBeNull();

		const running = createExecution({
			finished: false,
			status: 'running',
		});
		expect(getViewerExecutionOutput(running)).toBeNull();
	});

	it('returns latest output for successful execution', () => {
		const execution = createExecution({
			executedNode: 'Final node',
			data: {
				startData: {},
				resultData: {
					runData: {
						'Final node': [
							{
								startTime: 1,
								executionIndex: 0,
								executionTime: 1,
								executionStatus: 'success',
								data: {
									main: [
										[
											{
												json: { invoiceId: 'INV-123' },
												binary: { document: { fileName: 'invoice.pdf', mimeType: 'application/pdf', data: 'abc' } },
											},
										],
									],
								},
							},
						],
					},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			},
		});

		expect(getViewerExecutionOutput(execution)).toEqual(
			expect.objectContaining({
				status: 'success',
				nodeName: 'Final node',
				binaryKeys: ['document'],
			}),
		);
	});

	it('returns error output when execution contains error', () => {
		const execution = createExecution({
			status: 'error',
			data: {
				startData: {},
				resultData: {
					runData: {},
					error: { message: 'Invalid document format' },
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			},
		});

		expect(getViewerExecutionOutput(execution)).toEqual({
			status: 'error',
			binaryKeys: [],
			errorMessage: 'Invalid document format',
		});
	});

	it('returns empty output when execution has no data and no errors', () => {
		const execution = createExecution();

		expect(getViewerExecutionOutput(execution)).toEqual({
			status: 'empty',
			binaryKeys: [],
		});
	});

	it('returns first task error when no output is available', () => {
		const execution = createExecution({
			status: 'error',
			data: {
				startData: {},
				resultData: {
					runData: {
						'Transform node': [
							{
								startTime: 1,
								executionIndex: 0,
								executionTime: 1,
								executionStatus: 'error',
								error: { message: 'Could not parse invoice fields' },
							},
						],
					},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			},
		});

		expect(getViewerExecutionOutput(execution)).toEqual({
			status: 'error',
			binaryKeys: [],
			errorMessage: 'Could not parse invoice fields',
		});
	});
});
