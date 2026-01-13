import { AgentRequestBase } from 'intento-core';
import type { IDataObject } from 'n8n-workflow';

import type { ISegment } from '../../types/i-segment';
import { MergeRequest } from '../merge-request';

/**
 * Tests for MergeRequest
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Test implementations
class MockAgentRequest extends AgentRequestBase {
	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
		};
	}
}

describe('MergeRequest', () => {
	let mockAgentRequest: MockAgentRequest;

	beforeEach(() => {
		mockAgentRequest = new MockAgentRequest();
	});

	describe('constructor', () => {
		describe('business logic', () => {
			it('[BL-01] should create request with segments', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request.segments).toEqual(segments);
				expect(request.segments).toBe(segments);
			});

			it('[BL-02] should inherit agentRequestId from parent request', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request.agentRequestId).toBe(mockAgentRequest.agentRequestId);
			});

			it('[BL-03] should generate unique supplyRequestId', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const request1 = new MergeRequest(mockAgentRequest, segments);
				const request2 = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request1.supplyRequestId).toBeDefined();
				expect(request2.supplyRequestId).toBeDefined();
				expect(request1.supplyRequestId).not.toBe(request2.supplyRequestId);
			});

			it('[BL-04] should capture requestedAt timestamp', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const beforeTime = Date.now();

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				const afterTime = Date.now();
				expect(request.requestedAt).toBeGreaterThanOrEqual(beforeTime);
				expect(request.requestedAt).toBeLessThanOrEqual(afterTime);
			});

			it('[BL-05] should set readonly segments property correctly', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const request = new MergeRequest(mockAgentRequest, segments);

				// ACT & ASSERT
				expect(() => {
					// @ts-expect-error Testing readonly property
					request.segments = [];
				}).toThrow();
			});

			it('[BL-06] should freeze object after construction', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(Object.isFrozen(request)).toBe(true);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle single segment', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Single segment', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request.segments).toHaveLength(1);
				expect(request.segments[0].text).toBe('Single segment');
			});

			it('[EC-02] should handle multiple segments', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Segment 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Segment 2', textPosition: 0, segmentPosition: 1 },
					{ text: 'Segment 3', textPosition: 0, segmentPosition: 2 },
				];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request.segments).toHaveLength(3);
				expect(request.segments).toEqual(segments);
			});

			it('[EC-03] should preserve segment structure', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello', textPosition: 0, segmentPosition: 0 },
					{ text: 'world', textPosition: 0, segmentPosition: 1 },
				];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request.segments[0]).toEqual({
					text: 'Hello',
					textPosition: 0,
					segmentPosition: 0,
				});
				expect(request.segments[1]).toEqual({
					text: 'world',
					textPosition: 0,
					segmentPosition: 1,
				});
			});

			it('[EC-04] should handle segments with different textPositions', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
					{ text: 'Text 3', textPosition: 2, segmentPosition: 0 },
				];

				// ACT
				const request = new MergeRequest(mockAgentRequest, segments);

				// ASSERT
				expect(request.segments).toHaveLength(3);
				expect(request.segments[0].textPosition).toBe(0);
				expect(request.segments[1].textPosition).toBe(1);
				expect(request.segments[2].textPosition).toBe(2);
			});
		});
	});

	describe('throwIfInvalid', () => {
		describe('error handling', () => {
			it('[EH-01] should throw if segments array is empty', () => {
				// ARRANGE
				const emptySegments: ISegment[] = [];
				const request = new MergeRequest(mockAgentRequest, emptySegments);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow('"segments" must contain at least one item.');
			});

			it('[EH-02] should throw with correct message for empty segments', () => {
				// ARRANGE
				const request = new MergeRequest(mockAgentRequest, []);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow(Error);
				expect(() => request.throwIfInvalid()).toThrow(/segments/);
				expect(() => request.throwIfInvalid()).toThrow(/at least one item/);
			});

			it('[EH-03] should call super.throwIfInvalid for parent validation', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const request = new MergeRequest(mockAgentRequest, segments);

				// Spy on parent's throwIfInvalid to verify it's called
				const parentThrowIfInvalid = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(request)), 'throwIfInvalid');

				// ACT
				request.throwIfInvalid();

				// ASSERT
				expect(parentThrowIfInvalid).toHaveBeenCalled();

				// Cleanup
				parentThrowIfInvalid.mockRestore();
			});

			it('[EH-04] should allow construction without validation', () => {
				// ARRANGE
				const emptySegments: ISegment[] = [];

				// ACT
				const request = new MergeRequest(mockAgentRequest, emptySegments);

				// ASSERT - should not throw during construction
				expect(request).toBeDefined();
				expect(request.segments).toEqual(emptySegments);
			});
		});
	});

	describe('asLogMetadata', () => {
		describe('metadata & data', () => {
			it('[MD-01] should return log metadata with segmentsCount', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Segment 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Segment 2', textPosition: 0, segmentPosition: 1 },
					{ text: 'Segment 3', textPosition: 0, segmentPosition: 2 },
				];
				const request = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const metadata = request.asLogMetadata();

				// ASSERT
				expect(metadata.segmentsCount).toBe(3);
			});

			it('[MD-02] should include parent metadata in log output', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const request = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const metadata = request.asLogMetadata();

				// ASSERT
				expect(metadata.agentRequestId).toBe(mockAgentRequest.agentRequestId);
				expect(metadata.supplyRequestId).toBe(request.supplyRequestId);
				expect(metadata.requestedAt).toBe(request.requestedAt);
			});
		});
	});

	describe('asDataObject', () => {
		describe('metadata & data', () => {
			it('[MD-03] should return data object with segments array', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Segment 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Segment 2', textPosition: 0, segmentPosition: 1 },
				];
				const request = new MergeRequest(mockAgentRequest, segments);

				// ACT
				const data = request.asDataObject();

				// ASSERT
				expect(data.segments).toEqual(segments);
			});
		});
	});
});
