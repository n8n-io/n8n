import type { Logger } from '@n8n/backend-common';
import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { ChatHubExtractor } from '../chat-hub-extractor';

// Helper function to create trigger items
const createTriggerItem = (data: IDataObject): INodeExecutionData => ({
	json: data,
	pairedItem: { item: 0 },
});

describe('ChatHubExtractor', () => {
	let extractor: ChatHubExtractor;
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
		} as unknown as jest.Mocked<Logger>;
		extractor = new ChatHubExtractor(mockLogger);
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

		it('should extract authToken and browserId successfully', async () => {
			const triggerItem = createTriggerItem({
				authToken: 'test-auth-token-123',
				browserId: 'browser-id-456',
				otherField: 'value',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({
				triggerItems: [createTriggerItem({ otherField: 'value' })],
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
			const triggerItem = createTriggerItem({
				authToken: 'test-auth-token-123',
				otherField: 'value',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({
				triggerItems: [createTriggerItem({ otherField: 'value' })],
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

		it('should delete authToken and browserId from trigger item', async () => {
			const triggerItem = createTriggerItem({
				authToken: 'test-auth-token-123',
				browserId: 'browser-id-456',
				otherField: 'value',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			await extractor.execute(options);

			// Verify sensitive fields are removed
			expect(triggerItem.json).not.toHaveProperty('authToken');
			expect(triggerItem.json).not.toHaveProperty('browserId');
			expect(triggerItem.json).toHaveProperty('otherField', 'value');
		});

		it('should return empty object when authToken is missing', async () => {
			const triggerItem = createTriggerItem({
				browserId: 'browser-id-456',
				otherField: 'value',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			// Verify fields are still deleted even on validation failure
			expect(triggerItem.json).not.toHaveProperty('authToken');
			expect(triggerItem.json).not.toHaveProperty('browserId');
		});

		it('should return empty object when authToken is not a string', async () => {
			const triggerItem = createTriggerItem({
				authToken: 12345,
				browserId: 'browser-id-456',
				otherField: 'value',
			});
			const options = {
				triggerItems: [triggerItem],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result).toEqual({});
			// Verify fields are still deleted even on validation failure
			expect(triggerItem.json).not.toHaveProperty('authToken');
			expect(triggerItem.json).not.toHaveProperty('browserId');
		});

		it('should only process first trigger item', async () => {
			const triggerItem1 = createTriggerItem({
				authToken: 'token-1',
				browserId: 'browser-1',
			});
			const triggerItem2 = createTriggerItem({
				authToken: 'token-2',
				browserId: 'browser-2',
			});
			const options = {
				triggerItems: [triggerItem1, triggerItem2],
			} as ContextEstablishmentOptions;

			const result = await extractor.execute(options);

			expect(result.contextUpdate?.credentials?.identity).toBe('token-1');
			// First item should have sensitive fields deleted
			expect(triggerItem1.json).not.toHaveProperty('authToken');
			expect(triggerItem1.json).not.toHaveProperty('browserId');
			// Second item should remain unchanged
			expect(triggerItem2.json).toHaveProperty('authToken', 'token-2');
			expect(triggerItem2.json).toHaveProperty('browserId', 'browser-2');
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
