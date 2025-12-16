import { TranslationSupplier } from '../TranslationSupplier';
import type { TranslationRequest } from '../TranslationRequest';
import type { TranslationResponse } from '../TranslationResponse';
import { NodeOperationError, ExecutionError } from 'n8n-workflow';
import type { ISupplyDataFunctions, NodeConnectionType } from 'n8n-workflow';

// Mock implementation for testing
class TestTranslationSupplier extends TranslationSupplier {
	private responses: TranslationResponse[] = [];
	private throwError = false;
	private errorMessage = 'Test error';
	private callCount = 0;

	constructor(connection: NodeConnectionType, data: ISupplyDataFunctions) {
		super(connection, data);
	}

	setResponses(responses: TranslationResponse[]): void {
		this.responses = responses;
		this.callCount = 0;
	}

	setThrowError(shouldThrow: boolean, message?: string): void {
		this.throwError = shouldThrow;
		if (message) this.errorMessage = message;
		this.callCount = 0;
	}

	getCallCount(): number {
		return this.callCount;
	}

	protected async executeTranslation(request: TranslationRequest): Promise<TranslationResponse> {
		this.callCount++;

		if (this.throwError) {
			throw new Error(this.errorMessage);
		}

		if (this.responses.length > 0) {
			return this.responses[this.callCount - 1] || this.responses[0];
		}

		return {
			...request,
			translation: `Translated: ${request.text}`,
		};
	}
}

