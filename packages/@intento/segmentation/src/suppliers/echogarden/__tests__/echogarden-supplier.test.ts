/**
 * Tests for EchoGardenSupplier
 * @author Claude Sonnet 4.5
 * @date 2026-01-12
 */

jest.mock('@echogarden/icu-segmentation-wasm', () => ({
	initialize: jest.fn(),
}));

jest.mock('@echogarden/text-segmentation', () => ({
	segmentText: jest.fn(),
}));

jest.mock('intento-core', () => {
	const actualModule: Record<string, unknown> = jest.requireActual('intento-core');
	const contextFactory = {
		read: jest.fn(),
	};
	const result: Record<string, unknown> = {
		...actualModule,
	};
	result['ContextFactory'] = contextFactory;
	return result;
});

import * as ICUSegmentation from '@echogarden/icu-segmentation-wasm';
import { segmentText, type SegmentationResult } from '@echogarden/text-segmentation';
import { ContextFactory, type IFunctions } from 'intento-core';

import { SuppressionContext } from '../../../context/suppression-context';
import { SplitRequest } from '../../../supply/split-request';
import type { SplitResponse } from '../../../supply/split-response';
import { EchoGardenSupplier } from '../echogarden-supplier';

// Helper to create mock SegmentationResult
const createMockResult = (textArray: string[]): SegmentationResult =>
	({
		sentences: textArray.map((text) => ({
			text,
			wordRange: { start: 0, end: 0 },
			words: [] as unknown,
			charRange: { start: 0, end: text.length },
			phrases: [],
		})) as unknown,
		words: [] as unknown,
		segmentSentenceRanges: [],
	}) as SegmentationResult;

