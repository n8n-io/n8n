import type { useClipboard } from '@/app/composables/useClipboard';
import type { useUsersStore } from './users.store';

/**
 * Copies a freshly-generated invite link to the clipboard.
 *
 * The link is passed to `clipboard.copy` as a promise-returning function rather
 * than an already-awaited string. vueuse 14+ writes via `navigator.clipboard.write`,
 * which accepts a promise that resolves to the value; starting the copy synchronously
 * inside the click handler keeps Safari's transient user-activation alive. Awaiting the
 * network request first drops it, and Safari (26.5 / 27.0) then silently copies an empty
 * string. See IAM-532.
 */
export async function copyInviteLink(
	clipboard: ReturnType<typeof useClipboard>,
	usersStore: ReturnType<typeof useUsersStore>,
	userId: string,
): Promise<void> {
	const invite = usersStore.generateInviteLink({ id: userId });
	await clipboard.copy(() => invite.then((res) => res.link));
}
