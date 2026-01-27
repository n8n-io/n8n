import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';
import {
	extractRevertVersionIds,
	fetchExistingVersionIds,
	enrichMessagesWithRevertVersion,
} from './builder.utils';

// Mock workflowHistory API
vi.mock('@n8n/rest-api-client/api/workflowHistory', () => ({
	getWorkflowVersionsByIds: vi.fn(),
}));

describe('builder.utils', () => {
	describe('extractRevertVersionIds', () => {
		it('should extract revertVersionId from messages that have them', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'assistant',
					text: 'Created workflow',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'user',
					text: 'Update workflow',
					revertVersionId: 'version-2',
				} as ChatRequest.TextMessage,
			];

			const result = extractRevertVersionIds(messages);

			expect(result).toEqual(['version-1', 'version-2']);
		});

		it('should return empty array when no messages have revertVersionId', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'assistant',
					text: 'Created workflow',
				} as ChatRequest.TextMessage,
			];

			const result = extractRevertVersionIds(messages);

			expect(result).toEqual([]);
		});

		it('should return empty array for empty messages array', () => {
			const result = extractRevertVersionIds([]);

			expect(result).toEqual([]);
		});

		it('should ignore messages where revertVersionId is not a string', () => {
			const messages = [
				{
					type: 'message',
					role: 'user',
					text: 'Test',
					revertVersionId: 123,
				},
				{
					type: 'message',
					role: 'user',
					text: 'Test 2',
					revertVersionId: null,
				},
				{
					type: 'message',
					role: 'user',
					text: 'Valid',
					revertVersionId: 'version-1',
				},
			] as unknown as ChatRequest.MessageResponse[];

			const result = extractRevertVersionIds(messages);

			expect(result).toEqual(['version-1']);
		});
	});

	describe('fetchExistingVersionIds', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should return empty map when versionIds array is empty', async () => {
			const restApiContext = { baseUrl: 'http://test.com' };

			const result = await fetchExistingVersionIds(
				restApiContext as Parameters<typeof fetchExistingVersionIds>[0],
				'workflow-1',
				[],
			);

			expect(result).toEqual(new Map());
		});

		it('should return map of existing versions', async () => {
			const restApiContext = { baseUrl: 'http://test.com' };
			const workflowHistoryModule = await import('@n8n/rest-api-client/api/workflowHistory');

			vi.mocked(workflowHistoryModule.getWorkflowVersionsByIds).mockResolvedValueOnce({
				versions: [
					{ versionId: 'version-1', createdAt: '2024-01-01T00:00:00Z' },
					{ versionId: 'version-2', createdAt: '2024-01-02T00:00:00Z' },
				],
			});

			const result = await fetchExistingVersionIds(
				restApiContext as Parameters<typeof fetchExistingVersionIds>[0],
				'workflow-1',
				['version-1', 'version-2'],
			);

			expect(result).toEqual(
				new Map([
					['version-1', '2024-01-01T00:00:00Z'],
					['version-2', '2024-01-02T00:00:00Z'],
				]),
			);

			expect(workflowHistoryModule.getWorkflowVersionsByIds).toHaveBeenCalledWith(
				restApiContext,
				'workflow-1',
				['version-1', 'version-2'],
			);
		});

		it('should return empty map when API call fails', async () => {
			const restApiContext = { baseUrl: 'http://test.com' };
			const workflowHistoryModule = await import('@n8n/rest-api-client/api/workflowHistory');

			vi.mocked(workflowHistoryModule.getWorkflowVersionsByIds).mockRejectedValueOnce(
				new Error('API error'),
			);

			const result = await fetchExistingVersionIds(
				restApiContext as Parameters<typeof fetchExistingVersionIds>[0],
				'workflow-1',
				['version-1'],
			);

			expect(result).toEqual(new Map());
		});
	});

	describe('enrichMessagesWithRevertVersion', () => {
		it('should enrich messages with revertVersion when version exists in map', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map([['version-1', '2024-01-01T00:00:00Z']]);

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				type: 'message',
				role: 'user',
				text: 'Create workflow',
				revertVersion: {
					id: 'version-1',
					createdAt: '2024-01-01T00:00:00Z',
				},
			});
		});

		it('should remove revertVersionId when version does not exist in map', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'Create workflow',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map<string, string>();

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toHaveLength(1);
			expect(result[0]).not.toHaveProperty('revertVersionId');
			expect(result[0]).not.toHaveProperty('revertVersion');
			expect(result[0]).toMatchObject({
				type: 'message',
				role: 'user',
				text: 'Create workflow',
			});
		});

		it('should not modify messages without revertVersionId', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Here is your workflow',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map([['version-1', '2024-01-01T00:00:00Z']]);

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toEqual(messages);
		});

		it('should handle mixed messages correctly', () => {
			const messages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'user',
					text: 'First message',
					revertVersionId: 'version-1',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'assistant',
					text: 'Response',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'user',
					text: 'Second message',
					revertVersionId: 'version-2',
				} as ChatRequest.TextMessage,
				{
					type: 'message',
					role: 'user',
					text: 'Third message (version deleted)',
					revertVersionId: 'version-3',
				} as ChatRequest.TextMessage,
			];

			const versionMap = new Map([
				['version-1', '2024-01-01T00:00:00Z'],
				['version-2', '2024-01-02T00:00:00Z'],
				// version-3 not in map (simulating deleted version)
			]);

			const result = enrichMessagesWithRevertVersion(messages, versionMap);

			expect(result).toHaveLength(4);

			// First message should have revertVersion
			expect(result[0]).toHaveProperty('revertVersion', {
				id: 'version-1',
				createdAt: '2024-01-01T00:00:00Z',
			});

			// Second message should be unchanged
			expect(result[1]).not.toHaveProperty('revertVersionId');
			expect(result[1]).not.toHaveProperty('revertVersion');

			// Third message should have revertVersion
			expect(result[2]).toHaveProperty('revertVersion', {
				id: 'version-2',
				createdAt: '2024-01-02T00:00:00Z',
			});

			// Fourth message should have revertVersionId removed (version doesn't exist)
			expect(result[3]).not.toHaveProperty('revertVersionId');
			expect(result[3]).not.toHaveProperty('revertVersion');
			expect(result[3]).toMatchObject({
				type: 'message',
				role: 'user',
				text: 'Third message (version deleted)',
			});
		});

		it('should return empty array for empty messages array', () => {
			const result = enrichMessagesWithRevertVersion([], new Map());

			expect(result).toEqual([]);
		});
	});
});
