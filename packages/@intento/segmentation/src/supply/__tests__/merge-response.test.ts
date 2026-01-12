import { mock } from 'jest-mock-extended';

import type { ISegment } from '../../types/i-segment';
import type { MergeRequest } from '../merge-request';
import { MergeResponse } from '../merge-response';

/**
 * Tests for MergeResponse
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

// Utility type to make readonly properties writable for testing
type WritableMergeRequest = { -readonly [K in keyof MergeRequest]: MergeRequest[K] };

const createMockRequest = (segments: ISegment[]): MergeRequest => {
	const mockRequest = mock<MergeRequest>() as unknown as WritableMergeRequest;
	mockRequest.segments = segments;
	return mockRequest as MergeRequest;
};

const createSegment = (textPosition: number, segmentPosition: number, text: string): ISegment => ({
	textPosition,
	segmentPosition,
	text,
});

describe('MergeResponse', () => {
	describe('business logic', () => {
		it('[BL-01] should create response with merged text array', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Hello'), createSegment(1, 0, 'World')];
			const text = ['Hello', 'World'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.text).toBe(text);
			expect(response.segments).toBe(segments);
		});

		it('[BL-02] should create response with single text item', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Single text')];
			const text = ['Single text'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.text).toEqual(['Single text']);
			expect(response.segments).toHaveLength(1);
		});

		it('[BL-03] should create response with multiple text items', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'First'), createSegment(1, 0, 'Second'), createSegment(2, 0, 'Third')];
			const text = ['First', 'Second', 'Third'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.text).toHaveLength(3);
			expect(response.segments).toHaveLength(3);
		});

		it('[BL-04] should freeze response object after construction', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];
			const text = ['Test'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(Object.isFrozen(response)).toBe(true);
		});

		it('[BL-05] should inherit from SupplyResponseBase', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];
			const text = ['Test'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.requestId).toBeDefined();
			expect(response.latencyMs).toBeDefined();
			expect(typeof response.latencyMs).toBe('number');
		});

		it('[BL-06] should include segments and text count in log metadata', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'First'), createSegment(0, 1, ' segment'), createSegment(1, 0, 'Second')];
			const text = ['First segment', 'Second'];
			const request = createMockRequest(segments);
			const response = new MergeResponse(request, text);

			// ACT
			const metadata = response.asLogMetadata();

			// ASSERT
			expect(metadata.segmentsCount).toBe(3);
			expect(metadata.textCount).toBe(2);
			expect(metadata.requestId).toBe(response.requestId);
			expect(metadata.latencyMs).toBe(response.latencyMs);
		});

		it('[BL-07] should include segments and text in data object', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];
			const text = ['Test'];
			const request = createMockRequest(segments);
			const response = new MergeResponse(request, text);

			// ACT
			const dataObject = response.asDataObject();

			// ASSERT
			expect(dataObject.segments).toBe(segments);
			expect(dataObject.text).toBe(text);
			expect(dataObject.requestId).toBe(response.requestId);
			expect(dataObject.latencyMs).toBe(response.latencyMs);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty segments and empty text', () => {
			// ARRANGE
			const segments: ISegment[] = [];
			const text: string[] = [];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.segments).toHaveLength(0);
			expect(response.text).toHaveLength(0);
		});

		it('[EC-02] should handle single segment (textPosition 0)', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Only one')];
			const text = ['Only one'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.text).toHaveLength(1);
			expect(response.segments[0].textPosition).toBe(0);
		});

		it('[EC-03] should handle segments with gaps in textPosition', () => {
			// ARRANGE
			// textPosition has gap: [0, 2] - expects 3 texts (positions 0, 1, 2)
			const segments = [createSegment(0, 0, 'First'), createSegment(2, 0, 'Third')];
			const text = ['First', 'Missing', 'Third'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.text).toHaveLength(3);
		});

		it('[EC-04] should handle multiple segments with same textPosition', () => {
			// ARRANGE
			// Multiple segments for textPosition 0, should expect 1 text
			const segments = [createSegment(0, 0, 'Hello'), createSegment(0, 1, ' '), createSegment(0, 2, 'world')];
			const text = ['Hello world'];
			const request = createMockRequest(segments);

			// ACT
			const response = new MergeResponse(request, text);

			// ASSERT
			expect(response.text).toHaveLength(1);
			expect(response.segments).toHaveLength(3);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw if text length less than expected', () => {
			// ARRANGE
			// textPosition max is 2, expects 3 texts, but only 2 provided
			const segments = [createSegment(0, 0, 'First'), createSegment(2, 0, 'Third')];
			const text = ['First', 'Second']; // Missing third item
			const request = createMockRequest(segments);

			// ACT & ASSERT
			expect(() => new MergeResponse(request, text)).toThrow('Text length 2 does not match expected count 3 - one per input text item');
		});

		it('[EH-02] should throw if text length more than expected', () => {
			// ARRANGE
			// textPosition max is 1, expects 2 texts, but 3 provided
			const segments = [createSegment(0, 0, 'First'), createSegment(1, 0, 'Second')];
			const text = ['First', 'Second', 'Extra'];
			const request = createMockRequest(segments);

			// ACT & ASSERT
			expect(() => new MergeResponse(request, text)).toThrow('Text length 3 does not match expected count 2 - one per input text item');
		});

		it('[EH-03] should throw if non-empty segments but empty text', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];
			const text: string[] = [];
			const request = createMockRequest(segments);

			// ACT & ASSERT
			expect(() => new MergeResponse(request, text)).toThrow('Text length 0 does not match expected count 1 - one per input text item');
		});

		it('[EH-04] should include expected count in error message', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'A'), createSegment(1, 0, 'B')];
			const text = ['Only one'];
			const request = createMockRequest(segments);

			// ACT & ASSERT
			expect(() => new MergeResponse(request, text)).toThrow(/expected count 2/);
		});

		it('[EH-05] should throw before freezing object', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];
			const text: string[] = []; // Invalid: missing text
			const request = createMockRequest(segments);
			let response: MergeResponse | undefined;

			// ACT & ASSERT
			expect(() => {
				response = new MergeResponse(request, text);
			}).toThrow();

			// Verify object was never created/frozen
			expect(response).toBeUndefined();
		});
	});
});
