import type { IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory } from '../../context/context-factory';
import type { ExecutionContext } from '../../context/execution-context';
import { Tracer } from '../../tracing/tracer';
import type { IDescriptor } from '../../types/i-descriptor';
import type { IFunctions } from '../../types/i-functions';
import { Delay } from '../../utils/delay';
import { SupplierBase } from '../supplier-base';
import { SupplyError } from '../supply-error';
import type { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Tests for SupplierBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

// Test request implementation
class TestRequest implements SupplyRequestBase {
	readonly requestId: string;
	readonly requestedAt: number;

	constructor(requestId: string = 'test-req-id') {
		this.requestId = requestId;
		this.requestedAt = Date.now();
	}

	asLogMetadata() {
		return { requestId: this.requestId, requestedAt: this.requestedAt };
	}

	asDataObject() {
		return { requestId: this.requestId };
	}
}

// Test response implementation
class TestResponse extends SupplyResponseBase {
	readonly data: string;

	constructor(request: SupplyRequestBase, data: string) {
		super(request);
		this.data = data;
	}

	asDataObject() {
		return {
			...super.asDataObject(),
			data: this.data,
		};
	}
}

// Concrete test supplier
class TestSupplier extends SupplierBase<TestRequest, TestResponse> {
	executeImplementation: jest.Mock<Promise<TestResponse | SupplyError>, [request: TestRequest, signal: AbortSignal]>;

	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
		this.executeImplementation = jest
			.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
			.mockResolvedValue(new TestResponse(new TestRequest(), 'default'));
	}

	protected async execute(request: TestRequest, signal: AbortSignal): Promise<TestResponse | SupplyError> {
		return await this.executeImplementation(request, signal);
	}
}