describe('TranslationSupplier', () => {
	let mockSupplyData: jest.Mocked<ISupplyDataFunctions>;
	let mockNode: any;
	let connection: NodeConnectionType;

	beforeEach(() => {
		connection = 'main' as NodeConnectionType;

		mockNode = {
			parameters: {
				retryEnabled: false,
				retryMaxAttempts: 1,
				retryMaxDelay: 1000,
			},
		};

		mockSupplyData = {
			getNode: jest.fn().mockReturnValue(mockNode),
			addInputData: jest.fn(),
			addOutputData: jest.fn(),
		} as unknown as jest.Mocked<ISupplyDataFunctions>;
	});

	describe('constructor', () => {
		it('should create an instance and read retry configuration', () => {
			mockNode.parameters = {
				retryEnabled: true,
				retryMaxAttempts: 3,
				retryMaxDelay: 2000,
			};

			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			expect(supplier).toBeInstanceOf(TranslationSupplier);
			expect(mockSupplyData.getNode).toHaveBeenCalled();
		});
	});

	describe('translate method without retry', () => {
		it('should successfully translate a request', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const response = await supplier.translate(request);

			expect(response).toBeDefined();
			expect(response.text).toBe('Hello');
			expect(response.from).toBe('en');
			expect(response.to).toBe('es');
			expect(response.translation).toBeDefined();
		});

		it('should call addInputData with the request', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			await supplier.translate(request);

			expect(mockSupplyData.addInputData).toHaveBeenCalledWith(
				connection,
				expect.arrayContaining([
					expect.arrayContaining([expect.objectContaining({ json: request })]),
				]),
				0,
			);
		});

		it('should call addOutputData with the response', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			await supplier.translate(request);

			expect(mockSupplyData.addOutputData).toHaveBeenCalledWith(
				connection,
				0,
				expect.arrayContaining([
					expect.arrayContaining([
						expect.objectContaining({
							json: expect.objectContaining({
								text: 'Hello',
								translation: expect.any(String),
							}),
						}),
					]),
				]),
			);
		});

		it('should throw error when translation fails and retry is disabled', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			supplier.setThrowError(true, 'Translation service down');

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			await expect(supplier.translate(request)).rejects.toThrow(NodeOperationError);
		});

		it('should call addOutputData with error when translation fails', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			supplier.setThrowError(true);

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			try {
				await supplier.translate(request);
			} catch (e) {
				// Expected error
			}

			expect(mockSupplyData.addOutputData).toHaveBeenCalledWith(
				connection,
				0,
				expect.any(Object), // ExecutionError
			);
		});
	});

	describe('translate method with retry enabled', () => {
		it('should retry and succeed on second attempt', async () => {
			mockNode.parameters.retryEnabled = true;
			mockNode.parameters.retryMaxAttempts = 2;
			mockNode.parameters.retryMaxDelay = 100;

			const supplier = new TestTranslationSupplier(connection, mockSupplyData);

			// First call throws, second succeeds
			let attemptCount = 0;
			const originalExecute = (supplier as any).executeTranslation.bind(supplier);
			(supplier as any).executeTranslation = async (request: TranslationRequest) => {
				attemptCount++;
				if (attemptCount === 1) {
					throw new Error('First attempt failed');
				}
				return originalExecute(request);
			};

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const response = await supplier.translate(request);

			expect(response).toBeDefined();
			expect(response.translation).toBeDefined();
			expect(attemptCount).toBe(2);
		});

		it('should retry with multiple attempts', async () => {
			mockNode.parameters.retryEnabled = true;
			mockNode.parameters.retryMaxAttempts = 3;
			mockNode.parameters.retryMaxDelay = 50;

			const supplier = new TestTranslationSupplier(connection, mockSupplyData);

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			// Set to fail multiple times
			let attemptCount = 0;
			(supplier as any).executeTranslation = async (request: TranslationRequest) => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error(`Attempt ${attemptCount} failed`);
				}
				return {
					...request,
					translation: `Translated: ${request.text}`,
				};
			};

			const response = await supplier.translate(request);

			expect(response).toBeDefined();
			expect(attemptCount).toBe(3);
		});

		it('should fail after max attempts exceeded', async () => {
			mockNode.parameters.retryEnabled = true;
			mockNode.parameters.retryMaxAttempts = 2;
			mockNode.parameters.retryMaxDelay = 50;

			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			supplier.setThrowError(true, 'Always fails');

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			await expect(supplier.translate(request)).rejects.toThrow(
				'Translation failed after maximum retry attempts: 2',
			);
		});
	});

	describe('waitTillNextRetryAttempt method', () => {
		it('should introduce delay for retry attempts', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			mockNode.parameters.retryMaxDelay = 100;
			const expectedMinDelay = 50; // Account for test timing variance

			const startTime = Date.now();
			await (supplier as any).waitTillNextRetryAttempt(1);
			const elapsed = Date.now() - startTime;

			// Verify delay was applied (with tolerance for CI system variance)
			expect(typeof elapsed).toBe('number');
			expect(elapsed).toBeGreaterThanOrEqual(expectedMinDelay);
		});
	});

	describe('error handling', () => {
		it('should wrap errors in NodeOperationError with node context', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			supplier.setThrowError(true, 'Connection timeout');

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			try {
				await supplier.translate(request);
				fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect(mockSupplyData.getNode).toHaveBeenCalled();
			}
		});
	});

	describe('integration scenarios', () => {
		it('should handle successful translation with latency', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
				latency: 150,
			};

			supplier.setResponses([response]);

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const result = await supplier.translate(request);

			expect(result.latency).toBe(150);
			expect(result.translation).toBe('Hola');
		});

		it('should handle translation with detected language', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);
			const response: TranslationResponse = {
				text: 'Hello',
				from: 'en',
				to: 'es',
				translation: 'Hola',
				detectedLanguage: 'en',
			};

			supplier.setResponses([response]);

			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const result = await supplier.translate(request);

			expect(result.detectedLanguage).toBe('en');
		});

		it('should handle multiple requests in sequence', async () => {
			const supplier = new TestTranslationSupplier(connection, mockSupplyData);

			const requests: TranslationRequest[] = [
				{ text: 'Hello', from: 'en', to: 'es' },
				{ text: 'Goodbye', from: 'en', to: 'es' },
				{ text: 'Thank you', from: 'en', to: 'es' },
			];

			for (const request of requests) {
				const result = await supplier.translate(request);
				expect(result.text).toBe(request.text);
				expect(result.translation).toBeDefined();
			}
		});
	});
});
