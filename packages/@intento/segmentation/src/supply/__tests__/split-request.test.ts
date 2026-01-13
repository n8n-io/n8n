import { AgentRequestBase } from 'intento-core';
import type { IDataObject } from 'n8n-workflow';

import { SplitRequest } from '../split-request';

/**
 * Tests for SplitRequest
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

describe('SplitRequest', () => {
	let mockAgentRequest: MockAgentRequest;

	beforeEach(() => {
		mockAgentRequest = new MockAgentRequest();
	});

	describe('constructor', () => {
		describe('business logic', () => {
			it('[BL-01] should create request with all parameters', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const segmentLimit = 5000;
				const from = 'en';

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, segmentLimit, from);

				// ASSERT
				expect(request.text).toEqual(text);
				expect(request.text).toBe(text);
				expect(request.segmentLimit).toBe(segmentLimit);
				expect(request.from).toBe(from);
			});

			it('[BL-02] should create request without optional from parameter', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const segmentLimit = 5000;

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, segmentLimit);

				// ASSERT
				expect(request.text).toEqual(text);
				expect(request.segmentLimit).toBe(segmentLimit);
				expect(request.from).toBeUndefined();
			});

			it('[BL-03] should inherit agentRequestId from parent request', () => {
				// ARRANGE
				const text = ['Hello world.'];

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				expect(request.agentRequestId).toBe(mockAgentRequest.agentRequestId);
			});

			it('[BL-04] should generate unique supplyRequestId', () => {
				// ARRANGE
				const text = ['Hello world.'];

				// ACT
				const request1 = new SplitRequest(mockAgentRequest, text, 5000);
				const request2 = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				expect(request1.supplyRequestId).toBeDefined();
				expect(request2.supplyRequestId).toBeDefined();
				expect(request1.supplyRequestId).not.toBe(request2.supplyRequestId);
			});

			it('[BL-05] should capture requestedAt timestamp', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const beforeTime = Date.now();

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				const afterTime = Date.now();
				expect(request.requestedAt).toBeGreaterThanOrEqual(beforeTime);
				expect(request.requestedAt).toBeLessThanOrEqual(afterTime);
			});

			it('[BL-06] should set readonly properties correctly', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const segmentLimit = 5000;
				const from = 'en';
				const request = new SplitRequest(mockAgentRequest, text, segmentLimit, from);

				// ACT & ASSERT
				expect(() => {
					// @ts-expect-error Testing readonly property
					request.text = [];
				}).toThrow();
				expect(() => {
					// @ts-expect-error Testing readonly property
					request.segmentLimit = 1000;
				}).toThrow();
				expect(() => {
					// @ts-expect-error Testing readonly property
					request.from = 'ru';
				}).toThrow();
			});

			it('[BL-07] should freeze object after construction', () => {
				// ARRANGE
				const text = ['Hello world.'];

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				expect(Object.isFrozen(request)).toBe(true);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle single text item', () => {
				// ARRANGE
				const text = ['Single item'];

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				expect(request.text).toHaveLength(1);
				expect(request.text[0]).toBe('Single item');
			});

			it('[EC-02] should handle multiple text items', () => {
				// ARRANGE
				const text = ['Text 1', 'Text 2', 'Text 3'];

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				expect(request.text).toHaveLength(3);
				expect(request.text).toEqual(text);
			});

			it('[EC-03] should handle segmentLimit = 1', () => {
				// ARRANGE
				const text = ['Hello world.'];

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, 1);

				// ASSERT
				expect(request.segmentLimit).toBe(1);
			});

			it('[EC-04] should handle large segmentLimit', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const largeLimit = 10000;

				// ACT
				const request = new SplitRequest(mockAgentRequest, text, largeLimit);

				// ASSERT
				expect(request.segmentLimit).toBe(largeLimit);
			});

			it('[EC-05] should handle from parameter with language code', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const languageCodes = ['en', 'ru', 'de', 'fr', 'es'];

				// ACT & ASSERT
				for (const code of languageCodes) {
					const request = new SplitRequest(mockAgentRequest, text, 5000, code);
					expect(request.from).toBe(code);
				}
			});

			it('[EC-06] should handle undefined from parameter explicitly', () => {
				// ARRANGE
				const text = ['Hello world.'];

				// ACT
				const request1 = new SplitRequest(mockAgentRequest, text, 5000, undefined);
				const request2 = new SplitRequest(mockAgentRequest, text, 5000);

				// ASSERT
				expect(request1.from).toBeUndefined();
				expect(request2.from).toBeUndefined();
			});
		});
	});

	describe('throwIfInvalid', () => {
		describe('error handling', () => {
			it('[EH-01] should throw if text array is empty', () => {
				// ARRANGE
				const emptyText: string[] = [];
				const request = new SplitRequest(mockAgentRequest, emptyText, 5000);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow('"text" must contain at least one item.');
			});

			it('[EH-02] should throw with correct message for empty text', () => {
				// ARRANGE
				const request = new SplitRequest(mockAgentRequest, [], 5000);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow(Error);
				expect(() => request.throwIfInvalid()).toThrow(/text/);
				expect(() => request.throwIfInvalid()).toThrow(/at least one item/);
			});

			it('[EH-03] should throw if segmentLimit is zero', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const request = new SplitRequest(mockAgentRequest, text, 0);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow('"segmentLimit" must be a positive number.');
			});

			it('[EH-04] should throw if segmentLimit is negative', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const request = new SplitRequest(mockAgentRequest, text, -1);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow('"segmentLimit" must be a positive number.');
			});

			it('[EH-05] should throw with correct message for invalid segmentLimit', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const request = new SplitRequest(mockAgentRequest, text, -5);

				// ACT & ASSERT
				expect(() => request.throwIfInvalid()).toThrow(Error);
				expect(() => request.throwIfInvalid()).toThrow(/segmentLimit/);
				expect(() => request.throwIfInvalid()).toThrow(/positive number/);
			});

			it('[EH-06] should call super.throwIfInvalid for parent validation', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// Spy on parent's throwIfInvalid to verify it's called
				const parentThrowIfInvalid = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(request)), 'throwIfInvalid');

				// ACT
				request.throwIfInvalid();

				// ASSERT
				expect(parentThrowIfInvalid).toHaveBeenCalled();

				// Cleanup
				parentThrowIfInvalid.mockRestore();
			});

			it('[EH-07] should allow construction without validation', () => {
				// ARRANGE
				const emptyText: string[] = [];

				// ACT
				const request = new SplitRequest(mockAgentRequest, emptyText, -1);

				// ASSERT - should not throw during construction
				expect(request).toBeDefined();
				expect(request.text).toEqual(emptyText);
				expect(request.segmentLimit).toBe(-1);
			});
		});
	});

	describe('asLogMetadata', () => {
		describe('metadata & data', () => {
			it('[MD-01] should return log metadata with textCount', () => {
				// ARRANGE
				const text = ['Text 1', 'Text 2', 'Text 3'];
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ACT
				const metadata = request.asLogMetadata();

				// ASSERT
				expect(metadata.textCount).toBe(3);
			});

			it('[MD-02] should return log metadata with segmentLimit', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const segmentLimit = 5000;
				const request = new SplitRequest(mockAgentRequest, text, segmentLimit);

				// ACT
				const metadata = request.asLogMetadata();

				// ASSERT
				expect(metadata.segmentLimit).toBe(segmentLimit);
			});

			it('[MD-03] should return log metadata with from when provided', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const from = 'en';
				const request = new SplitRequest(mockAgentRequest, text, 5000, from);

				// ACT
				const metadata = request.asLogMetadata();

				// ASSERT
				expect(metadata.from).toBe(from);
			});

			it('[MD-04] should include parent metadata in log output', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const request = new SplitRequest(mockAgentRequest, text, 5000);

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
			it('[MD-05] should return data object with text array', () => {
				// ARRANGE
				const text = ['Text 1', 'Text 2'];
				const request = new SplitRequest(mockAgentRequest, text, 5000);

				// ACT
				const data = request.asDataObject();

				// ASSERT
				expect(data.text).toEqual(text);
			});

			it('[MD-06] should return data object with segmentLimit', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const segmentLimit = 5000;
				const request = new SplitRequest(mockAgentRequest, text, segmentLimit);

				// ACT
				const data = request.asDataObject();

				// ASSERT
				expect(data.segmentLimit).toBe(segmentLimit);
			});

			it('[MD-07] should return data object with from when provided', () => {
				// ARRANGE
				const text = ['Hello world.'];
				const from = 'en';
				const request = new SplitRequest(mockAgentRequest, text, 5000, from);

				// ACT
				const data = request.asDataObject();

				// ASSERT
				expect(data.from).toBe(from);
			});
		});
	});
});
