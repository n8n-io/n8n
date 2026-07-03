import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';

import { createAgent } from './useAgentApi';
import { upsertProjectAgentsListCache } from './useProjectAgentsList';
import type { AgentResource } from '../types';

/**
 * Eagerly create a draft agent primitive and reference it on the node —
 * without leaving the workflow. The user keeps editing in place: the NDV's
 * agent section loads the new draft inline, and the canvas card opens the NDV.
 * An abandoned create leaves a harmless draft in the catalog (the
 * draft/published model keeps production executions safe).
 *
 * Shared by the agent picker's "+ Create agent" action and the NDV builder
 * banner, which differ only in how they write the reference onto the node
 * (`setReference`) and their telemetry source.
 */
export function useAgentInlineCreate(options: {
	projectId: MaybeRefOrGetter<string>;
	telemetrySource: string;
	setReference: (agent: AgentResource) => void;
	onCreated?: (agent: AgentResource) => void;
}) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const toast = useToast();
	const telemetry = useTelemetry();

	const isCreating = ref(false);

	async function createAndSelect() {
		const projectId = toValue(options.projectId);
		if (!projectId) {
			toast.showError(
				new Error(i18n.baseText('agentSelector.createAgentFailed')),
				i18n.baseText('agentSelector.createAgentFailed'),
			);
			return;
		}

		if (isCreating.value) return;
		isCreating.value = true;

		try {
			const agent = await createAgent(
				rootStore.restApiContext,
				projectId,
				i18n.baseText('agents.new.defaultName'),
			);
			upsertProjectAgentsListCache(projectId, agent);

			options.setReference(agent);
			options.onCreated?.(agent);

			telemetry.track('User created agent', {
				agent_id: agent.id,
				source: options.telemetrySource,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSelector.createAgentFailed'));
		} finally {
			isCreating.value = false;
		}
	}

	return { createAndSelect, isCreating };
}
