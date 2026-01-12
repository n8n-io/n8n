import { mock } from 'jest-mock-extended';

import type { ISegment } from '../../types/i-segment';
import type { SplitRequest } from '../split-request';
import { SplitResponse } from '../split-response';

/**
 * Tests for SplitResponse
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

type WritableSplitRequest = {
	-readonly [K in keyof SplitRequest]: SplitRequest[K];
};

describe('SplitResponse', () => {
	const createSegment = (textPos: number, segmentPos: number, text: string): ISegment => ({
		textPosition: textPos,
		segmentPosition: segmentPos,
		text,
	});

	const createMockRequest = (text: string | string[]): SplitRequest => {
		const mockRequest = mock<SplitRequest>() as unknown as WritableSplitRequest;
		mockRequest.text = text;
		return mockRequest as unknown as SplitRequest;
	};

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should create response with single text string', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Hello world');
			const segments = [createSegment(0, 0, 'Hello world')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(response.text).toBe('Hello world');
			expect(response.segments).toEqual(segments);
			expect(response.segments.length).toBe(1);
		});

		it('[BL-02] should create response with text array', () => {
			// ARRANGE
			const mockRequest = createMockRequest(['First text', 'Second text']);
			const segments = [createSegment(0, 0, 'First text'), createSegment(1, 0, 'Second text')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(response.text).toEqual(['First text', 'Second text']);
			expect(response.segments).toEqual(segments);
			expect(response.segments.length).toBe(2);
		});

		it('[BL-03] should freeze response object after construction', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Test');
			const segments = [createSegment(0, 0, 'Test')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(Object.isFrozen(response)).toBe(true);
		});

		it('[BL-04] should inherit from SupplyResponseBase', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Test');
			const segments = [createSegment(0, 0, 'Test')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(response.asLogMetadata).toBeDefined();
			expect(response.asDataObject).toBeDefined();
			expect(typeof response.asLogMetadata).toBe('function');
			expect(typeof response.asDataObject).toBe('function');
		});

		it('[BL-05] should include segments and text count in log metadata', () => {
			// ARRANGE
			const mockRequest = createMockRequest(['Text 1', 'Text 2', 'Text 3']);
			const segments = [createSegment(0, 0, 'Text 1'), createSegment(1, 0, 'Text 2'), createSegment(2, 0, 'Text 3')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.segmentsCount).toBe(3);
			expect(metadata.textCount).toBe(3);
		});

		it('[BL-06] should include segments and text in data object', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Hello');
			const segments = [createSegment(0, 0, 'Hello')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject.text).toBe('Hello');
			expect(dataObject.segments).toEqual(segments);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty string in text array', () => {
			// ARRANGE
			const mockRequest = createMockRequest(['', 'Non-empty']);
			const segments = [createSegment(0, 0, ''), createSegment(1, 0, 'Non-empty')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(response.text).toEqual(['', 'Non-empty']);
			expect(response.segments).toEqual(segments);
		});

		it('[EC-02] should handle single segment for single text', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Short text');
			const segments = [createSegment(0, 0, 'Short text')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(response.segments.length).toBe(1);
			expect(response.text).toBe('Short text');
		});

		it('[EC-03] should handle multiple segments per text item', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Long text with multiple sentences');
			const segments = [createSegment(0, 0, 'Long text'), createSegment(0, 1, 'with multiple sentences')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);

			// ASSERT
			expect(response.segments.length).toBe(2);
			expect(response.segments[0].textPosition).toBe(0);
			expect(response.segments[1].textPosition).toBe(0);
		});

		it('[EC-04] should calculate text count as 1 for string type', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Single string');
			const segments = [createSegment(0, 0, 'Single string')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.textCount).toBe(1);
		});

		it('[EC-05] should calculate text count from array length', () => {
			// ARRANGE
			const mockRequest = createMockRequest(['One', 'Two', 'Three', 'Four']);
			const segments = [createSegment(0, 0, 'One'), createSegment(1, 0, 'Two'), createSegment(2, 0, 'Three'), createSegment(3, 0, 'Four')];

			// ACT
			const response = new SplitResponse(mockRequest, segments);
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.textCount).toBe(4);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw if segments empty for single text', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Some text');
			const segments: ISegment[] = [];

			// ACT & ASSERT
			expect(() => new SplitResponse(mockRequest, segments)).toThrow(
				'Segments response must contain at least 1 segment(s) - one per input text item.',
			);
		});

		it('[EH-02] should throw if segments fewer than text array items', () => {
			// ARRANGE
			const mockRequest = createMockRequest(['Text 1', 'Text 2', 'Text 3']);
			const segments = [createSegment(0, 0, 'Text 1'), createSegment(1, 0, 'Text 2')];

			// ACT & ASSERT
			expect(() => new SplitResponse(mockRequest, segments)).toThrow(
				'Segments response must contain at least 3 segment(s) - one per input text item.',
			);
		});

		it('[EH-03] should include expected count in error message', () => {
			// ARRANGE
			const mockRequest = createMockRequest(['A', 'B', 'C', 'D', 'E']);
			const segments: ISegment[] = [];

			// ACT & ASSERT
			expect(() => new SplitResponse(mockRequest, segments)).toThrow('at least 5 segment(s)');
		});

		it('[EH-04] should throw before freezing object', () => {
			// ARRANGE
			const mockRequest = createMockRequest('Test');
			const segments: ISegment[] = [];

			// ACT & ASSERT
			let response: SplitResponse | undefined;
			try {
				response = new SplitResponse(mockRequest, segments);
			} catch (error) {
				// Expected error
			}

			// If response was created, it would be frozen
			// But error should prevent object creation entirely
			expect(response).toBeUndefined();
		});
	});
});
