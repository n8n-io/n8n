import { generateKeyPairSync } from 'crypto';
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

			it('should compute HMAC-SHA1 over a value with hex encoding', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, string | boolean> = {
						action: 'hmac',
						type: 'SHA1',
						encoding: 'hex',
						dataPropertyName: 'data',
						binaryData: false,
						value: 'test',
					};
					return params[paramName];
				});
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					hmacSecret: 'key',
					signPrivateKey: '',
				});

				const result = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(result[0][0].json.data).toBe('671f54ce0c540f78ffe1e26dcf9c2a047aea4fda');
			});

			it('should compute HMAC-SHA1 over in-memory binary data with hex encoding', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{ json: {}, binary: { data: { data: 'dGVzdA==', mimeType: 'text/plain' } } },
				]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, string | boolean> = {
						action: 'hmac',
						type: 'SHA1',
						encoding: 'hex',
						dataPropertyName: 'data',
						binaryData: true,
						binaryPropertyName: 'data',
					};
					return params[paramName];
				});
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					hmacSecret: 'key',
					signPrivateKey: '',
				});
				(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue({
					data: 'dGVzdA==',
					mimeType: 'text/plain',
				});

				const result = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(result[0][0].json.data).toBe('671f54ce0c540f78ffe1e26dcf9c2a047aea4fda');
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

		it('should hash with SHA1 (hex encoding)', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | boolean> = {
					action: 'hash',
					type: 'SHA1',
					encoding: 'hex',
					dataPropertyName: 'data',
					binaryData: false,
					value: 'test',
				};
				return params[paramName];
			});

			const result = await cryptoNode.execute.call(mockExecuteFunctions);

			expect(result[0][0].json.data).toBe('a94a8fe5ccb19ba61c4c0873d391e987982fbbd3');
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

	describe('Encrypt / Decrypt actions', () => {
		const passphrase = 'correct horse battery staple';
		const plaintext = 'The quick brown fox jumps over the lazy dog';
		const symmetricCiphers = [
			'aes-128-gcm',
			'aes-192-gcm',
			'aes-256-gcm',
			'chacha20-poly1305',
		] as const;

		let rsaPublicKey: string;
		let rsaPrivateKey: string;

		beforeAll(() => {
			const keys = generateKeyPairSync('rsa', {
				modulusLength: 2048,
				publicKeyEncoding: { type: 'spki', format: 'pem' },
				privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			});
			rsaPublicKey = keys.publicKey;
			rsaPrivateKey = keys.privateKey;
		});

		const mockEncryptParams = (
			overrides: Partial<Record<string, string>> = {},
		): Record<string, string> => ({
			action: 'encrypt',
			mode: 'symmetric',
			cipher: 'aes-256-gcm',
			value: plaintext,
			dataPropertyName: 'data',
			...overrides,
		});

		const mockDecryptParams = (
			value: string,
			overrides: Partial<Record<string, string>> = {},
		): Record<string, string> => ({
			action: 'decrypt',
			mode: 'symmetric',
			cipher: 'aes-256-gcm',
			value,
			dataPropertyName: 'data',
			...overrides,
		});

		describe('Credential validation', () => {
			it('throws when symmetric encrypt has no passphrase', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const params = mockEncryptParams();
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({ encryptionPassphrase: '' });

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'No encryption passphrase set',
				);
			});

			it('throws when asymmetric encrypt has no public key', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const params = mockEncryptParams({ mode: 'asymmetric' });
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({ encryptionPublicKey: '' });

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'No encryption public key set',
				);
			});

			it('throws when symmetric decrypt has no passphrase', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const params = mockDecryptParams('AAAA');
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({ encryptionPassphrase: '' });

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'No encryption passphrase set',
				);
			});

			it('throws when asymmetric decrypt has no private key', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				const params = mockDecryptParams('AAAA', { mode: 'asymmetric' });
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({ encryptionPrivateKey: '' });

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'No encryption private key set',
				);
			});
		});

		describe('Symmetric round-trip', () => {
			it.each(symmetricCiphers)('encrypts and decrypts with %s', async (cipher) => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPassphrase: passphrase,
				});

				const encryptParams = mockEncryptParams({ cipher });
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				expect(typeof ciphertext).toBe('string');
				expect(ciphertext.length).toBeGreaterThan(0);
				expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);

				const decryptParams = mockDecryptParams(ciphertext, { cipher });
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);
				const decryptResult = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(decryptResult[0][0].json.data).toBe(plaintext);
			});

			it('produces different ciphertext each run (random salt/iv)', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPassphrase: passphrase,
				});
				const params = mockEncryptParams();
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => params[name]);

				const first = await cryptoNode.execute.call(mockExecuteFunctions);
				const second = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(first[0][0].json.data).not.toBe(second[0][0].json.data);
			});

			it('throws when decrypting a tampered payload', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPassphrase: passphrase,
				});
				const encryptParams = mockEncryptParams();
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				const tampered = Buffer.from(ciphertext, 'base64');
				tampered[tampered.length - 1] ^= 0xff;
				const tamperedB64 = tampered.toString('base64');

				const decryptParams = mockDecryptParams(tamperedB64);
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});

			it('throws when decrypting with the wrong passphrase', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPassphrase: passphrase,
				});
				const encryptParams = mockEncryptParams();
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPassphrase: 'wrong passphrase',
				});
				const decryptParams = mockDecryptParams(ciphertext);
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});

			it('throws when decrypting with the wrong cipher selection', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPassphrase: passphrase,
				});

				const encryptParams = mockEncryptParams({ cipher: 'aes-256-gcm' });
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				const decryptParams = mockDecryptParams(ciphertext, { cipher: 'chacha20-poly1305' });
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow();
			});
		});

		describe('Asymmetric round-trip', () => {
			it('encrypts with public key and decrypts with private key', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPublicKey: rsaPublicKey,
				});
				const encryptParams = mockEncryptParams({ mode: 'asymmetric' });
				delete encryptParams.cipher;
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				expect(typeof ciphertext).toBe('string');
				expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);

				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPrivateKey: rsaPrivateKey,
				});
				const decryptParams = mockDecryptParams(ciphertext, { mode: 'asymmetric' });
				delete decryptParams.cipher;
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);
				const decryptResult = await cryptoNode.execute.call(mockExecuteFunctions);

				expect(decryptResult[0][0].json.data).toBe(plaintext);
			});

			it('throws a clear error when RSA plaintext exceeds the key size limit', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPublicKey: rsaPublicKey,
				});

				// 2048-bit RSA-OAEP-SHA256 max plaintext is ~190 bytes.
				const oversized = 'a'.repeat(512);
				const encryptParams = mockEncryptParams({ mode: 'asymmetric', value: oversized });
				delete encryptParams.cipher;
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Plaintext is too large',
				);
			});

			it('wraps asymmetric decrypt failures in a NodeOperationError', async () => {
				const otherKeyPair = generateKeyPairSync('rsa', {
					modulusLength: 2048,
					publicKeyEncoding: { type: 'spki', format: 'pem' },
					privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
				});

				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPublicKey: rsaPublicKey,
				});
				const encryptParams = mockEncryptParams({ mode: 'asymmetric' });
				delete encryptParams.cipher;
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPrivateKey: otherKeyPair.privateKey,
				});
				const decryptParams = mockDecryptParams(ciphertext, { mode: 'asymmetric' });
				delete decryptParams.cipher;
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			});
		});

		describe('Payload format validation', () => {
			it('throws a clear error when symmetric ciphertext is truncated', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPassphrase: passphrase,
				});
				const decryptParams = mockDecryptParams(Buffer.from([0x01, 0x02, 0x03]).toString('base64'));
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Ciphertext is malformed or truncated',
				);
			});

			it('throws a clear error on unsupported ciphertext version', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					encryptionPassphrase: passphrase,
				});
				const encryptParams = mockEncryptParams();
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				const buf = Buffer.from(ciphertext, 'base64');
				buf[0] = 0xff;
				const decryptParams = mockDecryptParams(buf.toString('base64'));
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Unsupported ciphertext version 0xff',
				);
			});

			it('wraps symmetric decrypt failures in a NodeOperationError', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPassphrase: passphrase,
				});
				const encryptParams = mockEncryptParams();
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => encryptParams[name],
				);
				const encryptResult = await cryptoNode.execute.call(mockExecuteFunctions);
				const ciphertext = encryptResult[0][0].json.data as string;

				mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
					encryptionPassphrase: 'wrong passphrase',
				});
				const decryptParams = mockDecryptParams(ciphertext);
				mockExecuteFunctions.getNodeParameter.mockImplementation(
					(name: string) => decryptParams[name],
				);

				await expect(cryptoNode.execute.call(mockExecuteFunctions)).rejects.toThrow(
					NodeOperationError,
				);
			});
		});
	});
});
