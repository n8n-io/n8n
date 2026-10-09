import type { RunTarget } from '@n8n/api-types';

import { isLinkedRunTarget } from './runTargetOptions';
import { useOpenThreadSummary } from './useOpenThreadSummary';

/**
 * The run target that the messages of the open chat carry. Only the first message sets the
 * target of a chat. So the target of an opener that the chat did not accept goes with the next
 * message too, until the chat accepts one.
 *
 * @param refreshThread reads the chat again, so its chip and its lost link notice update.
 */
export function useMessageRunTarget(refreshThread: () => Promise<void>) {
	const openThreadSummary = useOpenThreadSummary();
	let unsent: RunTarget | undefined;

	/** Keeps the target of a programmatic send, an opener, until the chat accepts a message. */
	function remember(runTarget: RunTarget | undefined) {
		if (runTarget) unsent = runTarget;
	}

	/** The target that the next message carries: the target of an opener that was not accepted. */
	function forNextMessage(): RunTarget | undefined {
		return unsent;
	}

	/**
	 * The chat accepted a message. A message can store the link of a new chat, or drop the link
	 * of a linked chat. Then the chat is read now, so the chip and the notice show during the
	 * turn, not at its end.
	 */
	function accepted(hostContext: Record<string, unknown>) {
		unsent = undefined;
		const linkedChat = openThreadSummary.value?.runTarget?.kind === 'linked';
		if (linkedChat || isLinkedRunTarget(hostContext.runTarget)) void refreshThread();
	}

	return { remember, forNextMessage, accepted };
}
