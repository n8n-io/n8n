import { AgentRequestBase } from 'intento-core';
import type { IDataObject } from 'n8n-workflow';

import type { ISegment } from '../../types/i-segment';
import { SplitRequest } from '../split-request';
import { SplitResponse } from '../split-response';

/**
 * Tests for SplitResponse
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

describe('SplitResponse', () => {
	let mockAgentRequest: MockAgentRequest;
	let splitRequest: SplitRequest;

	beforeEach(() => {
		mockAgentRequest = new MockAgentRequest();
		splitRequest = new SplitRequest(mockAgentRequest, ['Hello world.'], 5000);
	});

	describe('constructor', () => {
		describe('business logic', () => {
			it('[BL-01] should create response with text from request', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.text).toEqual(['Hello world.']);
				expect(response.text).toBe(splitRequest.text);
			});

			it('[BL-02] should create response with provided segments', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 },
					{ text: 'How are you?', textPosition: 0, segmentPosition: 1 },
				];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.segments).toEqual(segments);
				expect(response.segments).toBe(segments);
			});

			it('[BL-03] should set readonly properties correctly', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const response = new SplitResponse(splitRequest, segments);

				// ACT & ASSERT
				expect(() => {
					// @ts-expect-error Testing readonly property
					response.text = [];
				}).toThrow();
				expect(() => {
					// @ts-expect-error Testing readonly property
					response.segments = [];
				}).toThrow();
			});

			it('[BL-04] should freeze response object', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(Object.isFrozen(response)).toBe(true);
			});

			it('[BL-05] should copy agentRequestId from request via super', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.agentRequestId).toBe(mockAgentRequest.agentRequestId);
			});

			it('[BL-06] should copy supplyRequestId from request via super', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.supplyRequestId).toBe(splitRequest.supplyRequestId);
			});

			it('[BL-07] should calculate latencyMs from request via super', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.latencyMs).toBeGreaterThanOrEqual(0);
				expect(typeof response.latencyMs).toBe('number');
			});
		});
	});

	describe('throwIfInvalid', () => {
		describe('edge cases', () => {
			it('[EC-01] should handle equal segments and text count (minimum valid)', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, ['Text 1', 'Text 2'], 5000);
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
				];
				const response = new SplitResponse(request, segments);

				// ACT & ASSERT
				expect(() => response.throwIfInvalid()).not.toThrow();
			});

			it('[EC-02] should handle more segments than text items', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 },
					{ text: 'How are you?', textPosition: 0, segmentPosition: 1 },
					{ text: 'Good morning.', textPosition: 0, segmentPosition: 2 },
				];
				const response = new SplitResponse(splitRequest, segments);

				// ACT & ASSERT
				expect(() => response.throwIfInvalid()).not.toThrow();
			});

			it('[EC-03] should handle single text item with single segment', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.text).toHaveLength(1);
				expect(response.segments).toHaveLength(1);
				expect(() => response.throwIfInvalid()).not.toThrow();
			});

			it('[EC-04] should handle single text item with multiple segments', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 },
					{ text: 'How are you?', textPosition: 0, segmentPosition: 1 },
				];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.text).toHaveLength(1);
				expect(response.segments).toHaveLength(2);
				expect(() => response.throwIfInvalid()).not.toThrow();
			});

			it('[EC-05] should handle multiple text items with segments', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, ['Text 1', 'Text 2', 'Text 3'], 5000);
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
					{ text: 'Text 3 part 1', textPosition: 2, segmentPosition: 0 },
					{ text: 'Text 3 part 2', textPosition: 2, segmentPosition: 1 },
				];

				// ACT
				const response = new SplitResponse(request, segments);

				// ASSERT
				expect(response.text).toHaveLength(3);
				expect(response.segments).toHaveLength(4);
				expect(() => response.throwIfInvalid()).not.toThrow();
			});

			it('[EC-06] should preserve segment positions from split operation', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'First sentence.', textPosition: 0, segmentPosition: 0 },
					{ text: 'Second sentence.', textPosition: 0, segmentPosition: 1 },
				];

				// ACT
				const response = new SplitResponse(splitRequest, segments);

				// ASSERT
				expect(response.segments[0].textPosition).toBe(0);
				expect(response.segments[0].segmentPosition).toBe(0);
				expect(response.segments[1].textPosition).toBe(0);
				expect(response.segments[1].segmentPosition).toBe(1);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should throw if segments.length < text.length', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, ['Text 1', 'Text 2', 'Text 3'], 5000);
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
				];
				const response = new SplitResponse(request, segments);

				// ACT & ASSERT
				expect(() => response.throwIfInvalid()).toThrow();
			});

			it('[EH-02] should throw with descriptive error message including expected count', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, ['Text 1', 'Text 2'], 5000);
				const segments: ISegment[] = [{ text: 'Text 1', textPosition: 0, segmentPosition: 0 }];
				const response = new SplitResponse(request, segments);

				// ACT & ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"segments" must contain at least 2 segment(s).');
			});

			it('[EH-03] should throw for empty segments with non-empty text', () => {
				// ARRANGE
				const segments: ISegment[] = [];
				const response = new SplitResponse(splitRequest, segments);

				// ACT & ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"segments" must contain at least 1 segment(s).');
			});

			it('[EH-04] should call super.throwIfInvalid for parent validation', () => {
				// ARRANGE - Create request with invalid supplyRequestId to trigger parent validation
				const invalidRequest = {
					...splitRequest,
					supplyRequestId: '', // Invalid - will trigger parent validation
					throwIfInvalid() {
						if (!this.supplyRequestId) throw new Error('"supplyRequestId" must not be empty');
					},
				};
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const response = new SplitResponse(invalidRequest as unknown as SplitRequest, segments); // ACT & ASSERT
				expect(() => response.throwIfInvalid()).toThrow('"supplyRequestId"');
			});

			it('[EH-05] should allow construction without validation', () => {
				// ARRANGE
				const segments: ISegment[] = []; // Invalid - fewer segments than text items

				// ACT & ASSERT - Should not throw during construction
				expect(() => new SplitResponse(splitRequest, segments)).not.toThrow();
			});
		});
	});

	describe('asLogMetadata', () => {
		describe('metadata & data', () => {
			it('[MD-01] should return log metadata with segmentsCount', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 },
					{ text: 'How are you?', textPosition: 0, segmentPosition: 1 },
				];
				const response = new SplitResponse(splitRequest, segments);

				// ACT
				const metadata = response.asLogMetadata();

				// ASSERT
				expect(metadata.segmentsCount).toBe(2);
			});

			it('[MD-02] should return log metadata with textCount', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, ['Text 1', 'Text 2', 'Text 3'], 5000);
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
					{ text: 'Text 3', textPosition: 2, segmentPosition: 0 },
				];
				const response = new SplitResponse(request, segments);

				// ACT
				const metadata = response.asLogMetadata();

				// ASSERT
				expect(metadata.textCount).toBe(3);
			});

			it('[MD-03] should include parent metadata in log output', () => {
				// ARRANGE
				const segments: ISegment[] = [{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 }];
				const response = new SplitResponse(splitRequest, segments);

				// ACT
				const metadata = response.asLogMetadata();

				// ASSERT
				expect(metadata).toHaveProperty('agentRequestId');
				expect(metadata).toHaveProperty('supplyRequestId');
				expect(metadata).toHaveProperty('latencyMs');
				expect(metadata.agentRequestId).toBe(mockAgentRequest.agentRequestId);
			});
		});
	});

	describe('asDataObject', () => {
		describe('metadata & data', () => {
			it('[MD-04] should return data object with text array', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, ['Text 1', 'Text 2'], 5000);
				const segments: ISegment[] = [
					{ text: 'Text 1', textPosition: 0, segmentPosition: 0 },
					{ text: 'Text 2', textPosition: 1, segmentPosition: 0 },
				];
				const response = new SplitResponse(request, segments);

				// ACT
				const data = response.asDataObject();

				// ASSERT
				expect(data.text).toEqual(['Text 1', 'Text 2']);
			});

			it('[MD-05] should return data object with segments array', () => {
				// ARRANGE
				const segments: ISegment[] = [
					{ text: 'Hello world.', textPosition: 0, segmentPosition: 0 },
					{ text: 'How are you?', textPosition: 0, segmentPosition: 1 },
				];
				const response = new SplitResponse(splitRequest, segments);

				// ACT
				const data = response.asDataObject();

				// ASSERT
				expect(data.segments).toEqual(segments);
				expect(data.segments).toHaveLength(2);
			});
		});
	});
});
