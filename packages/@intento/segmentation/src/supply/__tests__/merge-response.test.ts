import { AgentRequestBase } from 'intento-core';
import type { IDataObject } from 'n8n-workflow';

import type { ISegment } from '../../types/i-segment';
import { MergeRequest } from '../merge-request';
import { MergeResponse } from '../merge-response';

/**
 * Tests for MergeResponse
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

describe('MergeResponse', () => {
	let mockAgentRequest: MockAgentRequest;

	beforeEach(() => {
		mockAgentRequest = new MockAgentRequest();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		describe('business logic', () => {
			it('[BL-01] should create response with text and segments', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Hello world.'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.text).toEqual(text);
				expect(response.segments).toEqual(segments);
			});

			it('[BL-02] should inherit agentRequestId and supplyRequestId', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Hello world.'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.agentRequestId).toBe(mergeRequest.agentRequestId);
				expect(response.supplyRequestId).toBe(mergeRequest.supplyRequestId);
			});

			it('[BL-03] should calculate latency from request timestamp', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Hello world.'];
				const beforeTime = Date.now();

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				const afterTime = Date.now();
				expect(response.latencyMs).toBeGreaterThanOrEqual(0);
				expect(response.latencyMs).toBeLessThanOrEqual(afterTime - beforeTime + 10);
			});

			it('[BL-04] should copy segments from request', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello', textPosition: 0, segmentPosition: 0 },
					{ text: 'world', textPosition: 0, segmentPosition: 1 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Hello world'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.segments).toBe(mergeRequest.segments);
				expect(response.segments).toEqual(segments);
			});

			it('[BL-05] should set text property correctly', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Test output'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.text).toBe(text);
				expect(response.text).toEqual(['Test output']);
			});

			it('[BL-06] should freeze object after construction', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Test'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(Object.isFrozen(response)).toBe(true);
			});

			it('[BL-07] should validate response after setting properties', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Valid', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Valid text'];

				// ACT & ASSERT - should not throw
				expect(() => new MergeResponse(mergeRequest, text)).not.toThrow();
			});

			it('[BL-08] should include segmentsCount in log metadata', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Segment 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Segment 2', textPosition: 0, segmentPosition: 1 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Merged text'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);
				const metadata = response.asLogMetadata();

				// ASSERT
				expect(metadata.segmentsCount).toBe(2);
			});

			it('[BL-09] should include textCount in log metadata', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['First', 'Second'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);
				const metadata = response.asLogMetadata();

				// ASSERT
				expect(metadata.textCount).toBe(2);
			});

			it('[BL-10] should return segments and text in data object', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Data', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Data text'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);
				const dataObject = response.asDataObject();

				// ASSERT
				expect(dataObject.segments).toEqual(segments);
				expect(dataObject.text).toEqual(text);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle single text item with single segment', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Single', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Single item'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.text).toHaveLength(1);
				expect(response.segments).toHaveLength(1);
				expect(response.text[0]).toBe('Single item');
			});

			it('[EC-02] should handle multiple text items correctly', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'First', textPosition: 0, segmentPosition: 0 },
					{ text: 'Second', textPosition: 1, segmentPosition: 0 },
					{ text: 'Third', textPosition: 2, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['First text', 'Second text', 'Third text'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.text).toHaveLength(3);
				expect(response.segments[0].textPosition).toBe(0);
				expect(response.segments[1].textPosition).toBe(1);
				expect(response.segments[2].textPosition).toBe(2);
			});

			it('[EC-03] should handle textPosition=0 (first item)', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'First', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['First item only'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.text).toHaveLength(1);
				expect(response.segments[0].textPosition).toBe(0);
			});

			it('[EC-04] should handle high textPosition values', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Segment', textPosition: 9, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				// textCount = max(9) + 1 = 10, so need 10 text items
				const text: string[] = Array(10).fill('text') as string[]; // ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.text).toHaveLength(10);
				expect(response.segments[0].textPosition).toBe(9);
			});

			it('[EC-05] should handle multiple segments for same textPosition', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Part 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Part 2', textPosition: 0, segmentPosition: 1 },
					{ text: 'Part 3', textPosition: 0, segmentPosition: 2 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Merged parts'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(response.segments).toHaveLength(3);
				expect(response.segments.every((s) => s.textPosition === 0)).toBe(true);
				expect(response.text).toHaveLength(1);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should throw if segments array is empty', () => {
				// ARRANGE
				const segments: ISegment[] = [];
				const text = ['text'];

				// Create a mock request with empty segments
				const mockRequest = {
					agentRequestId: 'test-id',
					supplyRequestId: 'supply-id',
					requestedAt: Date.now(),
					segments,
				} as unknown as MergeRequest;

				// ACT
				const response = new MergeResponse(mockRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"segments" must contain at least one item.');
			});

			it('[EH-02] should throw with correct message for empty segments', () => {
				// ARRANGE
				const segments: ISegment[] = [];
				const text = ['text'];

				// Create a mock request with empty segments
				const mockRequest = {
					agentRequestId: 'test-id',
					supplyRequestId: 'supply-id',
					requestedAt: Date.now(),
					segments,
				} as unknown as MergeRequest;

				// ACT
				const response = new MergeResponse(mockRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"segments" must contain at least one item.');
			});

			it('[EH-03] should throw if text array is empty', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text: string[] = [];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"text" must contain at least one item.');
			});

			it('[EH-04] should throw with correct message for empty text', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text: string[] = [];

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"text" must contain at least one item.');
			});

			it("[EH-05] should throw if text length doesn't match textCount", () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Segment 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Segment 2', textPosition: 1, segmentPosition: 0 },
				];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Only one text']; // Should be 2 items

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow();
			});

			it('[EH-06] should throw with correct message showing expected count', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Segment', textPosition: 2, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['One', 'Two']; // Should be 3 items (textPosition 2 + 1)

				// ACT
				const response = new MergeResponse(mergeRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"text" must contain exactly 3 items.');
			});

			it('[EH-07] should call super.throwIfInvalid for parent validation', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const text = ['Test text'];

				// Create mock request with invalid parent state
				const mockRequest = {
					agentRequestId: '', // Empty ID should trigger parent validation
					supplyRequestId: 'supply-id',
					requestedAt: Date.now(),
					segments,
				} as unknown as MergeRequest;

				// ACT
				const response = new MergeResponse(mockRequest, text);

				// ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"agentRequestId" is required');
			});
		});

		describe('metadata & data', () => {
			it('[MD-01] should return parent metadata fields in asLogMetadata', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Test text'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);
				const metadata = response.asLogMetadata();

				// ASSERT
				expect(metadata.agentRequestId).toBe(response.agentRequestId);
				expect(metadata.supplyRequestId).toBe(response.supplyRequestId);
				expect(metadata.latencyMs).toBe(response.latencyMs);
			});

			it('[MD-02] should return correct IDataObject structure', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Test', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Test text'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);
				const dataObject = response.asDataObject();

				// ASSERT
				expect(dataObject).toHaveProperty('segments');
				expect(dataObject).toHaveProperty('text');
				expect(Object.keys(dataObject)).toHaveLength(2);
			});

			it('[MD-03] should preserve segment references in asDataObject', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Segment', textPosition: 0, segmentPosition: 0 }];
				const mergeRequest = new MergeRequest(mockAgentRequest, segments);
				const text = ['Text'];

				// ACT
				const response = new MergeResponse(mergeRequest, text);
				const dataObject = response.asDataObject();

				// ASSERT
				expect(dataObject.segments).toBe(response.segments);
				expect(dataObject.text).toBe(response.text);
			});
		});
	});
});