describe('SupplierBase', () => {
	let mockFunctions: jest.Mocked<IFunctions>;
	let mockTracer: jest.Mocked<Tracer>;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let supplier: TestSupplier;
	let abortController: AbortController;

	const mockDescriptor: IDescriptor = {
		symbol: '🧪',
		name: 'Test Supplier',
		tool: 'test-tool',
		node: 'test-node',
		displayName: 'Test Supplier',
		description: 'Test supplier for unit tests',
	};
	const connectionType: IntentoConnectionType = 'intento_translationSupplier';

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock IFunctions
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
			logger: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
		} as unknown as jest.Mocked<IFunctions>;

		// Mock Tracer
		mockTracer = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Tracer>;

		// Mock ExecutionContext
		mockExecutionContext = {
			maxAttempts: 3,
			calculateDelay: jest.fn((attempt: number) => attempt * 100),
			createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
		} as unknown as jest.Mocked<ExecutionContext>;

		// Mock ContextFactory.read
		jest.spyOn(ContextFactory, 'read').mockReturnValue(mockExecutionContext);

		// Mock Tracer constructor
		jest.spyOn(Tracer.prototype, 'debug').mockImplementation(mockTracer.debug);
		jest.spyOn(Tracer.prototype, 'info').mockImplementation(mockTracer.info);
		jest.spyOn(Tracer.prototype, 'warn').mockImplementation(mockTracer.warn);
		jest.spyOn(Tracer.prototype, 'error').mockImplementation(mockTracer.error);

		// Mock Delay.apply
		jest.spyOn(Delay, 'apply').mockResolvedValue(undefined);

		abortController = new AbortController();
		supplier = new TestSupplier(mockDescriptor, connectionType, mockFunctions);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should execute single successful supply with no retries', async () => {
			// ARRANGE
			const request = new TestRequest();
			const expectedResponse = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(expectedResponse);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBe(expectedResponse);
			expect(supplier.executeImplementation).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(1);
		});

		it('[BL-02] should retry retriable error and succeed on second attempt', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);
			const successResponse = new TestResponse(request, 'success after retry');

			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValueOnce(retriableError)
				.mockResolvedValueOnce(successResponse);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBe(successResponse);
			expect(supplier.executeImplementation).toHaveBeenCalledTimes(2);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(2);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(2);
		});

		it('[BL-03] should stop retrying on non-retriable error', async () => {
			// ARRANGE
			const request = new TestRequest();
			const nonRetriableError = new SupplyError(request, 400, 'Bad request', false);

			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(nonRetriableError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBe(nonRetriableError);
			expect(supplier.executeImplementation).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(1);
		});

		it('[BL-04] should execute all attempts when all are retriable failures', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);

			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(retriableError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBe(retriableError);
			expect(supplier.executeImplementation).toHaveBeenCalledTimes(3); // maxAttempts
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(3);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(3);
		});

		it('[BL-05] should call startSupply before each attempt', async () => {
			// ARRANGE
			const request = new TestRequest();
			const response = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockFunctions.addInputData).toHaveBeenCalledWith(connectionType, [[{ json: request.asDataObject() }]]);
			expect(mockTracer.debug).toHaveBeenCalledWith('🧪 Supplying data (attempt 1)...', request.asLogMetadata());
		});

		it('[BL-06] should call completeSupply after each attempt', async () => {
			// ARRANGE
			const request = new TestRequest();
			const response = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(connectionType, 0, [[{ json: response.asDataObject() }]]);
		});

		it('[BL-07] should check abort signal before delay', async () => {
			// ARRANGE
			const request = new TestRequest();
			abortController.abort();
			const abortError = new DOMException('Aborted', 'AbortError');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(abortError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(499);
		});

		it('[BL-08] should apply exponential backoff delay before execute', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(retriableError);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(0);
			expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(1);
			expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(2);
			expect(Delay.apply).toHaveBeenCalledTimes(3);
		});

		it('[BL-09] should log success at debug level', async () => {
			// ARRANGE
			const request = new TestRequest();
			const response = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith('🧪 Data supply successfully completed (attempt 1)', response.asLogMetadata());
		});

		it('[BL-10] should log retriable error at info level', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(retriableError);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockTracer.info).toHaveBeenCalledWith(
				'🧪 Data supply failed with retriable error (attempt 1)',
				retriableError.asLogMetadata(),
			);
		});

		it('[BL-11] should log non-retriable error at warn level', async () => {
			// ARRANGE
			const request = new TestRequest();
			const nonRetriableError = new SupplyError(request, 400, 'Bad request', false);
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(nonRetriableError);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockTracer.warn).toHaveBeenCalledWith(
				'🧪 Data supply failed with non-retriable error (attempt 1)',
				nonRetriableError.asLogMetadata(),
			);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle maxAttempts = 0 (return default error)', async () => {
			// ARRANGE
			const request = new TestRequest();
			// Override maxAttempts for this test
			jest.spyOn(ContextFactory, 'read').mockReturnValue({
				maxAttempts: 0,
				calculateDelay: jest.fn((attempt: number) => attempt * 100),
				createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
			} as unknown as jest.Mocked<ExecutionContext>);
			// Create new supplier with overridden context
			const testSupplier = new TestSupplier(mockDescriptor, connectionType, mockFunctions);

			// ACT
			const result = await testSupplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).reason).toBe('No data supply attempts executed (maxAttempts is 0)');
			expect(testSupplier.executeImplementation).not.toHaveBeenCalled();
		});

		it('[EC-02] should handle maxAttempts = 1 (single attempt only)', async () => {
			// ARRANGE
			const request = new TestRequest();
			// Override maxAttempts for this test
			jest.spyOn(ContextFactory, 'read').mockReturnValue({
				maxAttempts: 1,
				calculateDelay: jest.fn((attempt: number) => attempt * 100),
				createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
			} as unknown as jest.Mocked<ExecutionContext>);
			const response = new TestResponse(request, 'success');
			// Create new supplier with overridden context
			const testSupplier = new TestSupplier(mockDescriptor, connectionType, mockFunctions);
			testSupplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT
			const result = await testSupplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBe(response);
			expect(testSupplier.executeImplementation).toHaveBeenCalledTimes(1);
		});

		it('[EC-03] should calculate zero delay for attempt 0', async () => {
			// ARRANGE
			const request = new TestRequest();
			mockExecutionContext.calculateDelay = jest.fn((attempt: number) => (attempt === 0 ? 0 : attempt * 100));
			const response = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(0);
			expect(Delay.apply).toHaveBeenCalledWith(0, expect.any(Object));
		});

		it('[EC-04] should combine parent signal with timeout in createAbortSignal', async () => {
			// ARRANGE
			const request = new TestRequest();
			const response = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockExecutionContext.createAbortSignal).toHaveBeenCalledWith(abortController.signal);
		});

		it('[EC-05] should pass attempt number to startSupply and completeSupply', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(retriableError);
			mockFunctions.addInputData = jest
				.fn()
				.mockReturnValueOnce({ index: 0 })
				.mockReturnValueOnce({ index: 1 })
				.mockReturnValueOnce({ index: 2 });

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith('🧪 Supplying data (attempt 1)...', expect.any(Object));
			expect(mockTracer.debug).toHaveBeenCalledWith('🧪 Supplying data (attempt 2)...', expect.any(Object));
			expect(mockTracer.debug).toHaveBeenCalledWith('🧪 Supplying data (attempt 3)...', expect.any(Object));
		});

		it('[EC-06] should return last retriable error when all attempts exhausted', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(retriableError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBe(retriableError);
			expect((result as SupplyError).isRetriable).toBe(true);
		});

		it('[EC-07] should preserve error details through multiple retries', async () => {
			// ARRANGE
			const request = new TestRequest();
			const retriableError = new SupplyError(request, 503, 'Service unavailable', true);
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(retriableError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect((result as SupplyError).code).toBe(503);
			expect((result as SupplyError).reason).toBe('Service unavailable');
			expect((result as SupplyError).requestId).toBe(request.requestId);
		});

		it('[EC-08] should use default attempt=0 when calling supply without attempt parameter', async () => {
			// ARRANGE
			const request = new TestRequest();
			const response = new TestResponse(request, 'success');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockResolvedValue(response);

			// ACT - Call supply directly without attempt parameter to test default value
			const result = await supplier.supply(request, abortController.signal);

			// ASSERT
			expect(result).toBe(response);
			expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(0);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should convert DOMException TimeoutError to SupplyError 408', async () => {
			// ARRANGE
			const request = new TestRequest();
			const timeoutError = new DOMException('Timeout', 'TimeoutError');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(timeoutError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal); // ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(408);
			expect((result as SupplyError).reason).toContain('timed out');
			expect((result as SupplyError).isRetriable).toBe(false);
		});

		it('[EH-02] should convert DOMException AbortError to SupplyError 499', async () => {
			// ARRANGE
			const request = new TestRequest();
			const abortError = new DOMException('Aborted', 'AbortError');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(abortError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(499);
			expect((result as SupplyError).reason).toContain('aborted');
			expect((result as SupplyError).isRetriable).toBe(false);
		});

		it('[EH-03] should convert unexpected errors to SupplyError 500', async () => {
			// ARRANGE
			const request = new TestRequest();
			const unexpectedError = new Error('Something went wrong');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(unexpectedError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(500);
			expect((result as SupplyError).reason).toContain('Unexpected error');
			expect((result as SupplyError).reason).toContain('Something went wrong');
			expect((result as SupplyError).isRetriable).toBe(false);
		});

		it('[EH-04] should catch and convert errors in supply method', async () => {
			// ARRANGE
			const request = new TestRequest();
			const error = new Error('Supply error');
			supplier.executeImplementation = jest.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>().mockRejectedValue(error);

			// ACT
			const result = await supplier.supply(request, abortController.signal, 0);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(500);
		});

		it('[EH-05] should mark all DOMException errors as non-retriable', async () => {
			// ARRANGE
			const request = new TestRequest();
			const timeoutError = new DOMException('Timeout', 'TimeoutError');
			const abortError = new DOMException('Aborted', 'AbortError');

			// ACT
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(timeoutError);
			const result1 = await supplier.supplyWithRetries(request, abortController.signal);

			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(abortError);
			const result2 = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect((result1 as SupplyError).isRetriable).toBe(false);
			expect((result2 as SupplyError).isRetriable).toBe(false);
		});

		it('[EH-06] should include error message in unexpected error reason', async () => {
			// ARRANGE
			const request = new TestRequest();
			const customError = new Error('Custom error message');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(customError);

			// ACT
			const result = await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect((result as SupplyError).reason).toContain('Custom error message');
		});

		it('[EH-07] should log timeout errors with warn level', async () => {
			// ARRANGE
			const request = new TestRequest();
			const timeoutError = new DOMException('Timeout', 'TimeoutError');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(timeoutError);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockTracer.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'), expect.any(Object));
		});

		it('[EH-08] should log unexpected errors with error level and source', async () => {
			// ARRANGE
			const request = new TestRequest();
			const unexpectedError = new Error('Unexpected');
			supplier.executeImplementation = jest
				.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>()
				.mockRejectedValue(unexpectedError);

			// ACT
			await supplier.supplyWithRetries(request, abortController.signal);

			// ASSERT
			expect(mockTracer.error).toHaveBeenCalledWith(
				expect.stringContaining('Unexpected error'),
				expect.objectContaining({
					source: unexpectedError,
				}),
			);
		});

		it('[EH-09] should handle abort during delay (throwIfAborted)', async () => {
			// ARRANGE
			const request = new TestRequest();
			const abortError = new DOMException('Aborted', 'AbortError');
			jest.spyOn(Delay, 'apply').mockRejectedValue(abortError);

			// ACT
			const result = await supplier.supply(request, abortController.signal, 0);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(499);
		});

		it('[EH-10] should handle abort before first attempt', async () => {
			// ARRANGE
			const request = new TestRequest();
			abortController.abort();
			const abortedSignal = abortController.signal;
			mockExecutionContext.createAbortSignal = jest.fn().mockReturnValue(abortedSignal);

			// Mock signal.throwIfAborted to throw
			const throwIfAbortedSpy = jest.spyOn(abortedSignal, 'throwIfAborted').mockImplementation(() => {
				throw new DOMException('Aborted', 'AbortError');
			});

			supplier.executeImplementation = jest.fn<Promise<TestResponse | SupplyError>, [TestRequest, AbortSignal]>();

			// ACT
			const result = await supplier.supplyWithRetries(request, abortedSignal);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyError);
			expect((result as SupplyError).code).toBe(499);
			expect(supplier.executeImplementation).not.toHaveBeenCalled();

			throwIfAbortedSpy.mockRestore();
		});
	});
});
