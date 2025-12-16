import { DryRunTranslationSupplier } from '../DryRunTranslationSupplier';
import type { TranslationRequest } from '../../types/TranslationRequest';
import {
	NodeOperationError,
	type ISupplyDataFunctions,
	type NodeConnectionType,
} from 'n8n-workflow';

describe('DryRunTranslationSupplier', () => {
	let mockSupplyData: jest.Mocked<ISupplyDataFunctions>;
	let mockNode: any;
	let connection: NodeConnectionType;

	beforeEach(() => {
		connection = 'main' as NodeConnectionType;

		mockNode = {
			parameters: {
				mockedTranslationResult: 'pass',
				mockedTranslationText: 'Mocked translation',
				mockedTranslationStatusCode: 500,
				mockedTranslationErrorMessage: 'Translation error',
				delayEnabled: false,
				delayType: 'fixed',
				delayValue: 0,
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
		it('should initialize with parameters from node', () => {
			mockNode.parameters = {
				mockedTranslationResult: 'overwrite',
				mockedTranslationText: 'Custom translation',
				mockedTranslationStatusCode: 503,
				mockedTranslationErrorMessage: 'Service unavailable',
				delayEnabled: true,
				delayType: 'random',
				delayValue: 500,
			};

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			expect(supplier).toBeInstanceOf(DryRunTranslationSupplier);
			expect(mockSupplyData.getNode).toHaveBeenCalled();
		});
	});

	describe('pass mode', () => {
		it('should return request text as translation', async () => {
			mockNode.parameters.mockedTranslationResult = 'pass';

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello World',
				from: 'en',
				to: 'es',
			};

			const response = await supplier.translate(request);

			expect(response.translation).toBe('Hello World');
			expect(response.from).toBe('en');
			expect(response.to).toBe('es');
			expect(response.latency).toBeGreaterThanOrEqual(0);
		});
	});

	describe('overwrite mode', () => {
		it('should return configured translation with custom and special characters', async () => {
			const testCases = [
				{ translation: 'Hola Mundo', text: 'Hello World' },
				{ translation: '', text: 'Hello' },
				{ translation: 'Special: <>&"\'\n\t', text: 'Test' },
			];

			for (const testCase of testCases) {
				mockNode.parameters.mockedTranslationResult = 'overwrite';
				mockNode.parameters.mockedTranslationText = testCase.translation;

				const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
				const request: TranslationRequest = {
					text: testCase.text,
					from: 'en',
					to: 'es',
				};

				const response = await supplier.translate(request);

				expect(response.translation).toBe(testCase.translation);
				expect(response.from).toBe('en');
				expect(response.to).toBe('es');
			}
		});
	});

	describe('fail mode', () => {
		it('should throw error in fail mode', async () => {
			mockNode.parameters.mockedTranslationResult = 'fail';
			mockNode.parameters.mockedTranslationStatusCode = 500;
			mockNode.parameters.mockedTranslationErrorMessage = 'Service error';

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			await expect(supplier.translate(request)).rejects.toBeInstanceOf(NodeOperationError);
		});

		it('should include error details in fail mode', async () => {
			mockNode.parameters.mockedTranslationResult = 'fail';
			mockNode.parameters.mockedTranslationErrorMessage = 'Custom error message';

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			try {
				await supplier.translate(request);
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
			}
		});

		it('should use configured status code in fail mode', async () => {
			mockNode.parameters.mockedTranslationResult = 'fail';
			mockNode.parameters.mockedTranslationStatusCode = 429;
			mockNode.parameters.mockedTranslationErrorMessage = 'Rate limited';

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
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
			}
		});
	});

	describe('fixed delay', () => {
		it('should apply fixed delay when enabled', async () => {
			mockNode.parameters.mockedTranslationResult = 'pass';
			mockNode.parameters.delayEnabled = true;
			mockNode.parameters.delayType = 'fixed';
			mockNode.parameters.delayValue = 100;

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const startTime = Date.now();
			await supplier.translate(request);
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeGreaterThanOrEqual(100);
		});

		it('should reflect delay in latency measurement', async () => {
			mockNode.parameters.mockedTranslationResult = 'pass';
			mockNode.parameters.delayEnabled = true;
			mockNode.parameters.delayType = 'fixed';
			mockNode.parameters.delayValue = 50;

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const response = await supplier.translate(request);

			expect(response.latency).toBeGreaterThanOrEqual(50);
		});

		it('should not delay when delay is disabled', async () => {
			mockNode.parameters.mockedTranslationResult = 'pass';
			mockNode.parameters.delayEnabled = false;
			mockNode.parameters.delayValue = 100;

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const startTime = Date.now();
			await supplier.translate(request);
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeLessThan(100);
		});
	});

	describe('random delay', () => {
		it('should apply random delay between 0 and delayValue', async () => {
			mockNode.parameters.mockedTranslationResult = 'pass';
			mockNode.parameters.delayEnabled = true;
			mockNode.parameters.delayType = 'random';
			mockNode.parameters.delayValue = 100;

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const startTime = Date.now();
			await supplier.translate(request);
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeLessThanOrEqual(100 + 50); // Add buffer for execution
		});
	});

	describe('fail mode with delay', () => {
		it('should apply delay before throwing error', async () => {
			mockNode.parameters.mockedTranslationResult = 'fail';
			mockNode.parameters.delayEnabled = true;
			mockNode.parameters.delayType = 'fixed';
			mockNode.parameters.delayValue = 100;
			mockNode.parameters.mockedTranslationErrorMessage = 'Error after delay';

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: 'Hello',
				from: 'en',
				to: 'es',
			};

			const startTime = Date.now();
			try {
				await supplier.translate(request);
				fail('Should have thrown');
			} catch (error) {
				const elapsed = Date.now() - startTime;
				expect(elapsed).toBeGreaterThanOrEqual(100);
				expect(error).toBeInstanceOf(NodeOperationError);
			}
		});

		it('should include delay in error response', async () => {
			mockNode.parameters.mockedTranslationResult = 'fail';
			mockNode.parameters.delayEnabled = true;
			mockNode.parameters.delayType = 'fixed';
			mockNode.parameters.delayValue = 50;

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
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
			}
		});
	});

	describe('language preservation', () => {
		it('should preserve language codes across different modes and pairs', async () => {
			const testCases = [
				{ mode: 'pass' as const, from: 'en', to: 'es' },
				{ mode: 'overwrite' as const, from: 'fr', to: 'de' },
				{ mode: 'pass' as const, from: 'zh', to: 'ja' },
			];

			for (const testCase of testCases) {
				mockNode.parameters.mockedTranslationResult = testCase.mode;
				mockNode.parameters.mockedTranslationText = 'Translated';

				const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
				const request: TranslationRequest = {
					text: 'Test',
					from: testCase.from,
					to: testCase.to,
				};

				const response = await supplier.translate(request);

				expect(response.from).toBe(testCase.from);
				expect(response.to).toBe(testCase.to);
			}
		});
	});

	describe('edge cases', () => {
		it('should handle very long text', async () => {
			mockNode.parameters.mockedTranslationResult = 'pass';
			const longText = 'Hello '.repeat(10000);

			const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
			const request: TranslationRequest = {
				text: longText,
				from: 'en',
				to: 'es',
			};

			const response = await supplier.translate(request);
			expect(response.translation).toBe(longText);
		});

		it('should work with different error status codes', async () => {
			const errorCodes = [429, 500, 599];

			for (const statusCode of errorCodes) {
				mockNode.parameters.mockedTranslationResult = 'fail';
				mockNode.parameters.mockedTranslationStatusCode = statusCode;
				mockNode.parameters.mockedTranslationErrorMessage = `Error ${statusCode}`;

				const supplier = new DryRunTranslationSupplier(connection, mockSupplyData);
				const request: TranslationRequest = {
					text: 'Hello',
					from: 'en',
					to: 'es',
				};

				await expect(supplier.translate(request)).rejects.toBeInstanceOf(NodeOperationError);
			}
		});
	});
});
