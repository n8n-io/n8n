import { mock } from 'jest-mock-extended';
import type { INode, Logger } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IFunctions } from 'types/*';

import { Pipeline } from '../../utils/pipeline';
import { Tracer } from '../tracer';

/**
 * Tests for Tracer
 * @author Claude Sonnet 4.5
 * @date 2026-01-06
 */

describe('Tracer', () => {
	let mockLogger: Logger;
	let mockNode: INode;
	let mockFunctions: IFunctions;
	let mockCustomData: Map<string, unknown>;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockNode = {
			id: 'node-123',
			name: 'TestNode',
			type: 'n8n-nodes-base.test',
			typeVersion: 1,
			position: [100, 200],
			parameters: {},
		};

		mockCustomData = new Map<string, unknown>();

		mockFunctions = {
			logger: mockLogger,
			getNode: jest.fn().mockReturnValue(mockNode),
			getWorkflow: jest.fn().mockReturnValue({
				id: 'workflow-456',
				name: 'Test Workflow',
				active: true,
				nodes: [mockNode],
				connections: {},
			}),
			getExecutionId: jest.fn().mockReturnValue('execution-789'),
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: mockCustomData,
				},
			}),
		} as unknown as IFunctions;

		jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});
		jest.spyOn(crypto, 'randomUUID').mockReturnValue('generated-uuid-123' as `${string}-${string}-${string}-${string}-${string}`);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('[BL-01] should create tracer with all properties initialized', () => {
			// ARRANGE & ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(tracer.log).toBe(mockLogger);
			expect(tracer.traceId).toBe('generated-uuid-123');
			expect(tracer.workflowId).toBe('workflow-456');
			expect(tracer.executionId).toBe('execution-789');
		});

		it('[BL-02] should extract node from IFunctions', () => {
			// ARRANGE & ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(mockFunctions.getNode).toHaveBeenCalled();
			expect((tracer as unknown as { node: unknown }).node).toBe(mockNode);
		});

		it('[BL-03] should extract workflowId from workflow', () => {
			// ARRANGE & ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(mockFunctions.getWorkflow).toHaveBeenCalled();
			expect(tracer.workflowId).toBe('workflow-456');
		});

		it('[BL-04] should extract executionId from IFunctions', () => {
			// ARRANGE & ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(mockFunctions.getExecutionId).toHaveBeenCalled();
			expect(tracer.executionId).toBe('execution-789');
		});

		it('[BL-05] should resolve traceId via getTraceId', () => {
			// ARRANGE & ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(tracer.traceId).toBe('generated-uuid-123');
			expect(crypto.randomUUID).toHaveBeenCalled();
		});

		it('[BL-06] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(Object.isFrozen(tracer)).toBe(true);
		});

		it('[EC-01] should handle workflow with generated UUID workflowId', () => {
			// ARRANGE
			const uuidWorkflowId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
			(mockFunctions.getWorkflow as jest.Mock).mockReturnValue({
				id: uuidWorkflowId,
				name: 'UUID Workflow',
			});

			// ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(tracer.workflowId).toBe(uuidWorkflowId);
		});

		it('[EC-02] should handle empty executionId string', () => {
			// ARRANGE
			(mockFunctions.getExecutionId as jest.Mock).mockReturnValue('');

			// ACT
			const tracer = new Tracer(mockFunctions);

			// ASSERT
			expect(tracer.executionId).toBe('');
		});
	});

	describe('logging methods', () => {
		let tracer: Tracer;

		beforeEach(() => {
			tracer = new Tracer(mockFunctions);
		});

		describe('debug', () => {
			it('[BL-07] should log debug message with metadata', () => {
				// ARRANGE
				const message = 'Debug test message';
				const extension = { userId: '123' };

				// ACT
				tracer.debug(message, extension);

				// ASSERT
				expect(mockLogger.debug).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
					userId: '123',
				});
			});
		});

		describe('info', () => {
			it('[BL-08] should log info message with metadata', () => {
				// ARRANGE
				const message = 'Info test message';
				const extension = { requestId: 'req-456' };

				// ACT
				tracer.info(message, extension);

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
					requestId: 'req-456',
				});
			});
		});

		describe('warn', () => {
			it('[BL-09] should log warn message with metadata', () => {
				// ARRANGE
				const message = 'Warning test message';
				const extension = { attempts: 3 };

				// ACT
				tracer.warn(message, extension);

				// ASSERT
				expect(mockLogger.warn).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
					attempts: 3,
				});
			});
		});

		describe('error', () => {
			it('[BL-10] should log error message with metadata', () => {
				// ARRANGE
				const message = 'Error test message';
				const extension = { errorCode: 'E001' };

				// ACT
				tracer.error(message, extension);

				// ASSERT
				expect(mockLogger.error).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
					errorCode: 'E001',
				});
			});
		});

		describe('metadata enrichment', () => {
			it('[BL-11] should include standard metadata in all log calls', () => {
				// ARRANGE
				const message = 'Test message';

				// ACT
				tracer.debug(message);
				tracer.info(message);
				tracer.warn(message);
				tracer.error(message);

				// ASSERT
				const expectedMetadata = {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
				};
				expect(mockLogger.debug).toHaveBeenCalledWith(message, expectedMetadata);
				expect(mockLogger.info).toHaveBeenCalledWith(message, expectedMetadata);
				expect(mockLogger.warn).toHaveBeenCalledWith(message, expectedMetadata);
				expect(mockLogger.error).toHaveBeenCalledWith(message, expectedMetadata);
			});

			it('[BL-12] should merge extension metadata with standard metadata', () => {
				// ARRANGE
				const message = 'Test message';
				const extension = { custom: 'value', extra: 42 };

				// ACT
				tracer.info(message, extension);

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
					custom: 'value',
					extra: 42,
				});
			});

			it('[EC-03] should log without extension metadata (undefined)', () => {
				// ARRANGE
				const message = 'Test message';

				// ACT
				tracer.info(message);

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
				});
			});

			it('[EC-04] should handle empty extension object', () => {
				// ARRANGE
				const message = 'Test message';

				// ACT
				tracer.info(message, {});

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(message, {
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
				});
			});

			it('[EC-05] should allow extension to override standard metadata', () => {
				// ARRANGE
				const message = 'Test message';
				const extension = { traceId: 'overridden-trace', nodeName: 'OverriddenNode' };

				// ACT
				tracer.info(message, extension);

				// ASSERT
				expect(mockLogger.info).toHaveBeenCalledWith(message, {
					traceId: 'overridden-trace',
					nodeName: 'OverriddenNode',
					workflowId: 'workflow-456',
					executionId: 'execution-789',
				});
			});
		});
	});

	describe('bugDetected', () => {
		let tracer: Tracer;

		beforeEach(() => {
			tracer = new Tracer(mockFunctions);
		});

		it('[BL-13] should log error with bug prefix and where location', () => {
			// ARRANGE
			const where = 'MyClass.myMethod';
			const error = new Error('Something broke');

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith("🐞 [BUG] at 'MyClass.myMethod'. Node TestNode thrown error: Something broke", {
				where: 'MyClass.myMethod',
				error,
			});
		});

		it('[BL-14] should throw NodeOperationError with formatted message', () => {
			// ARRANGE
			const where = 'TestLocation';
			const error = 'Test error message';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(() => tracer.bugDetected(where, error)).toThrow("🐞 [BUG] at 'TestLocation'. Node TestNode thrown error: Test error message");
		});

		it('[BL-15] should handle Error object with message property', () => {
			// ARRANGE
			const where = 'ErrorHandler';
			const error = new Error('Error object message');

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error object message'), expect.objectContaining({ error }));
		});

		it('[BL-16] should handle string error message', () => {
			// ARRANGE
			const where = 'StringHandler';
			const error = 'String error message';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('String error message'),
				expect.objectContaining({ message: 'String error message' }),
			);
		});

		it('[BL-17] should include where in metadata', () => {
			// ARRANGE
			const where = 'SpecificLocation';
			const error = 'Test error';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ where: 'SpecificLocation' }));
		});

		it('[BL-18] should include error in metadata when Error object', () => {
			// ARRANGE
			const where = 'ErrorTest';
			const error = new Error('Error instance');

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ error }));
		});

		it('[BL-19] should include message in metadata when string', () => {
			// ARRANGE
			const where = 'StringTest';
			const error = 'String message';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ message: 'String message' }));
		});

		it('[BL-20] should merge extension metadata into error log', () => {
			// ARRANGE
			const where = 'ExtensionTest';
			const error = 'Test error';
			const extension = { userId: '123', requestId: 'req-456' };

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error, extension)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					where: 'ExtensionTest',
					message: 'Test error',
					userId: '123',
					requestId: 'req-456',
				}),
			);
		});

		it('[EC-06] should handle bugDetected without extension metadata', () => {
			// ARRANGE
			const where = 'NoExtension';
			const error = 'Test error';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					where: 'NoExtension',
					message: 'Test error',
				}),
			);
		});

		it('[EC-07] should format node name in error message', () => {
			// ARRANGE
			const where = 'NodeNameTest';
			const error = 'Test error';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow(NodeOperationError);
			expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Node TestNode'), expect.any(Object));
		});

		it('[EH-01] should throw NodeOperationError with correct node', () => {
			// ARRANGE
			const where = 'NodeTest';
			const error = 'Test error';

			// ACT & ASSERT
			try {
				tracer.bugDetected(where, error);
				fail('Should have thrown NodeOperationError');
			} catch (caughtError) {
				expect(caughtError).toBeInstanceOf(NodeOperationError);
				expect((caughtError as NodeOperationError).node).toBe(mockNode);
			}
		});

		it('[EH-02] should never return (return type is never)', () => {
			// ARRANGE
			const where = 'NeverReturn';
			const error = 'Test error';

			// ACT & ASSERT
			expect(() => tracer.bugDetected(where, error)).toThrow();
			// TypeScript type system enforces `never` return type at compile time
		});
	});

	describe('traceId resolution', () => {
		describe('from customData', () => {
			it('[BL-26] should return traceId from customData if exists', () => {
				// ARRANGE
				mockCustomData.set('traceId', 'trace-from-custom');

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-from-custom');
				expect(crypto.randomUUID).not.toHaveBeenCalled();
			});

			it('[BL-37] should return traceId from customData if exists', () => {
				// ARRANGE
				mockCustomData.set('traceId', 'custom-trace-123');

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('custom-trace-123');
			});

			it('[BL-38] should access execution via workflow data proxy', () => {
				// ARRANGE
				mockCustomData.set('traceId', 'proxy-trace');

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(mockFunctions.getWorkflowDataProxy).toHaveBeenCalledWith(0);
			});

			it('[BL-39] should return undefined if customData missing', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {
						customData: undefined,
					},
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
				expect(crypto.randomUUID).toHaveBeenCalled();
			});

			it('[BL-40] should return undefined if customData.get not a function', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {
						customData: { get: 'not-a-function' },
					},
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
				expect(crypto.randomUUID).toHaveBeenCalled();
			});

			it('[BL-41] should return undefined if traceId is not a string', () => {
				// ARRANGE
				mockCustomData.set('traceId', 12345);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
				expect(crypto.randomUUID).toHaveBeenCalled();
			});

			it('[EC-19] should return undefined when customData is null', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {
						customData: null,
					},
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
			});

			it('[EC-20] should return undefined when customData is undefined', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {},
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
			});

			it('[EC-21] should return undefined when traceId is number/boolean', () => {
				// ARRANGE
				mockCustomData.set('traceId', true);

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
			});
		});

		describe('from pipeline', () => {
			it('[BL-27] should extract traceId from pipeline if customData empty', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'trace-from-pipeline', data: 'value' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-from-pipeline');
				expect(crypto.randomUUID).not.toHaveBeenCalled();
			});

			it('[BL-33] should extract traceIds from pipeline node outputs', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'trace-111' } }],
					NODE_2: [{ json: { traceId: 'trace-222' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-111');
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Multiple traceIds found'),
					expect.objectContaining({ traceIds: ['trace-111', 'trace-222'] }),
				);
			});

			it('[BL-34] should read pipeline using Pipeline.readPipeline', () => {
				// ARRANGE
				const readPipelineSpy = jest.spyOn(Pipeline, 'readPipeline');

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(readPipelineSpy).toHaveBeenCalledWith(mockFunctions);
			});

			it('[BL-35] should check json.traceId exists and is string', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'valid-trace' } }],
					NODE_2: [{ json: { traceId: 123 } }], // non-string
					NODE_3: [{ json: { data: 'no-traceId' } }], // missing
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('valid-trace');
			});

			it('[BL-36] should return deduplicated array via Set', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'trace-111' } }],
					NODE_2: [{ json: { traceId: 'trace-111' } }], // duplicate
					NODE_3: [{ json: { traceId: 'trace-111' } }], // duplicate
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-111');
				expect(mockLogger.warn).not.toHaveBeenCalled(); // Only one unique ID
			});

			it('[EC-13] should return empty array if pipeline is empty', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
				expect(crypto.randomUUID).toHaveBeenCalled();
			});

			it('[EC-14] should skip entries without json.traceId', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { data: 'no-traceId' } }],
					NODE_2: [{ json: { traceId: 'valid-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('valid-trace');
			});

			it('[EC-15] should skip entries with non-string traceId', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 12345 } }],
					NODE_2: [{ json: { traceId: null } }],
					NODE_3: [{ json: { traceId: 'valid-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('valid-trace');
			});

			it('[EC-16] should handle multiple nodes with same traceId', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'shared-trace' } }],
					NODE_2: [{ json: { traceId: 'shared-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('shared-trace');
				expect(mockLogger.warn).not.toHaveBeenCalled(); // Deduplicated to single ID
			});

			it('[EC-17] should handle multiple nodes with different traceIds', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'trace-aaa' } }],
					NODE_2: [{ json: { traceId: 'trace-bbb' } }],
					NODE_3: [{ json: { traceId: 'trace-ccc' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('trace-aaa');
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Multiple traceIds found'),
					expect.objectContaining({ traceIds: ['trace-aaa', 'trace-bbb', 'trace-ccc'] }),
				);
			});

			it('[EC-18] should handle pipeline with mixed valid/invalid traceIds', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 123 } }], // invalid
					NODE_2: [{ json: { data: 'value' } }], // missing
					NODE_3: [{ json: { traceId: 'valid-1' } }], // valid
					NODE_4: [{ json: { traceId: null } }], // invalid
					NODE_5: [{ json: { traceId: 'valid-2' } }], // valid
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('valid-1');
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Multiple traceIds found'),
					expect.objectContaining({ traceIds: ['valid-1', 'valid-2'] }),
				);
			});
		});

		describe('generate new', () => {
			it('[BL-28] should generate new UUID if no traceId found', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
				expect(crypto.randomUUID).toHaveBeenCalled();
			});

			it('[EC-10] should handle empty pipeline (no upstream nodes)', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('generated-uuid-123');
				expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Generated new traceId'), expect.any(Object));
			});

			it('[EC-11] should handle pipeline with single traceId', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'single-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('single-trace');
				expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Found single traceId in pipeline'), expect.any(Object));
			});

			it('[EC-12] should deduplicate identical traceIds from pipeline', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'dup-trace' } }, { json: { traceId: 'dup-trace' } }],
					NODE_2: [{ json: { traceId: 'dup-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('dup-trace');
				expect(mockLogger.warn).not.toHaveBeenCalled(); // Single unique ID after deduplication
			});
		});

		describe('multiple traceIds', () => {
			it('[BL-29] should use first traceId when multiple found', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'first-trace' } }],
					NODE_2: [{ json: { traceId: 'second-trace' } }],
					NODE_3: [{ json: { traceId: 'third-trace' } }],
				});

				// ACT
				const tracer = new Tracer(mockFunctions);

				// ASSERT
				expect(tracer.traceId).toBe('first-trace');
			});

			it('[BL-30] should warn when multiple traceIds in pipeline', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'trace-aaa' } }],
					NODE_2: [{ json: { traceId: 'trace-bbb' } }],
				});

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(mockLogger.warn).toHaveBeenCalledWith(
					'🧭 [Tracer] Multiple traceIds found in pipeline. Using the first one: trace-aaa',
					expect.objectContaining({
						traceIds: ['trace-aaa', 'trace-bbb'],
					}),
				);
			});
		});

		describe('storage', () => {
			it('[BL-31] should store traceId in customData after resolution', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(mockCustomData.get('traceId')).toBe('generated-uuid-123');
			});

			it('[BL-42] should store traceId in customData.set', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({
					NODE_1: [{ json: { traceId: 'pipeline-trace' } }],
				});
				const setSpy = jest.spyOn(mockCustomData, 'set');

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(setSpy).toHaveBeenCalledWith('traceId', 'pipeline-trace');
			});

			it('[BL-43] should access execution via workflow data proxy', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(mockFunctions.getWorkflowDataProxy).toHaveBeenCalledWith(0);
			});

			it('[BL-44] should call customData.set with traceId key and value', () => {
				// ARRANGE
				const setSpy = jest.spyOn(mockCustomData, 'set');

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(setSpy).toHaveBeenCalledWith('traceId', 'generated-uuid-123');
			});

			it('[EC-22] should silently ignore if customData is null', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {
						customData: null,
					},
				});

				// ACT & ASSERT
				expect(() => new Tracer(mockFunctions)).not.toThrow();
			});

			it('[EC-23] should silently ignore if customData is undefined', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {},
				});

				// ACT & ASSERT
				expect(() => new Tracer(mockFunctions)).not.toThrow();
			});

			it('[EC-24] should silently ignore if customData.set not a function', () => {
				// ARRANGE
				(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
					$execution: {
						customData: { set: 'not-a-function' },
					},
				});

				// ACT & ASSERT
				expect(() => new Tracer(mockFunctions)).not.toThrow();
			});
		});

		describe('logging during resolution', () => {
			it('[BL-32] should log debug messages during resolution process', () => {
				// ARRANGE
				jest.spyOn(Pipeline, 'readPipeline').mockReturnValue({});

				// ACT
				new Tracer(mockFunctions);

				// ASSERT
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 [Tracer] Getting traceId ...', expect.any(Object));
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 [Tracer] Checking custom data for traceId ...', expect.any(Object));
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 [Tracer] Extracting traceIds from pipeline ...', expect.any(Object));
				expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Generated new traceId'), expect.any(Object));
				expect(mockLogger.debug).toHaveBeenCalledWith('🧭 [Tracer] Remembering traceId in custom data...', expect.any(Object));
			});
		});
	});

	describe('getLogMetadata (private)', () => {
		let tracer: Tracer;

		beforeEach(() => {
			tracer = new Tracer(mockFunctions);
		});

		it('[BL-21] should return metadata with all standard fields', () => {
			// ARRANGE & ACT
			tracer.info('test');

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith(
				'test',
				expect.objectContaining({
					traceId: expect.any(String) as string,
					nodeName: expect.any(String) as string,
					workflowId: expect.any(String) as string,
					executionId: expect.any(String) as string,
				}),
			);
		});

		it('[BL-22] should include traceId in metadata', () => {
			// ARRANGE & ACT
			tracer.info('test');

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith('test', expect.objectContaining({ traceId: 'generated-uuid-123' }));
		});

		it('[BL-23] should include nodeName in metadata', () => {
			// ARRANGE & ACT
			tracer.info('test');

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith('test', expect.objectContaining({ nodeName: 'TestNode' }));
		});

		it('[BL-24] should include workflowId in metadata', () => {
			// ARRANGE & ACT
			tracer.info('test');

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith('test', expect.objectContaining({ workflowId: 'workflow-456' }));
		});

		it('[BL-25] should include executionId in metadata', () => {
			// ARRANGE & ACT
			tracer.info('test');

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith('test', expect.objectContaining({ executionId: 'execution-789' }));
		});

		it('[EC-08] should merge extension with standard metadata (extension priority)', () => {
			// ARRANGE
			const extension = { traceId: 'override-trace', custom: 'value' };

			// ACT
			tracer.info('test', extension);

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith(
				'test',
				expect.objectContaining({
					traceId: 'override-trace',
					nodeName: 'TestNode',
					custom: 'value',
				}),
			);
		});

		it('[EC-09] should handle undefined extension gracefully', () => {
			// ARRANGE & ACT
			tracer.info('test', undefined);

			// ASSERT
			expect(mockLogger.info).toHaveBeenCalledWith(
				'test',
				expect.objectContaining({
					traceId: 'generated-uuid-123',
					nodeName: 'TestNode',
				}),
			);
		});
	});
});
