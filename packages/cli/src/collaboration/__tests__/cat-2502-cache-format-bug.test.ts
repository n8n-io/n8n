import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { CollaborationState } from '../collaboration.state';

describe('CAT-2502: Cache format incompatibility', () => {
	let collaborationState: CollaborationState;
	let mockCacheService: jest.Mocked<CacheService>;

	beforeEach(() => {
		mockCacheService = mock<CacheService>();
		collaborationState = new CollaborationState(mockCacheService);
	});

	const workflowId = 'workflow';

	describe('String split behavior with legacy format', () => {
		it('demonstrates how legacy format produces invalid userId', () => {
			// Legacy format from 2.9.x: userId -> timestamp (no pipe separator)
			const legacyValue = '2026-02-26T21:23:36.318Z';
			const [userId, lastSeen] = legacyValue.split('|');

			// This is what happens in the buggy code:
			// userId = '2026-02-26T21:23:36.318Z' (the entire timestamp)
			// lastSeen = undefined
			expect(userId).toBe('2026-02-26T21:23:36.318Z');
			expect(lastSeen).toBeUndefined();

			// This timestamp string is then used as a UUID in database queries,
			// causing "invalid input syntax for type uuid" errors
		});

		it('demonstrates mixed format scenario from production', () => {
			// Production scenario: both legacy (2.9.x) and new (2.10.x) format entries coexist
			const mixedCacheHash = {
				// Legacy format (userId as key, timestamp as value - no pipe)
				'user-id-123': '2026-02-26T21:23:36.318Z',

				// New format (clientId as key, "userId|timestamp" as value)
				'client-id-456': 'user-id-456|2026-02-27T10:15:00.000Z',
			};

			// Parse both entries
			const entries = Object.entries(mixedCacheHash).map(([clientId, value]) => {
				const [userId, lastSeen] = value.split('|');
				return { clientId, userId, lastSeen };
			});

			// Legacy entry produces invalid result
			expect(entries[0]).toEqual({
				clientId: 'user-id-123',
				userId: '2026-02-26T21:23:36.318Z', // BUG: timestamp used as userId
				lastSeen: undefined, // BUG: no lastSeen value
			});

			// New entry parses correctly
			expect(entries[1]).toEqual({
				clientId: 'client-id-456',
				userId: 'user-id-456',
				lastSeen: '2026-02-27T10:15:00.000Z',
			});
		});
	});

	describe('Expected vs Actual behavior', () => {
		it('should handle legacy format gracefully by filtering out invalid entries', async () => {
			// Simulate cache state with legacy format entries
			mockCacheService.getHash.mockResolvedValueOnce({
				// Legacy entry: no pipe separator in value
				'old-client-id': '2026-02-26T21:23:36.318Z',
			});

			// Act
			const collaborators = await collaborationState.getCollaborators(workflowId);

			// Assert: Legacy entries are filtered out to prevent UUID errors
			expect(collaborators).toEqual([]);
		});

		it('should handle mixed legacy and new format entries', async () => {
			// Simulate cache with both legacy and new format
			const now = new Date().toISOString();
			mockCacheService.getHash.mockResolvedValueOnce({
				// Legacy entry: should be filtered out
				'old-client-id': '2026-02-26T21:23:36.318Z',
				// New format entry: should be included
				'new-client-id': `valid-user-id|${now}`,
			});

			// Act
			const collaborators = await collaborationState.getCollaborators(workflowId);

			// Assert: Only new format entries are returned
			expect(collaborators).toHaveLength(1);
			expect(collaborators[0]).toEqual({
				clientId: 'new-client-id',
				userId: 'valid-user-id',
				lastSeen: now,
			});
		});
	});
});
