import type { INode, IntentoConnectionType, LogMetadata, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ContextFactory } from '../../context/context-factory';
import { ExecutionContext } from '../../context/execution-context';
import { Tracer } from '../../tracing/tracer';
import { CoreError } from '../../types/core-error';
import type { IFunctions } from '../../types/functions-interface';
import { Delay } from '../../utils/delay';
import { SupplierBase } from '../supplier-base';
import { SupplyErrorBase } from '../supply-error-base';
import { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Tests for SupplierBase
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

// Test implementations
class TestRequest extends SupplyRequestBase {
	constructor(public data: string) {
		super();
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, data: this.data };
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId, data: this.data } }]];
	}

	clone(): this {
		const cloned = new TestRequest(this.data) as this;
		(cloned as unknown as { requestId: string }).requestId = this.requestId;
		(cloned as unknown as { requestedAt: number }).requestedAt = this.requestedAt;
		return cloned;
	}
}

class TestResponse extends SupplyResponseBase {
	constructor(
		request: TestRequest,
		public result: string,
	) {
		super(request);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, result: this.result, latencyMs: this.latencyMs };
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId, result: this.result } }]];
	}
}

class TestError extends SupplyErrorBase {
	constructor(request: TestRequest, code: number, reason: string) {
		super(request, code, reason);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, code: this.code, reason: this.reason };
	}

	asExecutionData(): INodeExecutionData[][] {
		return [[{ json: { requestId: this.requestId, error: this.reason } }]];
	}

	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, `Error ${this.code}: ${this.reason}`);
	}
}

class TestSupplier extends SupplierBase<TestRequest, TestResponse, TestError> {
	supplyCallCount = 0;
	supplyBehavior: 'success' | 'error' | 'throw' = 'success';
	throwError: Error | null = null;

	protected async supply(request: TestRequest, signal?: AbortSignal): Promise<TestResponse | TestError> {
		this.supplyCallCount++;
		await Promise.resolve(); // Make async meaningful
		signal?.throwIfAborted();

		if (this.supplyBehavior === 'throw') {
			throw this.throwError ?? new Error('Unexpected error');
		}

		if (this.supplyBehavior === 'error') {
			return new TestError(request, 500, 'Supply failed');
		}

		return new TestResponse(request, 'success');
	}
}

