import { mock } from 'jest-mock-extended';
import type { IDataObject, INode, IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from '../../context/*';
import { Tracer } from '../../tracing/tracer';
import type { IDescriptor } from '../../types/i-descriptor';
import type { IFunctions } from '../../types/i-functions';
import { Delay } from '../../utils/delay';
import { SupplierBase } from '../supplier-base';
import { SupplyError } from '../supply-error';
import type { SupplyRequestBase } from '../supply-request-base';
import { SupplyResponseBase } from '../supply-response-base';

/**
 * Comprehensive tests for SupplierBase abstract class
 * Achieves 100% coverage of all methods, branches, and edge cases
 */

// Test implementations
class TestSupplyRequest implements SupplyRequestBase {
	readonly agentRequestId: string;
	readonly supplyRequestId: string;
	readonly requestedAt: number;
	private shouldThrowValidation = false;

	constructor(agentRequestId: string = crypto.randomUUID()) {
		this.agentRequestId = agentRequestId;
		this.supplyRequestId = crypto.randomUUID();
		this.requestedAt = Date.now();
	}

	setValidationError(shouldThrow: boolean): void {
		this.shouldThrowValidation = shouldThrow;
	}

	throwIfInvalid(): void {
		if (this.shouldThrowValidation) {
			throw new Error('Invalid request');
		}
	}

	asLogMetadata(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
		};
	}

	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
			requestedAt: this.requestedAt,
		};
	}
}

class TestSupplyResponse extends SupplyResponseBase {
	private shouldThrowValidation = false;

	constructor(request: SupplyRequestBase) {
		super(request);
	}

	setValidationError(shouldThrow: boolean): void {
		this.shouldThrowValidation = shouldThrow;
	}

	throwIfInvalid(): void {
		if (this.shouldThrowValidation) {
			throw new Error('Invalid response');
		}
	}

	asDataObject(): IDataObject {
		return {
			agentRequestId: this.agentRequestId,
			supplyRequestId: this.supplyRequestId,
			latencyMs: this.latencyMs,
		};
	}
}

class TestSupplier extends SupplierBase<TestSupplyRequest, TestSupplyResponse> {
	executeMock: jest.Mock;

	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
		this.executeMock = jest.fn();
	}

	protected async execute(request: TestSupplyRequest, signal: AbortSignal): Promise<TestSupplyResponse | SupplyError> {
		return await (this.executeMock(request, signal) as Promise<TestSupplyResponse | SupplyError>);
	}
}

