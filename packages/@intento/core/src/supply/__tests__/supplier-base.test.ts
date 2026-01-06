import 'reflect-metadata';

import type { IntentoConnectionType, INode, LogMetadata, IDataObject, NodeOperationError } from 'n8n-workflow';

// Mock modules before imports that use them
const mockContextFactoryRead = jest.fn();
const mockExecutionContext = jest.fn();
const mockDelayApply = jest.fn();

const contextFactoryMock = {
	read: mockContextFactoryRead,
};

const executionContextMock = mockExecutionContext;

const delayMock = {
	apply: mockDelayApply,
};

const contextMockExports = {};
Object.defineProperty(contextMockExports, 'ContextFactory', { value: contextFactoryMock });
Object.defineProperty(contextMockExports, 'ExecutionContext', { value: executionContextMock });

jest.mock('context/*', () => contextMockExports);

const TracerMock = jest.fn().mockImplementation(() => ({
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	bugDetected: jest.fn(),
}));

const tracingMockExports = {};
Object.defineProperty(tracingMockExports, 'Tracer', { value: TracerMock });

jest.mock('tracing/*', () => tracingMockExports);

const utilsMockExports = {};
Object.defineProperty(utilsMockExports, 'Delay', { value: delayMock });

jest.mock('utils/*', () => utilsMockExports);

import type { IFunctions } from 'types/*';

import type { ExecutionContext } from '../../context/execution-context';
import type { Tracer } from '../../tracing/tracer';
import { SupplierBase } from '../supplier-base';
import { SupplyErrorBase } from '../supply-error-base';
import { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Tests for SupplierBase
 * @author Claude Sonnet 4.5
 * @date 2026-01-06
 */

// Test implementations of abstract base classes
class TestRequest extends SupplyRequestBase {
	constructor(public data: string) {
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
		public result: string,
	) {
		super(request);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, result: this.result, latencyMs: this.latencyMs };
	}

	asDataObject(): IDataObject {
		return { requestId: this.requestId, result: this.result, latencyMs: this.latencyMs };
	}
}

class TestError extends SupplyErrorBase {
	constructor(request: SupplyRequestBase, code: number, reason: string, isRetriable: boolean) {
		super(request, code, reason, isRetriable);
	}

	asLogMetadata(): LogMetadata {
		return { requestId: this.requestId, code: this.code, reason: this.reason };
	}

	asDataObject(): IDataObject {
		return { error: this.reason, code: this.code };
	}

	asError(node: INode): NodeOperationError {
		return { node, message: this.reason } as NodeOperationError;
	}
}

// Helper functions to create properly typed mocks
function createMockFunctions(mockAddInputData: jest.Mock, mockAddOutputData: jest.Mock, mockGetNode: jest.Mock): IFunctions {
	return {
		addInputData: mockAddInputData,
		addOutputData: mockAddOutputData,
		getNode: mockGetNode,
	} as unknown as IFunctions;
}

function createMockTracer(): Tracer {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		bugDetected: jest.fn(),
	} as unknown as Tracer;
}

class TestSupplier extends SupplierBase<TestRequest, TestResponse, TestError> {
	readonly supplyImpl!: jest.Mock<Promise<TestResponse | TestError>>;
	readonly onErrorImpl!: jest.Mock<TestError>;

	constructor(name: string, connection: IntentoConnectionType, functions: IFunctions) {
		super(name, connection, functions as never as IFunctions);
		this.supplyImpl = jest.fn() as jest.Mock<Promise<TestResponse | TestError>>;
		this.onErrorImpl = jest.fn() as jest.Mock<TestError>;
	}

	protected async supply(request: TestRequest, signal?: AbortSignal): Promise<TestResponse | TestError> {
		return await this.supplyImpl(request, signal);
	}

	protected onError(request: TestRequest, error: Error): TestError {
		return this.onErrorImpl(request, error);
	}
}