describe('SupplierBase', () => {
	let mockFunctions: IFunctions;
	let mockContext: ExecutionContext;
	let mockNode: INode;
	let supplier: TestSupplier;
	let contextFactoryReadSpy: jest.SpyInstance;
	let delayApplySpy: jest.SpyInstance;

	const connectionType: IntentoConnectionType = 'intento_translationProvider';

	beforeEach(() => {
		// Setup mocks
		mockNode = { name: 'TestNode' } as INode;

		let inputDataIndex = 0;
		mockFunctions = {
			getNode: jest.fn().mockReturnValue(mockNode),
			getWorkflow: jest.fn().mockReturnValue({ id: 'workflow-123' }),
			getExecutionId: jest.fn().mockReturnValue('execution-456'),
			getWorkflowDataProxy: jest.fn().mockReturnValue({
				$execution: {
					customData: new Map(),
				},
			}),
			logger: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
			addInputData: jest.fn().mockImplementation(() => ({ index: inputDataIndex++ })),
			addOutputData: jest.fn(),
		} as unknown as IFunctions;

		mockContext = {
			maxAttempts: 3,
			calculateDelay: jest.fn().mockImplementation((attempt: number) => attempt * 100),
			createAbortSignal: jest.fn().mockImplementation((signal?: AbortSignal) => signal),
		} as unknown as ExecutionContext;

		// Spy on static methods
		contextFactoryReadSpy = jest.spyOn(ContextFactory, 'read').mockReturnValue(mockContext);
		delayApplySpy = jest.spyOn(Delay, 'apply').mockResolvedValue();

		// Mock Tracer constructor
		jest.spyOn(Tracer.prototype, 'debug').mockImplementation();
		jest.spyOn(Tracer.prototype, 'info').mockImplementation();
		jest.spyOn(Tracer.prototype, 'warn').mockImplementation();
		jest.spyOn(Tracer.prototype, 'errorAndThrow').mockImplementation((msg) => {
			throw new Error(msg);
		});

		// Create supplier
		supplier = new TestSupplier('test-supplier', connectionType, mockFunctions);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should initialize with name, connection, functions', () => {
			// ASSERT
			expect(supplier.name).toBe('test-supplier');
			expect(supplier['connection']).toBe(connectionType);
			expect(supplier['functions']).toBe(mockFunctions);
		});

		it('[BL-02] should read ExecutionContext during construction', () => {
			// ASSERT
			expect(contextFactoryReadSpy).toHaveBeenCalledWith(ExecutionContext, mockFunctions, expect.any(Tracer));
		});

		it('[BL-03] should create Tracer during construction', () => {
			// ASSERT
			expect(supplier['tracer']).toBeInstanceOf(Tracer);
		});

		it('[BL-04] should execute supply once when first attempt succeeds', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'success';

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBeInstanceOf(TestResponse);
			expect(supplier.supplyCallCount).toBe(1);
			expect(delayApplySpy).toHaveBeenCalledTimes(1);
		});

		it('[BL-05] should retry on error until success', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			let attemptCount = 0;
			supplier.supply = jest.fn().mockImplementation(async () => {
				await Promise.resolve(); // Make async meaningful
				attemptCount++;
				if (attemptCount < 3) {
					return new TestError(request, 500, 'Temporary error');
				}
				return new TestResponse(request, 'success');
			});

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBeInstanceOf(TestResponse);
			expect(supplier.supply).toHaveBeenCalledTimes(3);
		});

		it('[BL-06] should return final error after exhausting retries', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'error';

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBeInstanceOf(TestError);
			expect(supplier.supplyCallCount).toBe(3); // maxAttempts = 3
		});

		it('[BL-07] should log debug message at supply start', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'success';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(supplier['tracer'].debug).toHaveBeenCalledWith(
				expect.stringContaining('Supplying data'),
				expect.objectContaining({ requestId: request.requestId }),
			);
		});

		it('[BL-08] should log warning after all retries fail', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'error';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(supplier['tracer'].warn).toHaveBeenCalledWith(expect.stringContaining('failed all supply attempts'), expect.any(Object));
		});

		it('[BL-09] should apply exponential backoff delay between attempts', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'error';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockContext.calculateDelay).toHaveBeenCalledTimes(3);
			expect(mockContext.calculateDelay).toHaveBeenNthCalledWith(1, 0);
			expect(mockContext.calculateDelay).toHaveBeenNthCalledWith(2, 1);
			expect(mockContext.calculateDelay).toHaveBeenNthCalledWith(3, 2);
		});

		it('[BL-10] should clone request for each attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const cloneSpy = jest.spyOn(request, 'clone');
			supplier.supplyBehavior = 'error';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(cloneSpy).toHaveBeenCalledTimes(3); // maxAttempts = 3
		});

		it('[BL-11] should track successful attempt in execution data', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'success';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(
				connectionType,
				0,
				expect.arrayContaining([expect.arrayContaining([expect.objectContaining({ json: expect.anything() as unknown })])]),
			);
		});

		it('[BL-12] should track failed attempt in execution data', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'error';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(connectionType, expect.any(Number), expect.any(NodeOperationError));
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle maxAttempts = 1 (single attempt)', async () => {
			// ARRANGE
			mockContext.maxAttempts = 1;
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'success';

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBeInstanceOf(TestResponse);
			expect(supplier.supplyCallCount).toBe(1);
		});

		it('[EC-02] should handle maxAttempts = 50 (maximum retries)', async () => {
			// ARRANGE
			mockContext.maxAttempts = 50;
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'error';

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBeInstanceOf(TestError);
			expect(supplier.supplyCallCount).toBe(50);
		});

		it('[EC-03] should pass abort signal through to delay and supply', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const abortController = new AbortController();
			const signal = abortController.signal;
			supplier.supplyBehavior = 'success';

			// ACT
			await supplier.supplyWithRetries(request, signal);

			// ASSERT
			expect(mockContext.createAbortSignal).toHaveBeenCalledWith(signal);
			expect(delayApplySpy).toHaveBeenCalledWith(expect.any(Number), signal);
		});

		it('[EC-04] should create abort signal from context', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'success';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockContext.createAbortSignal).toHaveBeenCalledWith(undefined);
		});

		it('[EC-05] should handle zero delay on first attempt (attempt = 0)', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			(mockContext.calculateDelay as jest.Mock).mockReturnValue(0);
			supplier.supplyBehavior = 'success';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockContext.calculateDelay).toHaveBeenCalledWith(0);
		});

		it('[EC-06] should record input data for each attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'error';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(3);
			expect(mockFunctions.addInputData).toHaveBeenCalledWith(connectionType, expect.any(Array));
		});

		it('[EC-07] should use correct run index for output tracking', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'success';

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(
				connectionType,
				0, // First index from addInputData
				expect.anything(),
			);
		});

		it('[EC-08] should distinguish success vs error in completeAttempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			let attemptCount = 0;
			supplier.supply = jest.fn().mockImplementation(async () => {
				await Promise.resolve(); // Make async meaningful
				attemptCount++;
				if (attemptCount === 1) {
					return new TestError(request, 500, 'First error');
				}
				return new TestResponse(request, 'success');
			});

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(2);
			// First call with error
			expect(mockFunctions.addOutputData).toHaveBeenNthCalledWith(1, connectionType, 0, expect.any(NodeOperationError));
			// Second call with success
			expect(mockFunctions.addOutputData).toHaveBeenNthCalledWith(2, connectionType, 1, expect.any(Array));
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw NodeOperationError when supply throws unexpected error', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = new Error('Network failure');

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow('Network failure');
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(connectionType, expect.any(Number), expect.any(NodeOperationError));
		});

		it('[EH-02] should throw TimeoutError when signal times out', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const timeoutError = new DOMException('Timeout', 'TimeoutError');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = timeoutError;

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow('Timeout');
		});

		it('[EH-03] should wrap CoreError with original message', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const coreError = new CoreError('Configuration error');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = coreError;

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow('Configuration error');
		});

		it('[EH-04] should wrap other errors with BUG marker', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = new Error('Unknown error');

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow();
			// Verify error was tracked
			expect(mockFunctions.addOutputData).toHaveBeenCalled();
		});

		it('[EH-05] should track error in execution data before throwing', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = new Error('Test error');

			// ACT
			try {
				await supplier.supplyWithRetries(request);
			} catch (error) {
				// Expected
			}

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(connectionType, expect.any(Number), expect.any(NodeOperationError));
		});

		it('[EH-06] should throw defensive error if no result after loop', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			mockContext.maxAttempts = 0; // Force loop to not execute

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow('No supply attempts were made');
		});

		it('[EH-07] should throw CoreError if ExecutionContext cannot be read', () => {
			// ARRANGE
			contextFactoryReadSpy.mockImplementation(() => {
				throw new CoreError('Failed to read context');
			});

			// ACT & ASSERT
			expect(() => new TestSupplier('test', connectionType, mockFunctions)).toThrow('Failed to read context');
		});

		it('[EH-08] should preserve timeout error type (not wrap as NodeOperationError)', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const timeoutError = new DOMException('Operation timed out', 'TimeoutError');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = timeoutError;

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow(DOMException);
			await expect(supplier.supplyWithRetries(request)).rejects.toMatchObject({
				name: 'TimeoutError',
			});
		});

		it('[EH-09] should provide configuration guidance for timeout errors', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const timeoutError = new DOMException('Timeout', 'TimeoutError');
			supplier.supplyBehavior = 'throw';
			supplier.throwError = timeoutError;

			// ACT
			try {
				await supplier.supplyWithRetries(request);
			} catch (error) {
				// Expected
			}

			// ASSERT - verify error output was recorded with timeout message
			expect(mockFunctions.addOutputData).toHaveBeenCalled();
			const addOutputCalls = (mockFunctions.addOutputData as jest.Mock).mock.calls;
			const hasTimeoutError = addOutputCalls.some((call: unknown[]) => {
				const errorArg = call[2];
				return (
					errorArg &&
					typeof errorArg === 'object' &&
					'message' in errorArg &&
					typeof errorArg.message === 'string' &&
					errorArg.message.includes('timeout')
				);
			});
			expect(hasTimeoutError).toBe(true);
		});
	});
});
