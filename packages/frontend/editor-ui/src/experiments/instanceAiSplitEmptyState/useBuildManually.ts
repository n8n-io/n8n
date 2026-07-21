import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { NODE_CREATOR_OPEN_SOURCES, VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { createAgent } from '@/features/agents/composables/useAgentApi';
import { upsertProjectAgentsListCache } from '@/features/agents/composables/useProjectAgentsList';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import {
	INSTANCE_AI_CREATION_INTENT_AGENT,
	INSTANCE_AI_CREATION_INTENT_QUERY,
} from '@/features/ai/instanceAi/constants';

/**
 * Shared "build manually" escape hatch for the split-empty-state experiment.
 * Agent creation entries open a blank agent; other entries open a fresh
 * workflow with the trigger node-creator already open.
 *
 * Experiment cleanup: remove with instanceAiSplitEmptyState.
 */
export function useBuildManually() {
	const route = useRoute();
	const router = useRouter();
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const toast = useToast();
	const isCreatingAgent = ref(false);

	function buildWorkflowManually(projectId?: string) {
		uiStore.addFirstStepOnLoad = true;
		// Attribute the manual build to Instance AI (the 'User opened nodes panel'
		// event). Generic on purpose — reused by future Instance AI experiments.
		uiStore.addFirstStepOnLoadSource = NODE_CREATOR_OPEN_SOURCES.INSTANCE_AI;
		void router.push({
			name: VIEWS.NEW_WORKFLOW,
			query: projectId ? { projectId } : {},
		});
	}

	async function buildAgentManually(projectId?: string) {
		if (isCreatingAgent.value) return;

		const errorMessage = i18n.baseText('agentSelector.createAgentFailed');
		if (!projectId) {
			toast.showError(new Error(errorMessage), errorMessage);
			return;
		}

		isCreatingAgent.value = true;
		try {
			const agent = await createAgent(
				rootStore.restApiContext,
				projectId,
				i18n.baseText('agents.new.defaultName'),
			);
			upsertProjectAgentsListCache(projectId, agent);
			telemetry.track('User created agent', {
				agent_id: agent.id,
				source: 'create_blank',
			});
			void router.push({
				name: AGENT_BUILDER_VIEW,
				params: { projectId, agentId: agent.id },
			});
		} catch (error) {
			toast.showError(error, errorMessage);
		} finally {
			isCreatingAgent.value = false;
		}
	}

	async function buildManually(projectId?: string) {
		if (route.query[INSTANCE_AI_CREATION_INTENT_QUERY] === INSTANCE_AI_CREATION_INTENT_AGENT) {
			await buildAgentManually(projectId);
			return;
		}

		buildWorkflowManually(projectId);
	}

	return { buildManually };
}
