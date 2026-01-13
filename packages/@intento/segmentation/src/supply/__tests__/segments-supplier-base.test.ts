import type { ExecutionContext, IDescriptor, IFunctions, SupplyError } from 'intento-core';
import { AgentRequestBase, ContextFactory } from 'intento-core';
import { mock } from 'jest-mock-extended';
import type { IDataObject, INode, IntentoConnectionType } from 'n8n-workflow';

import type { ISegment } from '../../types/i-segment';
import { MergeRequest } from '../merge-request';
import { MergeResponse } from '../merge-response';
import { SegmentsSupplierBase } from '../segments-supplier-base';
import { SplitRequest } from '../split-request';
import { SplitResponse } from '../split-response';

/**
 * Tests for SegmentsSupplierBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Mock implementations
class MockAgentRequest extends AgentRequestBase {
	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
		};
	}
}

// Concrete test class extending abstract SegmentsSupplierBase
class TestSegmentsSupplier extends SegmentsSupplierBase {
	mockSplitResponse?: SplitResponse | SupplyError;

	protected async executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		signal.throwIfAborted();
		if (this.mockSplitResponse) {
			return await Promise.resolve(this.mockSplitResponse);
		}
		// Default: create valid split response
		const segments: ISegment[] = request.text.map((text, index) => ({
			text,
			textPosition: index,
			segmentPosition: 0,
		}));
		return new SplitResponse(request, segments);
	}

	// Expose protected execute for testing
	async testExecute(request: SplitRequest | MergeRequest, signal: AbortSignal): Promise<SplitResponse | MergeResponse | SupplyError> {
		return await this.execute(request, signal);
	}

	// Expose protected executeMerge for testing
	async testExecuteMerge(request: MergeRequest, signal: AbortSignal): Promise<MergeResponse | SupplyError> {
		return await this.executeMerge(request, signal);
	}
}

describe('SegmentsSupplierBase', () => {
	let mockFunctions: IFunctions;
	let mockDescriptor: IDescriptor;
	let mockConnection: IntentoConnectionType;
	let mockNode: INode;
	let mockExecutionContext: ExecutionContext;
	let supplier: TestSegmentsSupplier;
	let mockAgentRequest: MockAgentRequest;
	let abortController: AbortController;

	beforeEach(() => {
		// Setup mocks
		mockNode = mock<INode>({ name: 'TestSegmentSupplierNode', type: 'test' });
		mockDescriptor = mock<IDescriptor>({ name: 'TestSupplier' });
		mockConnection = 'input1' as IntentoConnectionType;
		mockAgentRequest = new MockAgentRequest();
		abortController = new AbortController();

		const debugFn = jest.fn();
		const infoFn = jest.fn();
		const warnFn = jest.fn();
		const errorFn = jest.fn();

		mockFunctions = mock<IFunctions>({
			getNode: jest.fn(() => mockNode),
			getWorkflow: jest.fn(() => ({ id: 'test-workflow-id', name: 'Test Workflow', active: true })),
			getExecutionId: jest.fn(() => 'test-execution-id'),
			getWorkflowDataProxy: jest.fn(() => ({
				$execution: { customData: new Map() },
			})) as unknown as (itemIndex: number) => IFunctions['getWorkflowDataProxy'] extends (itemIndex: number) => infer R ? R : never,
			logger: {
				debug: debugFn,
				info: infoFn,
				warn: warnFn,
				error: errorFn,
			},
			addInputData: jest.fn(() => ({ index: 0 })),
			addOutputData: jest.fn(() => undefined),
			getNodeParameter: jest.fn(),
		} as Partial<IFunctions>) as IFunctions;

		mockExecutionContext = mock<ExecutionContext>({
			maxAttempts: 3,
			createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
		});

		jest.spyOn(ContextFactory, 'read').mockReturnValue(mockExecutionContext);

		supplier = new TestSegmentsSupplier(mockDescriptor, mockConnection, mockFunctions);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('execute()', () => {
		describe('business logic', () => {
			it('[BL-01] should route SplitRequest to executeSplit', async () => {
				// ARRANGE
				const splitRequest = new SplitRequest(mockAgentRequest, ['Test text'], 1000);

				// ACT
				const result = await supplier.testExecute(splitRequest, abortController.signal);

				// ASSERT
				expect(result).toBeInstanceOf(SplitResponse);
				expect((result as SplitResponse).segments.length).toBeGreaterThan(0);
			});

			it('[BL-02] should route MergeRequest to executeMerge', async () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = await supplier.testExecute(mergeRequest, abortController.signal);

				// ASSERT
				expect(result).toBeInstanceOf(MergeResponse);
				expect((result as MergeResponse).segments).toBe(mergeRequest.segments);
			});

			it('[BL-03] should merge single segment into single text item', async () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Single segment', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result).toBeInstanceOf(MergeResponse);
				expect(result.text).toEqual(['Single segment']);
				expect(result.text).toHaveLength(1);
			});

			it('[BL-04] should concatenate multiple segments with same textPosition', async () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello ', textPosition: 0, segmentPosition: 0 },
					{ text: 'world', textPosition: 0, segmentPosition: 1 },
					{ text: '!', textPosition: 0, segmentPosition: 2 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['Hello world!']);
				expect(result.text).toHaveLength(1);
			});

			it('[BL-05] should preserve textPosition ordering when merging', async () => {
				// ARRANGE - Intentionally unsorted by textPosition
				const segments: ISegment[] = [
					{ text: 'Third', textPosition: 2, segmentPosition: 0 },
					{ text: 'First', textPosition: 0, segmentPosition: 0 },
					{ text: 'Second', textPosition: 1, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['First', 'Second', 'Third']);
			});

			it('[BL-06] should preserve segmentPosition ordering within same text', async () => {
				// ARRANGE - Unsorted segmentPosition for same textPosition
				const segments: ISegment[] = [
					{ text: 'Third', textPosition: 0, segmentPosition: 2 },
					{ text: 'First', textPosition: 0, segmentPosition: 0 },
					{ text: 'Second', textPosition: 0, segmentPosition: 1 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['FirstSecondThird']);
			});

			it('[BL-07] should create MergeResponse with correct text array', async () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Item1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Item2', textPosition: 1, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result).toBeInstanceOf(MergeResponse);
				expect(result.text).toEqual(['Item1', 'Item2']);
				expect(result.segments).toBe(mergeRequest.segments);
			});

			it('[BL-08] should log debug message at merge start', async () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				await supplier.testExecuteMerge(mergeRequest, abortController.signal);

				// ASSERT
				expect(mockFunctions.logger.debug).toHaveBeenCalledWith(expect.stringContaining('Merging 1 segment(s)'), expect.any(Object));
			});

			it('[BL-09] should log info message after successful merge', async () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Seg1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Seg2', textPosition: 0, segmentPosition: 1 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				await supplier.testExecuteMerge(mergeRequest, abortController.signal);

				// ASSERT
				expect(mockFunctions.logger.info).toHaveBeenCalledWith(
					expect.stringContaining('Merged 2 segments into 1 text item(s)'),
					expect.any(Object),
				);
			});

			it('[BL-10] should use Map to group segments by textPosition', async () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'A', textPosition: 0, segmentPosition: 0 },
					{ text: 'B', textPosition: 1, segmentPosition: 0 },
					{ text: 'C', textPosition: 0, segmentPosition: 1 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toHaveLength(2); // Two distinct textPositions
				expect(result.text[0]).toBe('AC'); // textPosition 0: A + C
				expect(result.text[1]).toBe('B'); // textPosition 1: B
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle segments with non-sequential textPosition', async () => {
				// ARRANGE - Gaps in textPosition (0, 2, 5)
				const segments: ISegment[] = [
					{ text: 'Pos0', textPosition: 0, segmentPosition: 0 },
					{ text: 'Pos2', textPosition: 2, segmentPosition: 0 },
					{ text: 'Pos5', textPosition: 5, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['Pos0', 'Pos2', 'Pos5']);
				expect(result.text).toHaveLength(3);
			});

			it('[EC-02] should handle segments with high textPosition values', async () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'High position', textPosition: 999, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['High position']);
				expect(result.segments[0].textPosition).toBe(999);
			});

			it('[EC-03] should handle segments in unsorted order', async () => {
				// ARRANGE - Completely reversed order
				const segments: ISegment[] = [
					{ text: 'Third', textPosition: 2, segmentPosition: 0 },
					{ text: 'Second', textPosition: 1, segmentPosition: 0 },
					{ text: 'First', textPosition: 0, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['First', 'Second', 'Third']);
			});

			it('[EC-04] should handle mixed textPosition and segmentPosition order', async () => {
				// ARRANGE - Complex sorting scenario
				const segments: ISegment[] = [
					{ text: 'C', textPosition: 1, segmentPosition: 1 },
					{ text: 'A', textPosition: 0, segmentPosition: 0 },
					{ text: 'D', textPosition: 1, segmentPosition: 2 },
					{ text: 'B', textPosition: 1, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toEqual(['A', 'BCD']); // textPos 0: A, textPos 1: B+C+D
			});

			it('[EC-05] should create correct number of text items from Map', async () => {
				// ARRANGE - Multiple segments across different positions
				const segments: ISegment[] = [
					{ text: 'A', textPosition: 0, segmentPosition: 0 },
					{ text: 'B', textPosition: 0, segmentPosition: 1 },
					{ text: 'C', textPosition: 1, segmentPosition: 0 },
					{ text: 'D', textPosition: 2, segmentPosition: 0 },
					{ text: 'E', textPosition: 2, segmentPosition: 1 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const result = (await supplier.testExecuteMerge(mergeRequest, abortController.signal)) as MergeResponse;

				// ASSERT
				expect(result.text).toHaveLength(3); // 3 distinct textPositions
				expect(result.text).toEqual(['AB', 'C', 'DE']);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should call bugDetected for unsupported request type', async () => {
				// ARRANGE
				const unsupportedRequest = { constructor: { name: 'UnsupportedRequest' } } as unknown as SplitRequest | MergeRequest;

				// ACT & ASSERT - bugDetected logs error and throws
				await expect(supplier.testExecute(unsupportedRequest, abortController.signal)).rejects.toThrow();
				expect(mockFunctions.logger.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported request type'), expect.any(Object));
			});

			it('[EH-02] should throw if signal aborted before execute', async () => {
				// ARRANGE
				const splitRequest = new SplitRequest(mockAgentRequest, ['Test'], 1000);
				abortController.abort();

				// ACT & ASSERT
				await expect(supplier.testExecute(splitRequest, abortController.signal)).rejects.toThrow();
			});

			it('[EH-03] should throw if signal aborted before executeMerge', async () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				abortController.abort();

				// ACT & ASSERT
				await expect(supplier.testExecuteMerge(mergeRequest, abortController.signal)).rejects.toThrow();
			});

			it('[EH-04] should propagate executeSplit errors', async () => {
				// ARRANGE
				const splitRequest = new SplitRequest(mockAgentRequest, ['Test'], 1000);
				const mockError = new Error('Split failed');
				supplier.mockSplitResponse = mockError as unknown as SupplyError;

				// ACT
				const result = await supplier.testExecute(splitRequest, abortController.signal);

				// ASSERT
				expect(result).toBe(mockError);
			});
		});

		describe('metadata & data', () => {
			it('[MD-01] should include segment count in debug log', async () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'A', textPosition: 0, segmentPosition: 0 },
					{ text: 'B', textPosition: 0, segmentPosition: 1 },
					{ text: 'C', textPosition: 0, segmentPosition: 2 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				await supplier.testExecuteMerge(mergeRequest, abortController.signal);

				// ASSERT
				expect(mockFunctions.logger.debug).toHaveBeenCalledWith(expect.stringContaining('Merging 3 segment(s)'), expect.any(Object));
			});

			it('[MD-02] should include merged counts in info log', async () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'A', textPosition: 0, segmentPosition: 0 },
					{ text: 'B', textPosition: 1, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				await supplier.testExecuteMerge(mergeRequest, abortController.signal);

				// ASSERT
				expect(mockFunctions.logger.info).toHaveBeenCalledWith(
					expect.stringContaining('Merged 2 segments into 2 text item'),
					expect.any(Object),
				);
			});

			it('[MD-03] should pass request metadata to tracer calls', async () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);

				// ACT
				await supplier.testExecuteMerge(mergeRequest, abortController.signal);

				// ASSERT
				expect(mockFunctions.logger.debug).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						agentRequestId: expect.any(String) as string,
						supplyRequestId: expect.any(String) as string,
						segmentsCount: 1,
					}),
				);
				expect(mockFunctions.logger.info).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						agentRequestId: expect.any(String) as string,
						supplyRequestId: expect.any(String) as string,
						latencyMs: expect.any(Number) as number,
						segmentsCount: 1,
						textCount: 1,
					}),
				);
			});
		});
	});
});
