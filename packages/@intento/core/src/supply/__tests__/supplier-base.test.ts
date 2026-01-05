import 'reflect-metadata';

import { mock } from 'jest-mock-extended';
import type { IDataObject, INode, IntentoConnectionType, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ExecutionContext } from '../../context/execution-context';
import type { Tracer } from '../../tracing/tracer';
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
 * @date 2025-01-05
 */

// Mock Delay utility - must be done this way due to jest.mock hoisting
jest.mock('../../utils/delay');
const mockDelayApply = Delay.apply as jest.Mock;

// Test data classes
class TestRequest extends SupplyRequestBase {
	constructor(readonly data: string) {
		super();
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, data: this.data };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId, data: this.data };
	}

	clone(): this {
		return new TestRequest(this.data) as this;
	}
}

class TestResponse extends SupplyResponseBase {
	constructor(
		request: SupplyRequestBase,
		readonly result: string,
	) {
		super(request);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, latencyMs: this.latencyMs, result: this.result };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId, latencyMs: this.latencyMs, result: this.result };
	}
}

class TestError extends SupplyErrorBase {
	constructor(request: SupplyRequestBase, code: number, reason: string) {
		super(request, code, reason);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, latencyMs: this.latencyMs, code: this.code, reason: this.reason };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId, latencyMs: this.latencyMs, code: this.code, reason: this.reason };
	}

	asError(node: INode): NodeOperationError {
		return new NodeOperationError(node, this.reason);
	}
}

// Concrete test implementation of abstract SupplierBase
class TestSupplier extends SupplierBase<TestRequest, TestResponse, TestError> {
	readonly supplyMock = jest.fn<Promise<TestResponse | TestError>, [TestRequest, AbortSignal?]>();
	readonly onTimeOutMock = jest.fn<TestError, [TestRequest]>();

	protected async supply(request: TestRequest, signal?: AbortSignal): Promise<TestResponse | TestError> {
		return await this.supplyMock(request, signal);
	}

