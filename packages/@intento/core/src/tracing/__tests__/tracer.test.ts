import { mock } from 'jest-mock-extended';
import type { INode, Logger, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IFunctions } from '../../types/*';
import { Pipeline } from '../../utils/pipeline';
import { Tracer } from '../tracer';

/**
 * Tests for Tracer
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

jest.mock('../../utils/pipeline');

describe('Tracer', () => {
	let mockFunctions: ReturnType<typeof mock<IFunctions>>;
	let mockLogger: Logger;
	let mockNode: INode;
	let mockCustomData: Map<string, unknown>;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockNode = {
			id: 'test-node-id',
			name: 'TestNode',
			type: 'n8n-nodes-base.test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		mockCustomData = new Map<string, unknown>();

		mockFunctions = mock<IFunctions>();
		Object.defineProperty(mockFunctions, 'logger', { value: mockLogger, writable: true });
		Object.defineProperty(mockFunctions, 'getNode', {
			value: jest.fn().mockReturnValue(mockNode),
			writable: true,
		});
		Object.defineProperty(mockFunctions, 'getWorkflow', {
			value: jest.fn().mockReturnValue({
				id: 'workflow-123',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: false,
				settings: {},
			}),
			writable: true,
		});
		Object.defineProperty(mockFunctions, 'getExecutionId', {
			value: jest.fn().mockReturnValue('execution-456'),
			writable: true,
		});
		Object.defineProperty(mockFunctions, 'getWorkflowDataProxy', {
			value: jest.fn().mockReturnValue({
				$execution: {
					customData: mockCustomData,
				},
			} as never),
			writable: true,
		});

		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('constructor', () => {
		describe('business logic', () => {
			it('[BL-01] should create tracer with traceId from customData', () => {
				// ARRANGE
				const existingTraceId = 'trace-from-custom-data';
				mockCustomData.set('traceId', existingTraceId);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe(existingTraceId);
				expect(tracer.node).toBe(mockNode);
				expect(tracer.log).toBe(mockLogger);
				expect(tracer.workflowId).toBe('workflow-123');
				expect(tracer.executionId).toBe('execution-456');
			});

			it('[BL-02] should create tracer with traceId from pipeline', () => {
				// ARRANGE
				const pipelineTraceId = 'trace-from-pipeline';
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					previousNode: [{ json: { traceId: pipelineTraceId, data: 'test' } }],
				} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe(pipelineTraceId);
				expect(mockCustomData.get('traceId')).toBe(pipelineTraceId);
			});

			it('[BL-03] should create tracer with generated UUID when no traceId found', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
				expect(mockCustomData.get('traceId')).toBe(tracer.traceId);
			});

			it('[BL-04] should freeze tracer instance', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(Object.isFrozen(tracer)).toBe(true);
			});

			it('[BL-05] should extract workflowId and executionId from functions', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.workflowId).toBe('workflow-123');
				expect(tracer.executionId).toBe('execution-456');
				expect(mockFunctions.getWorkflow).toHaveBeenCalled();
				expect(mockFunctions.getExecutionId).toHaveBeenCalled();
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle multiple traceIds in pipeline (use first)', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					node1: [{ json: { traceId: 'trace-1' } }],
					node2: [{ json: { traceId: 'trace-2' } }],
					node3: [{ json: { traceId: 'trace-1' } }], // Duplicate
				} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-1');
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Multiple traceIds found'),
					expect.objectContaining({
						traceIds: expect.arrayContaining(['trace-1', 'trace-2']) as string[],
					}),
				);
			});

			it('[EC-02] should handle empty pipeline data', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			});

			it('[EC-03] should handle pipeline items without traceId field', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					node1: [
						{ json: { data: 'test' } }, // No traceId
						{ json: { traceId: null } }, // Null traceId
						{ json: { traceId: 123 } }, // Non-string traceId
					],
				} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			});

			it('[EC-04] should handle customData without get method', () => {
				// ARRANGE
				const customDataWithoutGet = { notAMap: true } as unknown as Map<string, unknown>;
				const mockedFunctions = mock<IFunctions>();
				Object.defineProperty(mockedFunctions, 'logger', { value: mockLogger, writable: true });
				Object.defineProperty(mockedFunctions, 'getNode', {
					value: jest.fn().mockReturnValue(mockNode),
					writable: true,
				});
				Object.defineProperty(mockedFunctions, 'getWorkflow', {
					value: jest.fn().mockReturnValue({
						id: 'workflow-123',
						name: 'Test Workflow',
						nodes: [],
						connections: {},
						active: false,
						settings: {},
					}),
					writable: true,
				});
				Object.defineProperty(mockedFunctions, 'getExecutionId', {
					value: jest.fn().mockReturnValue('execution-456'),
					writable: true,
				});
				Object.defineProperty(mockedFunctions, 'getWorkflowDataProxy', {
					value: jest.fn().mockReturnValue({
						$execution: {
							customData: customDataWithoutGet,
						},
					} as never),
					writable: true,
				});
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockedFunctions);

				// ASSERT
				expect(tracer.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			});

			it('[EC-05] should handle customData returning non-string traceId', () => {
				// ARRANGE
				mockCustomData.set('traceId', 12345);
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			});

			it('[EC-06] should handle customData without set method', () => {
				// ARRANGE
				const mockInvalidCustomData = { get: () => undefined } as unknown as Map<string, unknown>;
				const mockedFunctions = mock<IFunctions>();
				Object.defineProperty(mockedFunctions, 'logger', { value: mockLogger, writable: true });
				Object.defineProperty(mockedFunctions, 'getNode', {
					value: jest.fn().mockReturnValue(mockNode),
					writable: true,
				});
				Object.defineProperty(mockedFunctions, 'getWorkflow', {
					value: jest.fn().mockReturnValue({
						id: 'workflow-123',
						name: 'Test Workflow',
						nodes: [],
						connections: {},
						active: false,
						settings: {},
					}),
					writable: true,
				});
				Object.defineProperty(mockedFunctions, 'getExecutionId', {
					value: jest.fn().mockReturnValue('execution-456'),
					writable: true,
				});
				Object.defineProperty(mockedFunctions, 'getWorkflowDataProxy', {
					value: jest.fn().mockReturnValue({
						$execution: {
							customData: mockInvalidCustomData,
						},
					} as never),
					writable: true,
				});
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({} as never);

				// ACT
				const tracer = new Tracer(mockedFunctions);

				// ASSERT
				expect(tracer.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
			});
		});
	});

	describe('logging methods', () => {
		let tracer: Tracer;

		beforeEach(() => {
			mockCustomData.set('traceId', 'test-trace-id');
			tracer = new Tracer(mockFunctions);
		});

		describe('debug', () => {
			describe('business logic', () => {
				it('[BL-06] should log debug message with execution context', () => {
					// ARRANGE
					const message = 'Debug message';

					// ACT
					tracer.debug(message);

					// ASSERT
					expect(mockLogger.debug).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
					});
				});

				it('[BL-07] should merge extension metadata with context', () => {
					// ARRANGE
					const message = 'Debug with extension';
					const extension: LogMetadata = { customField: 'value', requestId: '789' };

					// ACT
					tracer.debug(message, extension);

					// ASSERT
					expect(mockLogger.debug).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
						customField: 'value',
						requestId: '789',
					});
				});
			});
		});

		describe('info', () => {
			describe('business logic', () => {
				it('[BL-08] should log info message with execution context', () => {
					// ARRANGE
					const message = 'Info message';

					// ACT
					tracer.info(message);

					// ASSERT
					expect(mockLogger.info).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
					});
				});

				it('[BL-09] should merge extension metadata with context', () => {
					// ARRANGE
					const message = 'Info with extension';
					const extension: LogMetadata = { userId: 'user-123' };

					// ACT
					tracer.info(message, extension);

					// ASSERT
					expect(mockLogger.info).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
						userId: 'user-123',
					});
				});
			});
		});

		describe('warn', () => {
			describe('business logic', () => {
				it('[BL-10] should log warn message with execution context', () => {
					// ARRANGE
					const message = 'Warning message';

					// ACT
					tracer.warn(message);

					// ASSERT
					expect(mockLogger.warn).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
					});
				});

				it('[BL-11] should merge extension metadata with context', () => {
					// ARRANGE
					const message = 'Warning with extension';
					const extension: LogMetadata = { severity: 'medium' };

					// ACT
					tracer.warn(message, extension);

					// ASSERT
					expect(mockLogger.warn).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
						severity: 'medium',
					});
				});
			});
		});

		describe('error', () => {
			describe('business logic', () => {
				it('[BL-12] should log error message with execution context', () => {
					// ARRANGE
					const message = 'Error message';

					// ACT
					tracer.error(message);

					// ASSERT
					expect(mockLogger.error).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
					});
				});

				it('[BL-13] should merge extension metadata with context', () => {
					// ARRANGE
					const message = 'Error with extension';
					const extension: LogMetadata = { errorCode: 'E001', stack: 'stack trace' };

					// ACT
					tracer.error(message, extension);

					// ASSERT
					expect(mockLogger.error).toHaveBeenCalledWith(message, {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
						errorCode: 'E001',
						stack: 'stack trace',
					});
				});
			});
		});
	});

	describe('bugDetected', () => {
		let tracer: Tracer;

		beforeEach(() => {
			mockCustomData.set('traceId', 'test-trace-id');
			tracer = new Tracer(mockFunctions);
		});

		describe('business logic', () => {
			it('[BL-14] should log error and throw NodeOperationError with Error object', () => {
				// ARRANGE
				const where = 'testMethod';
				const error = new Error('Test error');

				// ACT & ASSERT
				expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
				expect(mockLogger.error).toHaveBeenCalledWith(
					expect.stringContaining('🐞 [BUG]') as string,
					expect.objectContaining({
						where,
						error,
					}),
				);
			});

			it('[BL-15] should log error and throw NodeOperationError with string message', () => {
				// ARRANGE
				const where = 'testMethod';
				const errorMessage = 'Test error message';

				// ACT & ASSERT
				expect(() => tracer.bugDetected(where, errorMessage)).toThrow(NodeOperationError);
				expect(mockLogger.error).toHaveBeenCalledWith(
					expect.stringContaining('🐞 [BUG]') as string,
					expect.objectContaining({
						where,
						message: errorMessage,
					}),
				);
			});
		});

		describe('error handling', () => {
			it('[EH-01] should always throw NodeOperationError (never returns)', () => {
				// ARRANGE
				const where = 'testMethod';
				const error = 'Bug detected';

				// ACT & ASSERT
				expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);

				try {
					tracer.bugDetected(where, error);
					fail('Should have thrown');
				} catch (error: unknown) {
					expect(error).toBeInstanceOf(NodeOperationError);
				}
			});

			it('[EH-02] should include where, error, and extension in log metadata', () => {
				// ARRANGE
				const where = 'testMethod';
				const error = 'Bug message';
				const extension: LogMetadata = { context: 'additional info' };

				// ACT
				try {
					tracer.bugDetected(where, error, extension);
				} catch {
					// Expected
				}

				// ASSERT
				expect(mockLogger.error).toHaveBeenCalledWith(
					expect.stringContaining('🐞 [BUG]') as string,
					expect.objectContaining({
						where: 'testMethod',
						message: 'Bug message',
						context: 'additional info',
					}),
				);
			});
		});
	});

	describe('private methods (via constructor behavior)', () => {
		describe('getFromPipeline', () => {
			describe('business logic', () => {
				it('[BL-19] should extract traceIds from pipeline json.traceId fields', () => {
					// ARRANGE
					jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
						node1: [{ json: { traceId: 'trace-abc' } }, { json: { traceId: 'trace-def' } }],
						node2: [{ json: { traceId: 'trace-ghi' } }],
					} as never);

					// ACT
					const tracer = new Tracer(mockFunctions);

					// ASSERT
					// First unique traceId should be used
					expect(['trace-abc', 'trace-def', 'trace-ghi']).toContain(tracer.traceId);
				});

				it('[BL-20] should deduplicate traceIds from multiple nodes', () => {
					// ARRANGE
					jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
						node1: [{ json: { traceId: 'trace-same' } }],
						node2: [{ json: { traceId: 'trace-same' } }],
						node3: [{ json: { traceId: 'trace-same' } }],
					} as never);

					// ACT
					const tracer = new Tracer(mockFunctions);

					// ASSERT
					expect(tracer.traceId).toBe('trace-same');
					// Should not warn about multiple traceIds since they're duplicates
					expect(mockLogger.warn).not.toHaveBeenCalled();
				});
			});
		});

		describe('getCustomData', () => {
			describe('business logic', () => {
				it('[BL-21] should retrieve traceId from customData', () => {
					// ARRANGE
					mockCustomData.set('traceId', 'stored-trace-id');

					// ACT
					const tracer = new Tracer(mockFunctions);

					// ASSERT
					expect(tracer.traceId).toBe('stored-trace-id');
				});
			});
		});

		describe('rememberTraceId', () => {
			describe('business logic', () => {
				it('[BL-22] should store traceId in customData', () => {
					// ARRANGE
					jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
						node1: [{ json: { traceId: 'pipeline-trace' } }],
					} as never);

					// ACT
					const tracer = new Tracer(mockFunctions);

					// ASSERT
					expect(mockCustomData.get('traceId')).toBe('pipeline-trace');
					expect(tracer.traceId).toBe('pipeline-trace');
				});
			});
		});

		describe('getLogMetadata', () => {
			describe('business logic', () => {
				it('[BL-16] should return metadata with traceId, nodeName, workflowId, executionId', () => {
					// ARRANGE
					mockCustomData.set('traceId', 'test-trace-id');
					const tracer = new Tracer(mockFunctions);

					// ACT
					tracer.info('test message');

					// ASSERT
					expect(mockLogger.info).toHaveBeenCalledWith('test message', {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
					});
				});

				it('[BL-17] should merge extension metadata if provided', () => {
					// ARRANGE
					mockCustomData.set('traceId', 'test-trace-id');
					const tracer = new Tracer(mockFunctions);
					const extension: LogMetadata = { extra: 'data' };

					// ACT
					tracer.info('test message', extension);

					// ASSERT
					expect(mockLogger.info).toHaveBeenCalledWith('test message', {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
						extra: 'data',
					});
				});

				it('[BL-18] should work without extension metadata', () => {
					// ARRANGE
					mockCustomData.set('traceId', 'test-trace-id');
					const tracer = new Tracer(mockFunctions);

					// ACT
					tracer.debug('test message');

					// ASSERT
					expect(mockLogger.debug).toHaveBeenCalledWith('test message', {
						traceId: 'test-trace-id',
						nodeName: 'TestNode',
						workflowId: 'workflow-123',
						executionId: 'execution-456',
					});
				});
			});
		});
	});
});
