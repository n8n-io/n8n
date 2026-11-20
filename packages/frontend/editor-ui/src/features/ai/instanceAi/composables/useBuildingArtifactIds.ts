import { computed, type ComputedRef } from 'vue';

import {
	getActiveSelectedAgentIds,
	isAgentEditingAgent,
	isAgentEditingWorkflow,
} from '../canvasPreview.utils';
import { useArtifactThread, type ArtifactThread } from '../artifactThread';

/**
 * Ids of the thread's artifacts the AI is actively mutating right now — the
 * per-artifact progress signal behind the spinners on preview tabs and
 * sidebar rows, so the artifact panel visibly reacts while a build is in
 * flight instead of only when the change lands.
 *
 * Reuses the per-artifact editing-lock signals (`isAgentEditingWorkflow` /
 * `isAgentEditingAgent`), so the indicator covers the same window as the
 * editing lock: from the first mutating tool call until the run settles.
 * Data tables have no lock signal and are not tracked.
 *
 * Agents selected in an active run count even before they are produced: the
 * agent can read and ask about an existing draft before its first write.
 *
 * Pass `runtime` from the component that *provides* the thread — it can't
 * inject what it provides. Everything below it just calls this with no
 * argument.
 */
export function useBuildingArtifactIds(runtime?: ArtifactThread): ComputedRef<Set<string>> {
	const thread = runtime ?? useArtifactThread();

	return computed(() => {
		const turns = thread.artifactTurns;
		const ids = getActiveSelectedAgentIds(turns);
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type !== 'workflow' && entry.type !== 'agent') continue;
			if (ids.has(entry.id)) continue;
			const isEditing = entry.type === 'workflow' ? isAgentEditingWorkflow : isAgentEditingAgent;
			if (isEditing(turns, entry.id)) ids.add(entry.id);
		}
		return ids;
	});
}
