import type { Logger } from '@n8n/backend-common';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { Cipher } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { ChatHubExtractor } from '../chat-hub-extractor';

// Helper function to create trigger items
const createTriggerItem = (data: Record<string, unknown>): INodeExecutionData => ({
	json: {},
	...data,
	pairedItem: { item: 0 },
});

describe('ChatHubExtractor', () => {
	let extractor: ChatHubExtractor;
	let mockLogger: jest.Mocked<Logger>;
	let mockCipher: jest.Mocked<Cipher>;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockCipher = mock<Cipher>();
		extractor = new ChatHubExtractor(mockLogger, mockCipher);
	});

	describe('execute', () => {
		it('should return empty object when no trigger items', async () => {
			const options = {
				triggerItems: [],
			} as unknown as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'No trigger items found, skipping ChatHubExtractor hook.',
			);
		});

		it('should return empty object when triggerItems is null', async () => {
			const options = {
				triggerItems: null,
			} as unknown as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			expect(mockLogger.debug).toHaveBeenCalledWith(
				'No trigger items found, skipping ChatHubExtractor hook.',
			);
		});

		it('should decrypt and extract authToken and browserId successfully', async () => {
			const metadata = { authToken: 'test-auth-token-123', browserId: 'browser-id-456' };
			const encryptedData = 'encrypted-string';

			mockCipher.decrypt.mockReturnValue(JSON.stringify(metadata));

			const triggerItem = createTriggerItem({
				encryptedMetadata: encryptedData,
				json: { otherField: 'value' },
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedData);
			expect(result).toEqual({
				triggerItems: [triggerItem],
				contextUpdate: {
					credentials: {
						version: 1,
						identity: 'test-auth-token-123',
						metadata: {
							source: 'chat-hub-injected',
							browserId: 'browser-id-456',
						},
					},
				},
			});
		});

		it('should extract authToken without browserId', async () => {
			const metadata = { authToken: 'test-auth-token-123' };
			mockCipher.decrypt.mockReturnValue(JSON.stringify(metadata));

			const triggerItem = createTriggerItem({
				encryptedMetadata: 'encrypted',
				json: { otherField: 'value' },
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({
				triggerItems: [triggerItem],
				contextUpdate: {
					credentials: {
						version: 1,
						identity: 'test-auth-token-123',
						metadata: {
							source: 'chat-hub-injected',
							browserId: null,
						},
					},
				},
			});
		});

		it('should delete encryptedMetadata from trigger item', async () => {
			const metadata = { authToken: 'test-auth-token-123', browserId: 'browser-id-456' };
			mockCipher.decrypt.mockReturnValue(JSON.stringify(metadata));

			const triggerItem = createTriggerItem({
				encryptedMetadata: 'encrypted',
				json: { otherField: 'value' },
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			await extractor.execute(options);

			// Verify encryptedMetadata is removed
			expect(triggerItem).not.toHaveProperty('encryptedMetadata');
			expect(triggerItem.json).toHaveProperty('otherField', 'value');
		});

		it('should return empty object when decryption fails', async () => {
			mockCipher.decrypt.mockImplementation(() => {
				throw new Error('Decryption failed');
			});

			const triggerItem = createTriggerItem({
				encryptedMetadata: 'invalid-encrypted',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to decrypt/parse encrypted chat metadata',
				expect.objectContaining({
					error: expect.objectContaining({ message: 'Decryption failed' }),
				}),
			);
		});

		it('should return empty object when JSON parsing fails', async () => {
			mockCipher.decrypt.mockReturnValue('invalid-json{]');

			const triggerItem = createTriggerItem({
				encryptedMetadata: 'encrypted',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should return empty object when authToken is missing in decrypted data', async () => {
			mockCipher.decrypt.mockReturnValue(JSON.stringify({ browserId: 'browser-id-456' }));

			const triggerItem = createTriggerItem({
				encryptedMetadata: 'encrypted',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Invalid format for encryptedMetadata in chathub extractor',
			);
		});

		it('should always delete encryptedMetadata even on error', async () => {
			mockCipher.decrypt.mockImplementation(() => {
				throw new Error('fail');
			});

			const triggerItem = createTriggerItem({
				encryptedMetadata: 'encrypted',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			await extractor.execute(options);

			expect(triggerItem).not.toHaveProperty('encryptedMetadata');
		});

		it('should return empty object when no encryptedMetadata field', async () => {
			const triggerItem = createTriggerItem({
				json: { someField: 'value' },
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			expect(mockCipher.decrypt).not.toHaveBeenCalled();
		});
	});

	describe('isApplicableToTriggerNode', () => {
		it('should always return false', () => {
			expect(extractor.isApplicableToTriggerNode('any-node-type')).toBe(false);
		});
	});

	describe('hookDescription', () => {
		it('should have correct metadata', () => {
			expect(extractor.hookDescription).toEqual({
				name: 'ChatHubExtractor',
				displayName: 'Chat Hub Extractor',
				options: [],
			});
		});
	});
});
