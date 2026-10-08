import { inject, ref } from 'vue';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';

import { agentsEventBus } from '../agents.eventBus';
import { useAgentEvalsStore } from '../agentEvals.store';
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

	async function applySuggestions(resultIds: string[]) {
		if (resultIds.length === 0 || resultIds.some((id) => applyingIds.value.includes(id))) return;
		applyingIds.value = [...applyingIds.value, ...resultIds];
		const { projectId, agentId } = target();
		try {
			await flushAgentConfig?.();
			const applied = await store.applySuggestions(projectId, agentId, resultIds);
			if (applied) agentsEventBus.emit('agentUpdated', { agentId, source: 'agent-evals' });
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
		} finally {
			applyingIds.value = applyingIds.value.filter((id) => !resultIds.includes(id));
		}
	}

	return { applyingIds, applySuggestions };
}
