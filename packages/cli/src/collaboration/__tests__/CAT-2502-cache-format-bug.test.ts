/**
 * Regression test for CAT-2502: Cache format incompatibility between 2.9.x and 2.10.x
 *
 * In 2.9.x, the collaboration cache stored entries as:
 *   userId -> timestamp
 *
 * In 2.10.x, the format changed to:
 *   clientId -> "userId|timestamp"
 *
 * When upgrading from 2.9.x to 2.10.x, old cache entries may exist that don't
 * contain the pipe separator, causing the parsing logic to treat the timestamp
 * as a userId, which then fails UUID validation in database queries.
 */
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { CollaborationState } from '../collaboration.state';

describe('CAT-2502: Cache format incompatibility', () => {
	let collaborationState: CollaborationState;
	let mockCache: jest.Mocked<CacheService>;

	beforeEach(() => {
		mockCache = mock<CacheService>();
		collaborationState = new CollaborationState(mockCache);
	});

	describe('String split behavior with legacy format', () => {
		it('demonstrates how legacy format produces invalid userId', () => {
			// Simulate legacy 2.9.x cache entry format
			const legacyValue = '2026-02-26T21:23:36.318Z'; // timestamp without userId prefix

			// This is what the old cacheHashToCollaborators did
			const [userId, lastSeen] = legacyValue.split('|');

			// With legacy format, userId gets the entire timestamp, lastSeen is undefined
			expect(userId).toBe('2026-02-26T21:23:36.318Z');
			expect(lastSeen).toBeUndefined();

			// This invalid userId would then be passed to database queries
			// causing "invalid input syntax for type uuid: '2026-02-26T21:23:36.318Z'"
		});

		it('demonstrates mixed format scenario from production', () => {
			// In production after upgrade, cache might have both formats:
			// - Some old entries from 2.9.x (userId -> timestamp)
			// - Some new entries from 2.10.x (clientId -> userId|timestamp)

			const mixedCache = {
				// Old format (hypothetical intermediate version or migration artifact)
				'4b324c79-e576-49f2-b493-43408059b081': '2026-02-26T21:23:36.318Z',
				// New format
				'0nwmjwxdsw': '4b324c79-e576-49f2-b493-43408059b081|2026-02-27T19:05:56.728Z',
			};

			const entries = Object.entries(mixedCache).map(([clientId, value]) => {
				const [userId, lastSeen] = value.split('|');
				return { clientId, userId, lastSeen };
			});

			// Old format entry produces invalid data
			expect(entries[0]).toEqual({
				clientId: '4b324c79-e576-49f2-b493-43408059b081',
				userId: '2026-02-26T21:23:36.318Z', // BUG: timestamp as userId
				lastSeen: undefined, // BUG: missing lastSeen
			});

			// New format entry is parsed correctly
			expect(entries[1]).toEqual({
				clientId: '0nwmjwxdsw',
				userId: '4b324c79-e576-49f2-b493-43408059b081',
				lastSeen: '2026-02-27T19:05:56.728Z',
			});
		});
	});

	describe('Fixed behavior: Handles legacy format gracefully', () => {
		it('should skip legacy format entries without pipe separator', async () => {
			// Simulate cache with legacy format entry
			mockCache.getHash.mockResolvedValue({
				'user-uuid': '2026-02-26T21:23:36.318Z', // legacy format
			});

			const collaborators = await collaborationState.getCollaborators('workflow-123');

			// After fix, legacy entries are skipped
			expect(collaborators).toBeEmptyArray();
		});

		it('should skip legacy format and return only valid new format entries', async () => {
			mockCache.getHash.mockResolvedValue({
				// Legacy format entry (should be skipped)
				'user-uuid': '2026-02-26T21:23:36.318Z',
				// New format entry (should be parsed correctly)
				'client-123': 'user-uuid|2026-02-27T19:05:56.728Z',
			});

			const collaborators = await collaborationState.getCollaborators('workflow-123');

			// After fix, only valid entries should be returned
			expect(collaborators).toEqual([
				{
					userId: 'user-uuid',
					lastSeen: '2026-02-27T19:05:56.728Z',
					clientId: 'client-123',
				},
			]);
			// Legacy entry should be skipped
			expect(collaborators).toHaveLength(1);
		});

		it('should handle mixed valid and invalid entries', async () => {
			mockCache.getHash.mockResolvedValue({
				// Invalid: no pipe separator
				'legacy-1': '2026-02-26T21:23:36.318Z',
				// Valid
				'client-1': 'user-1|2026-02-27T10:00:00.000Z',
				// Invalid: empty after split
				'invalid-1': '|',
				// Valid
				'client-2': 'user-2|2026-02-27T11:00:00.000Z',
				// Invalid: only userId, no timestamp
				'invalid-2': 'user-only|',
			});

			const collaborators = await collaborationState.getCollaborators('workflow-123');

			// Only valid entries are returned
			expect(collaborators).toHaveLength(2);
			expect(collaborators).toEqual(
				expect.arrayContaining([
					{
						userId: 'user-1',
						lastSeen: '2026-02-27T10:00:00.000Z',
						clientId: 'client-1',
					},
					{
						userId: 'user-2',
						lastSeen: '2026-02-27T11:00:00.000Z',
						clientId: 'client-2',
					},
				]),
			);
		});
	});
});
