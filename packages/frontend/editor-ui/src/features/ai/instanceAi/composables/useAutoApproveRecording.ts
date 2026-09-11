import { watch } from 'vue';

import type { ThreadRuntime } from '../instanceAi.store';

/** The backend's `DOMAIN_TOOL_IDS.START_BROWSER_RECORDING` (packages/@n8n/instance-ai). */
const START_BROWSER_RECORDING_TOOL_ID = 'start-browser-recording';

/** Give up quietly if the agent never proposes recording (e.g. it asks a question first). */
const AUTO_APPROVE_TIMEOUT_MS = 20_000;

/**
 * Auto-clicks the agent's "Start recording" confirmation the moment it appears on this
 * thread — the same two calls `InstanceAiConfirmationPanel.vue`'s `handleContinue` makes.
 *
 * Scoped to a single thread and a single fire: this must never become a generic auto-allow
 * for `inputType: 'continue'` confirmations elsewhere, since that suspend exists specifically
 * because starting a recording captures the user's screen.
 */
export function armAutoApproveRecording(thread: ThreadRuntime): void {
	let settled = false;
	const stop = watch(
		thread.pendingConfirmations,
		(items) => {
			const item = items.find(
				(candidate) =>
					candidate.toolCall.toolName === START_BROWSER_RECORDING_TOOL_ID &&
					candidate.toolCall.confirmation.inputType === 'continue',
			);
			if (!item || settled) return;

			settled = true;
			stop();
			thread.resolveConfirmation(item.toolCall.confirmation.requestId, 'approved');
			void thread.confirmAction(item.toolCall.confirmation.requestId, {
				kind: 'approval',
				approved: true,
			});
		},
		{ immediate: true },
	);

	setTimeout(() => {
		if (!settled) stop();
	}, AUTO_APPROVE_TIMEOUT_MS);
}
