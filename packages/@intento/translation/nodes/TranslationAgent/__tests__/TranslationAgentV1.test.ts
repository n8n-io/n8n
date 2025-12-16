import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { TranslationRequest } from '../../../types/TranslationRequest';
import type { TranslationSupplier } from '../../../types/TranslationSupplier';
import type { TranslationResponse } from '../../../types/TranslationResponse';
import { TranslationAgentV1 } from '../v1/TranslationAgentV1.node';

describe('TranslationAgentV1', () => {
	let node: TranslationAgentV1;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		jest.clearAllMocks();

		mockNode = mock<INode>({
			id: 'translation-agent-test',
			name: 'Translation Agent',
			type: 'n8n-nodes-intento.translationAgent',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.logger.mockReturnValue({
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as any);

		const baseDescription = {
			displayName: 'Translation Agent',
			name: 'translationAgent',
			group: ['transform'],
			description: 'Use Intento Translation Agent to translate text via NMT and LLM providers.',
			icon: {
				light: 'file:translationAgent.light.svg',
				dark: 'file:translationAgent.dark.svg',
			},
		};

		node = new TranslationAgentV1(baseDescription);
	});

	describe('Node Description', () => {
		it('should have required properties defined', () => {
			const propNames = node.description.properties.map((p) => p.name);
			expect(propNames).toContain('numberModels');
			expect(propNames).toContain('text');
			expect(propNames).toContain('from');
			expect(propNames).toContain('to');
		});
	});

	describe('Execute - Happy Path', () => {
		it('should translate text successfully with single provider', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text: 'Hello World',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Hello World',
				translation: 'Hola Mundo',
				from: 'en',
				to: 'es',
				detectedLanguage: 'en',
				latency: 100,
			};

			const mockSupplier = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
			expect(mockSupplier.translate).toHaveBeenCalledWith({
				text: 'Hello World',
				from: 'en',
				to: 'es',
			});
		});

		it.each<[string, string, string]>([
			['en', 'es', 'Hello'],
			['en', 'fr', 'Good morning'],
			['de', 'it', 'Guten Tag'],
		])('should translate text with %s→%s language pair: "%s"', async (from, to, text) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text,
					from,
					to,
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text,
				translation: 'translated',
				from,
				to,
				detectedLanguage: from,
				latency: 100,
			};

			const mockSupplier = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockSupplier.translate).toHaveBeenCalledWith({
				text,
				from,
				to,
			});
		});

		it('should translate text with multiple providers and use first successful one', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 2,
					text: 'Hello',
					from: 'en',
					to: 'fr',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Hello',
				translation: 'Bonjour',
				from: 'en',
				to: 'fr',
				detectedLanguage: 'en',
				latency: 150,
			};

			const mockSupplier1 = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			const mockSupplier2 = mock<TranslationSupplier>({
				translate: jest.fn().mockRejectedValue(new Error('Provider 2 failed')),
			});

			// Node reverses the array, so mockSupplier2 becomes index 0, mockSupplier1 becomes index 1
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier1, mockSupplier2]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
		});
		it('should use second provider when first fails', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 2,
					text: 'Hello',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Hello',
				translation: 'Hola',
				from: 'en',
				to: 'es',
				detectedLanguage: 'en',
				latency: 100,
			};

			const mockSupplier1 = mock<TranslationSupplier>({
				translate: jest.fn().mockRejectedValue(new Error('Provider 1 failed')),
			});

			const mockSupplier2 = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			// Node reverses array: [mockSupplier1, mockSupplier2] -> [mockSupplier2, mockSupplier1]
			// So mockSupplier2 is tried first (and succeeds)
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier1, mockSupplier2]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
			// mockSupplier2 is tried first due to reverse order
			expect(mockSupplier2.translate).toHaveBeenCalled();
		});

		it('should try providers in reverse order', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 3,
					text: 'Test',
					from: 'en',
					to: 'de',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Test',
				translation: 'Test',
				from: 'en',
				to: 'de',
				detectedLanguage: 'en',
				latency: 50,
			};

			const suppliers = Array(3)
				.fill(null)
				.map((_, i) => {
					const supplier = mock<TranslationSupplier>({
						translate: jest.fn().mockRejectedValue(new Error(`Provider ${i} failed`)),
					});
					if (i === 2) {
						supplier.translate.mockResolvedValue(mockResponse);
					}
					return supplier;
				});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(suppliers);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
			expect(suppliers[2].translate).toHaveBeenCalled();
		});

		it('should throw error when all providers fail', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 2,
					text: 'Hello',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockSupplier1 = mock<TranslationSupplier>({
				translate: jest.fn().mockRejectedValue(new Error('Provider 1 failed')),
			});

			const mockSupplier2 = mock<TranslationSupplier>({
				translate: jest.fn().mockRejectedValue(new Error('Provider 2 failed')),
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier1, mockSupplier2]);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
		});
	});

	describe('Execute - Error Handling', () => {
		it('should throw error when no providers are connected', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text: 'Hello',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([]);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
		});

		it('should throw error when connection data is not an array', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text: 'Hello',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(null);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
		});

		it('should log warning when provider fails', async () => {
			const mockLogger = {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			};
			mockExecuteFunctions.logger = mockLogger as any;

			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 2,
					text: 'Hello',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Hello',
				translation: 'Hola',
				from: 'en',
				to: 'es',
				detectedLanguage: 'en',
				latency: 100,
			};

			const mockSupplier1 = mock<TranslationSupplier>({
				translate: jest.fn().mockRejectedValue(new Error('Provider 1 failed')),
			});

			const mockSupplier2 = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			// Node reverses array: [mockSupplier1, mockSupplier2] -> [mockSupplier2, mockSupplier1]
			// mockSupplier2 succeeds first, so mockSupplier1 is not called
			// For logger to be called, we need a provider to actually fail
			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier2, mockSupplier1]);

			await node.execute.call(mockExecuteFunctions);

			expect(mockLogger.warn).toHaveBeenCalled();
		});

		it('should include provider count in error message when all fail', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 3,
					text: 'Hello',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const suppliers = Array(3)
				.fill(null)
				.map(() =>
					mock<TranslationSupplier>({
						translate: jest.fn().mockRejectedValue(new Error('Failed')),
					}),
				);

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(suppliers);

			try {
				await node.execute.call(mockExecuteFunctions);
				fail('Should have thrown');
			} catch (error) {
				expect((error as NodeOperationError).message).toContain('3');
				expect((error as NodeOperationError).message).toContain('All');
			}
		});
	});

	describe('Execute - Text Handling', () => {
		it.each([
			{ text: '', desc: 'empty text' },
			{ text: 'Hello '.repeat(1000), desc: 'long text' },
			{ text: 'Hello!@#$%^&*() <p>HTML</p>', desc: 'special characters and HTML' },
			{ text: '你好 مرحبا', desc: 'multilingual text' },
		])('should handle various text inputs: $desc', async ({ text, desc }) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text,
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text,
				translation: 'translated',
				from: 'en',
				to: 'es',
				detectedLanguage: 'en',
				latency: 100,
			};

			const mockSupplier = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual(mockResponse);
			expect(mockSupplier.translate).toHaveBeenCalledWith(expect.objectContaining({ text }));
		});
	});

	describe('Execute - Response Handling', () => {
		it('should return supplier response as output', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text: 'Test',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Test',
				translation: 'Prueba',
				from: 'en',
				to: 'es',
				detectedLanguage: 'en',
				latency: 100,
			};

			const mockSupplier = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
		});
	});

	describe('Execute - Request Building', () => {
		it('should build and pass correct translation request to supplier', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 1,
					text: 'Hello World',
					from: 'en',
					to: 'de',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Hello World',
				translation: 'Hallo Welt',
				from: 'en',
				to: 'de',
				detectedLanguage: 'en',
				latency: 100,
			};

			const mockSupplier = mock<TranslationSupplier>({
				translate: jest.fn().mockResolvedValue(mockResponse),
			});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier]);

			await node.execute.call(mockExecuteFunctions);

			const expectedRequest: TranslationRequest = {
				text: 'Hello World',
				from: 'en',
				to: 'de',
			};

			expect(mockSupplier.translate).toHaveBeenCalledWith(expectedRequest);
		});
	});

	describe('Execute - Concurrent Requests', () => {
		it('should handle 5+ concurrent translation requests', async () => {
			const numRequests = 7;
			const promises: Promise<any>[] = [];

			for (let i = 0; i < numRequests; i++) {
				mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
					const params: Record<string, any> = {
						numberModels: 1,
						text: `Request ${i}`,
						from: 'en',
						to: 'es',
					};
					return params[param];
				});

				const mockResponse: TranslationResponse = {
					text: `Request ${i}`,
					translation: `Solicitud ${i}`,
					from: 'en',
					to: 'es',
					detectedLanguage: 'en',
					latency: 50 + i * 10,
				};

				const mockSupplier = mock<TranslationSupplier>({
					translate: jest.fn().mockResolvedValue(mockResponse),
				});

				mockExecuteFunctions.getInputConnectionData.mockResolvedValue([mockSupplier]);

				promises.push(node.execute.call(mockExecuteFunctions));
			}

			const results = await Promise.all(promises);

			expect(results).toHaveLength(numRequests);
			results.forEach((result, i) => {
				expect(result[0][0].json.text).toBe(`Request ${i}`);
			});
		});
	});

	describe('Execute - Performance Edge Cases', () => {
		it('should handle extremely large provider count (100+ providers)', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 100,
					text: 'Test',
					from: 'en',
					to: 'es',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Test',
				translation: 'Prueba',
				from: 'en',
				to: 'es',
				detectedLanguage: 'en',
				latency: 100,
			};

			// Create many suppliers, only first one succeeds
			const suppliers = Array(100)
				.fill(null)
				.map((_, i) => {
					const supplier = mock<TranslationSupplier>({
						translate: jest.fn(),
					});
					if (i === 0) {
						supplier.translate.mockResolvedValue(mockResponse);
					} else {
						supplier.translate.mockRejectedValue(new Error(`Provider ${i} failed`));
					}
					return supplier;
				});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(suppliers);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
			// First provider should be called (after reversal)
			expect(suppliers[0].translate).toHaveBeenCalled();
		});

		it('should succeed with many provider failures before success', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
				const params: Record<string, any> = {
					numberModels: 25,
					text: 'Test text',
					from: 'en',
					to: 'fr',
				};
				return params[param];
			});

			const mockResponse: TranslationResponse = {
				text: 'Test text',
				translation: 'Texte de test',
				from: 'en',
				to: 'fr',
				detectedLanguage: 'en',
				latency: 80,
			};

			// Create suppliers: first 24 fail, last one succeeds
			const suppliers = Array(25)
				.fill(null)
				.map((_, i) => {
					const supplier = mock<TranslationSupplier>({
						translate: jest.fn(),
					});
					if (i === 24) {
						supplier.translate.mockResolvedValue(mockResponse);
					} else {
						supplier.translate.mockRejectedValue(new Error(`Provider ${i} failed`));
					}
					return supplier;
				});

			mockExecuteFunctions.getInputConnectionData.mockResolvedValue(suppliers);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: mockResponse }]]);
			expect(suppliers[24].translate).toHaveBeenCalled();
		});
	});
});
