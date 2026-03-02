/**
 * Regression test for CAT-2502
 *
 * Bug: CollaborationService errors on workflowOpened message after upgrade from 2.9.x to 2.10.x
 *
 * Root cause: Cache format incompatibility between versions
 * - 2.9.x: Stored in-memory, no cache
 * - 2.10.x: Stores in Redis/cache with format `clientId -> "userId|timestamp"`
 * - But if old cache entries exist with format `userId -> timestamp` (no pipe),
 *   parsing fails and produces invalid UUID (timestamp string used as userId)
 *
 * Error symptoms:
 * 1. "Error handling CollaborationService push message" at collaboration.service.ts:45
 * 2. "invalid input syntax for type uuid: '2026-02-26T21:23:36.318Z'"
 */

import { mock } from 'jest-mock-extended';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { ErrorReporter } from 'n8n-core';

import { CollaborationService } from '../collaboration.service';
import { CollaborationState } from '../collaboration.state';
import { Push } from '@/push';
import { AccessService } from '@/services/access.service';
import type { CacheService } from '@/services/cache/cache.service';

describe('CollaborationService - CAT-2502 regression', () => {
	let collaborationService: CollaborationService;
	let mockPush: jest.Mocked<Push>;
	let mockState: CollaborationState;
	let mockUserRepository: jest.Mocked<UserRepository>;
	let mockAccessService: jest.Mocked<AccessService>;
	let mockErrorReporter: jest.Mocked<ErrorReporter>;
	let mockCacheService: jest.Mocked<CacheService>;

	beforeEach(() => {
		mockPush = mock<Push>();
		mockCacheService = mock<CacheService>();
		mockState = new CollaborationState(mockCacheService);
		mockUserRepository = mock<UserRepository>();
		mockAccessService = mock<AccessService>();
		mockErrorReporter = mock<ErrorReporter>();

		collaborationService = new CollaborationService(
			mockErrorReporter,
			mockPush,
			mockState,
			mockUserRepository,
			mockAccessService,
		);
	});

	describe('workflowOpened with legacy cache format', () => {
		it('should not crash when cache contains legacy format entries', async () => {
			// Arrange
			const userId = '4b324c79-e576-49f2-b493-43408059b081';
			const clientId = '0nwmjwxdsw';
			const workflowId = '857EtISnbQo1gtk0';

			// Simulate legacy cache entry from 2.9.x upgrade
			// Old format: userId -> timestamp (no pipe delimiter)
			mockCacheService.getHash.mockResolvedValue({
				[userId]: '2026-02-26T21:23:36.318Z', // Legacy format: no pipe
			});

			mockAccessService.hasReadAccess.mockResolvedValue(true);

			const workflowOpenedMessage = {
				type: 'workflowOpened' as const,
				workflowId,
			};

			// Act & Assert - should not throw
			await expect(
				collaborationService.handleUserMessage(userId, clientId, workflowOpenedMessage),
			).resolves.not.toThrow();

			// Should not call error reporter with catastrophic errors
			// (it's ok to log/handle gracefully, but shouldn't crash)
			const errorCalls = mockErrorReporter.error.mock.calls;
			const hasUuidError = errorCalls.some((call) => {
				const error = call[0];
				return error?.message?.includes('uuid') || error?.cause?.message?.includes('uuid');
			});
			expect(hasUuidError).toBe(false);
		});

		it('should handle mixed legacy and new cache formats', async () => {
			// Arrange
			const userId = 'new-user-id';
			const clientId = 'new-client-id';
			const workflowId = 'test-workflow';
			const now = new Date().toISOString();

			// Mixed cache: some old format, some new format
			mockCacheService.getHash.mockResolvedValue({
				// Legacy entries from 2.9.x
				'old-user-1': '2026-02-26T21:23:36.318Z',
				'old-user-2': '2026-02-27T10:15:22.123Z',
				// New format entries
				'valid-client-1': `valid-user-1|${now}`,
				'valid-client-2': `valid-user-2|${now}`,
			});

			mockAccessService.hasReadAccess.mockResolvedValue(true);
			mockUserRepository.getByIds.mockResolvedValue([
				{ id: 'valid-user-1', toIUser: () => ({ id: 'valid-user-1' }) } as User,
				{ id: 'valid-user-2', toIUser: () => ({ id: 'valid-user-2' }) } as User,
			]);

			const workflowOpenedMessage = {
				type: 'workflowOpened' as const,
				workflowId,
			};

			// Act & Assert - should not crash
			await expect(
				collaborationService.handleUserMessage(userId, clientId, workflowOpenedMessage),
			).resolves.not.toThrow();

			// Should have tried to query only valid UUIDs, not timestamps
			if (mockUserRepository.getByIds.mock.calls.length > 0) {
				const queriedUserIds = mockUserRepository.getByIds.mock.calls[0][1];
				const hasTimestampAsUuid = queriedUserIds.some((id: string) =>
					id.match(/^\d{4}-\d{2}-\d{2}T/),
				);
				expect(hasTimestampAsUuid).toBe(false);
			}
		});

		it('should recover from cache format errors gracefully', async () => {
			// Arrange
			const userId = '4b324c79-e576-49f2-b493-43408059b081';
			const clientId = '0nwmjwxdsw';
			const workflowId = '857EtISnbQo1gtk0';

			// Simulate cache that will cause parsing errors
			mockCacheService.getHash.mockResolvedValue({
				'malformed-entry': 'not-a-valid-format',
				'another-bad-entry': '',
			});

			mockAccessService.hasReadAccess.mockResolvedValue(true);

			const workflowOpenedMessage = {
				type: 'workflowOpened' as const,
				workflowId,
			};

			// Act & Assert - should handle gracefully, not flood logs with errors
			await expect(
				collaborationService.handleUserMessage(userId, clientId, workflowOpenedMessage),
			).resolves.not.toThrow();
		});
	});

	describe('UUID validation', () => {
		it('should not pass timestamp strings to UserRepository.getByIds', async () => {
			// Arrange
			const userId = 'valid-user-id';
			const clientId = 'valid-client-id';
			const workflowId = 'test-workflow';

			// Cache with legacy format that would produce timestamp as userId
			mockCacheService.getHash.mockResolvedValue({
				'timestamp-as-key': '2026-02-26T21:23:36.318Z',
			});

			mockAccessService.hasReadAccess.mockResolvedValue(true);
			mockUserRepository.getByIds.mockImplementation((_, userIds: string[]) => {
				// This simulates the database error that occurred in production
				const invalidUuid = userIds.find((id) => id.match(/^\d{4}-\d{2}-\d{2}T/));
				if (invalidUuid) {
					throw new Error(`invalid input syntax for type uuid: "${invalidUuid}"`);
				}
				return Promise.resolve([]);
			});

			const workflowOpenedMessage = {
				type: 'workflowOpened' as const,
				workflowId,
			};

			// Act
			await collaborationService.handleUserMessage(userId, clientId, workflowOpenedMessage);

			// Assert - if getByIds was called, it should not have received timestamp strings
			if (mockUserRepository.getByIds.mock.calls.length > 0) {
				const queriedIds = mockUserRepository.getByIds.mock.calls[0][1];
				const hasTimestamp = queriedIds.some((id: string) => id.match(/^\d{4}-\d{2}-\d{2}T/));
				expect(hasTimestamp).toBe(false);
			}
		});
	});
});
