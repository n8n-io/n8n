import type { IDescriptor, IFunctions, SupplyError } from 'intento-core';
import { mock } from 'jest-mock-extended';
import type { IntentoConnectionType } from 'n8n-workflow';

import type { ISegment } from '../../types/i-segment';
import { MergeRequest } from '../merge-request';
import { MergeResponse } from '../merge-response';
import { SegmentsSupplierBase } from '../segments-supplier-base';
import { SplitRequest } from '../split-request';
import type { SplitResponse } from '../split-response';

/**
 * Tests for SegmentsSupplierBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-12
 */

const createSegment = (textPosition: number, segmentPosition: number, text: string): ISegment => ({
	textPosition,
	segmentPosition,
	text,
});

const createMergeRequest = (segments: ISegment[]): MergeRequest => new MergeRequest(segments);

const createSplitRequest = (text: string | string[], limit: number): SplitRequest => new SplitRequest(text, limit);

class ConcreteSegmentsSupplier extends SegmentsSupplierBase {
	mockSplitResponse: SplitResponse | SupplyError = mock<SplitResponse>();

	protected async executeSplit(_request: SplitRequest, _signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		return await Promise.resolve(this.mockSplitResponse);
	}

	// Type-safe accessors for testing protected methods
	async testExecute(request: SplitRequest | MergeRequest, signal: AbortSignal) {
		return await this.execute(request, signal);
	}

	async testExecuteMerge(request: MergeRequest, signal: AbortSignal) {
		return await this.executeMerge(request, signal);
	}
}

