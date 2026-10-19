import { inject, ref } from 'vue';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import type { ApplyPreviewSuggestionOptions, ApplyPreviewSuggestionResult } from '@n8n/api-types';

import { agentsEventBus } from '../agents.eventBus';
import { useAgentEvalsStore } from '../agentEvals.store';
import { MAX_APPLY_SUGGESTIONS } from '../agentEvals.types';
import { AGENT_CONFIG_WRITE_KEY } from '../components/agentBuilderInjectionKeys';

/**
 * Applies the stored fix suggestions of failed eval results: the backend rewrites the
 * agent's instructions from the *saved* config, then reruns just those results. The builder
 * saves its pending edits first, locks editing while this runs and reloads the config
 * afterwards (see `AgentConfigWrite`). Without a builder there is nothing to lock, so other
 * surfaces are told to refresh instead.
 */
export function useApplyAgentEvalSuggestions(target: () => { projectId: string; agentId: string }) {
	const i18n = useI18n();
	const toast = useToast();
	const store = useAgentEvalsStore();
	const runConfigWrite = inject(AGENT_CONFIG_WRITE_KEY, null);

	const applyingIds = ref<string[]>([]);
	const applyingPreview = ref(false);

	// Runs `work` as one write to the agent's config. A failure, including the builder failing
	// to save its pending edits first, is toasted and reads as `null`.
	async function writeConfig<T>(agentId: string, work: () => Promise<T>): Promise<T | null> {
		try {
			if (runConfigWrite) return await runConfigWrite(work);
			try {
				return await work();
			} finally {
				agentsEventBus.emit('agentUpdated', { agentId, source: 'agent-evals' });
			}
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
			return null;
		}
	}

	// Every write rewrites the agent from the config the server holds, so two at once would
	// start from the same config hash and one would hit a conflict. Only one runs at a time.
	const busy = () => applyingIds.value.length > 0 || applyingPreview.value;

	/**
	 * Applies the suggestions of these results. One request takes at most
	 * MAX_APPLY_SUGGESTIONS results, so a longer list goes out as successive requests, all
	 * inside one locked write on the agent the call started on. The first failure stops the
	 * rest. A batch with nothing left to send is skipped, not a failure. Resolves to whether
	 * no request failed.
	 */
	async function applySuggestions(resultIds: string[]): Promise<boolean> {
		const ids = [...new Set(resultIds)];
		if (ids.length === 0 || busy()) return false;
		const { projectId, agentId } = target();
		applyingIds.value = ids;
		try {
			const done = await writeConfig(agentId, async () => {
				for (let start = 0; start < ids.length; start += MAX_APPLY_SUGGESTIONS) {
					const batch = ids.slice(start, start + MAX_APPLY_SUGGESTIONS);
					await store.applySuggestions(projectId, agentId, batch);
				}
				return true;
			});
			return done === true;
		} finally {
			applyingIds.value = [];
		}
	}

	// A preview run saves nothing, so the case travels with the suggestion.
	async function applyPreviewSuggestion(
		options: ApplyPreviewSuggestionOptions,
	): Promise<ApplyPreviewSuggestionResult | null> {
		if (busy()) return null;
		const { projectId, agentId } = target();
		applyingPreview.value = true;
		try {
			return await writeConfig(
				agentId,
				async () => await store.applyPreviewSuggestion(projectId, agentId, options),
			);
		} finally {
			applyingPreview.value = false;
		}
	}

	return { applyingIds, applySuggestions, applyingPreview, applyPreviewSuggestion };
}
