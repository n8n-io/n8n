import { inject, ref } from 'vue';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import type { ApplyPreviewSuggestionOptions, ApplyPreviewSuggestionResult } from '@n8n/api-types';

import { agentsEventBus } from '../agents.eventBus';
import { useAgentEvalsStore } from '../agentEvals.store';
import { MAX_APPLY_SUGGESTIONS } from '../agentEvals.types';
import { AGENT_CONFIG_FLUSH_KEY } from '../components/agentBuilderInjectionKeys';

/**
 * Applies the stored fix suggestions of failed eval results: the backend rewrites the
 * agent's instructions from the *saved* config, so pending builder edits are flushed
 * first. It then reruns just those results. The builder does not hear about its own
 * tab's write over push, so it is told to refetch the config.
 */
export function useApplyAgentEvalSuggestions(target: () => { projectId: string; agentId: string }) {
	const i18n = useI18n();
	const toast = useToast();
	const store = useAgentEvalsStore();
	const flushAgentConfig = inject(AGENT_CONFIG_FLUSH_KEY, null);

	const applyingIds = ref<string[]>([]);
	const applyingPreview = ref(false);

	type Target = { projectId: string; agentId: string };
	// `ok: false` is a failure that was toasted. `ok: true` with a null `value` means the write had
	// nothing to send, which is not a failure.
	type Outcome<T> = { ok: true; value: T | null } | { ok: false };

	// Optionally saves pending builder edits, runs the write, and tells the builder to refetch.
	// The target is fixed by the caller, so a navigation in the middle of a multi-request apply
	// cannot move the rest of it to another agent. The flush saves the agent the builder shows
	// now, so it only runs for the first request, while that is still the pinned agent.
	async function applyAndRefresh<T>(
		{ projectId, agentId }: Target,
		write: (projectId: string, agentId: string) => Promise<T | null>,
		{ flush }: { flush: boolean },
	): Promise<Outcome<T>> {
		try {
			if (flush) await flushAgentConfig?.();
			const applied = await write(projectId, agentId);
			if (applied) agentsEventBus.emit('agentUpdated', { agentId, source: 'agent-evals' });
			return { ok: true, value: applied };
		} catch (error) {
			const conflict = error instanceof ResponseError && error.httpStatusCode === 409;
			toast.showError(
				error,
				i18n.baseText(
					conflict
						? 'agents.builder.agentEvals.suggestion.conflictError'
						: 'agents.builder.agentEvals.suggestion.applyError',
				),
			);
			return { ok: false };
		}
	}

	// Every write rewrites the agent from the config the server holds, so two at once would
	// start from the same config hash and one would hit a conflict. Only one runs at a time.
	const busy = () => applyingIds.value.length > 0 || applyingPreview.value;

	/**
	 * Applies the suggestions of these results. One request takes at most
	 * MAX_APPLY_SUGGESTIONS results, so a longer list goes out as successive requests; the
	 * first failure stops the rest. A batch with nothing left to send is skipped, not a failure.
	 * Resolves to whether no request failed.
	 */
	async function applySuggestions(resultIds: string[]): Promise<boolean> {
		const ids = [...new Set(resultIds)];
		if (ids.length === 0 || busy()) return false;
		const writeTarget = target();
		applyingIds.value = ids;
		try {
			for (let start = 0; start < ids.length; start += MAX_APPLY_SUGGESTIONS) {
				const batch = ids.slice(start, start + MAX_APPLY_SUGGESTIONS);
				const outcome = await applyAndRefresh(
					writeTarget,
					async (projectId, agentId) => await store.applySuggestions(projectId, agentId, batch),
					{ flush: start === 0 },
				);
				if (!outcome.ok) return false;
			}
			return true;
		} finally {
			applyingIds.value = [];
		}
	}

	// A preview run saves nothing, so the case travels with the suggestion.
	async function applyPreviewSuggestion(
		options: ApplyPreviewSuggestionOptions,
	): Promise<ApplyPreviewSuggestionResult | null> {
		if (busy()) return null;
		applyingPreview.value = true;
		try {
			const outcome = await applyAndRefresh(
				target(),
				async (projectId, agentId) =>
					await store.applyPreviewSuggestion(projectId, agentId, options),
				{ flush: true },
			);
			return outcome.ok ? outcome.value : null;
		} finally {
			applyingPreview.value = false;
		}
	}

	return { applyingIds, applySuggestions, applyingPreview, applyPreviewSuggestion };
}
