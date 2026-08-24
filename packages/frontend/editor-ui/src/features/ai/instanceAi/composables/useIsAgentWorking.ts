import { computed, type ComputedRef } from 'vue';

import { collectActiveBuilderAgents } from '../builderAgents';
import { useThread, type ThreadRuntime } from '../instanceAi.store';

/**
 * Whether the agent is busy anywhere in this thread — the lock signal shared by
 * every artifact preview, so user edits can't race agent mutations.
 *
 * Thread-wide rather than per-artifact: keying off tool calls that name a
 * resource id left long stretches unlocked. Hydration counts as busy, since an
 * in-flight run isn't known until thread status resolves after a reload.
 *
 * `isAwaitingConfirmation` is deliberately unused — it can linger on
 * confirmations left unresolved by a finished run. A live confirmation keeps
 * `activeRunId` set, so `isStreaming` already covers that case.
 *
 * Pass `runtime` from the component that *provides* the thread — it can't
 * inject what it provides, and forking this logic there would leave two copies
 * to keep in sync. Everything below it just calls this with no argument.
 */
export function useIsAgentWorking(runtime?: ThreadRuntime): ComputedRef<boolean> {
	const thread = runtime ?? useThread();

	return computed(
		() =>
			thread.isHydratingThread ||
			thread.isStreaming ||
			thread.isSendingMessage ||
			collectActiveBuilderAgents(thread.messages).length > 0,
	);
}
