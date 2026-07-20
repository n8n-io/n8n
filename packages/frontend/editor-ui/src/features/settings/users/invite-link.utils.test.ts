import { copyInviteLink } from './invite-link.utils';
import type { useClipboard } from '@/app/composables/useClipboard';
import type { useUsersStore } from './users.store';

describe('copyInviteLink', () => {
	const link = 'https://example.com/signup?token=generated-token';

	function setup(generateInviteLink: ReturnType<typeof vi.fn>) {
		const clipboard = { copy: vi.fn() } as unknown as ReturnType<typeof useClipboard>;
		const usersStore = { generateInviteLink } as unknown as ReturnType<typeof useUsersStore>;
		return { clipboard, usersStore };
	}

	it('calls generateInviteLink with the user id', async () => {
		const generateInviteLink = vi.fn().mockResolvedValue({ link });
		const { clipboard, usersStore } = setup(generateInviteLink);

		await copyInviteLink(clipboard, usersStore, 'user-1');

		expect(generateInviteLink).toHaveBeenCalledWith({ id: 'user-1' });
	});

	it('passes a promise-returning function to clipboard.copy that resolves to the link', async () => {
		const generateInviteLink = vi.fn().mockResolvedValue({ link });
		const { clipboard, usersStore } = setup(generateInviteLink);

		await copyInviteLink(clipboard, usersStore, 'user-1');

		expect(clipboard.copy).toHaveBeenCalledWith(expect.any(Function));
		const getLink = (clipboard.copy as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
		await expect(getLink()).resolves.toBe(link);
	});

	it('propagates a rejection from generateInviteLink', async () => {
		const error = new Error('Failed to generate link');
		const generateInviteLink = vi.fn().mockRejectedValue(error);
		const { clipboard, usersStore } = setup(generateInviteLink);
		// Mimic useClipboard.copy resolving the promise-returning value, so a
		// rejected invite surfaces to the caller's try/catch.
		(clipboard.copy as ReturnType<typeof vi.fn>).mockImplementation(
			async (value: string | (() => Promise<string>)) => {
				if (typeof value === 'function') await value();
			},
		);

		await expect(copyInviteLink(clipboard, usersStore, 'user-1')).rejects.toThrow(error);
	});
});
