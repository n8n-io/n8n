/* eslint-disable @typescript-eslint/naming-convention */
import { mock } from 'jest-mock-extended';
import type { INode, Logger } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IDescriptor } from '../../types/i-descriptor';
import type { IFunctions } from '../../types/i-functions';
import { Pipeline } from '../../utils/pipeline';
import { Tracer } from '../tracer';

/**
 * Tests for Tracer
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

// Mock Pipeline utility
jest.mock('../../utils/pipeline');

describe('Tracer', () => {
	let mockLogger: Logger;
	let mockNode: INode;
	let mockFunctions: IFunctions;
	let mockDescriptor: IDescriptor;
	let mockCryptoRandomUUID: jest.SpyInstance;
	let mockCustomData: Map<string, unknown>;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockNode = mock<INode>({ name: 'TestNode' });
		mockCustomData = new Map<string, unknown>();

		mockFunctions = mock<IFunctions>({
			logger: mockLogger,
			getNode: () => mockNode,
			getWorkflow: () => ({ id: 'workflow-123' }) as never,
			getExecutionId: () => 'execution-456',
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: mockCustomData,
				},
			}),
		});

		mockDescriptor = {
			symbol: '🔧',
			name: 'test-descriptor',
			tool: 'test-tool',
			node: 'test-node',
			displayName: 'Test Descriptor',
			description: 'Test descriptor for testing',
		};

		mockCryptoRandomUUID = jest.spyOn(crypto, 'randomUUID');
		(Pipeline.readPipeline as jest.Mock).mockReturnValue({});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should initialize with descriptor symbol', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.symbol).toBe('🔧');
		});

		it('[BL-02] should initialize with node from functions', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.node).toBe(mockNode);
		});

		it('[BL-03] should initialize with workflowId from functions', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.workflowId).toBe('workflow-123');
		});

		it('[BL-04] should initialize with executionId from functions', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.executionId).toBe('execution-456');
		});

		it('[BL-05] should freeze object after construction', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(Object.isFrozen(tracer)).toBe(true);
		});

		it('[BL-06] should log debug with metadata', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			tracer.debug('Test debug message');

			expect(mockLogger.debug).toHaveBeenCalledWith('🔧 Test debug message', {
				traceId: 'generated-uuid',
				nodeName: 'TestNode',
				workflowId: 'workflow-123',
				executionId: 'execution-456',
			});
		});

		it('[BL-07] should log info with metadata', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			tracer.info('Test info message');

			expect(mockLogger.info).toHaveBeenCalledWith('🔧 Test info message', {
				traceId: 'generated-uuid',
				nodeName: 'TestNode',
				workflowId: 'workflow-123',
				executionId: 'execution-456',
			});
		});

		it('[BL-08] should log warn with metadata', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			tracer.warn('Test warn message');

			expect(mockLogger.warn).toHaveBeenCalledWith('🔧 Test warn message', {
				traceId: 'generated-uuid',
				nodeName: 'TestNode',
				workflowId: 'workflow-123',
				executionId: 'execution-456',
			});
		});

		it('[BL-09] should log error with metadata', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			tracer.error('Test error message');

			expect(mockLogger.error).toHaveBeenCalledWith('🔧 Test error message', {
				traceId: 'generated-uuid',
				nodeName: 'TestNode',
				workflowId: 'workflow-123',
				executionId: 'execution-456',
			});
		});

		it('[BL-10] should include extension metadata in logs', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			tracer.info('Test message', { customField: 'customValue' });

			expect(mockLogger.info).toHaveBeenCalledWith('🔧 Test message', {
				traceId: 'generated-uuid',
				nodeName: 'TestNode',
				workflowId: 'workflow-123',
				executionId: 'execution-456',
				customField: 'customValue',
			});
		});

		it('[BL-11] should generate UUID when no traceId in custom data or pipeline', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('generated-uuid');
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'🔧 No traceId found in pipeline. Generated new traceId: generated-uuid',
				expect.objectContaining({ workflowId: 'workflow-123' }),
			);
		});

		it('[BL-12] should use traceId from custom data when available', () => {
			mockCustomData.set('traceId', 'cached-trace-id');

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('cached-trace-id');
			expect(mockLogger.info).toHaveBeenCalledWith('🔧 Found traceId in custom data: cached-trace-id', expect.any(Object));
		});

		it('[BL-13] should use single traceId from pipeline', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'pipeline-trace-id' } }],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('pipeline-trace-id');
			expect(mockLogger.info).toHaveBeenCalledWith('🔧 Found single traceId in pipeline: pipeline-trace-id', expect.any(Object));
		});

		it('[BL-14] should deduplicate traceIds from pipeline', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'duplicate-id' } }],
				'Node B': [{ json: { traceId: 'duplicate-id' } }],
				'Node C': [{ json: { traceId: 'duplicate-id' } }],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('duplicate-id');
			expect(mockLogger.info).toHaveBeenCalledWith('🔧 Found single traceId in pipeline: duplicate-id', expect.any(Object));
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should use first traceId when multiple found in pipeline', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'first-trace-id' } }],
				'Node B': [{ json: { traceId: 'second-trace-id' } }],
				'Node C': [{ json: { traceId: 'third-trace-id' } }],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('first-trace-id');
		});

		it('[EC-02] should log multiple traceIds in warning when multiple found', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'first-trace-id' } }],
				'Node B': [{ json: { traceId: 'second-trace-id' } }],
			});

			new Tracer(mockDescriptor, mockFunctions);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'🔧 Multiple traceIds found in pipeline. Using the first one: first-trace-id',
				expect.objectContaining({
					traceIds: ['first-trace-id', 'second-trace-id'],
				}),
			);
		});

		it('[EC-03] should cache resolved traceId in custom data', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'pipeline-trace-id' } }],
			});

			new Tracer(mockDescriptor, mockFunctions);

			expect(mockCustomData.get('traceId')).toBe('pipeline-trace-id');
		});

		it('[EC-04] should extract traceId from pipeline json field', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [
					{ json: { traceId: 'valid-trace-id', otherField: 'value' } },
					{ json: { otherField: 'value' } }, // no traceId
				],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('valid-trace-id');
		});

		it('[EC-05] should return undefined when customData not available', () => {
			(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
				$execution: {
					customData: undefined,
				},
			});
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('generated-uuid');
		});

		it('[EC-06] should return undefined when traceId not string in customData', () => {
			mockCustomData.set('traceId', 123); // non-string value
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('generated-uuid');
		});

		it('[EC-07] should silently fail when custom data unavailable for caching', () => {
			(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
				$execution: {
					customData: undefined,
				},
			});
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'pipeline-trace-id' } }],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('pipeline-trace-id');
			// Should not throw even though caching fails
		});

		it('[EC-08] should handle empty pipeline', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({});
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('generated-uuid');
		});

		it('[EC-09] should skip pipeline items without json.traceId', () => {
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [
					{ json: {} }, // no traceId
					{ json: { traceId: 123 } }, // non-string traceId
					{ json: { traceId: 'valid-trace-id' } }, // valid
				],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('valid-trace-id');
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw NodeOperationError in bugDetected', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(() => tracer.bugDetected('TestClass', 'Something went wrong')).toThrow(NodeOperationError);
		});

		it('[EH-02] should log error before throwing in bugDetected', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			try {
				tracer.bugDetected('TestClass', 'Something went wrong');
			} catch {
				// Expected error
			}

			expect(mockLogger.error).toHaveBeenCalledWith("🔧 Bug detected at 'TestClass': Something went wrong", expect.any(Object));
		});

		it('[EH-03] should include where and error in bugDetected message', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			try {
				tracer.bugDetected('TestClass.testMethod', 'Invalid state detected');
			} catch (error) {
				expect((error as Error).message).toBe("Bug detected at 'TestClass.testMethod': Invalid state detected");
			}
		});

		it('[EH-04] should include extension metadata in bugDetected', () => {
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);
			const tracer = new Tracer(mockDescriptor, mockFunctions);

			try {
				tracer.bugDetected('TestClass', 'Bug found', { additionalInfo: 'context' });
			} catch {
				// Expected error
			}

			expect(mockLogger.error).toHaveBeenCalledWith(
				"🔧 Bug detected at 'TestClass': Bug found",
				expect.objectContaining({
					additionalInfo: 'context',
				}),
			);
		});

		it('[EH-05] should handle customData.get not being a function', () => {
			(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
				$execution: {
					customData: { get: 'not-a-function' }, // invalid
				},
			});
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('generated-uuid');
		});

		it('[EH-06] should handle customData.set not being a function', () => {
			(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
				$execution: {
					customData: { set: 'not-a-function' }, // invalid
				},
			});
			(Pipeline.readPipeline as jest.Mock).mockReturnValue({
				'Node A': [{ json: { traceId: 'pipeline-trace-id' } }],
			});

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('pipeline-trace-id');
			// Should not throw even though set fails
		});

		it('[EH-07] should handle non-string traceId in customData', () => {
			mockCustomData.set('traceId', { invalid: 'object' }); // non-string
			mockCryptoRandomUUID.mockReturnValue('generated-uuid' as `${string}-${string}-${string}-${string}-${string}`);

			const tracer = new Tracer(mockDescriptor, mockFunctions);

			expect(tracer.traceId).toBe('generated-uuid');
		});
	});
});