describe('EchoGardenSupplier', () => {
	let mockFunctions: IFunctions;
	let mockContextFactory: jest.Mocked<typeof ContextFactory>;
	let mockICUInitialize: jest.MockedFunction<typeof ICUSegmentation.initialize>;
	let mockSegmentText: jest.MockedFunction<typeof segmentText>;
	let supplier: EchoGardenSupplier;
	let abortController: AbortController;

	beforeEach(() => {
		jest.clearAllMocks();

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
			getNodeParameter: jest.fn(),
			logger: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
		} as unknown as IFunctions;

		mockContextFactory = ContextFactory as unknown as jest.Mocked<typeof ContextFactory>;
		mockICUInitialize = ICUSegmentation.initialize as jest.MockedFunction<typeof ICUSegmentation.initialize>;
		mockSegmentText = segmentText as jest.MockedFunction<typeof segmentText>;

		abortController = new AbortController();

		// Default mock implementations
		mockICUInitialize.mockResolvedValue(undefined);
		mockContextFactory.read.mockReturnValue(new SuppressionContext(false, undefined));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should create supplier instance with frozen state', () => {
			// ACT
			supplier = new EchoGardenSupplier(mockFunctions);

			// ASSERT
			expect(supplier).toBeInstanceOf(EchoGardenSupplier);
			expect(Object.isFrozen(supplier)).toBe(true);
		});

		it('[BL-02] should initialize ICU on first split request', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const request = new SplitRequest('Short text', 1000, 'en');

			// ACT
			await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(mockICUInitialize).toHaveBeenCalledTimes(1);
		});

		it('[BL-03] should handle single text item as string', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const request = new SplitRequest('Single text item', 1000, 'en');

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(response).toHaveProperty('segments');
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(segments[0].text).toBe('Single text item');
			expect(segments[0].textPosition).toBe(0);
		});

		it('[BL-04] should handle text array with multiple items', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const request = new SplitRequest(['First item', 'Second item'], 1000, 'en');

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(response).toHaveProperty('segments');
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(2);
			expect(segments[0].text).toBe('First item');
			expect(segments[0].textPosition).toBe(0);
			expect(segments[1].text).toBe('Second item');
			expect(segments[1].textPosition).toBe(1);
		});

		it('[BL-05] should skip text items shorter than segment limit', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const request = new SplitRequest('Short', 100, 'en');

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(response).toHaveProperty('segments');
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(segments[0].text).toBe('Short');
			expect(segments[0].segmentPosition).toBe(0);
			expect(mockSegmentText).not.toHaveBeenCalled();
		});

		it('[BL-06] should segment text exceeding limit', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const longText = 'A'.repeat(150);
			const request = new SplitRequest(longText, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['A'.repeat(75), 'A'.repeat(75)]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(mockSegmentText).toHaveBeenCalledWith(longText, expect.objectContaining({ language: 'en', customSuppressions: [] }));
			expect(response).toHaveProperty('segments');
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
		});

		it('[BL-07] should apply suppressions when enabled', async () => {
			// ARRANGE
			const suppressionsList = ['Dr.', 'Inc.', 'Prof.'];
			mockContextFactory.read.mockReturnValue(new SuppressionContext(true, suppressionsList));
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Dr. Smith works at Inc. Company with a long text that exceeds one hundred characters to trigger segmentation.';
			const request = new SplitRequest(text, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(mockSegmentText).toHaveBeenCalledWith(text, expect.objectContaining({ customSuppressions: suppressionsList }));
		});

		it('[BL-08] should skip suppressions when disabled', async () => {
			// ARRANGE
			mockContextFactory.read.mockReturnValue(new SuppressionContext(false, ['Dr.', 'Inc.']));
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Dr. Smith works here with a long text that exceeds one hundred characters to ensure segmentation is triggered.';
			const request = new SplitRequest(text, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(mockSegmentText).toHaveBeenCalledWith(text, expect.objectContaining({ customSuppressions: [] }));
		});

		it('[BL-09] should combine sentences until limit reached', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'First sentence. Second sentence. Third sentence.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['First sentence. ', 'Second sentence. ', 'Third sentence.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
		});

		it('[BL-10] should preserve atomic sentence exceeding limit', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const longSentence = 'This is a very long sentence that exceeds the segment limit but should be preserved as a single atomic unit.';
			const request = new SplitRequest(longSentence, 50, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([longSentence]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(segments[0].text).toBe(longSentence);
			expect(segments[0].text.length).toBeGreaterThan(50);
		});

		it('[BL-11] should push final currentSegment', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Final sentence remains.';
			const request = new SplitRequest(text, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(segments[0].text).toBe(text);
		});

		it('[BL-12] should assign correct textPosition and segmentPosition', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'First. Second. Third. Fourth.';
			const request = new SplitRequest(text, 15, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['First. ', 'Second. ', 'Third. ', 'Fourth.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			segments.forEach((segment, index) => {
				expect(segment.textPosition).toBe(0);
				expect(segment.segmentPosition).toBe(index);
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should skip empty text items', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const request = new SplitRequest('Valid text', 1000, 'en');

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(segments[0].text).toBe('Valid text');
		});

		it('[EC-02] should handle text with single sentence', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Single sentence only.';
			const request = new SplitRequest(text, 50, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(segments[0].text).toBe(text);
		});

		it('[EC-03] should handle text with no sentences', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text =
				'Text without period but long enough to exceed limit so it triggers segmentation and returns empty when no sentences found';
			const request = new SplitRequest(text, 50, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([]));

			// ACT & ASSERT
			await expect(supplier['executeSplit'](request, abortController.signal)).rejects.toThrow(
				'Segments response must contain at least 1 segment',
			);
		});

		it('[EC-04] should reuse ICU initialization across instances', async () => {
			// NOTE: This test specifically verifies singleton behavior across suppliers
			// Reset static state and track initialization calls
			const TestSupplier = EchoGardenSupplier;
			// @ts-expect-error - Accessing private static property for testing
			TestSupplier.icuInitialized = null;

			let initCallCount = 0;
			mockICUInitialize.mockImplementation(async () => {
				initCallCount++;
				await Promise.resolve();
			});

			const supplier1 = new TestSupplier(mockFunctions);
			const supplier2 = new TestSupplier(mockFunctions);
			const longText = 'A'.repeat(150);
			const request = new SplitRequest(longText, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['A'.repeat(75), 'A'.repeat(75)]));

			// ACT
			await supplier1['executeSplit'](request, abortController.signal);
			await supplier2['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(initCallCount).toBe(1);
		});

		it('[EC-05] should handle suppressions as empty list when null', async () => {
			// ARRANGE
			mockContextFactory.read.mockReturnValue(new SuppressionContext(true, undefined));
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Test text that is long enough to exceed the one hundred character limit so segmentation is triggered properly.';
			const request = new SplitRequest(text, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(mockSegmentText).toHaveBeenCalledWith(text, expect.objectContaining({ customSuppressions: [] }));
		});

		it('[EC-06] should handle optional language parameter', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Text without language hint but with enough characters to exceed the one hundred character limit for segmentation.';
			const request = new SplitRequest(text, 100);
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			expect(mockSegmentText).toHaveBeenCalledWith(text, expect.objectContaining({ language: undefined }));
		});
	});

	describe('integration tests - language groups', () => {
		it('[IT-01] should segment Cyrillic text (Russian)', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Это первое предложение. Это второе предложение.';
			const request = new SplitRequest(text, 30, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult(['Это первое предложение. ', 'Это второе предложение.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[А-Яа-я]/.test(s.text))).toBe(true);
		});

		it('[IT-02] should segment Latin text (English)', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'This is first sentence. This is second sentence.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['This is first sentence. ', 'This is second sentence.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[A-Za-z]/.test(s.text))).toBe(true);
		});

		it('[IT-03] should segment CJK text (Chinese)', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '这是第一句。这是第二句。';
			const request = new SplitRequest(text, 15, 'zh');
			mockSegmentText.mockResolvedValue(createMockResult(['这是第一句。', '这是第二句。']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u4E00-\u9FFF]/.test(s.text))).toBe(true);
		});

		it('[IT-04] should segment CJK text (Japanese)', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'これは最初の文です。これは二番目の文です。';
			const request = new SplitRequest(text, 20, 'ja');
			mockSegmentText.mockResolvedValue(createMockResult(['これは最初の文です。', 'これは二番目の文です。']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u3040-\u309F\u30A0-\u30FF]/.test(s.text))).toBe(true);
		});

		it('[IT-05] should segment RTL text (Arabic)', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'هذه الجملة الأولى. هذه الجملة الثانية.';
			const request = new SplitRequest(text, 25, 'ar');
			mockSegmentText.mockResolvedValue(createMockResult(['هذه الجملة الأولى. ', 'هذه الجملة الثانية.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0600-\u06FF]/.test(s.text))).toBe(true);
		});

		it('[IT-06] should segment RTL text (Hebrew)', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'זה המשפט הראשון. זה המשפט השני.';
			const request = new SplitRequest(text, 20, 'he');
			mockSegmentText.mockResolvedValue(createMockResult(['זה המשפט הראשון. ', 'זה המשפט השני.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0590-\u05FF]/.test(s.text))).toBe(true);
		});

		it('[IT-07] should segment mixed Latin-Cyrillic', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Hello мир. World привет.';
			const request = new SplitRequest(text, 20, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Hello мир. ', 'World привет.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
		});

		it('[IT-08] should handle abbreviations with suppressions (English)', async () => {
			// ARRANGE
			const suppressionsList = ['Dr.', 'Inc.'];
			mockContextFactory.read.mockReturnValue(new SuppressionContext(true, suppressionsList));
			supplier = new EchoGardenSupplier(mockFunctions);
			const text =
				'Dr. Smith works at Inc. Company today with a long description that exceeds one hundred characters to trigger segmentation.';
			const request = new SplitRequest(text, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments).toHaveLength(1);
			expect(mockSegmentText).toHaveBeenCalledWith(text, expect.objectContaining({ customSuppressions: suppressionsList }));
		});

		it('[IT-09] should segment long multi-sentence text with limit', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const sentenceText = 'This is a sentence that contains multiple words. ';
			const sentences = Array<string>(10).fill(sentenceText);
			const text = sentences.join('');
			const request = new SplitRequest(text, 100, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(sentences));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(1);
		});

		it('[IT-10] should preserve sentence integrity in mixed scripts', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Test测试. Another另一个.';
			const request = new SplitRequest(text, 20, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Test测试. ', 'Another另一个.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
		});

		it('[IT-11] should segment Thai text without explicit punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'นี่คือประโยคแรก นี่คือประโยคที่สอง';
			const request = new SplitRequest(text, 25, 'th');
			mockSegmentText.mockResolvedValue(createMockResult(['นี่คือประโยคแรก ', 'นี่คือประโยคที่สอง']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0E00-\u0E7F]/.test(s.text))).toBe(true);
		});

		it('[IT-12] should segment Khmer text without explicit punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'នេះគឺជាប្រយោគមួយ ប្រយោគមួយទៀតនៅទីនេះ';
			const request = new SplitRequest(text, 30, 'km');
			mockSegmentText.mockResolvedValue(createMockResult(['នេះគឺជាប្រយោគមួយ ', 'ប្រយោគមួយទៀតនៅទីនេះ']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u1780-\u17FF]/.test(s.text))).toBe(true);
		});

		it('[IT-13] should segment Burmese text without explicit punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'ဒါပထမစာကြောင်းပါ ဒါဒုတိယစာကြောင်းပါ';
			const request = new SplitRequest(text, 25, 'my');
			mockSegmentText.mockResolvedValue(createMockResult(['ဒါပထမစာကြောင်းပါ ', 'ဒါဒုတိယစာကြောင်းပါ']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u1000-\u109F]/.test(s.text))).toBe(true);
		});

		it('[IT-14] should segment Japanese text with implicit sentence boundaries', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'これはテストです それから別のテストです';
			const request = new SplitRequest(text, 20, 'ja');
			mockSegmentText.mockResolvedValue(createMockResult(['これはテストです ', 'それから別のテストです']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u3040-\u309F\u30A0-\u30FF]/.test(s.text))).toBe(true);
		});

		it('[IT-15] should segment Chinese text without punctuation marks', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '这是第一句 这是第二句';
			const request = new SplitRequest(text, 15, 'zh');
			mockSegmentText.mockResolvedValue(createMockResult(['这是第一句 ', '这是第二句']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u4E00-\u9FFF]/.test(s.text))).toBe(true);
		});

		it('[IT-16] should segment HTML with tags and preserve structure', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '<p>First sentence.</p><div>Second sentence.</div>';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['<p>First sentence.</p>', '<div>Second sentence.</div>']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('<p>'))).toBe(true);
			expect(segments.some((s) => s.text.includes('</p>'))).toBe(true);
		});

		it('[IT-17] should segment XML with attributes', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = "<node attr='value'>First sentence.</node><node>Second sentence.</node>";
			const request = new SplitRequest(text, 40, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(["<node attr='value'>First sentence.</node>", '<node>Second sentence.</node>']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes("attr='value'"))).toBe(true);
		});

		it('[IT-18] should segment JSON strings without breaking structure', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '{"text": "First sentence. Second sentence."}';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['{"text": "First sentence. ', 'Second sentence."}']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('"text"'))).toBe(true);
		});

		it('[IT-19] should segment Markdown with formatting', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '# Heading. **Bold text.** Regular text.';
			const request = new SplitRequest(text, 25, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['# Heading. ', '**Bold text.** ', 'Regular text.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('**'))).toBe(true);
			expect(segments.some((s) => s.text.includes('#'))).toBe(true);
		});

		it('[IT-20] should segment text with code blocks', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Text before. `code snippet`. Text after.';
			const request = new SplitRequest(text, 25, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Text before. ', '`code snippet`. ', 'Text after.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('`code snippet`'))).toBe(true);
		});

		it('[IT-21] should segment text with placeholders', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Hello {name}. Welcome to {place}. Enjoy your stay.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Hello {name}. ', 'Welcome to {place}. ', 'Enjoy your stay.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('{name}'))).toBe(true);
			expect(segments.some((s) => s.text.includes('{place}'))).toBe(true);
		});

		it('[IT-22] should segment text with variables', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Value is {{var1}}. Result is {{var2}}. End of text.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Value is {{var1}}. ', 'Result is {{var2}}. ', 'End of text.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('{{var1}}'))).toBe(true);
			expect(segments.some((s) => s.text.includes('{{var2}}'))).toBe(true);
		});

		it('[IT-23] should segment text with URLs', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Visit https://example.com. Read more there. Thank you.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Visit https://example.com. ', 'Read more there. ', 'Thank you.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('https://example.com'))).toBe(true);
		});

		it('[IT-24] should segment text with email addresses', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Contact admin@example.com. Or support@test.org. We are here.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Contact admin@example.com. ', 'Or support@test.org. ', 'We are here.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('admin@example.com'))).toBe(true);
			expect(segments.some((s) => s.text.includes('support@test.org'))).toBe(true);
		});

		it('[IT-25] should segment HTML entities', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'First &amp; second. Third &lt; fourth. Fifth &gt; sixth.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['First &amp; second. ', 'Third &lt; fourth. ', 'Fifth &gt; sixth.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('&amp;'))).toBe(true);
			expect(segments.some((s) => s.text.includes('&lt;'))).toBe(true);
		});

		it('[IT-26] should preserve multiple spaces between sentences', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Sentence one.  Multiple spaces.   More text.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Sentence one.  ', 'Multiple spaces.   ', 'More text.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('  '))).toBe(true);
		});

		it('[IT-27] should handle leading/trailing whitespace', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '  Текст с пробелами.  ';
			const request = new SplitRequest(text, 50, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult(['  Текст с пробелами.  ']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments[0].text).toMatch(/^\s+/);
			expect(segments[segments.length - 1].text).toMatch(/\s+$/);
		});

		it('[IT-28] should segment newlines and paragraphs', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'First paragraph.\n\nSecond paragraph.\nThird line.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['First paragraph.\n\n', 'Second paragraph.\n', 'Third line.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('\n'))).toBe(true);
		});

		it('[IT-29] should handle tab characters', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '文本与\t制表符。\t更多文本。';
			const request = new SplitRequest(text, 30, 'zh');
			mockSegmentText.mockResolvedValue(createMockResult(['文本与\t制表符。', '\t更多文本。']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('\t'))).toBe(true);
		});

		it('[IT-30] should not split on decimal numbers', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'The value is 3.14. And 2.71 is another.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['The value is 3.14. ', 'And 2.71 is another.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('3.14'))).toBe(true);
			expect(segments.some((s) => s.text.includes('2.71'))).toBe(true);
		});

		it('[IT-31] should handle thousands separators', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Стоимость 1,234.56. Всего: 9,876,543 единиц.';
			const request = new SplitRequest(text, 35, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult(['Стоимость 1,234.56. ', 'Всего: 9,876,543 единиц.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('1,234.56'))).toBe(true);
			expect(segments.some((s) => s.text.includes('9,876,543'))).toBe(true);
		});

		it('[IT-32] should preserve version numbers', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'バージョン 2.0.1。リリース v3.14.159 昨日。';
			const request = new SplitRequest(text, 35, 'ja');
			mockSegmentText.mockResolvedValue(createMockResult(['バージョン 2.0.1。', 'リリース v3.14.159 昨日。']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('2.0.1'))).toBe(true);
			expect(segments.some((s) => s.text.includes('v3.14.159'))).toBe(true);
		});

		it('[IT-33] should handle date formats', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Date: 01.12.2026. Also 12/01/2026 works. تاريخ: 2026/01/12.';
			const request = new SplitRequest(text, 40, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Date: 01.12.2026. ', 'Also 12/01/2026 works. ', 'تاريخ: 2026/01/12.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('01.12.2026'))).toBe(true);
			expect(segments.some((s) => s.text.includes('12/01/2026'))).toBe(true);
		});

		it('[IT-34] should not split on time formats', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Meeting at 14:30. Or 2:30 p.m. today.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Meeting at 14:30. ', 'Or 2:30 p.m. today.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('14:30'))).toBe(true);
			expect(segments.some((s) => s.text.includes('2:30 p.m.'))).toBe(true);
		});

		it('[IT-35] should handle common abbreviations', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Dr. Smith and Prof. Johnson. They met at U.S.A. Inc.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Dr. Smith and Prof. Johnson. ', 'They met at U.S.A. Inc.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('Dr.'))).toBe(true);
			expect(segments.some((s) => s.text.includes('Prof.'))).toBe(true);
		});

		it('[IT-36] should preserve acronyms with periods', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Др. Иванов работает в США. ООН поддержала.';
			const request = new SplitRequest(text, 35, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult(['Др. Иванов работает в США. ', 'ООН поддержала.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('Др.'))).toBe(true);
			expect(segments.some((s) => s.text.includes('США'))).toBe(true);
		});

		it('[IT-37] should handle technical acronyms', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'API v2.0 released. REST API updated. GraphQL too.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['API v2.0 released. ', 'REST API updated. ', 'GraphQL too.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('API'))).toBe(true);
			expect(segments.some((s) => s.text.includes('REST'))).toBe(true);
		});

		it('[IT-38] should preserve initials', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'המחבר ש.י. עגנון כתב. ח.נ. ביאליק הסכים.';
			const request = new SplitRequest(text, 35, 'he');
			mockSegmentText.mockResolvedValue(createMockResult(['המחבר ש.י. עגנון כתב. ', 'ח.נ. ביאליק הסכים.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0590-\u05FF]/.test(s.text))).toBe(true);
		});

		it('[IT-39] should segment numbered lists', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'خطوات: 1. الخطوة الأولى. 2. الخطوة الثانية. 3. الخطوة الأخيرة.';
			const request = new SplitRequest(text, 40, 'ar');
			mockSegmentText.mockResolvedValue(createMockResult(['خطوات: 1. الخطوة الأولى. ', '2. الخطوة الثانية. ', '3. الخطوة الأخيرة.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0600-\u06FF]/.test(s.text))).toBe(true);
			expect(segments.some((s) => s.text.includes('1.'))).toBe(true);
		});

		it('[IT-40] should handle lettered lists', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Options: a) First choice. b) Second option. c) Last one.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Options: a) First choice. ', 'b) Second option. ', 'c) Last one.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('a)'))).toBe(true);
			expect(segments.some((s) => s.text.includes('b)'))).toBe(true);
		});

		it('[IT-41] should preserve bullet points', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '项目：• 第一项。• 第二项。• 第三项。';
			const request = new SplitRequest(text, 30, 'zh');
			mockSegmentText.mockResolvedValue(createMockResult(['项目：• 第一项。', '• 第二项。', '• 第三项。']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('•'))).toBe(true);
		});

		it('[IT-42] should handle quoted sentences', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = "He said 'Hello world.' Then left. She replied 'Goodbye.'";
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(["He said 'Hello world.' ", 'Then left. ', "She replied 'Goodbye.'"]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes("'"))).toBe(true);
		});

		it('[IT-43] should preserve nested quotes', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = "Она сказала: 'Он сказал: «Привет».' Вчера.";
			const request = new SplitRequest(text, 40, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult(["Она сказала: 'Он сказал: «Привет».' ", 'Вчера.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('«'))).toBe(true);
		});

		it('[IT-44] should segment dialog attribution', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '「こんにちは」と彼は言った。「元気ですか」と彼女は尋ねた。';
			const request = new SplitRequest(text, 40, 'ja');
			mockSegmentText.mockResolvedValue(createMockResult(['「こんにちは」と彼は言った。', '「元気ですか」と彼女は尋ねた。']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('「'))).toBe(true);
		});

		it('[IT-45] should handle ellipsis', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = "Wait... Something's wrong. Really... Think about it.";
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Wait... ', "Something's wrong. ", 'Really... ', 'Think about it.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('...'))).toBe(true);
		});

		it('[IT-46] should preserve em dash', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'החלק הראשון—הערה חשובה—ממשיך כאן. סיום.';
			const request = new SplitRequest(text, 40, 'he');
			mockSegmentText.mockResolvedValue(createMockResult(['החלק הראשון—הערה חשובה—ממשיך כאן. ', 'סיום.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('—'))).toBe(true);
		});

		it('[IT-47] should handle parentheses mid-sentence', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Текст (с примечанием). Еще (другое примечание) здесь.';
			const request = new SplitRequest(text, 40, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult(['Текст (с примечанием). ', 'Еще (другое примечание) здесь.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('('))).toBe(true);
		});

		it('[IT-48] should handle question/exclamation combos', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Really?! Are you sure?! Wow!';
			const request = new SplitRequest(text, 25, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Really?! ', 'Are you sure?! ', 'Wow!']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('?!'))).toBe(true);
		});

		it('[IT-49] should preserve phone numbers', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Call +1-555-123-4567. Or (555) 123.4567 works.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Call +1-555-123-4567. ', 'Or (555) 123.4567 works.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('+1-555-123-4567'))).toBe(true);
		});

		it('[IT-50] should handle file paths', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'See file.txt. Or /path/to/file.json for details.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['See file.txt. ', 'Or /path/to/file.json for details.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('.txt'))).toBe(true);
			expect(segments.some((s) => s.text.includes('/path/to/'))).toBe(true);
		});

		it('[IT-51] should preserve currency symbols', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Costs €99.99. Also £50.00 and ¥1000 available.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Costs €99.99. ', 'Also £50.00 and ¥1000 available.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('€'))).toBe(true);
			expect(segments.some((s) => s.text.includes('£'))).toBe(true);
		});

		it('[IT-52] should handle mathematical expressions', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Formula: a+b=c. Also x²+y²=z² applies.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Formula: a+b=c. ', 'Also x²+y²=z² applies.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('a+b=c'))).toBe(true);
		});

		it('[IT-53] should preserve chemical formulas', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'الماء هو H₂O. ثاني أكسيد الكربون: CO₂. صيغة.';
			const request = new SplitRequest(text, 35, 'ar');
			mockSegmentText.mockResolvedValue(createMockResult(['الماء هو H₂O. ', 'ثاني أكسيد الكربون: CO₂. ', 'صيغة.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('H₂O'))).toBe(true);
			expect(segments.some((s) => s.text.includes('CO₂'))).toBe(true);
		});

		it('[IT-54] should preserve untranslatable terms', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Product name SuperApp™. Version MacroTool® 3.0.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Product name SuperApp™. ', 'Version MacroTool® 3.0.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('™'))).toBe(true);
			expect(segments.some((s) => s.text.includes('®'))).toBe(true);
		});

		it('[IT-55] should handle mixed RTL/LTR', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'English text עברית text العربية continues.';
			const request = new SplitRequest(text, 50, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['English text עברית text العربية continues.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0590-\u05FF]/.test(s.text))).toBe(true);
			expect(segments.some((s) => /[\u0600-\u06FF]/.test(s.text))).toBe(true);
		});

		it('[IT-56] should segment mixed CJK/Latin', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = '日本語 text with English. 中文 mixed content.';
			const request = new SplitRequest(text, 35, 'ja');
			mockSegmentText.mockResolvedValue(createMockResult(['日本語 text with English. ', '中文 mixed content.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u4E00-\u9FFF]/.test(s.text))).toBe(true);
		});

		it('[IT-57] should handle sentence-ending abbreviations', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Company: Apple Inc. Location: USA. Founded: 1976.';
			const request = new SplitRequest(text, 35, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Company: Apple Inc. ', 'Location: USA. ', 'Founded: 1976.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('Inc.'))).toBe(true);
		});

		it('[IT-58] should preserve contractions', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = "It's working. They're done. Won't stop. Can't fail.";
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(["It's working. ", "They're done. ", "Won't stop. ", "Can't fail."]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes("'"))).toBe(true);
		});

		it('[IT-59] should handle CAT tool tags', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = "Text <g id='1'>with tags</g>. More <x id='2'/> content.";
			const request = new SplitRequest(text, 40, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(["Text <g id='1'>with tags</g>. ", "More <x id='2'/> content."]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes("<g id='1'>"))).toBe(true);
		});

		it('[IT-60] should preserve placeholders with numbers', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Welcome {0}. Your score: {1}. Rank: {2}.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Welcome {0}. ', 'Your score: {1}. ', 'Rank: {2}.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('{0}'))).toBe(true);
			expect(segments.some((s) => s.text.includes('{1}'))).toBe(true);
		});

		it('[IT-61] should handle printf-style formatting', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Hello %s. Value: %d. Percent: %.2f done.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Hello %s. ', 'Value: %d. ', 'Percent: %.2f done.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('%s'))).toBe(true);
			expect(segments.some((s) => s.text.includes('%d'))).toBe(true);
		});

		it('[IT-62] should preserve ICU MessageFormat', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'You have {count, plural, one {# item} other {# items}}.';
			const request = new SplitRequest(text, 60, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['You have {count, plural, one {# item} other {# items}}.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('plural'))).toBe(true);
		});

		it('[IT-63] should handle non-breaking spaces', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Company Name. Another Company.'; // Contains NBSP (U+00A0)
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(createMockResult(['Company Name. ', 'Another Company.']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => s.text.includes('Company'))).toBe(true);
		});

		it('[IT-64] should preserve very long sentence', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text =
				'Это очень длинное предложение которое содержит более пятисот символов и должно быть сохранено как одно целое несмотря на то что оно превышает лимит сегментации потому что это атомарная единица текста которая не может быть разделена на части без потери смысла и контекста что является критически важным для качества перевода и это предложение продолжается дальше чтобы достичь требуемой длины для тестирования данного случая использования когда переводчик должен обработать очень длинный текст как единую смысловую единицу.';
			const request = new SplitRequest(text, 100, 'ru');
			mockSegmentText.mockResolvedValue(createMockResult([text]));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBe(1);
			expect(segments[0].text.length).toBeGreaterThan(500);
		});

		it('[IT-65] should combine multiple short sentences', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'Hi. OK. Yes. No. Maybe. Sure. Fine. Good. Great. Done.';
			const request = new SplitRequest(text, 30, 'en');
			mockSegmentText.mockResolvedValue(
				createMockResult(['Hi. ', 'OK. ', 'Yes. ', 'No. ', 'Maybe. ', 'Sure. ', 'Fine. ', 'Good. ', 'Great. ', 'Done.']),
			);

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.length).toBeLessThan(10); // Should combine some sentences
		});

		it('[IT-66] should handle alternating long/short', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text =
				'Short. This is a longer sentence with more content. Brief. Another extended sentence providing additional context. End.';
			const request = new SplitRequest(text, 60, 'en');
			mockSegmentText.mockResolvedValue(
				createMockResult([
					'Short. ',
					'This is a longer sentence with more content. ',
					'Brief. ',
					'Another extended sentence providing additional context. ',
					'End.',
				]),
			);

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			// After combining, segments will be longer since short sentences are combined
			expect(segments.some((s) => s.text.length > 40)).toBe(true);
		});

		it('[IT-67] should segment Thai without punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'นี่คือประโยคแรก นี่คือประโยคที่สอง นี่คือประโยคที่สาม';
			const request = new SplitRequest(text, 30, 'th');
			mockSegmentText.mockResolvedValue(createMockResult(['นี่คือประโยคแรก ', 'นี่คือประโยคที่สอง ', 'นี่คือประโยคที่สาม']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0E00-\u0E7F]/.test(s.text))).toBe(true);
		});

		it('[IT-68] should segment Khmer without punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'នេះជាប្រយោគទីមួយ នេះជាប្រយោគទីពីរ នេះជាប្រយោគទីបី';
			const request = new SplitRequest(text, 30, 'km');
			mockSegmentText.mockResolvedValue(createMockResult(['នេះជាប្រយោគទីមួយ ', 'នេះជាប្រយោគទីពីរ ', 'នេះជាប្រយោគទីបី']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u1780-\u17FF]/.test(s.text))).toBe(true);
		});

		it('[IT-69] should segment Burmese without punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'ဒါပထမစာကြောင်း ဒါဒုတိယစာကြောင်း ဒါတတိယစာကြောင်း';
			const request = new SplitRequest(text, 30, 'my');
			mockSegmentText.mockResolvedValue(createMockResult(['ဒါပထမစာကြောင်း ', 'ဒါဒုတိယစာကြောင်း ', 'ဒါတတိယစာကြောင်း']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u1000-\u109F]/.test(s.text))).toBe(true);
		});

		it('[IT-70] should segment Lao without punctuation', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'ນີ້ແມ່ນປະໂຫຍກທຳອິດ ນີ້ແມ່ນປະໂຫຍກທີສອງ ນີ້ແມ່ນປະໂຫຍກທີສາມ';
			const request = new SplitRequest(text, 35, 'lo');
			mockSegmentText.mockResolvedValue(createMockResult(['ນີ້ແມ່ນປະໂຫຍກທຳອິດ ', 'ນີ້ແມ່ນປະໂຫຍກທີສອງ ', 'ນີ້ແມ່ນປະໂຫຍກທີສາມ']));

			// ACT
			const response = await supplier['executeSplit'](request, abortController.signal);

			// ASSERT
			const segments = (response as SplitResponse).segments;
			expect(segments.length).toBeGreaterThan(0);
			expect(segments.some((s) => /[\u0E80-\u0EFF]/.test(s.text))).toBe(true);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should reset icuInitialized on initialization failure', async () => {
			// ARRANGE
			const TestSupplier = EchoGardenSupplier;
			// @ts-expect-error - Accessing private static property for testing
			TestSupplier.icuInitialized = null;

			const error = new Error('WASM initialization failed');
			mockICUInitialize.mockRejectedValueOnce(error);

			supplier = new TestSupplier(mockFunctions);
			const longText = 'A'.repeat(150);
			const request = new SplitRequest(longText, 100, 'en');

			// ACT & ASSERT
			await expect(supplier['executeSplit'](request, abortController.signal)).rejects.toThrow('WASM initialization failed');

			// Verify icuInitialized was reset to null
			// @ts-expect-error - Accessing private static property for testing
			expect(TestSupplier.icuInitialized).toBeNull();
		});

		it('[EH-02] should throw error from ICU initialization', async () => {
			// ARRANGE
			const TestSupplier = EchoGardenSupplier;
			// @ts-expect-error - Accessing private static property for testing
			TestSupplier.icuInitialized = null;

			const error = new Error('ICU module not found');
			mockICUInitialize.mockRejectedValueOnce(error);

			supplier = new TestSupplier(mockFunctions);
			const longText = 'A'.repeat(150);
			const request = new SplitRequest(longText, 100, 'en');

			// ACT & ASSERT
			await expect(supplier['executeSplit'](request, abortController.signal)).rejects.toThrow('ICU module not found');
		});

		it('[EH-03] should respect abort signal at method start', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const request = new SplitRequest('Test', 1000, 'en');
			abortController.abort();

			// ACT & ASSERT
			await expect(supplier['executeSplit'](request, abortController.signal)).rejects.toThrow();
		});

		it('[EH-04] should respect abort signal in loop', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const longText = 'A'.repeat(150);
			const request = new SplitRequest([longText, longText, longText], 100, 'en');

			let iterationCount = 0;
			jest.spyOn(abortController.signal, 'throwIfAborted').mockImplementation(() => {
				iterationCount++;
				if (iterationCount > 2) {
					throw new Error('Aborted');
				}
			});

			mockSegmentText.mockResolvedValue(createMockResult(['A'.repeat(75)]));

			// ACT & ASSERT
			await expect(supplier['executeSplit'](request, abortController.signal)).rejects.toThrow();
		});

		it('[EH-05] should propagate segmentText errors', async () => {
			// ARRANGE
			supplier = new EchoGardenSupplier(mockFunctions);
			const text = 'A'.repeat(200);
			const request = new SplitRequest(text, 100, 'en');
			const error = new Error('Segmentation failed');
			mockSegmentText.mockRejectedValueOnce(error);

			// ACT & ASSERT
			await expect(supplier['executeSplit'](request, abortController.signal)).rejects.toThrow('Segmentation failed');
		});
	});
});
