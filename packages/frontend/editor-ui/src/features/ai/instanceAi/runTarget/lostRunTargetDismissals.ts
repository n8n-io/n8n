import type { InstanceAiThreadInfo, InstanceAiThreadSummary } from '@n8n/api-types';

/**
 * The lost link notices that the owner dismissed in this session. The server drops a dismissed
 * notice, but a read that started before the dismissal still names the lost link. Such a read
 * must not bring the notice back.
 *
 * @param localCopies every local copy of a thread, for example in the sidebar list and the history
 * @param acknowledge tells the server that the owner dismissed the notice
 */
export function createLostRunTargetDismissals(
	localCopies: (threadId: string) => InstanceAiThreadSummary[],
	acknowledge: (threadId: string) => Promise<void>,
) {
	const dismissed = new Set<string>();

	/** The lost link of a server copy of a thread, unless the owner dismissed its notice. */
	function visible(thread: Pick<InstanceAiThreadInfo, 'id' | 'lostRunTarget'>) {
		return dismissed.has(thread.id) ? undefined : thread.lostRunTarget;
	}

	/**
	 * Hides the notice at once, and the server drops it for good. When the request fails, the
	 * notice comes back, so the owner can try again.
	 */
	async function dismiss(threadId: string): Promise<void> {
		const copies = localCopies(threadId);
		const lost = copies.find((copy) => copy.lostRunTarget)?.lostRunTarget;
		dismissed.add(threadId);
		for (const copy of copies) copy.lostRunTarget = undefined;
		try {
			await acknowledge(threadId);
		} catch {
			dismissed.delete(threadId);
			for (const copy of localCopies(threadId)) copy.lostRunTarget ??= lost;
		}
	}

	return { visible, dismiss };
}
