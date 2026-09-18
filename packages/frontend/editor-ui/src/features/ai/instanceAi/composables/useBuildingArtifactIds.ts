import { computed, type ComputedRef } from 'vue';

import { isAgentEditingAgent, isAgentEditingWorkflow } from '../canvasPreview.utils';
import { useThread, type ThreadRuntime } from '../instanceAi.store';

/**
 * Ids of the thread's artifacts the AI is actively mutating right now — the
 * per-artifact progress signal behind the spinners on preview tabs and
 * sidebar rows, so the artifact panel visibly reacts while a build is in
 * flight instead of only when the change lands.
 *
 * Reuses the per-artifact editing-lock signals (`isAgentEditingWorkflow` /
 * `isAgentEditingAgent`), so the indicator covers the same window as the
 * editing lock: from sub-agent spawn (or first mutating tool call) until the
 * run settles. Data tables have no lock signal and are not tracked.
 *
 * Pass `runtime` from the component that *provides* the thread — it can't
 * inject what it provides. Everything below it just calls this with no
 * argument.
 */
export function useBuildingArtifactIds(runtime?: ThreadRuntime): ComputedRef<Set<string>> {
	const thread = runtime ?? useThread();

	return computed(() => {
		const ids = new Set<string>();
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type !== 'workflow' && entry.type !== 'agent') continue;
			const isEditing = entry.type === 'workflow' ? isAgentEditingWorkflow : isAgentEditingAgent;
			for (const message of thread.messages) {
				if (!message.agentTree) continue;
				if (isEditing(message.agentTree, entry.id)) {
					ids.add(entry.id);
					break;
				}
			}
		}
		return ids;
	});
}