describe('SupplierBase', () => {
	let mockFunctions: IFunctions;
	let mockTracer: Tracer;
	let mockContext: ExecutionContext;
	let testSupplier: TestSupplier;
	let mockAddInputData: jest.Mock;
	let mockAddOutputData: jest.Mock;
	let mockGetNode: jest.Mock;
	const connectionType = 'intento-test' as IntentoConnectionType;
	const supplierName = 'TestSupplier';

	beforeEach(() => {
		// Create properly typed mock functions
		mockAddInputData = jest.fn().mockReturnValue({ index: 0 });
		mockAddOutputData = jest.fn();
		mockGetNode = jest.fn().mockReturnValue({ name: 'TestNode' } as INode);

		// Mock IFunctions - use helper to avoid error type
		mockFunctions = createMockFunctions(mockAddInputData, mockAddOutputData, mockGetNode) as never as IFunctions;

		// Mock Tracer - use helper
		mockTracer = createMockTracer() as never as Tracer;

		// Make Tracer constructor return our mockTracer
		TracerMock.mockReturnValue(mockTracer);

		// Mock ExecutionContext
		mockContext = {
			maxAttempts: 3,
			calculateDelay: jest.fn((attempt: number) => attempt * 100),
			createAbortSignal: jest.fn((signal?: AbortSignal) => signal ?? new AbortController().signal),
		} as unknown as ExecutionContext;

		// Mock mockContextFactoryRead
		mockContextFactoryRead.mockReturnValue(mockContext);

		// Mock mockDelayApply
		mockDelayApply.mockResolvedValue(undefined);

		// Create test supplier
		testSupplier = new TestSupplier(supplierName, connectionType, mockFunctions);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('[BL-01] should initialize with name, connection, functions, tracer, and context', () => {
			// ASSERT
			expect(testSupplier.name).toBe(supplierName);
			expect(testSupplier['connection']).toBe(connectionType);
			expect(testSupplier['functions']).toBe(mockFunctions);
			expect(testSupplier['tracer']).toBeDefined();
			expect(testSupplier['context']).toBe(mockContext);
			expect(mockContextFactoryRead).toHaveBeenCalledWith(expect.anything(), mockFunctions, expect.anything());
		});
	});

	describe('supplyWithRetries - business logic', () => {
		it('[BL-02] should succeed on first attempt with valid response', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);

			// ACT
			const result = await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(response);
			expect(result).toBeInstanceOf(SupplyResponseBase);
			expect(testSupplier.supplyImpl).toHaveBeenCalledTimes(1);
		});

		it('[BL-03] should return success response immediately without retry', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);

			// ACT
			const result = await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBeInstanceOf(SupplyResponseBase);
			expect(testSupplier.supplyImpl).toHaveBeenCalledTimes(1);
			expect(mockContext.calculateDelay).toHaveBeenCalledTimes(1);
		});

		it('[BL-04] should track input data with addInputData on attempt start', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockAddInputData).toHaveBeenCalledWith(connectionType, [[{ json: request.asDataObject() }]]);
		});

		it('[BL-05] should track output data with addOutputData on success', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockAddOutputData).toHaveBeenCalledWith(connectionType, 0, [[{ json: response.asDataObject() }]]);
		});

		it('[BL-06] should clone request before supply call to prevent mutation', async () => {
			// ARRANGE
			const request = new TestRequest('original-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);
			const cloneSpy = jest.spyOn(request, 'clone');

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(cloneSpy).toHaveBeenCalledTimes(1);
			expect(testSupplier.supplyImpl).toHaveBeenCalledWith(expect.any(TestRequest), expect.any(Object));
		});

		it('[BL-07] should apply exponential backoff delay before each attempt', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error1 = new TestError(request, 500, 'error1', true);
			const error2 = new TestError(request, 500, 'error2', true);
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValueOnce(error1).mockResolvedValueOnce(error2).mockResolvedValueOnce(response);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockContext.calculateDelay).toHaveBeenCalledTimes(3);
			expect(mockContext.calculateDelay).toHaveBeenNthCalledWith(1, 0);
			expect(mockContext.calculateDelay).toHaveBeenNthCalledWith(2, 1);
			expect(mockContext.calculateDelay).toHaveBeenNthCalledWith(3, 2);
			expect(mockDelayApply).toHaveBeenCalledTimes(3);
		});

		it('[BL-08] should use context.createAbortSignal for cancellation', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);
			const customSignal = new AbortController().signal;

			// ACT
			await testSupplier.supplyWithRetries(request, customSignal);

			// ASSERT
			expect(mockContext.createAbortSignal).toHaveBeenCalledWith(customSignal);
		});
	});

	describe('supplyWithRetries - edge cases', () => {
		it('[EC-01] should retry up to maxAttempts times for retriable errors', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 500, 'retriable error', true);
			testSupplier.supplyImpl.mockResolvedValue(error);

			// ACT
			const result = await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(error);
			expect(testSupplier.supplyImpl).toHaveBeenCalledTimes(3);
		});

		it('[EC-02] should stop retrying on first non-retriable error', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const nonRetriableError = new TestError(request, 400, 'validation error', false);
			testSupplier.supplyImpl.mockResolvedValue(nonRetriableError);

			// ACT
			const result = await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(nonRetriableError);
			expect(testSupplier.supplyImpl).toHaveBeenCalledTimes(1);
		});

		it('[EC-03] should handle zero delay on first attempt (attempt 0)', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);
			(mockContext.calculateDelay as jest.Mock).mockReturnValue(0);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockContext.calculateDelay).toHaveBeenCalledWith(0);
			expect(mockDelayApply).toHaveBeenCalledWith(0, expect.any(Object));
		});

		it('[EC-04] should respect AbortSignal cancellation during delay', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);
			const controller = new AbortController();
			const signal = controller.signal;
			(mockContext.createAbortSignal as jest.Mock).mockReturnValue(signal);

			// ACT
			await testSupplier.supplyWithRetries(request, signal);

			// ASSERT
			expect(mockDelayApply).toHaveBeenCalledWith(expect.any(Number), signal);
		});

		it('[EC-05] should respect AbortSignal cancellation during supply call', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);
			const controller = new AbortController();
			const signal = controller.signal;
			(mockContext.createAbortSignal as jest.Mock).mockReturnValue(signal);

			// ACT
			await testSupplier.supplyWithRetries(request, signal);

			// ASSERT
			expect(testSupplier.supplyImpl).toHaveBeenCalledWith(expect.any(TestRequest), signal);
		});

		it('[EC-06] should return last retriable error when all attempts exhausted', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error1 = new TestError(request, 500, 'error1', true);
			const error2 = new TestError(request, 500, 'error2', true);
			const error3 = new TestError(request, 500, 'error3', true);
			testSupplier.supplyImpl.mockResolvedValueOnce(error1).mockResolvedValueOnce(error2).mockResolvedValueOnce(error3);

			// ACT
			const result = await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(result).toBe(error3);
			expect(testSupplier.supplyImpl).toHaveBeenCalledTimes(3);
		});

		it('[EC-07] should log retriable errors as info level', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 500, 'retriable error', true);
			testSupplier.supplyImpl.mockResolvedValue(error);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockTracer.info).toHaveBeenCalledTimes(3);
			expect(mockTracer.info).toHaveBeenCalledWith(expect.stringContaining('failed supply on attempt'), error.asLogMetadata());
		});

		it('[EC-08] should log non-retriable errors as warn level', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 400, 'non-retriable error', false);
			testSupplier.supplyImpl.mockResolvedValue(error);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockTracer.warn).toHaveBeenCalledTimes(1);
			expect(mockTracer.warn).toHaveBeenCalledWith(expect.stringContaining('with non-retriable error'), error.asLogMetadata());
		});

		it('[EC-09] should log success as debug level', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const response = new TestResponse(request, 'success');
			testSupplier.supplyImpl.mockResolvedValue(response);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockTracer.debug).toHaveBeenCalledWith(expect.stringContaining('supplied data successfully'), response.asLogMetadata());
		});

		it('[EC-10] should add error output data for retriable errors', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 500, 'retriable error', true);
			testSupplier.supplyImpl.mockResolvedValue(error);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockAddOutputData).toHaveBeenCalledTimes(3);
			expect(mockAddOutputData).toHaveBeenCalledWith(connectionType, 0, error.asError(mockGetNode() as INode));
		});
	});

	describe('supplyWithRetries - error handling', () => {
		it('[EH-01] should catch exceptions and convert to error response via onError', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const thrownError = new Error('Network failure');
			const convertedError = new TestError(request, 500, 'Network failure', true);
			testSupplier.supplyImpl.mockRejectedValue(thrownError);
			testSupplier.onErrorImpl.mockReturnValue(convertedError);

			// ACT
			const result = await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(testSupplier.onErrorImpl).toHaveBeenCalledWith(request, thrownError);
			expect(result).toBe(convertedError);
		});

		it('[EH-02] should complete attempt with error response after exception', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const thrownError = new Error('Network failure');
			const convertedError = new TestError(request, 500, 'Network failure', false);
			testSupplier.supplyImpl.mockRejectedValue(thrownError);
			testSupplier.onErrorImpl.mockReturnValue(convertedError);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockAddOutputData).toHaveBeenCalledWith(connectionType, 0, convertedError.asError(mockGetNode() as INode));
		});

		it('[EH-03] should log bug detection if no attempts were made', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			(mockContext as { maxAttempts: number }).maxAttempts = 0;

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockTracer.bugDetected).toHaveBeenCalledWith('SupplierBase', 'No supply attempts were made.', request.asLogMetadata());
		});

		it('[EH-04] should pass original request to onError for context', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const thrownError = new Error('Database connection failed');
			const convertedError = new TestError(request, 503, 'Database connection failed', true);
			testSupplier.supplyImpl.mockRejectedValue(thrownError);
			testSupplier.onErrorImpl.mockReturnValue(convertedError);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(testSupplier.onErrorImpl).toHaveBeenCalledWith(request, thrownError);
			const callArgs = testSupplier.onErrorImpl.mock.calls[0] as [TestRequest, Error];
			expect(callArgs[0]).toBe(request);
			expect(callArgs[0].data).toBe('test-data');
		});

		it('[EH-05] should add error output data for non-retriable errors', async () => {
			// ARRANGE
			const request = new TestRequest('test-data');
			const error = new TestError(request, 400, 'validation error', false);
			testSupplier.supplyImpl.mockResolvedValue(error);

			// ACT
			await testSupplier.supplyWithRetries(request);

			// ASSERT
			expect(mockAddOutputData).toHaveBeenCalledWith(connectionType, 0, error.asError(mockGetNode() as INode));
			expect(mockAddOutputData).toHaveBeenCalledTimes(1);
		});
	});
});
