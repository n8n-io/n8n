import { mock, mockDeep } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INode } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DryRunProviderV1 } from '../v1/DryRunProviderV1.node.ts';
import { DryRunTranslationSupplier } from '../../../suppliers/DryRunTranslationSupplier';
import type { TranslationRequest } from '../../../types/TranslationRequest';
import type { TranslationResponse } from '../../../types/TranslationResponse';

describe('DryRunProviderV1', () => {
	let node: DryRunProviderV1;
	let mockSupplyDataFunctions: ReturnType<typeof mockDeep<ISupplyDataFunctions>>;

	beforeEach(() => {
		const baseDescription = {
			displayName: 'DryRun Provider',
			name: 'dryRunProvider',
			group: ['transform'],
			description: 'Mock translation provider for testing',
			icon: 'file:dryrun.svg',
		};

		node = new DryRunProviderV1(baseDescription);

		mockSupplyDataFunctions = mockDeep<ISupplyDataFunctions>();
		mockSupplyDataFunctions.getNode.mockReturnValue(
			mock<INode>({
				id: 'test-node',
				name: 'DryRun',
				type: 'translationDryRunProvider',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					mockedTranslationResult: 'pass',
					mockedTranslationText: '',
					mockedTranslationStatusCode: 500,
					mockedTranslationErrorMessage: '',
					delayEnabled: false,
					delayType: 'fixed',
					delayValue: 0,
				},
			}),
		);
	});

	describe('Node Description', () => {
		it('should have required properties defined', () => {
			expect(node.description).toBeDefined();
			expect(node.description.displayName).toBe('DryRun Provider');
			expect(node.description.name).toBe('dryRunProvider');
			expect(node.description.version).toBe(1);
			expect(node.description.defaults).toEqual({ name: 'DryRun' });
		});

		it('should have correct input/output configuration', () => {
			expect(node.description.inputs).toEqual([]);
			expect(node.description.outputs).toContain(NodeConnectionTypes.TranslationSupplier);
		});

		it('should include translation features properties', () => {
			const propertyNames = node.description.properties.map((p) => p.name);

			// Should have properties for mocked translation
			expect(propertyNames).toContain('mockedTranslationResult');
			expect(propertyNames).toContain('mockedTranslationText');
			expect(propertyNames).toContain('mockedTranslationStatusCode');
			expect(propertyNames).toContain('mockedTranslationErrorMessage');

			// Should have properties for delay
			expect(propertyNames).toContain('delayEnabled');
			expect(propertyNames).toContain('delayType');
			expect(propertyNames).toContain('delayValue');

			// Should have properties for retry
			expect(propertyNames).toContain('retryEnabled');
			expect(propertyNames).toContain('retryMaxAttempts');
			expect(propertyNames).toContain('retryMaxDelay');
		});
	});

	describe('supplyData', () => {
		it('should return a DryRunTranslationSupplier instance', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);

			expect(supplyData).toBeDefined();
			expect(supplyData.response).toBeInstanceOf(DryRunTranslationSupplier);
		});
	});

	describe('Pass Mode', () => {
		beforeEach(() => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'pass',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: false,
						delayType: 'fixed',
						delayValue: 0,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);
		});

		it.each<[string, string, string]>([
			['en', 'es', 'Hello World'],
			['en', 'fr', 'Test text'],
			['de', 'it', 'Hallo'],
			['ja', 'zh', '日本語'],
		])('should handle translation from %s to %s with text: "%s"', async (from, to, text) => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const request: TranslationRequest = { text, from, to };
			const response = await supplier.translate(request);

			expect(response.text).toBe(text);
			expect(response.translation).toBe(text);
			expect(response.from).toBe(from);
			expect(response.to).toBe(to);
			expect(response.detectedLanguage).toBe(from);
			expect(response.latency).toBeGreaterThanOrEqual(0);
		});

		it('should handle empty text', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const response = await supplier.translate({ text: '', from: 'en', to: 'es' });

			expect(response.text).toBe('');
			expect(response.translation).toBe('');
		});

		it('should handle long text (10KB+)', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const longText = 'Hello '.repeat(1000);
			const response = await supplier.translate({ text: longText, from: 'en', to: 'es' });

			expect(response.text).toBe(longText);
			expect(response.translation).toBe(longText);
			expect(response.text.length).toBeGreaterThan(5000);
		});

		it.each<string>(['Hello!@#$%^&*()', '<p>HTML</p>', '你好 مرحبا', '🎉✨🌟'])(
			'should handle special characters: "%s"',
			async (specialText) => {
				const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
				const supplier = supplyData.response as DryRunTranslationSupplier;

				const response = await supplier.translate({
					text: specialText,
					from: 'en',
					to: 'es',
				});

				expect(response.text).toBe(specialText);
				expect(response.translation).toBe(specialText);
			},
		);
	});

	describe('Overwrite Mode', () => {
		beforeEach(() => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'overwrite',
						mockedTranslationText: 'Mocked translation',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: false,
						delayType: 'fixed',
						delayValue: 0,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);
		});

		it('should return mocked translation text in overwrite mode', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const response = await supplier.translate({ text: 'Original text', from: 'en', to: 'es' });

			expect(response.text).toBe('Original text');
			expect(response.translation).toBe('Mocked translation');
			expect(response.from).toBe('en');
			expect(response.to).toBe('es');
		});

		it.each<[string, string]>([
			['Hola Mundo', 'Hello World'],
			['', 'Empty string'],
			['Special: <>&"\'\n\t', 'Special chars'],
		])('should use configured text: "%s" for input "%s"', async (mockedText, inputText) => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'overwrite',
						mockedTranslationText: mockedText,
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: false,
						delayType: 'fixed',
						delayValue: 0,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);

			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const response = await supplier.translate({ text: inputText, from: 'en', to: 'es' });

			expect(response.translation).toBe(mockedText);
		});
	});

	describe('Fail Mode', () => {
		beforeEach(() => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'fail',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: 'Translation failed',
						delayEnabled: false,
						delayType: 'fixed',
						delayValue: 0,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);
		});

		it('should throw error in fail mode', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			await expect(supplier.translate({ text: 'Hello', from: 'en', to: 'es' })).rejects.toThrow();
		});

		it.each<number>([429, 500, 503])(
			'should throw error with status code %d',
			async (statusCode) => {
				mockSupplyDataFunctions.getNode.mockReturnValue(
					mock<INode>({
						id: 'test-node',
						name: 'DryRun',
						type: 'translationDryRunProvider',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							mockedTranslationResult: 'fail',
							mockedTranslationText: '',
							mockedTranslationStatusCode: statusCode,
							mockedTranslationErrorMessage: `Error ${statusCode}`,
							delayEnabled: false,
							delayType: 'fixed',
							delayValue: 0,
							retryEnabled: false,
							maxRetryAttempts: 1,
							retryDelayBase: 100,
						},
					}),
				);

				const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
				const supplier = supplyData.response as DryRunTranslationSupplier;

				await expect(supplier.translate({ text: 'Hello', from: 'en', to: 'es' })).rejects.toThrow();
			},
		);
	});

	describe('Delay Features', () => {
		it('should apply fixed delay when enabled', async () => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'pass',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: true,
						delayType: 'fixed',
						delayValue: 50,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);

			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const delayValue = 50;
			const tolerance = 30;
			const startTime = Date.now();
			await supplier.translate({ text: 'Hello', from: 'en', to: 'es' });
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeGreaterThanOrEqual(delayValue - tolerance);
		});

		it('should reflect delay in latency measurement', async () => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'pass',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: true,
						delayType: 'fixed',
						delayValue: 100,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);

			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const delayValue = 100;
			const tolerance = 50;
			const response = await supplier.translate({ text: 'Hello', from: 'en', to: 'es' });

			expect(response.latency).toBeGreaterThanOrEqual(delayValue - tolerance);
		});

		it('should not delay when disabled', async () => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'pass',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: false,
						delayType: 'fixed',
						delayValue: 100,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);

			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const startTime = Date.now();
			await supplier.translate({ text: 'Hello', from: 'en', to: 'es' });
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeLessThan(100);
		});

		it('should apply random delay between 0 and delayValue', async () => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'pass',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: true,
						delayType: 'random',
						delayValue: 100,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);

			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const startTime = Date.now();
			await supplier.translate({ text: 'Hello', from: 'en', to: 'es' });
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeLessThanOrEqual(150); // 100 + buffer
		});
	});

	describe('Error Handling', () => {
		it('should apply delay before throwing error', async () => {
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'fail',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: 'Error after delay',
						delayEnabled: true,
						delayType: 'fixed',
						delayValue: 100,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);

			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const startTime = Date.now();
			try {
				await supplier.translate({ text: 'Hello', from: 'en', to: 'es' });
				fail('Should have thrown');
			} catch (error) {
				const elapsed = Date.now() - startTime;
				expect(elapsed).toBeGreaterThanOrEqual(100);
			}
		});
	});

	describe('Integration Scenarios', () => {
		beforeEach(() => {
			// Ensure default pass mode for integration tests
			mockSupplyDataFunctions.getNode.mockReturnValue(
				mock<INode>({
					id: 'test-node',
					name: 'DryRun',
					type: 'translationDryRunProvider',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						mockedTranslationResult: 'pass',
						mockedTranslationText: '',
						mockedTranslationStatusCode: 500,
						mockedTranslationErrorMessage: '',
						delayEnabled: false,
						delayType: 'fixed',
						delayValue: 0,
						retryEnabled: false,
						maxRetryAttempts: 1,
						retryDelayBase: 100,
					},
				}),
			);
		});

		it('should preserve language codes across different modes', async () => {
			const modes: Array<'pass' | 'overwrite'> = ['pass', 'overwrite'];
			const langPairs = [
				{ from: 'en', to: 'es' },
				{ from: 'fr', to: 'de' },
				{ from: 'zh', to: 'ja' },
			];

			for (const mode of modes) {
				for (const pair of langPairs) {
					mockSupplyDataFunctions.getNode.mockReturnValue(
						mock<INode>({
							id: 'test-node',
							name: 'DryRun',
							type: 'translationDryRunProvider',
							typeVersion: 1,
							position: [0, 0],
							parameters: {
								mockedTranslationResult: mode,
								mockedTranslationText: 'Translated',
								mockedTranslationStatusCode: 500,
								mockedTranslationErrorMessage: '',
								delayEnabled: false,
								delayType: 'fixed',
								delayValue: 0,
								retryEnabled: false,
								maxRetryAttempts: 1,
								retryDelayBase: 100,
							},
						}),
					);

					const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
					const supplier = supplyData.response as DryRunTranslationSupplier;

					const response = await supplier.translate({ text: 'Test', from: pair.from, to: pair.to });

					expect(response.from).toBe(pair.from);
					expect(response.to).toBe(pair.to);
				}
			}
		});

		it('should handle very long text (10KB+)', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const longText = 'a'.repeat(10000);
			const response = await supplier.translate({ text: longText, from: 'en', to: 'es' });

			expect(response.text.length).toBeGreaterThanOrEqual(10000);
		});

		it('should handle multiple sequential requests', async () => {
			const supplyData = await node.supplyData.call(mockSupplyDataFunctions);
			const supplier = supplyData.response as DryRunTranslationSupplier;

			const responses: TranslationResponse[] = [];
			for (let i = 0; i < 5; i++) {
				const response = await supplier.translate({
					text: `Text ${i}`,
					from: 'en',
					to: 'es',
				});
				responses.push(response);
			}

			expect(responses).toHaveLength(5);
			responses.forEach((response, i) => {
				expect(response.text).toBe(`Text ${i}`);
			});
		});
	});
});
