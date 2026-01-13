import * as ICUSegmentation from '@echogarden/icu-segmentation-wasm';
import { segmentText } from '@echogarden/text-segmentation';
import type { IFunctions, SupplyError } from 'intento-core';
import { AgentRequestBase, ContextFactory } from 'intento-core';
import { mock } from 'jest-mock-extended';
import type { IDataObject } from 'n8n-workflow';

import { SuppressionContext } from '../../../context/suppression-context';
import { SplitRequest } from '../../../supply/split-request';
import type { SplitResponse } from '../../../supply/split-response';
import { EchoGardenSupplier } from '../echogarden-supplier';

/**
 * Tests for EchoGardenSupplier
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Mock ESM modules BEFORE imports
jest.mock('@echogarden/icu-segmentation-wasm', () => ({
	initialize: jest.fn(),
}));

jest.mock('@echogarden/text-segmentation', () => ({
	segmentText: jest.fn(),
}));

// Mock agent request
class MockAgentRequest extends AgentRequestBase {
	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			requestedAt: this.requestedAt,
		};
	}
}

// Test class to expose protected methods
class TestEchoGardenSupplier extends EchoGardenSupplier {
	async testExecuteSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		return await this.executeSplit(request, signal);
	}

	static resetICUInitialized(): void {
		(EchoGardenSupplier as unknown as { icuInitialized: Promise<void> | null }).icuInitialized = null;
	}

	static getICUInitialized(): Promise<void> | null {
		return (EchoGardenSupplier as unknown as { icuInitialized: Promise<void> | null }).icuInitialized;
	}
}

describe('EchoGardenSupplier', () => {
	let mockFunctions: IFunctions;
	let mockAgentRequest: MockAgentRequest;
	let abortController: AbortController;
	let mockICUInitialize: jest.MockedFunction<typeof ICUSegmentation.initialize>;
	let mockSegmentText: jest.MockedFunction<typeof segmentText>;

	beforeEach(() => {
		// Reset ICU initialization state
		TestEchoGardenSupplier.resetICUInitialized();

		// Setup mocks
		mockAgentRequest = new MockAgentRequest();
		abortController = new AbortController();

		mockICUInitialize = ICUSegmentation.initialize as jest.MockedFunction<typeof ICUSegmentation.initialize>;
		mockICUInitialize.mockResolvedValue(undefined);

		mockSegmentText = segmentText as jest.MockedFunction<typeof segmentText>;
		mockSegmentText.mockResolvedValue({
			sentences: [{ text: 'Test sentence.' }],
		} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

		const debugFn = jest.fn();
		const infoFn = jest.fn();
		const errorFn = jest.fn();

		mockFunctions = mock<IFunctions>({
			getNode: jest.fn(() => ({
				id: 'node-id',
				name: 'EchoGardenNode',
				type: 'intento.segmentSupplier',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			})),
			getWorkflow: jest.fn(() => ({ id: 'workflow-id', name: 'Test Workflow', active: true })),
			getExecutionId: jest.fn(() => 'execution-id'),
			getWorkflowDataProxy: jest.fn(() => ({
				$execution: { customData: new Map() },
			})) as unknown as (itemIndex: number) => IFunctions['getWorkflowDataProxy'] extends (itemIndex: number) => infer R ? R : never,
			logger: {
				debug: debugFn,
				info: infoFn,
				warn: jest.fn(),
				error: errorFn,
			},
			addInputData: jest.fn(() => ({ index: 0 })),
			addOutputData: jest.fn(() => undefined),
			getNodeParameter: jest.fn(),
		} as Partial<IFunctions>) as IFunctions;

		// Default context mock (disabled suppressions)
		const defaultContext = mock<SuppressionContext>({ enabled: false, list: [] });
		jest.spyOn(ContextFactory, 'read').mockReturnValue(defaultContext);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('Business Logic', () => {
		describe('BL-01: should construct with IFunctions and read context', () => {
			it('constructs supplier and reads suppression context', () => {
				// Arrange & Act
				const supplier = new TestEchoGardenSupplier(mockFunctions);

				// Assert
				expect(supplier).toBeInstanceOf(EchoGardenSupplier);
				expect(ContextFactory.read).toHaveBeenCalledWith(SuppressionContext, mockFunctions, expect.anything());
			});
		});

		describe('BL-02: should pass through text shorter than limit', () => {
			it('returns single segment without calling segmentText', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const shortText = 'Short text.';
				const request = new SplitRequest(mockAgentRequest, [shortText], 50);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments).toEqual([{ text: shortText, textPosition: 0, segmentPosition: 0 }]);
				expect(mockSegmentText).not.toHaveBeenCalled();
			});
		});

		describe('BL-03: should split long text into segments', () => {
			it('calls segmentText and returns multiple segments', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const longText = 'This is a very long text that exceeds the segment limit and needs to be split.';
				const request = new SplitRequest(mockAgentRequest, [longText], 20);

				mockSegmentText.mockResolvedValue({
					sentences: [
						{ text: 'This is a very long text ' },
						{ text: 'that exceeds the segment limit ' },
						{ text: 'and needs to be split.' },
					],
				} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(mockSegmentText).toHaveBeenCalledWith(
					longText,
					expect.objectContaining({
						customSuppressions: [],
						enableEastAsianPostprocessing: true,
					}),
				);
				expect(result.segments.length).toBeGreaterThan(0);
			});
		});

		describe('BL-04: should use empty suppressions when context disabled', () => {
			it('passes empty array to segmentText', async () => {
				// Arrange
				const disabledContext: SuppressionContext = {
					enabled: false,
					list: ['Dr.', 'Inc.'],
					throwIfInvalid: jest.fn(),
					asLogMetadata: jest.fn(() => ({ enabled: false })),
				};
				jest.spyOn(ContextFactory, 'read').mockReturnValue(disabledContext);
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Long text here that needs splitting.'], 10);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				expect(mockSegmentText).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					expect.objectContaining({
						customSuppressions: [],
						enableEastAsianPostprocessing: true,
					}),
				);
			});
		});

		describe('BL-05: should use context suppressions when enabled', () => {
			it('passes suppression list to segmentText', async () => {
				// Arrange
				const enabledContext: SuppressionContext = {
					enabled: true,
					list: ['Dr.', 'Inc.'],
					throwIfInvalid: jest.fn(),
					asLogMetadata: jest.fn(() => ({ enabled: true, suppressionsCount: 2 })),
				};
				jest.spyOn(ContextFactory, 'read').mockReturnValue(enabledContext);
				// Must create supplier AFTER mocking context so it reads the right value
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Dr. Smith works at Acme Inc. today. This is a longer text.'], 10);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				expect(mockSegmentText).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					expect.objectContaining({
						customSuppressions: ['Dr.', 'Inc.'],
						enableEastAsianPostprocessing: true,
					}),
				);
			});
		});

		describe('BL-06: should log debug at split start', () => {
			it('logs message with suppressions count and metadata', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text one.', 'Text two.'], 50);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				const debugCalls = (mockFunctions.logger.debug as jest.Mock).mock.calls as Array<[string, Record<string, unknown>]>;
				const splitCall = debugCalls.find((call) => typeof call[0] === 'string' && call[0].includes('Splitting 2 text item(s)'));
				expect(splitCall).toBeDefined();
				if (splitCall) {
					expect(splitCall[1]).toMatchObject({ agentRequestId: mockAgentRequest.agentRequestId });
				}
			});
		});

		describe('BL-07: should log debug after split complete', () => {
			it('logs completion message with segment count', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				const debugCalls = (mockFunctions.logger.debug as jest.Mock).mock.calls as Array<[string, Record<string, unknown>?]>;
				const completionCall = debugCalls.find((call) => typeof call[0] === 'string' && call[0].includes('split into'));
				expect(completionCall).toBeDefined();
			});
		});

		describe('BL-08: should preserve textPosition across segments', () => {
			it('assigns correct textPosition to each segment', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['First text.', 'Second text.'], 50);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments[0].textPosition).toBe(0);
				expect(result.segments[1].textPosition).toBe(1);
			});
		});

		describe('BL-09: should assign sequential segmentPosition', () => {
			it('numbers segments sequentially within same text', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const longText = 'This is a long text that will be split into multiple segments for testing.';
				const request = new SplitRequest(mockAgentRequest, [longText], 20);

				mockSegmentText.mockResolvedValue({
					sentences: [{ text: 'Segment one. ' }, { text: 'Segment two. ' }, { text: 'Segment three.' }],
				} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				const positions = result.segments.map((s) => s.segmentPosition);
				expect(positions).toEqual([0, 1, 2]);
			});
		});

		describe('BL-10: should initialize ICU on first call', () => {
			it('calls ICUSegmentation.initialize once', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				expect(mockICUInitialize).toHaveBeenCalledTimes(1);
				const infoCalls = (mockFunctions.logger.info as jest.Mock).mock.calls as Array<[string, Record<string, unknown>?]>;
				const initCall = infoCalls.find(
					(call) => typeof call[0] === 'string' && call[0].includes('ICU Segmentation WASM module initialized'),
				);
				expect(initCall).toBeDefined();
			});
		});
	});

	describe('Edge Cases', () => {
		describe('EC-01: should handle multiple text items', () => {
			it('processes each text item in array', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const texts = ['First item.', 'Second item.', 'Third item.'];
				const request = new SplitRequest(mockAgentRequest, texts, 50);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments).toHaveLength(3);
				expect(result.segments[0].text).toBe('First item.');
				expect(result.segments[1].text).toBe('Second item.');
				expect(result.segments[2].text).toBe('Third item.');
			});
		});

		describe('EC-02: should handle empty text array', () => {
			it('returns empty segments array', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, [], 50);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments).toEqual([]);
			});
		});

		describe('EC-03: should handle text exactly at limit', () => {
			it('segments text exactly matching limit (condition is <)', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const exactText = 'X'.repeat(50);
				const request = new SplitRequest(mockAgentRequest, [exactText], 50);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert - text at exactly limit still gets segmented
				expect(mockSegmentText).toHaveBeenCalled();
				expect(result.segments.length).toBeGreaterThanOrEqual(1);
			});
		});

		describe('EC-04: should accumulate sentences until limit', () => {
			it('combines sentences while under limit', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Short. Sentences. Here.'], 10);

				mockSegmentText.mockResolvedValue({
					sentences: [{ text: 'Short. ' }, { text: 'Sentences. ' }, { text: 'Here.' }],
				} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments.length).toBeGreaterThan(0);
				const firstSegment = result.segments[0].text;
				expect(firstSegment.length).toBeLessThanOrEqual(20);
			});
		});

		describe('EC-05: should push segment on overflow', () => {
			it('creates new segment when limit would be exceeded', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['First sentence here. Second sentence here.'], 15);

				mockSegmentText.mockResolvedValue({
					sentences: [{ text: 'First sentence here. ' }, { text: 'Second sentence here.' }],
				} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments.length).toBe(2);
			});
		});

		describe('EC-06: should handle final segment after loop', () => {
			it('pushes remaining accumulated segment', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['One. Two. Three.'], 10);

				mockSegmentText.mockResolvedValue({
					sentences: [{ text: 'One. ' }, { text: 'Two. ' }, { text: 'Three.' }],
				} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments.length).toBeGreaterThan(0);
				const lastSegment = result.segments[result.segments.length - 1];
				expect(lastSegment.text).toContain('Three.');
			});
		});

		describe('EC-07: should handle single sentence exceeding limit', () => {
			it('creates segment with single long sentence', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const longSentence = 'This is an extremely long sentence that definitely exceeds any reasonable limit.';
				const request = new SplitRequest(mockAgentRequest, [longSentence], 10);

				mockSegmentText.mockResolvedValue({
					sentences: [{ text: longSentence }],
				} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments).toHaveLength(1);
				expect(result.segments[0].text).toBe(longSentence);
				expect(result.segments[0].text.length).toBeGreaterThan(10);
			});
		});

		describe('EC-08: should handle empty sentences array', () => {
			it('returns empty segments for text with no sentences', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text without sentences'], 10);

				mockSegmentText.mockResolvedValue({
					sentences: [],
					words: [],
					segmentSentenceRanges: [],
				} as unknown as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				expect(result.segments).toHaveLength(0);
			});
		});

		describe('EC-09: should reuse ICU initialization promise', () => {
			it('does not reinitialize ICU on subsequent calls', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request1 = new SplitRequest(mockAgentRequest, ['First call.'], 50);
				const request2 = new SplitRequest(mockAgentRequest, ['Second call.'], 50);

				// Act
				await supplier.testExecuteSplit(request1, abortController.signal);
				await supplier.testExecuteSplit(request2, abortController.signal);

				// Assert
				expect(mockICUInitialize).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('Error Handling', () => {
		describe('EH-01: should throw on abort signal before split', () => {
			it('throws when signal aborted before execution', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);
				abortController.abort();

				// Act & Assert
				await expect(supplier.testExecuteSplit(request, abortController.signal)).rejects.toThrow();
			});
		});

		describe('EH-02: should throw on abort signal during loop', () => {
			it('checks abort signal for each text item', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				// Make text long enough to trigger segmentation
				const longText = 'This is a very long text item that exceeds the limit.';
				const request = new SplitRequest(mockAgentRequest, [longText, longText, longText], 10);

				let callCount = 0;
				mockSegmentText.mockImplementation(async () => {
					callCount++;
					if (callCount === 2) {
						abortController.abort();
					}
					return await Promise.resolve({
						sentences: [{ text: 'Test.' }],
					} as ReturnType<typeof segmentText> extends Promise<infer R> ? R : never);
				});

				// Act & Assert
				await expect(supplier.testExecuteSplit(request, abortController.signal)).rejects.toThrow();
			});
		});

		describe('EH-03: should reset ICU on initialization failure', () => {
			it('sets icuInitialized to null on error', async () => {
				// Arrange
				TestEchoGardenSupplier.resetICUInitialized();
				mockICUInitialize.mockRejectedValue(new Error('Init failed'));
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act
				try {
					await supplier.testExecuteSplit(request, abortController.signal);
				} catch {
					// Expected error
				}

				// Assert
				expect(TestEchoGardenSupplier.getICUInitialized()).toBeNull();
			});
		});

		describe('EH-04: should log error on ICU failure', () => {
			it('logs error message with error details', async () => {
				// Arrange
				TestEchoGardenSupplier.resetICUInitialized();
				const error = new Error('Init failed');
				mockICUInitialize.mockRejectedValue(error);
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act
				try {
					await supplier.testExecuteSplit(request, abortController.signal);
				} catch {
					// Expected error
				}

				// Assert
				expect(mockFunctions.logger.error).toHaveBeenCalledWith(
					expect.stringContaining('Failed to initialize ICU'),
					expect.objectContaining({ error }),
				);
			});
		});

		describe('EH-05: should re-throw ICU initialization error', () => {
			it('propagates initialization error to caller', async () => {
				// Arrange
				TestEchoGardenSupplier.resetICUInitialized();
				const error = new Error('Init failed');
				mockICUInitialize.mockRejectedValue(error);
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act & Assert
				await expect(supplier.testExecuteSplit(request, abortController.signal)).rejects.toThrow('Init failed');
			});
		});
	});

	describe('Metadata & Data', () => {
		describe('MD-01: should include suppression count in log', () => {
			it('logs suppressions count at split start', async () => {
				// Arrange
				const enabledContext: SuppressionContext = {
					enabled: true,
					list: ['Dr.', 'Inc.'],
					throwIfInvalid: jest.fn(),
					asLogMetadata: jest.fn(() => ({ enabled: true, suppressionsCount: 2 })),
				};
				jest.spyOn(ContextFactory, 'read').mockReturnValue(enabledContext);
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				const debugCalls = (mockFunctions.logger.debug as jest.Mock).mock.calls as Array<[string, Record<string, unknown>?]>;
				const logCall = debugCalls.find((call) => typeof call[0] === 'string' && call[0].includes('applying 2 suppressions'));
				expect(logCall).toBeDefined();
			});
		});

		describe('MD-02: should include segment count in log', () => {
			it('logs segment count at split completion', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text one.', 'Text two.'], 50);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				const debugCalls = (mockFunctions.logger.debug as jest.Mock).mock.calls as Array<[string, Record<string, unknown>?]>;
				const completionCall = debugCalls.find((call) => typeof call[0] === 'string' && call[0].includes('split into 2 segments'));
				expect(completionCall).toBeDefined();
			});
		});

		describe('MD-03: should pass request metadata to tracer', () => {
			it('includes request agentRequestId in log metadata', async () => {
				// Arrange
				const customRequest = new MockAgentRequest();
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(customRequest, ['Text.'], 50);

				// Act
				await supplier.testExecuteSplit(request, abortController.signal);

				// Assert
				expect(mockFunctions.logger.debug).toHaveBeenCalledWith(
					expect.stringMatching(/.+/),
					expect.objectContaining({ agentRequestId: customRequest.agentRequestId }),
				);
			});
		});

		describe('MD-04: should pass response metadata to tracer', () => {
			it('includes response metadata in completion log', async () => {
				// Arrange
				const supplier = new TestEchoGardenSupplier(mockFunctions);
				const request = new SplitRequest(mockAgentRequest, ['Text.'], 50);

				// Act
				const result = (await supplier.testExecuteSplit(request, abortController.signal)) as SplitResponse;

				// Assert
				const debugMock = mockFunctions.logger.debug as jest.Mock<void, [string, Record<string, unknown>]>;
				const completionCall = debugMock.mock.calls.find((call) => call[0].includes('split into'));
				expect(completionCall).toBeDefined();
				if (completionCall) {
					expect(completionCall[1]).toMatchObject(result.asLogMetadata());
				}
			});
		});
	});
});
