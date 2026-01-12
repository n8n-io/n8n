import type { Text } from 'intento-core';

import { SplitRequest } from '../split-request';

/**
 * Tests for SplitRequest
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

describe('SplitRequest', () => {
	describe('business logic', () => {
		it('[BL-01] should create request with single text string', () => {
			// ARRANGE
			const text: Text = 'Hello world';
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.text).toBe(text);
			expect(request.segmentLimit).toBe(segmentLimit);
			expect(request.from).toBeUndefined();
		});

		it('[BL-02] should create request with text array', () => {
			// ARRANGE
			const text: Text = ['First text', 'Second text'];
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.text).toBe(text);
			expect(request.segmentLimit).toBe(segmentLimit);
			expect(request.from).toBeUndefined();
		});

		it('[BL-03] should create request with all parameters including from', () => {
			// ARRANGE
			const text: Text = 'Test text';
			const segmentLimit = 100;
			const from = 'en';

			// ACT
			const request = new SplitRequest(text, segmentLimit, from);

			// ASSERT
			expect(request.text).toBe(text);
			expect(request.segmentLimit).toBe(segmentLimit);
			expect(request.from).toBe(from);
		});

		it('[BL-04] should create request without from parameter', () => {
			// ARRANGE
			const text: Text = 'Test text';
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.from).toBeUndefined();
		});

		it('[BL-05] should freeze request object after construction', () => {
			// ARRANGE
			const text: Text = 'Test text';
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(Object.isFrozen(request)).toBe(true);
		});

		it('[BL-06] should inherit from SupplyRequestBase', () => {
			// ARRANGE
			const text: Text = 'Test text';
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.requestId).toBeDefined();
			expect(typeof request.requestId).toBe('string');
			expect(request.requestedAt).toBeDefined();
			expect(typeof request.requestedAt).toBe('number');
		});

		it('[BL-07] should include text count in log metadata', () => {
			// ARRANGE
			const text: Text = ['First', 'Second', 'Third'];
			const segmentLimit = 100;
			const request = new SplitRequest(text, segmentLimit);

			// ACT
			const metadata = request.asLogMetadata();

			// ASSERT
			expect(metadata.textCount).toBe(3);
			expect(metadata.segmentLimit).toBe(100);
			expect(metadata.requestId).toBe(request.requestId);
			expect(metadata.requestedAt).toBe(request.requestedAt);
		});

		it('[BL-08] should include all fields in data object', () => {
			// ARRANGE
			const text: Text = 'Test text';
			const segmentLimit = 100;
			const from = 'en';
			const request = new SplitRequest(text, segmentLimit, from);

			// ACT
			const dataObject = request.asDataObject();

			// ASSERT
			expect(dataObject.text).toBe(text);
			expect(dataObject.segmentLimit).toBe(segmentLimit);
			expect(dataObject.from).toBe(from);
			expect(dataObject.requestId).toBe(request.requestId);
			expect(dataObject.requestedAt).toBe(request.requestedAt);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle segmentLimit of 1', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 1;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.segmentLimit).toBe(1);
		});

		it('[EC-02] should handle large segmentLimit', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 10000;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.segmentLimit).toBe(10000);
		});

		it('[EC-03] should handle empty text array', () => {
			// ARRANGE
			const text: Text = [];
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.text).toEqual([]);
			expect(request.asLogMetadata().textCount).toBe(0);
		});

		it('[EC-04] should handle single character text string', () => {
			// ARRANGE
			const text: Text = 'a';
			const segmentLimit = 100;

			// ACT
			const request = new SplitRequest(text, segmentLimit);

			// ASSERT
			expect(request.text).toBe('a');
			expect(request.asLogMetadata().textCount).toBe(1);
		});

		it('[EC-05] should preserve from parameter value', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 100;
			const from = 'es';

			// ACT
			const request = new SplitRequest(text, segmentLimit, from);

			// ASSERT
			expect(request.from).toBe('es');
			expect(request.asLogMetadata().from).toBe('es');
			expect(request.asDataObject().from).toBe('es');
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw if segmentLimit is zero', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 0;

			// ACT & ASSERT
			expect(() => new SplitRequest(text, segmentLimit)).toThrow('Segment limit must be more than zero.');
		});

		it('[EH-02] should throw if segmentLimit is negative', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = -5;

			// ACT & ASSERT
			expect(() => new SplitRequest(text, segmentLimit)).toThrow('Segment limit must be more than zero.');
		});

		it('[EH-03] should throw if segmentLimit is decimal', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 1.5;

			// ACT & ASSERT
			expect(() => new SplitRequest(text, segmentLimit)).toThrow('Segment limit must be more than zero.');
		});

		it('[EH-04] should include descriptive error message', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 0;

			// ACT & ASSERT
			expect(() => new SplitRequest(text, segmentLimit)).toThrow(/must be more than zero/);
		});

		it('[EH-05] should throw before freezing object', () => {
			// ARRANGE
			const text: Text = 'Test';
			const segmentLimit = 0;
			let request: SplitRequest | undefined;

			// ACT & ASSERT
			expect(() => {
				request = new SplitRequest(text, segmentLimit);
			}).toThrow();

			// Verify object was never created/frozen
			expect(request).toBeUndefined();
		});
	});
});
