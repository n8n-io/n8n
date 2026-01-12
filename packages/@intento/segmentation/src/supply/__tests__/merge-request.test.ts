import type { ISegment } from '../../types/i-segment';
import { MergeRequest } from '../merge-request';

/**
 * Tests for MergeRequest
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

const createSegment = (textPosition: number, segmentPosition: number, text: string): ISegment => ({
	textPosition,
	segmentPosition,
	text,
});

describe('MergeRequest', () => {
	describe('business logic', () => {
		it('[BL-01] should create request with segments array', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Hello'), createSegment(1, 0, 'World')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toBe(segments);
		});

		it('[BL-02] should create request with single segment', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Single segment')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toHaveLength(1);
			expect(request.segments[0].text).toBe('Single segment');
		});

		it('[BL-03] should create request with multiple segments', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'First'), createSegment(1, 0, 'Second'), createSegment(2, 0, 'Third')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toHaveLength(3);
		});

		it('[BL-04] should freeze request object after construction', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(Object.isFrozen(request)).toBe(true);
		});

		it('[BL-05] should inherit from SupplyRequestBase', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.requestId).toBeDefined();
			expect(typeof request.requestId).toBe('string');
			expect(request.requestedAt).toBeDefined();
			expect(typeof request.requestedAt).toBe('number');
		});

		it('[BL-06] should include segments count in log metadata', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'First'), createSegment(0, 1, 'segment'), createSegment(1, 0, 'Second')];
			const request = new MergeRequest(segments);

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata.segmentsCount).toBe(3);
			expect(metadata.requestId).toBe(request.requestId);
			expect(metadata.requestedAt).toBe(request.requestedAt);
		});

		it('[BL-07] should include segments in data object', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Test')];
			const request = new MergeRequest(segments);

			// ACT
			const dataObject = request.asDataObject();

			// ASSERT
			expect(dataObject.segments).toBe(segments);
			expect(dataObject.requestId).toBe(request.requestId);
			expect(dataObject.requestedAt).toBe(request.requestedAt);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty segments array', () => {
			// ARRANGE
			const segments: ISegment[] = [];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toHaveLength(0);
			expect(request.asLogMetadata().segmentsCount).toBe(0);
		});

		it('[EC-02] should handle segments with various textPositions', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Zero'), createSegment(1, 0, 'One'), createSegment(2, 0, 'Two'), createSegment(5, 0, 'Five')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toHaveLength(4);
			expect(request.segments[0].textPosition).toBe(0);
			expect(request.segments[3].textPosition).toBe(5);
		});

		it('[EC-03] should handle segments with same textPosition', () => {
			// ARRANGE
			const segments = [createSegment(0, 0, 'Part '), createSegment(0, 1, 'one'), createSegment(0, 2, '!')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toHaveLength(3);
			expect(request.segments.every((s) => s.textPosition === 0)).toBe(true);
		});

		it('[EC-04] should preserve segment order', () => {
			// ARRANGE
			const segments = [createSegment(2, 0, 'Third'), createSegment(0, 0, 'First'), createSegment(1, 0, 'Second')];

			// ACT
			const request = new MergeRequest(segments);

			// ASSERT
			expect(request.segments).toBe(segments);
			expect(request.segments[0].textPosition).toBe(2);
			expect(request.segments[1].textPosition).toBe(0);
		});
	});
});
