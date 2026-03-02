/**
 * Minimal reproduction test for CAT-2502
 *
 * This test demonstrates the cache format incompatibility bug without requiring
 * full service dependencies or database setup.
 *
 * Bug: When upgrading from 2.9.x to 2.10.x, old cache entries cause parsing errors
 * Expected cache format: clientId -> "userId|timestamp"
 * Legacy cache format: userId -> timestamp
 *
 * When legacy format is encountered:
 * 1. split('|') on 'timestamp' returns ['timestamp']
 * 2. Destructuring [userId, lastSeen] = ['timestamp'] gives userId='timestamp', lastSeen=undefined
 * 3. This timestamp string is then used as a UUID in database queries
 * 4. Database error: "invalid input syntax for type uuid: '2026-02-26T21:23:36.318Z'"
 */

describe('CAT-2502: Cache format incompatibility', () => {
	describe('String split behavior with legacy format', () => {
		it('demonstrates how legacy format produces invalid userId', () => {
			// This is what happens in collaboration.state.ts line 118
			// when processing a legacy cache entry
			const legacyValue = '2026-02-26T21:23:36.318Z'; // No pipe delimiter
			const [userId, lastSeen] = legacyValue.split('|');

			// Bug: userId becomes the timestamp string
			expect(userId).toBe('2026-02-26T21:23:36.318Z');
			// Bug: lastSeen is undefined (or empty string)
			expect(lastSeen).toBeUndefined();

			// This timestamp string would then be passed to UserRepository.getByIds()
			// causing: "invalid input syntax for type uuid: '2026-02-26T21:23:36.318Z'"
		});

		it('shows correct behavior with new format', () => {
			const newValue = 'user-uuid-123|2026-02-26T21:23:36.318Z'; // With pipe delimiter
			const [userId, lastSeen] = newValue.split('|');

			expect(userId).toBe('user-uuid-123');
			expect(lastSeen).toBe('2026-02-26T21:23:36.318Z');
		});

		it('demonstrates mixed format scenario from production', () => {
			// Production scenario: cache contains both old and new formats
			const cacheEntries = {
				// Legacy format from 2.9.x (key is userId, value is just timestamp)
				'4b324c79-e576-49f2-b493-43408059b081': '2026-02-26T21:23:36.318Z',

				// New format from 2.10.x (key is clientId, value is "userId|timestamp")
				'0nwmjwxdsw': 'user-id-456|2026-02-27T10:00:00.000Z',
			};

			// Simulate collaboration.state.ts cacheHashToCollaborators() behavior
			const parsed = Object.entries(cacheEntries).map(([clientId, value]) => {
				const [userId, lastSeen] = value.split('|');
				return { clientId, userId, lastSeen };
			});

			// First entry (legacy): userId is the timestamp!
			expect(parsed[0]).toEqual({
				clientId: '4b324c79-e576-49f2-b493-43408059b081',
				userId: '2026-02-26T21:23:36.318Z', // BUG: timestamp as userId
				lastSeen: undefined,
			});

			// Second entry (new format): correct
			expect(parsed[1]).toEqual({
				clientId: '0nwmjwxdsw',
				userId: 'user-id-456',
				lastSeen: '2026-02-27T10:00:00.000Z',
			});

			// Extract userIds for database query
			const userIds = parsed.map((p) => p.userId);

			// BUG: userIds array contains a timestamp string
			expect(userIds).toContain('2026-02-26T21:23:36.318Z');

			// This would cause database error when passed to UserRepository.getByIds()
			const isValidUuid = (str: string | undefined) => {
				if (!str) return false;
				return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
			};

			const invalidUuids = userIds.filter((id) => !isValidUuid(id));
			expect(invalidUuids).toHaveLength(1);
			expect(invalidUuids[0]).toBe('2026-02-26T21:23:36.318Z');
		});
	});

	describe('Expected vs Actual behavior', () => {
		it('OLD CODE (2.9.x): stored userId -> timestamp in memory', () => {
			// 2.9.x used in-memory Map<userId, {userId, lastSeen}>
			// No cache persistence, so no migration issue
			const inMemoryState = new Map<string, { userId: string; lastSeen: Date }>();
			inMemoryState.set('user-123', {
				userId: 'user-123',
				lastSeen: new Date('2026-02-26T21:23:36.318Z'),
			});

			const entry = inMemoryState.get('user-123');
			expect(entry?.userId).toBe('user-123');
		});

		it('NEW CODE (2.10.x): expects clientId -> "userId|timestamp" in cache', () => {
			// 2.10.x persists to Redis/cache with format: clientId -> "userId|timestamp"
			const cacheHash = {
				'client-abc': 'user-123|2026-02-26T21:23:36.318Z',
			};

			const [clientId, value] = Object.entries(cacheHash)[0];
			const [userId, lastSeen] = value.split('|');

			expect(clientId).toBe('client-abc');
			expect(userId).toBe('user-123');
			expect(lastSeen).toBe('2026-02-26T21:23:36.318Z');
		});

		it('BUG: 2.10.x code encounters cache from hypothetical intermediate version', () => {
			// If there was an intermediate version or migration that stored
			// userId -> timestamp (instead of clientId -> "userId|timestamp"),
			// then 2.10.x code would fail

			const legacyCacheHash = {
				'user-123': '2026-02-26T21:23:36.318Z', // No pipe separator
			};

			const [clientId, value] = Object.entries(legacyCacheHash)[0];
			const [userId, lastSeen] = value.split('|');

			// clientId is actually a userId (wrong)
			expect(clientId).toBe('user-123');
			// userId becomes the timestamp (BUG!)
			expect(userId).toBe('2026-02-26T21:23:36.318Z');
			// lastSeen is undefined
			expect(lastSeen).toBeUndefined();
		});
	});
});
