import { useUsersStore } from '@n8n/stores/users.store';
import { nextTick } from 'vue';

import { useSeenAppPreviewVersions } from './useSeenAppPreviewVersions';

describe('useSeenAppPreviewVersions', () => {
	afterEach(() => localStorage.clear());

	it('keeps the seen versions of each user', async () => {
		const users = useUsersStore();
		users.currentUserId = 'user-1';
		useSeenAppPreviewVersions().markSeen('v1');
		await nextTick();

		expect(useSeenAppPreviewVersions().hasSeen('v1')).toBe(true);
		users.currentUserId = 'user-2';
		expect(useSeenAppPreviewVersions().hasSeen('v1')).toBe(false);
	});

	it('forgets the oldest versions after 200', () => {
		useUsersStore().currentUserId = 'user-1';
		const { hasSeen, markSeen } = useSeenAppPreviewVersions();

		for (let i = 0; i <= 200; i++) markSeen(`v${i}`);

		expect(hasSeen('v0')).toBe(false);
		expect(hasSeen('v1')).toBe(true);
		expect(hasSeen('v200')).toBe(true);
	});
});
