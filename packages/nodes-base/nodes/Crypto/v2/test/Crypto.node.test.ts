import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { CryptoV2 } from '../CryptoV2.node';

describe('CryptoV2 Node', () => {
	let cryptoNode: CryptoV2;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'Crypto',
		name: 'crypto',
		icon: 'fa:key',
		iconColor: 'green',
		group: ['transform'],
		defaultVersion: 2,
		subtitle: '={{$parameter["action"]}}',
		description: 'Provide cryptographic utilities',
	};

	beforeEach(() => {
		cryptoNode = new CryptoV2(baseDescription);
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'crypto-node',
			name: 'Crypto',
			type: 'n8n-nodes-base.crypto',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});
	});

	describe('Credential Validation', () => {
		describe('HMAC action', () => {
			it('should throw error when hmacSecret is not set in credentials', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, string | boolean> = {
						action: 'hmac',
						type: 'SHA256',
						encoding: 'hex',
						dataPropertyName: 'data',
						binaryData: false,
						value: 'test value',
					};
					return params[paramName];
				});
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					hmacSecret: '',
					signPrivateKey: 'some-key',
				});

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'No HMAC secret set in credentials',
				);
			});

			it('should execute successfully when hmacSecret is provided', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, string | boolean> = {
						action: 'hmac',
						type: 'SHA256',
						encoding: 'base64',
						dataPropertyName: 'data',
						binaryData: false,
						value: 'test',
					};
					return params[paramName];
				});
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					hmacSecret:
						'-----BEGIN RSA PRIVATE KEY-----|MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8QuKUpRKfFLfRYC9AIKjbJTWit+CqvjWYzvQwECAwEAAQJAIJLixBy2qpFoS4DSmoEmo3qGy0t6z09AIJtH+5OeRV1be+N4cDYJKffGzDa88vQENZiRm0GRq6a+HPGQMd2kTQIhAKMSvzIBnni7ot/OSie2TmJLY4SwTQAevXysE2RbFDYdAiEBCUEaRQnMnbp79mxDXDf6AU0cN/RPBjb9qSHDcWZHGzUCIG2Es59z8ugGrDY+pxLQnwfotadxd+Uyv/Ow5T0q5gIJAiEAyS4RaI9YG8EWx/2w0T67ZUVAw8eOMB6BIUg0Xcu+3okCIBOs/5OiPgoTdSy7bcF9IGpSE8ZgGKzgYQVZeN97YE00-----END RSA PRIVATE KEY-----',
					signPrivateKey: '',
				});

				const result = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(result[0][0].json.data).toBe('hoB1e7VM7nbOTl8floCPteEqN4ZODWlVc9IWQjsEhUk=');
			});
		});

		describe('Sign action', () => {
			it('should throw error when signPrivateKey is not set in credentials', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, string> = {
						action: 'sign',
						algorithm: 'RSA-SHA256',
						encoding: 'hex',
						dataPropertyName: 'data',
						value: 'test value',
					};
					return params[paramName];
				});
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					hmacSecret: 'some-secret',
					signPrivateKey: '',
				});

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'No private key set in credentials',
				);
			});

			it('should sign data with valid private key', async () => {
				// Key format matches V1 workflow JSON - uses \n escape sequences
				const privateKey =
					'-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu\nKUpRKfFLfRYC9AIKjbJTWit+CqvjWYzvQwECAwEAAQJAIJLixBy2qpFoS4DSmoEm\no3qGy0t6z09AIJtH+5OeRV1be+N4cDYJKffGzDa88vQENZiRm0GRq6a+HPGQMd2k\nTQIhAKMSvzIBnni7ot/OSie2TmJLY4SwTQAevXysE2RbFDYdAiEBCUEaRQnMnbp7\n9mxDXDf6AU0cN/RPBjb9qSHDcWZHGzUCIG2Es59z8ugGrDY+pxLQnwfotadxd+Uy\nv/Ow5T0q5gIJAiEAyS4RaI9YG8EWx/2w0T67ZUVAw8eOMB6BIUg0Xcu+3okCIBOs\n/5OiPgoTdSy7bcF9IGpSE8ZgGKzgYQVZeN97YE00\n-----END RSA PRIVATE KEY-----';

				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, string> = {
						action: 'sign',
						algorithm: 'RSA-SHA256',
						encoding: 'base64',
						dataPropertyName: 'data',
						value: 'test',
					};
					return params[paramName];
				});
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					hmacSecret: '',
					signPrivateKey: privateKey,
				});

				const result = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(result[0][0].json.data).toBe(
					'ZlDI7xX0XElJHwEpTw08Ykz/D+IJ+hQkcb4Cr929bUjiiLRXy8Etagc0Miuld2WnksIaznNmlqn7bom5oOpDnw==',
				);
			});
		});
	});

	describe('Hash action', () => {
		it('should hash with MD5 (hex encoding)', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | boolean> = {
					action: 'hash',
					type: 'MD5',
					encoding: 'hex',
					dataPropertyName: 'data',
					binaryData: false,
					value: 'test',
				};
				return params[paramName];
			});

			const result = await cryptoNode.execute.call(mockExecuteFunctions);

			expect(result[0][0].json.data).toBe('098f6bcd4621d373cade4e832627b4f6');
		});

		it('should hash with MD5 (base64 encoding)', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | boolean> = {
					action: 'hash',
					type: 'MD5',
					encoding: 'base64',
					dataPropertyName: 'data',
					binaryData: false,
					value: 'test',
				};
				return params[paramName];
			});

			const result = await cryptoNode.execute.call(mockExecuteFunctions);

			expect(result[0][0].json.data).toBe('CY9rzUYh03PK3k6DJie09g==');
		});

		it('should not require credentials for hash action', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | boolean> = {
					action: 'hash',
					type: 'SHA256',
					encoding: 'hex',
					dataPropertyName: 'data',
					binaryData: false,
					value: 'test',
				};
				return params[paramName];
			});

			await cryptoNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getCredentials).not.toHaveBeenCalled();
		});
	});

	describe('Generate action', () => {
		it('should generate valid UUID', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string> = {
					action: 'generate',
					encodingType: 'uuid',
					dataPropertyName: 'data',
				};
				return params[paramName];
			});

			const result = await cryptoNode.execute.call(mockExecuteFunctions);

			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
			expect(result[0][0].json.data).toMatch(uuidRegex);
		});

		it('should not require credentials for generate action', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string> = {
					action: 'generate',
					encodingType: 'uuid',
					dataPropertyName: 'data',
				};
				return params[paramName];
			});

			await cryptoNode.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getCredentials).not.toHaveBeenCalled();
		});
	});
});