	protected onTimeOut(request: TestRequest): TestError {
		return this.onTimeOutMock(request);
	}
}
describe('SupplierBase', () => {
	const MOCK_CONNECTION_TYPE: IntentoConnectionType = 'intento_translationProvider';
	const MOCK_SUPPLIER_NAME = 'TestSupplier';
	const MOCK_MAX_ATTEMPTS = 3;

	let mockFunctions: IFunctions;
	let mockContext: ExecutionContext;
	let mockNode: INode;
	let mockTracer: Tracer;
	let supplier: TestSupplier;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock IFunctions
		mockFunctions = mock<IFunctions>();
		mockNode = mock<INode>();
		mockNode.name = 'TestNode';
		(mockFunctions.addInputData as jest.Mock).mockReturnValue({ index: 0 });
		(mockFunctions.getNode as jest.Mock).mockReturnValue(mockNode);
		(mockFunctions.getWorkflow as jest.Mock).mockReturnValue({ id: 'test-workflow-id' });
		(mockFunctions.getExecutionId as jest.Mock).mockReturnValue('test-execution-id');
		(mockFunctions.getWorkflowDataProxy as jest.Mock).mockReturnValue({
			$execution: {
				customData: new Map(),
			},
		});
		Object.assign(mockFunctions, {
			logger: {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
		});

		// Mock ExecutionContext
		mockContext = {
			maxAttempts: MOCK_MAX_ATTEMPTS,
			calculateDelay: jest.fn((attempt: number) => attempt * 100),
			createAbortSignal: jest.fn((signal?: AbortSignal) => signal ?? new AbortController().signal),
		} as unknown as ExecutionContext;

		// Mock Tracer
		mockTracer = mock<Tracer>();
		Object.assign(mockTracer, {
			debug: jest.fn(),
			info: jest.fn(),
			errorAndThrow: jest.fn((msg: string) => {
				throw new Error(msg);
			}),
			nodeName: 'TestNode',
		});

		// Create supplier instance with mocked dependencies
		supplier = new TestSupplier(MOCK_SUPPLIER_NAME, MOCK_CONNECTION_TYPE, mockFunctions);
		// Replace internal dependencies with mocks
		Object.assign(supplier, { tracer: mockTracer, context: mockContext });
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should initialize supplier with name, connection, and functions', () => {
			// ASSERT
			expect(supplier.name).toBe(MOCK_SUPPLIER_NAME);
			expect(supplier['connection']).toBe(MOCK_CONNECTION_TYPE);
			expect(supplier['functions']).toBe(mockFunctions);
		});

		it('[BL-02] should create Tracer instance during construction', () => {
			// ASSERT
			expect(supplier['tracer']).toBeDefined();
		});

		it('[BL-03] should read ExecutionContext during construction', () => {
			// ASSERT
			expect(supplier['context']).toBeDefined();
		});

		it('[BL-04] should return response on first successful attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(result).toBeInstanceOf(TestResponse);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(1);
		});

		it('[BL-05] should retry on retryable error and succeed on second attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const retryableError = new TestError(request, 503, 'Service unavailable');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValueOnce(retryableError).mockResolvedValueOnce(response);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(result).toBeInstanceOf(TestResponse);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(2);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(2);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(2);
		});

		it('[BL-06] should exit early on non-retryable error without retrying', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const nonRetryableError = new TestError(request, 404, 'Not found');
			supplier.supplyMock.mockResolvedValue(nonRetryableError);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(nonRetryableError);
			expect(result).toBeInstanceOf(TestError);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(1);
		});

		it('[BL-07] should apply exponential backoff delay before each attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const retryableError = new TestError(request, 503, 'Service unavailable');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValueOnce(retryableError).mockResolvedValueOnce(retryableError).mockResolvedValueOnce(response);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockDelayApply).toHaveBeenCalledTimes(3);
			expect(mockContext.calculateDelay).toHaveBeenCalledWith(0);
			expect(mockContext.calculateDelay).toHaveBeenCalledWith(1);
			expect(mockContext.calculateDelay).toHaveBeenCalledWith(2);
		});

		it('[BL-08] should clone request for each retry attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const cloneSpy = jest.spyOn(request, 'clone');
			const retryableError = new TestError(request, 503, 'Service unavailable');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValueOnce(retryableError).mockResolvedValueOnce(response);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(cloneSpy).toHaveBeenCalledTimes(2);
		});

		it('[BL-09] should track input data in n8n UI for each attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const retryableError = new TestError(request, 503, 'Service unavailable');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValueOnce(retryableError).mockResolvedValueOnce(response);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(2);
			expect(mockFunctions.addInputData).toHaveBeenCalledWith(MOCK_CONNECTION_TYPE, [
				[{ json: expect.objectContaining({ data: 'test-data' }) as IDataObject }],
			]);
		});

		it('[BL-10] should track output data in n8n UI for successful attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(MOCK_CONNECTION_TYPE, 0, [
				[{ json: expect.objectContaining({ result: 'success' }) as IDataObject }],
			]);
		});

		it('[BL-11] should track error in n8n UI for failed attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 404, 'Not found');
			supplier.supplyMock.mockResolvedValue(error);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(1);
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(MOCK_CONNECTION_TYPE, 0, expect.any(NodeOperationError));
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle timeout error and convert to TE', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const timeoutError = new TestError(request, 408, 'Request timeout');
			supplier.supplyMock.mockRejectedValue(new DOMException('Timeout', 'TimeoutError'));
			supplier.onTimeOutMock.mockReturnValue(timeoutError);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(timeoutError);
			expect(supplier.onTimeOutMock).toHaveBeenCalledWith(expect.any(TestRequest));
		});

		it('[EC-02] should retry up to maxAttempts for retryable errors', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const retryableError = new TestError(request, 503, 'Service unavailable');
			supplier.supplyMock.mockResolvedValue(retryableError);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(supplier.supplyMock).toHaveBeenCalledTimes(MOCK_MAX_ATTEMPTS);
		});

		it('[EC-03] should return last retryable error after maxAttempts exhausted', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const retryableError1 = new TestError(request, 503, 'Service unavailable attempt 1');
			const retryableError2 = new TestError(request, 503, 'Service unavailable attempt 2');
			const retryableError3 = new TestError(request, 503, 'Service unavailable attempt 3');
			supplier.supplyMock
				.mockResolvedValueOnce(retryableError1)
				.mockResolvedValueOnce(retryableError2)
				.mockResolvedValueOnce(retryableError3);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(retryableError3); // Last error returned
			expect(result).toBeInstanceOf(TestError);
			expect((result as TestError).code).toBe(503);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(MOCK_MAX_ATTEMPTS);
		});

		it('[EC-04] should handle signal cancellation gracefully', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const controller = new AbortController();
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			const result = await supplier.supplyWithRetries(request, controller.signal);

			// ASSERT
			expect(result).toBe(response);
			expect(mockContext.createAbortSignal).toHaveBeenCalledWith(controller.signal);
		});

		it('[EC-05] should calculate delay as zero for first attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);
			(mockContext.calculateDelay as jest.Mock).mockReturnValue(0);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockContext.calculateDelay).toHaveBeenCalledWith(0);
			expect(mockDelayApply).toHaveBeenCalledWith(0, expect.any(Object));
		});

		it('[EC-06] should pass abort signal through to supply method', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const controller = new AbortController();
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request, controller.signal);

			// ASSERT
			expect(supplier.supplyMock).toHaveBeenCalledWith(expect.any(TestRequest), controller.signal);
		});

		it('[EC-07] should call onTimeOut when TimeoutError occurs', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const timeoutError = new TestError(request, 408, 'Request timeout');
			supplier.supplyMock.mockRejectedValue(new DOMException('Timeout', 'TimeoutError'));
			supplier.onTimeOutMock.mockReturnValue(timeoutError);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(supplier.onTimeOutMock).toHaveBeenCalledTimes(1);
			expect(supplier.onTimeOutMock).toHaveBeenCalledWith(expect.any(TestRequest));
		});

		it('[EC-08] should track attempt number correctly in logs', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('attempt 1'), expect.any(Object));
		});

		it('[EC-09] should handle multiple retryable errors before success', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error1 = new TestError(request, 429, 'Rate limit');
			const error2 = new TestError(request, 503, 'Service unavailable');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValueOnce(error1).mockResolvedValueOnce(error2).mockResolvedValueOnce(response);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(3);
		});

		it('[EC-10] should preserve runIndex correlation between input and output', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			const runIndex = 5;
			(mockFunctions.addInputData as jest.Mock).mockReturnValue({ index: runIndex });
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			await supplier.supplyWithRetries(request);

			// ASSERT
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(MOCK_CONNECTION_TYPE, runIndex, expect.any(Array));
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw if no attempts were made (bug scenario)', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			Object.assign(mockContext, { maxAttempts: 0 });

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow();
			expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('No supply attempts were made'));
		});

		it('[EH-02] should handle CoreError with clear message', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const coreError = new CoreError('Invalid configuration');
			supplier.supplyMock.mockRejectedValue(coreError);

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow();
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(MOCK_CONNECTION_TYPE, 0, expect.any(NodeOperationError));
		});

		it('[EH-03] should handle unexpected error with bug message', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const unexpectedError = new Error('Unexpected error');
			supplier.supplyMock.mockRejectedValue(unexpectedError);

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow();
			expect(mockTracer.errorAndThrow).toHaveBeenCalledWith(expect.stringContaining('BUG'), expect.any(Object));
		});

		it('[EH-04] should track unexpected error in n8n UI', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const unexpectedError = new Error('Unexpected error');
			supplier.supplyMock.mockRejectedValue(unexpectedError);

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow();
			expect(mockFunctions.addOutputData).toHaveBeenCalledWith(MOCK_CONNECTION_TYPE, 0, expect.any(NodeOperationError));
		});

		it('[EH-05] should rethrow unexpected errors after tracking', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const unexpectedError = new Error('Unexpected error');
			supplier.supplyMock.mockRejectedValue(unexpectedError);

			// ACT & ASSERT
			await expect(supplier.supplyWithRetries(request)).rejects.toThrow();
			expect(mockTracer.errorAndThrow).toHaveBeenCalled();
		});
	});

	describe('integration scenarios', () => {
		it('should complete full retry cycle with mixed results', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error1 = new TestError(request, 503, 'Service unavailable');
			const error2 = new TestError(request, 429, 'Rate limit');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValueOnce(error1).mockResolvedValueOnce(error2).mockResolvedValueOnce(response);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(3);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(3);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(3);
			expect(mockDelayApply).toHaveBeenCalledTimes(3);
		});

		it('should handle immediate success without retries', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			supplier.supplyMock.mockResolvedValue(response);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(1);
			expect(mockDelayApply).toHaveBeenCalledTimes(1);
			expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('supplied data successfully'), expect.any(Object));
		});

		it('should handle immediate non-retryable error', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 400, 'Bad request');
			supplier.supplyMock.mockResolvedValue(error);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(error);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(1);
			expect(mockTracer.info).toHaveBeenCalledWith(expect.stringContaining('failed supply attempt'), expect.any(Object));
		});

		it('should exhaust all retries with consistent retryable errors', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 503, 'Service unavailable');
			supplier.supplyMock.mockResolvedValue(error);

			// ACT
			const result = await supplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(error);
			expect(supplier.supplyMock).toHaveBeenCalledTimes(MOCK_MAX_ATTEMPTS);
			expect(mockFunctions.addInputData).toHaveBeenCalledTimes(MOCK_MAX_ATTEMPTS);
			expect(mockFunctions.addOutputData).toHaveBeenCalledTimes(MOCK_MAX_ATTEMPTS);
		});
	});
});
