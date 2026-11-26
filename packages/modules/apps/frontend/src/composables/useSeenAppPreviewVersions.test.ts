import { useUsersStore } from '@n8n/stores/users.store';

import { useSeenAppPreviewVersions } from './useSeenAppPreviewVersions';

describe('useSeenAppPreviewVersions', () => {
	it('shares the seen versions of a user and keeps them apart from other users', () => {
		const users = useUsersStore();
		users.currentUserId = 'shared-user';
		const first = useSeenAppPreviewVersions();
		const second = useSeenAppPreviewVersions();

		first.markSeen('v1');

		expect(second.hasSeen('v1')).toBe(true);
		users.currentUserId = 'other-user';
		expect(useSeenAppPreviewVersions().hasSeen('v1')).toBe(false);
	});

	it('forgets the oldest versions after 200', () => {
		useUsersStore().currentUserId = 'busy-user';
		const { hasSeen, markSeen } = useSeenAppPreviewVersions();

		for (let i = 0; i <= 200; i++) markSeen(`v${i}`);

		expect(hasSeen('v0')).toBe(false);
		expect(hasSeen('v1')).toBe(true);
		expect(hasSeen('v200')).toBe(true);
	});
});