describe('SupplierBase', () => {
	let mockDescriptor: IDescriptor;
	let mockConnection: IntentoConnectionType;
	let mockFunctions: IFunctions;
	let mockNode: INode;
	let mockExecutionContext: ExecutionContext;
	let supplier: TestSupplier;
	let testRequest: TestSupplyRequest;
	let testSignal: AbortSignal;

	beforeEach(() => {
		// Setup mocks
		mockNode = mock<INode>({ name: 'TestNode', type: 'test' });
		mockDescriptor = mock<IDescriptor>();
		mockConnection = 'main' as IntentoConnectionType;

		// Setup IFunctions mock
		const debugFn = jest.fn();
		const infoFn = jest.fn();
		const warnFn = jest.fn();
		const errorFn = jest.fn();

		mockFunctions = mock<IFunctions>({
			getNode: jest.fn(() => mockNode),
			getWorkflow: jest.fn(() => ({ id: 'test-workflow-id', name: 'Test Workflow', active: true })),
			getExecutionId: jest.fn(() => 'test-execution-id'),
			getWorkflowDataProxy: jest.fn(() => ({
				$execution: { customData: new Map() },
			})) as unknown as (itemIndex: number) => IFunctions['getWorkflowDataProxy'] extends (itemIndex: number) => infer R ? R : never,
			logger: {
				debug: debugFn,
				info: infoFn,
				warn: warnFn,
				error: errorFn,
			},
			addInputData: jest.fn(() => ({ index: 0 })),
			addOutputData: jest.fn(() => undefined),
			getNodeParameter: jest.fn(),
		} as Partial<IFunctions>) as IFunctions;

		// Setup ExecutionContext mock
		mockExecutionContext = mock<ExecutionContext>({
			maxAttempts: 3,
			createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
			calculateDelay: jest.fn(() => 0),
		});

		// Mock static methods
		jest.spyOn(ContextFactory, 'read').mockReturnValue(mockExecutionContext);
		jest.spyOn(Delay, 'apply').mockResolvedValue(undefined);

		// Create test data
		testSignal = new AbortController().signal;
		testRequest = new TestSupplyRequest();

		// Create supplier instance
		supplier = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);
	});

	describe('constructor', () => {
		it('should initialize with descriptor, connection, and functions', () => {
			expect(supplier['connection']).toBe(mockConnection);
			expect(supplier['functions']).toBe(mockFunctions);
			expect(supplier.descriptor).toBe(mockDescriptor);
		});

		it('should create Tracer instance', () => {
			expect(supplier['tracer']).toBeInstanceOf(Tracer);
		});

		it('should read ExecutionContext via ContextFactory', () => {
			expect(ContextFactory.read).toHaveBeenCalledWith(ExecutionContext, mockFunctions, expect.any(Tracer));
			expect(supplier['executionContext']).toBe(mockExecutionContext);
		});

		it('should handle custom ExecutionContext', () => {
			const customContext = mock<ExecutionContext>({ maxAttempts: 10 });
			jest.spyOn(ContextFactory, 'read').mockReturnValue(customContext);

			const customSupplier = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);

			expect(customSupplier['executionContext']).toBe(customContext);
			expect(customSupplier['executionContext'].maxAttempts).toBe(10);
		});
	});

	describe('supplyWithRetries', () => {
		describe('success scenarios', () => {
			it('should return success immediately on first attempt', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				const result = await supplier.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(response);
				expect(supplier.executeMock).toHaveBeenCalledTimes(1);
			});

			it('should succeed after retriable errors', async () => {
				const error = new SupplyError(testRequest, 500, 'Temporary error', true);
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValueOnce(error).mockResolvedValueOnce(response);

				const result = await supplier.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(response);
				expect(supplier.executeMock).toHaveBeenCalledTimes(2);
			});
		});

		describe('retry logic', () => {
			it('should retry retriable error up to maxAttempts', async () => {
				const error1 = new SupplyError(testRequest, 500, 'Error 1', true);
				const error2 = new SupplyError(testRequest, 500, 'Error 2', true);
				const error3 = new SupplyError(testRequest, 500, 'Error 3', true);
				supplier.executeMock.mockResolvedValueOnce(error1).mockResolvedValueOnce(error2).mockResolvedValueOnce(error3);

				const result = await supplier.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(error3);
				expect(supplier.executeMock).toHaveBeenCalledTimes(3);
			});

			it('should return non-retriable error immediately', async () => {
				const nonRetriableError = new SupplyError(testRequest, 400, 'Bad request', false);
				supplier.executeMock.mockResolvedValue(nonRetriableError);

				const result = await supplier.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(nonRetriableError);
				expect(supplier.executeMock).toHaveBeenCalledTimes(1);
			});

			it('should call supply for each attempt with incremented attempt number', async () => {
				const error = new SupplyError(testRequest, 500, 'Error', true);
				supplier.executeMock.mockResolvedValue(error);
				const supplySpy = jest.spyOn(supplier, 'supply');

				await supplier.supplyWithRetries(testRequest, testSignal);

				expect(supplySpy).toHaveBeenCalledTimes(3);
				expect(supplySpy).toHaveBeenNthCalledWith(1, testRequest, expect.any(Object), 0);
				expect(supplySpy).toHaveBeenNthCalledWith(2, testRequest, expect.any(Object), 1);
				expect(supplySpy).toHaveBeenNthCalledWith(3, testRequest, expect.any(Object), 2);
			});
		});

		describe('signal handling', () => {
			it('should create combined abort signal with timeout', async () => {
				const combinedSignal = new AbortController().signal;
				(mockExecutionContext.createAbortSignal as jest.Mock).mockReturnValue(combinedSignal);
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supplyWithRetries(testRequest, testSignal);

				expect(mockExecutionContext.createAbortSignal).toHaveBeenCalledWith(testSignal);
				expect(supplier.executeMock).toHaveBeenCalledWith(testRequest, combinedSignal);
			});
		});

		describe('edge cases', () => {
			it('should handle maxAttempts=1 (no retries)', async () => {
				const context1Attempt = mock<ExecutionContext>({
					maxAttempts: 1,
					createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
					calculateDelay: jest.fn(() => 0),
				});
				jest.spyOn(ContextFactory, 'read').mockReturnValue(context1Attempt);
				const supplier1 = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);
				const error = new SupplyError(testRequest, 500, 'Error', true);
				supplier1.executeMock.mockResolvedValue(error);

				const result = await supplier1.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(error);
				expect(supplier1.executeMock).toHaveBeenCalledTimes(1);
			});

			it('should handle maxAttempts=50 (many retries)', async () => {
				const context50Attempts = mock<ExecutionContext>({
					maxAttempts: 50,
					createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
					calculateDelay: jest.fn(() => 0),
				});
				jest.spyOn(ContextFactory, 'read').mockReturnValue(context50Attempts);
				const supplier50 = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);
				let count = 0;
				const error = new SupplyError(testRequest, 500, 'Error', true);
				const response = new TestSupplyResponse(testRequest);
				supplier50.executeMock.mockImplementation(() => {
					count++;
					return count < 50 ? error : response;
				});

				const result = await supplier50.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(response);
				expect(supplier50.executeMock).toHaveBeenCalledTimes(50);
			});

			it('should return error on last attempt', async () => {
				const context2Attempts = mock<ExecutionContext>({
					maxAttempts: 2,
					createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
					calculateDelay: jest.fn(() => 0),
				});
				jest.spyOn(ContextFactory, 'read').mockReturnValue(context2Attempts);
				const supplier2 = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);
				const error = new SupplyError(testRequest, 500, 'Error', true);
				supplier2.executeMock.mockResolvedValue(error);

				const result = await supplier2.supplyWithRetries(testRequest, testSignal);

				expect(result).toBe(error);
				expect(supplier2.executeMock).toHaveBeenCalledTimes(2);
			});

			it('should call bugDetected if unreachable code is reached', async () => {
				// Mock supply to return success but manipulate maxAttempts to trigger unreachable code
				const loggerErrorSpy = jest.spyOn(mockFunctions.logger, 'error');
				const response = new TestSupplyResponse(testRequest);

				// Create a context with maxAttempts = 0 to bypass the loop and reach unreachable code
				const context0Attempts = mock<ExecutionContext>({
					maxAttempts: 0,
					createAbortSignal: jest.fn((parent?: AbortSignal) => parent ?? new AbortController().signal),
					calculateDelay: jest.fn(() => 0),
				});
				jest.spyOn(ContextFactory, 'read').mockReturnValue(context0Attempts);
				const supplier0 = new TestSupplier(mockDescriptor, mockConnection, mockFunctions);
				supplier0.executeMock.mockResolvedValue(response);

				// bugDetected throws NodeOperationError, so we expect it to throw
				await expect(supplier0.supplyWithRetries(testRequest, testSignal)).rejects.toThrow('Bug detected');

				// Verify bugDetected was called (which logs as error before throwing)
				expect(loggerErrorSpy).toHaveBeenCalledWith(
					expect.stringContaining('unreachable'),
					expect.objectContaining({
						agentRequestId: testRequest.agentRequestId,
						supplyRequestId: testRequest.supplyRequestId,
					}),
				);
			});
		});
	});

	describe('supply', () => {
		describe('success path', () => {
			it('should execute complete flow successfully', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				const result = await supplier.supply(testRequest, testSignal, 0);

				expect(result).toBe(response);
				expect(mockFunctions.logger.debug).toHaveBeenCalled();
				expect(mockFunctions.addInputData).toHaveBeenCalled();
				expect(mockFunctions.addOutputData).toHaveBeenCalled();
			});

			it('should use default attempt=0 when omitted', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal);

				expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(0);
			});
		});

		describe('execution order', () => {
			it('should check abort signal before execution', async () => {
				const abortController = new AbortController();
				const signal = abortController.signal;
				abortController.abort();
				const throwIfAbortedSpy = jest.spyOn(signal, 'throwIfAborted');

				await supplier.supply(testRequest, signal, 0);

				expect(throwIfAbortedSpy).toHaveBeenCalled();
			});

			it('should validate request before execution', async () => {
				const validateSpy = jest.spyOn(testRequest, 'throwIfInvalid');
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(validateSpy).toHaveBeenCalled();
			});

			it('should apply delay before execution', async () => {
				(mockExecutionContext.calculateDelay as jest.Mock).mockReturnValue(1000);
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 1);

				expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(1);
				expect(Delay.apply).toHaveBeenCalledWith(1000, testSignal);
			});

			it('should execute supplier logic', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(supplier.executeMock).toHaveBeenCalledWith(testRequest, testSignal);
			});

			it('should validate response after execution', async () => {
				const response = new TestSupplyResponse(testRequest);
				const validateSpy = jest.spyOn(response, 'throwIfInvalid');
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(validateSpy).toHaveBeenCalled();
			});
		});

		describe('delay calculation', () => {
			it('should apply 0ms delay on first attempt', async () => {
				(mockExecutionContext.calculateDelay as jest.Mock).mockReturnValue(0);
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(0);
				expect(Delay.apply).toHaveBeenCalledWith(0, testSignal);
			});

			it('should apply non-zero delay on subsequent attempts', async () => {
				(mockExecutionContext.calculateDelay as jest.Mock).mockReturnValue(2500);
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 2);

				expect(mockExecutionContext.calculateDelay).toHaveBeenCalledWith(2);
				expect(Delay.apply).toHaveBeenCalledWith(2500, testSignal);
			});
		});

		describe('error handling', () => {
			it('should convert abort error to SupplyError', async () => {
				const abortController = new AbortController();
				const signal = abortController.signal;
				abortController.abort();

				const result = await supplier.supply(testRequest, signal, 0);

				expect(result).toBeInstanceOf(SupplyError);
				expect((result as SupplyError).code).toBe(499);
			});

			it('should convert request validation error to SupplyError', async () => {
				testRequest.setValidationError(true);

				const result = await supplier.supply(testRequest, testSignal, 0);

				expect(result).toBeInstanceOf(SupplyError);
				expect((result as SupplyError).code).toBe(500);
			});

			it('should convert delay error to SupplyError', async () => {
				jest.spyOn(Delay, 'apply').mockRejectedValue(new Error('Delay failed'));

				const result = await supplier.supply(testRequest, testSignal, 0);

				expect(result).toBeInstanceOf(SupplyError);
			});

			it('should convert execute error to SupplyError', async () => {
				supplier.executeMock.mockRejectedValue(new Error('Execute failed'));

				const result = await supplier.supply(testRequest, testSignal, 0);

				expect(result).toBeInstanceOf(SupplyError);
			});

			it('should convert response validation error to SupplyError', async () => {
				const response = new TestSupplyResponse(testRequest);
				response.setValidationError(true);
				supplier.executeMock.mockResolvedValue(response);

				const result = await supplier.supply(testRequest, testSignal, 0);

				expect(result).toBeInstanceOf(SupplyError);
			});

			it('should not validate SupplyError from execute', async () => {
				const error = new SupplyError(testRequest, 400, 'Bad request', false);
				supplier.executeMock.mockResolvedValue(error);

				const result = await supplier.supply(testRequest, testSignal, 0);

				expect(result).toBe(error);
			});
		});

		describe('logging', () => {
			it('should log supply attempt start', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.logger.debug).toHaveBeenCalledWith(
					expect.stringContaining('attempt 1'),
					expect.objectContaining({
						agentRequestId: testRequest.agentRequestId,
						supplyRequestId: testRequest.supplyRequestId,
					}),
				);
			});

			it('should use 1-based attempt numbering in logs', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 49);

				expect(mockFunctions.logger.debug).toHaveBeenCalledWith(expect.stringContaining('attempt 50'), expect.any(Object));
			});
		});

		describe('data registration', () => {
			it('should add input data to workflow', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.addInputData).toHaveBeenCalledWith(mockConnection, [[{ json: testRequest.asDataObject() }]]);
			});

			it('should use index from addInputData for output', async () => {
				(mockFunctions.addInputData as jest.Mock).mockReturnValue({ index: 5 });
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.addOutputData).toHaveBeenCalledWith(mockConnection, 5, expect.any(Array));
			});

			it('should add output data for success', async () => {
				const response = new TestSupplyResponse(testRequest);
				supplier.executeMock.mockResolvedValue(response);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.addOutputData).toHaveBeenCalledWith(mockConnection, 0, [[{ json: response.asDataObject() }]]);
			});

			it('should add error output for SupplyError', async () => {
				const error = new SupplyError(testRequest, 500, 'Error', false);
				supplier.executeMock.mockResolvedValue(error);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.addOutputData).toHaveBeenCalledWith(mockConnection, 0, error.asError(mockNode));
			});
		});

		describe('error result logging', () => {
			it('should log retriable error at info level', async () => {
				const error = new SupplyError(testRequest, 500, 'Retriable error', true);
				supplier.executeMock.mockResolvedValue(error);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.logger.info).toHaveBeenCalledWith(expect.stringContaining('retriable'), expect.any(Object));
			});

			it('should log non-retriable error at warn level', async () => {
				const error = new SupplyError(testRequest, 400, 'Non-retriable error', false);
				supplier.executeMock.mockResolvedValue(error);

				await supplier.supply(testRequest, testSignal, 0);

				expect(mockFunctions.logger.warn).toHaveBeenCalledWith(expect.stringContaining('non-retriable'), expect.any(Object));
			});
		});
	});

	describe('onError', () => {
		describe('timeout errors', () => {
			it('should convert TimeoutError to code 408', () => {
				const timeoutError = new DOMException('Timeout', 'TimeoutError');

				const result = supplier['onError'](testRequest, timeoutError);

				expect(result.code).toBe(408);
				expect(result.isRetriable).toBe(false);
				expect(result.reason).toContain('timed out');
			});

			it('should log warn for TimeoutError', () => {
				const timeoutError = new DOMException('Timeout', 'TimeoutError');

				supplier['onError'](testRequest, timeoutError);

				expect(mockFunctions.logger.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'), expect.any(Object));
			});
		});

		describe('abort errors', () => {
			it('should convert AbortError to code 499', () => {
				const abortError = new DOMException('Abort', 'AbortError');

				const result = supplier['onError'](testRequest, abortError);

				expect(result.code).toBe(499);
				expect(result.isRetriable).toBe(false);
				expect(result.reason).toContain('aborted');
			});

			it('should log warn for AbortError', () => {
				const abortError = new DOMException('Abort', 'AbortError');

				supplier['onError'](testRequest, abortError);

				expect(mockFunctions.logger.warn).toHaveBeenCalledWith(expect.stringContaining('aborted'), expect.any(Object));
			});
		});

		describe('unexpected errors', () => {
			it('should convert unexpected error to code 500', () => {
				const unexpectedError = new Error('Something went wrong');

				const result = supplier['onError'](testRequest, unexpectedError);

				expect(result.code).toBe(500);
				expect(result.isRetriable).toBe(false);
				expect(result.reason).toContain('Configuration error');
			});

			it('should log error for unexpected errors', () => {
				const unexpectedError = new Error('Something went wrong');

				supplier['onError'](testRequest, unexpectedError);

				expect(mockFunctions.logger.error).toHaveBeenCalledWith(
					expect.stringContaining('Configuration error'),
					expect.objectContaining({ details: unexpectedError }),
				);
			});

			it('should handle DOMException with different name', () => {
				const otherError = new DOMException('Other', 'OtherError');

				const result = supplier['onError'](testRequest, otherError);

				expect(result.code).toBe(500);
			});

			it('should handle non-DOMException errors', () => {
				const regularError = new Error('Regular error');

				const result = supplier['onError'](testRequest, regularError);

				expect(result.code).toBe(500);
			});
		});

		describe('error metadata', () => {
			it('should include request metadata in all errors', () => {
				const errors = [new DOMException('Timeout', 'TimeoutError'), new DOMException('Abort', 'AbortError'), new Error('Unexpected')];

				errors.forEach((error) => {
					const result = supplier['onError'](testRequest, error);
					expect(result.asLogMetadata()).toEqual(
						expect.objectContaining({
							agentRequestId: testRequest.agentRequestId,
							supplyRequestId: testRequest.supplyRequestId,
						}),
					);
				});
			});

			it('should include error details in unexpected error metadata', () => {
				const unexpectedError = new Error('Details here');

				supplier['onError'](testRequest, unexpectedError);

				expect(mockFunctions.logger.error).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({
						details: unexpectedError,
					}),
				);
			});
		});

		describe('error properties', () => {
			it('should mark all errors as non-retriable by default', () => {
				const errors = [new DOMException('Timeout', 'TimeoutError'), new DOMException('Abort', 'AbortError'), new Error('Unexpected')];

				errors.forEach((error) => {
					const result = supplier['onError'](testRequest, error);
					expect(result.isRetriable).toBe(false);
				});
			});
		});
	});
});
