/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, Logger } from 'n8n-workflow';

import { CoreError } from 'types/*';
import { Pipeline } from 'utils/*';

import { Tracer } from '../tracer';

/**
 * Test suite for Tracer class
 *
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 * @see tracer.test.md for test plan
 */

describe('Tracer', () => {
	let mockFunctions: IExecuteFunctions;
	let mockLogger: Logger;
	let mockCustomData: Map<string, unknown>;

	beforeEach(() => {
		// Setup mock logger
		mockLogger = mock<Logger>({
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		});

		// Setup mock customData Map
		mockCustomData = new Map<string, unknown>();

		// Setup mock IExecuteFunctions
		mockFunctions = mock<IExecuteFunctions>({
			logger: mockLogger,
			getNode: jest.fn(() => ({ name: 'TestNode' })) as unknown as IExecuteFunctions['getNode'],
			getWorkflow: jest.fn(() => ({ id: 'workflow-123' })) as unknown as IExecuteFunctions['getWorkflow'],
			getExecutionId: jest.fn(() => 'exec-456'),
			getWorkflowDataProxy: jest.fn(() => ({
				$execution: {
					customData: mockCustomData,
				},
			})) as unknown as IExecuteFunctions['getWorkflowDataProxy'],
		});

		// Mock Pipeline.readPipeline by default to return empty
		jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

		// Mock crypto.randomUUID for deterministic testing
		jest.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789abc');
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('constructor & traceId resolution', () => {
		describe('business logic', () => {
			// BL-01: should create tracer with resolved traceId from customData
			it('[BL-01] should create tracer with resolved traceId from customData', () => {
				// ARRANGE
				mockCustomData.set('traceId', 'cached-trace-id');

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('cached-trace-id');
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'🧭 Getting traceId ...',
					expect.objectContaining({
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
					}),
				);
			});

			// BL-02: should extract workflow metadata (nodeName, workflowId, executionId)
			it('[BL-02] should extract workflow metadata (nodeName, workflowId, executionId)', () => {
				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.nodeName).toBe('TestNode');
				expect(tracer.workflowId).toBe('workflow-123');
				expect(tracer.executionId).toBe('exec-456');
			});

			// BL-03: should freeze instance after construction
			it('[BL-03] should freeze instance after construction', () => {
				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(Object.isFrozen(tracer)).toBe(true);

				// Attempting to modify should have no effect (in strict mode would throw)
				expect(() => {
					(tracer as { traceId: string }).traceId = 'new-value';
				}).toThrow();
			});

			// BL-04: should log debug messages during traceId resolution
			it('[BL-04] should log debug messages during traceId resolution', () => {
				// ARRANGE
				mockCustomData.set('traceId', 'cached-trace-id');

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 Getting traceId ...', expect.any(Object));
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 Checking custom data for traceId ...', expect.any(Object));
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 Found traceId in custom data: cached-trace-id', expect.any(Object));
			});
		});

		describe('edge cases', () => {
			// EC-01: should generate new UUID when no upstream traceId found
			it('[EC-01] should generate new UUID when no upstream traceId found', () => {
				// ARRANGE - no customData, empty pipeline
				mockCustomData.clear();
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('12345678-1234-1234-1234-123456789abc');
				expect(crypto.randomUUID).toHaveBeenCalled();
				expect(mockLogger.debug).toHaveBeenCalledWith(
					expect.stringContaining('Generated new traceId: 12345678-1234-1234-1234-123456789abc'),
				);
			}); // EC-02: should use single traceId from pipeline
			it('[EC-02] should use single traceId from pipeline', () => {
				// ARRANGE
				mockCustomData.clear();
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					UpstreamNode: [{ json: { traceId: 'pipeline-trace-id' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('pipeline-trace-id');
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 Found single traceId in pipeline: pipeline-trace-id');
			}); // EC-03: should use first traceId when multiple found and log warning
			it('[EC-03] should use first traceId when multiple found and log warning', () => {
				// ARRANGE
				mockCustomData.clear();
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 'trace-id-1' } }],
					Node2: [{ json: { traceId: 'trace-id-2' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-id-1');
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Multiple traceIds found'),
					expect.objectContaining({
						traceIds: expect.arrayContaining(['trace-id-1', 'trace-id-2']),
					}),
				);
			});

			// EC-04: should handle customData unavailable (no Map)
			it('[EC-04] should handle customData unavailable (no Map)', () => {
				// ARRANGE - customData is not a Map
				mockFunctions.getWorkflowDataProxy = jest.fn(() => ({
					$execution: {
						customData: null,
					},
				})) as unknown as IExecuteFunctions['getWorkflowDataProxy'];

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should fall back to pipeline/generation
				expect(tracer.traceId).toBe('12345678-1234-1234-1234-123456789abc');
			});

			// EC-05: should handle rememberTraceId when customData unavailable
			it('[EC-05] should handle rememberTraceId when customData unavailable', () => {
				// ARRANGE - customData has no .set method
				const badCustomData = { get: jest.fn() };
				mockFunctions.getWorkflowDataProxy = jest.fn(() => ({
					$execution: {
						customData: badCustomData,
					},
				})) as unknown as IExecuteFunctions['getWorkflowDataProxy'];

				// ACT - should not throw even if caching fails
				expect(() => new Tracer(mockFunctions)).not.toThrow();
			});
		});
	});

	describe('logging methods', () => {
		let tracer: Tracer;

		beforeEach(() => {
			mockCustomData.set('traceId', 'test-trace-id');
			tracer = new Tracer(mockFunctions);
		});

		describe('business logic', () => {
			// BL-05: should log debug with enriched metadata
			it('[BL-05] should log debug with enriched metadata', () => {
				// ACT
				tracer.debug('Test debug message', { extra: 'data' });

				// ASSERT
				expect(mockLogger.debug).toHaveBeenCalledWith(
					'Test debug message',
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						extra: 'data',
					}),
				);
			});

			// BL-06: should log info with enriched metadata
			it('[BL-06] should log info with enriched metadata', () => {
				// ACT
				tracer.info('Test info message', { request: 'abc-123' });

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(
					'Test info message',
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						request: 'abc-123',
					}),
				);
			});

			// BL-07: should log warn with enriched metadata
			it('[BL-07] should log warn with enriched metadata', () => {
				// ACT
				tracer.warn('Test warning', { attempt: 2 });

				// ASSERT
				expect(mockLogger.warn).toHaveBeenCalledWith(
					'Test warning',
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						attempt: 2,
					}),
				);
			});

			// BL-08: should log error with enriched metadata
			it('[BL-08] should log error with enriched metadata', () => {
				// ACT
				tracer.error('Test error', { errorCode: 'ERR_001' });

				// ASSERT
				expect(mockLogger.error).toHaveBeenCalledWith(
					'Test error',
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						errorCode: 'ERR_001',
					}),
				);
			});

			// BL-09: should include base context in all logs
			it('[BL-09] should include base context in all logs', () => {
				// ACT
				tracer.debug('Message 1');
				tracer.info('Message 2');
				tracer.warn('Message 3');
				tracer.error('Message 4');

				// ASSERT - all calls include base metadata
				const baseMetadata = {
					traceId: 'test-trace-id',
					nodeName: 'TestNode',
					workflowId: 'workflow-123',
					executionId: 'exec-456',
				};

				expect(mockLogger.debug).toHaveBeenCalledWith('Message 1', baseMetadata);
				expect(mockLogger.info).toHaveBeenCalledWith('Message 2', baseMetadata);
				expect(mockLogger.warn).toHaveBeenCalledWith('Message 3', baseMetadata);
				expect(mockLogger.error).toHaveBeenCalledWith('Message 4', baseMetadata);
			});
		});

		describe('edge cases', () => {
			// EC-06: should merge extension metadata with base context
			it('[EC-06] should merge extension metadata with base context', () => {
				// ACT
				tracer.info('Test', { custom1: 'value1', custom2: 42, custom3: true });

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(
					'Test',
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						custom1: 'value1',
						custom2: 42,
						custom3: true,
					}),
				);
			});

			// EC-07: should handle undefined extension metadata
			it('[EC-07] should handle undefined extension metadata', () => {
				// ACT
				tracer.debug('Test without extension');

				// ASSERT
				expect(mockLogger.debug).toHaveBeenCalledWith('Test without extension', {
					traceId: 'test-trace-id',
					nodeName: 'TestNode',
					workflowId: 'workflow-123',
					executionId: 'exec-456',
				});
			});
		});
	});

	describe('error handling & throwing', () => {
		let tracer: Tracer;

		beforeEach(() => {
			mockCustomData.set('traceId', 'test-trace-id');
			tracer = new Tracer(mockFunctions);
		});

		describe('business logic', () => {
			// BL-10: should log error and throw CoreError with metadata
			it('[BL-10] should log error and throw CoreError with metadata', () => {
				// ARRANGE
				const message = 'Critical failure';
				const extension = { attempt: 5, error: 'timeout' };

				// ACT & ASSERT
				expect(() => tracer.errorAndThrow(message, extension)).toThrow(CoreError);

				// Verify error was logged first
				expect(mockLogger.error).toHaveBeenCalledWith(
					message,
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						attempt: 5,
						error: 'timeout',
					}),
				);
			});
		});

		describe('error handling', () => {
			// EH-01: should throw CoreError with correct message and metadata
			it('[EH-01] should throw CoreError with correct message and metadata', () => {
				// ARRANGE
				const message = 'Test error message';
				const extension = { context: 'test' };

				// ACT & ASSERT
				let caughtError: CoreError | undefined;
				try {
					tracer.errorAndThrow(message, extension);
				} catch (error) {
					caughtError = error as CoreError;
				}

				expect(caughtError).toBeInstanceOf(CoreError);
				expect(caughtError?.message).toBe(message);
				expect(caughtError?.metadata).toEqual(
					expect.objectContaining({
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'exec-456',
						context: 'test',
					}),
				);
			});

			// EH-02: should enrich CoreError with full tracing context
			it('[EH-02] should enrich CoreError with full tracing context', () => {
				// ARRANGE
				const extension = { requestId: 'req-123', latencyMs: 5000 };

				// ACT
				let error: CoreError | undefined;
				try {
					tracer.errorAndThrow('All attempts failed', extension);
				} catch (e) {
					error = e as CoreError;
				}

				// ASSERT
				expect(error?.metadata).toMatchObject({
					traceId: 'test-trace-id',
					nodeName: 'TestNode',
					workflowId: 'workflow-123',
					executionId: 'exec-456',
					requestId: 'req-123',
					latencyMs: 5000,
				});
			});
		});
	});

	describe('pipeline traceId extraction', () => {
		beforeEach(() => {
			mockCustomData.clear(); // Force pipeline extraction
		});

		describe('business logic', () => {
			// BL-11: should extract traceIds from pipeline node outputs
			it('[BL-11] should extract traceIds from pipeline node outputs', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 'trace-from-node1' } }],
					Node2: [{ json: { traceId: 'trace-from-node2' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should extract both and use first
				expect(tracer.traceId).toBe('trace-from-node1');
			});

			// BL-12: should deduplicate multiple instances of same traceId
			it('[BL-12] should deduplicate multiple instances of same traceId', () => {
				// ARRANGE - same traceId from multiple nodes (merge scenario)
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 'shared-trace-id' } }],
					Node2: [{ json: { traceId: 'shared-trace-id' } }],
					Node3: [{ json: { traceId: 'shared-trace-id' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should not log warning (only one unique ID)
				expect(tracer.traceId).toBe('shared-trace-id');
				expect(mockLogger.warn).not.toHaveBeenCalled();
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 Found single traceId in pipeline: shared-trace-id');
			});
		});

		describe('edge cases', () => {
			// EC-08: should handle empty pipeline (no upstream nodes)
			it('[EC-08] should handle empty pipeline (no upstream nodes)', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should generate new UUID
				expect(tracer.traceId).toBe('12345678-1234-1234-1234-123456789abc');
				expect(mockLogger.debug).toHaveBeenCalledWith(
					expect.stringContaining('No traceId found in pipeline. Generated new traceId: 12345678-1234-1234-1234-123456789abc'),
				);
			}); // EC-09: should skip outputs without json.traceId field
			it('[EC-09] should skip outputs without json.traceId field', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { someOtherField: 'value' } }],
					Node2: [{ json: { traceId: 'valid-trace-id' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should only find one traceId
				expect(tracer.traceId).toBe('valid-trace-id');
			});

			// EC-10: should skip outputs where traceId is not a string
			it('[EC-10] should skip outputs where traceId is not a string', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 123 } }], // number
					Node2: [{ json: { traceId: null } }], // null
					Node3: [{ json: { traceId: undefined } }], // undefined
					Node4: [{ json: { traceId: 'valid-string-id' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should only find string traceId
				expect(tracer.traceId).toBe('valid-string-id');
			});

			// EC-11: should handle multiple nodes with different traceIds
			it('[EC-11] should handle multiple nodes with different traceIds', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [
						{ json: { traceId: 'trace-1' } },
						{ json: { traceId: 'trace-1' } }, // duplicate
					],
					Node2: [{ json: { traceId: 'trace-2' } }],
					Node3: [{ json: { data: 'no-trace' } }, { json: { traceId: 'trace-3' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should find 3 unique IDs and use first
				expect(tracer.traceId).toBe('trace-1');
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Multiple traceIds found'),
					expect.objectContaining({
						traceIds: expect.arrayContaining(['trace-1', 'trace-2', 'trace-3']),
					}),
				);
			});
		});
	});

	describe('customData cache operations', () => {
		describe('business logic', () => {
			// BL-13: should retrieve traceId from customData cache
			it('[BL-13] should retrieve traceId from customData cache', () => {
				// ARRANGE
				mockCustomData.set('traceId', 'cached-from-previous-node');

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('cached-from-previous-node');
				expect(Pipeline.readPipeline).not.toHaveBeenCalled(); // Should short-circuit
			});

			// BL-14: should cache traceId in customData for downstream nodes
			it('[BL-14] should cache traceId in customData for downstream nodes', () => {
				// ARRANGE
				mockCustomData.clear();
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 'pipeline-trace' } }],
				});

				// ACT
				new Tracer(mockFunctions);

				// ASSERT - traceId should be cached
				expect(mockCustomData.get('traceId')).toBe('pipeline-trace');
			});
		});

		describe('edge cases', () => {
			// EC-12: should return undefined when customData.get is not a function
			it('[EC-12] should return undefined when customData.get is not a function', () => {
				// ARRANGE - customData object without get method
				const badCustomData = { notAMap: true };
				mockFunctions.getWorkflowDataProxy = jest.fn(() => ({
					$execution: {
						customData: badCustomData,
					},
				})) as unknown as IExecuteFunctions['getWorkflowDataProxy'];

				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 'fallback-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should fall back to pipeline
				expect(tracer.traceId).toBe('fallback-trace');
			});

			// EC-13: should return undefined when traceId in customData is not a string
			it('[EC-13] should return undefined when traceId in customData is not a string', () => {
				// ARRANGE - customData has non-string traceId
				mockCustomData.set('traceId', 12345); // number instead of string

				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					Node1: [{ json: { traceId: 'fallback-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT - should fall back to pipeline
				expect(tracer.traceId).toBe('fallback-trace');
			});

			// EC-14: should handle customData.set not being a function
			it('[EC-14] should handle customData.set not being a function', () => {
				// ARRANGE - customData has get but not set
				const partialCustomData = {
					get: jest.fn().mockReturnValue(undefined),
					// no set method
				};
				mockFunctions.getWorkflowDataProxy = jest.fn(() => ({
					$execution: {
						customData: partialCustomData,
					},
				})) as unknown as IExecuteFunctions['getWorkflowDataProxy'];

				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT - should not throw even if caching fails
				expect(() => new Tracer(mockFunctions)).not.toThrow();
			});
		});
	});
});