describe('SegmentsSupplierBase', () => {
	let supplier: ConcreteSegmentsSupplier;
	let mockDescriptor: IDescriptor;
	let mockFunctions: IFunctions;
	let mockConnection: IntentoConnectionType;
	let signal: AbortSignal;

	beforeEach(() => {
		mockDescriptor = { name: 'test-supplier', symbol: '🔧' } as IDescriptor;

		// Properly mock IFunctions with all required methods for Tracer
		mockFunctions = {
			addInputData: jest.fn().mockReturnValue({ index: 0 }),
			addOutputData: jest.fn(),
			getNode: jest.fn().mockReturnValue({ name: 'TestNode', type: 'test', typeVersion: 1 }),
			getWorkflow: jest.fn().mockReturnValue({ id: 'workflow-123' }),
			getExecutionId: jest.fn().mockReturnValue('execution-456'),
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: new Map(),
				},
			}),
			logger: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
		} as unknown as IFunctions;

		mockConnection = mock<IntentoConnectionType>();
		signal = new AbortController().signal;

		supplier = new ConcreteSegmentsSupplier(mockDescriptor, mockConnection, mockFunctions);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute routing', () => {
		it('[BL-01] should route SplitRequest to executeSplit', async () => {
			// ARRANGE
			const request = createSplitRequest('test text', 100);
			const mockResponse = mock<SplitResponse>();
			supplier.mockSplitResponse = mockResponse;
			const executeSplitSpy = jest.spyOn(
				supplier as unknown as { executeSplit: (req: SplitRequest, sig: AbortSignal) => Promise<SplitResponse | SupplyError> },
				'executeSplit',
			);

			// ACT
			const result = await supplier.testExecute(request, signal);

			// ASSERT
			expect(executeSplitSpy).toHaveBeenCalledWith(request, signal);
			expect(result).toBe(mockResponse);
		});

		it('[BL-02] should route MergeRequest to executeMerge', async () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'test')];
			const request = createMergeRequest(segments);
			const executeMergeSpy = jest.spyOn(
				supplier as unknown as { executeMerge: (req: MergeRequest, sig: AbortSignal) => Promise<MergeResponse> },
				'executeMerge',
			);

			// ACT
			const result = await supplier.testExecute(request, signal);

			// ASSERT
			expect(executeMergeSpy).toHaveBeenCalledWith(request, signal);
			expect(result).toBeInstanceOf(MergeResponse);
		});
		it('[EH-01] should call bugDetected for unsupported request type', async () => {
			// ARRANGE
			const unsupportedRequest = { requestId: 'test', requestedAt: Date.now() };

			// ACT & ASSERT - bugDetected throws Error with never return type
			await expect(supplier.testExecute(unsupportedRequest as SplitRequest, signal)).rejects.toThrow();
		});
	});

	describe('executeMerge - basic functionality', () => {
		it('[BL-03] should merge single text item with single segment', async () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Hello World')];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['Hello World']);
			}
		});

		it('[BL-04] should merge multiple segments into single text item', async () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Hello '), createSegment(0, 1, 'beautiful '), createSegment(0, 2, 'world')];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['Hello beautiful world']);
			}
		});

		it('[BL-05] should merge segments into multiple text items', async () => {
			// ARRANGE
			const segments = [
				createSegment(0, 0, 'First '),
				createSegment(0, 1, 'text'),
				createSegment(1, 0, 'Second '),
				createSegment(1, 1, 'text'),
			];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['First text', 'Second text']);
			}
		});

		it('[BL-08] should call signal.throwIfAborted before merge', async () => {
			// ARRANGE
			const controller = new AbortController();
			const abortedSignal = controller.signal;
			const segments = [createSegment(0, 0, 'test')];
			const request = createMergeRequest(segments);
			const throwIfAbortedSpy = jest.spyOn(abortedSignal, 'throwIfAborted');

			// ACT
			await supplier.testExecuteMerge(request, abortedSignal);

			// ASSERT
			expect(throwIfAbortedSpy).toHaveBeenCalled();
		});

		it('[BL-09] should log debug message before merge', async () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'test')];
			const request = createMergeRequest(segments);
			const debugSpy = jest.spyOn(mockFunctions.logger, 'debug');

			// ACT
			await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Merging'), expect.any(Object));
		});

		it('[BL-10] should log info message after merge', async () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'test')];
			const request = createMergeRequest(segments);
			const infoSpy = jest.spyOn(mockFunctions.logger, 'info');

			// ACT
			await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Merged'), expect.any(Object));
		});
	});

	describe('executeMerge - segment ordering', () => {
		it('[BL-06] should concatenate segments in segmentPosition order', async () => {
			// ARRANGE
			const segments = [createSegment(0, 2, ' world'), createSegment(0, 0, 'Hello'), createSegment(0, 1, ' beautiful')];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['Hello beautiful world']);
			}
		});

		it('[BL-07] should preserve textPosition order in output', async () => {
			// ARRANGE
			const segments = [createSegment(1, 0, 'Second'), createSegment(0, 0, 'First'), createSegment(2, 0, 'Third')];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['First', 'Second', 'Third']);
			}
		});

		it('[EC-02] should handle segments with same textPosition but different segmentPosition', async () => {
			// ARRANGE
			const segments = [createSegment(0, 1, 'B'), createSegment(0, 0, 'A'), createSegment(0, 3, 'D'), createSegment(0, 2, 'C')];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['ABCD']);
			}
		});

		it('[EC-04] should handle segments arriving in random order', async () => {
			// ARRANGE
			const segments = [
				createSegment(2, 1, 'F'),
				createSegment(0, 0, 'A'),
				createSegment(1, 1, 'D'),
				createSegment(2, 0, 'E'),
				createSegment(0, 1, 'B'),
				createSegment(1, 0, 'C'),
			];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual(['AB', 'CD', 'EF']);
			}
		});
	});

	describe('executeMerge - edge cases', () => {
		it('[EC-01] should handle empty segments array', async () => {
			// ARRANGE
			const segments: ISegment[] = [];
			const request = createMergeRequest(segments);

			// ACT
			const result = await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(result).toBeInstanceOf(MergeResponse);
			if (result instanceof MergeResponse) {
				expect(result.text).toEqual([]);
			}
		});

		it('[EC-05] should not mutate original request.segments array', async () => {
			// ARRANGE
			const segments = [createSegment(2, 0, 'Third'), createSegment(0, 0, 'First'), createSegment(1, 0, 'Second')];
			const request = createMergeRequest(segments);
			const originalOrder = [...segments];

			// ACT
			await supplier.testExecuteMerge(request, signal);

			// ASSERT
			expect(request.segments).toEqual(originalOrder);
			expect(request.segments[0]).toBe(segments[0]); // Same reference
		});
	});

	describe('error handling', () => {
		it('[EH-02] should throw when signal is already aborted', async () => {
			// ARRANGE
			const controller = new AbortController();
			const segments = [createSegment(0, 0, 'test')];
			const request = createMergeRequest(segments);
			controller.abort();

			// ACT & ASSERT
			await expect(supplier.testExecuteMerge(request, controller.signal)).rejects.toThrow(DOMException);
		});
	});
});
