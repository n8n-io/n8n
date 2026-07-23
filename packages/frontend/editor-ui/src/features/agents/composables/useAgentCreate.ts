import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';

import { createAgent } from './useAgentApi';
import { upsertProjectAgentsListCache } from './useProjectAgentsList';
import { useAgentNavigation } from './useAgentNavigation';
import type { AgentResource } from '../types';

/**
 * Eagerly create a draft agent primitive and reference it on the node.
 */
export function useAgentCreate(options: {
	projectId: MaybeRefOrGetter<string>;
	telemetrySource: string;
	/** Origin node for the builder's "Back to workflow" return context. */
	getOriginNodeId?: () => string | undefined;
	setReference: (agent: AgentResource) => void;
	onCreated?: (agent: AgentResource) => void;
}) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const nav = useAgentNavigation();
	const router = useRouter();
	const { saveCurrentWorkflow } = useWorkflowSaving({ router });

	const isCreating = ref(false);

	/** Shared core: create the draft and reference it. Returns null on failure. */
	async function createDraft(): Promise<AgentResource | null> {
		const projectId = toValue(options.projectId);
		if (!projectId) {
			toast.showError(
				new Error(i18n.baseText('agentSelector.createAgentFailed')),
				i18n.baseText('agentSelector.createAgentFailed'),
			);
			return null;
		}

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

		return agent;
	}

	async function createAndSelect() {
		if (isCreating.value) return;
		isCreating.value = true;

		try {
			await createDraft();
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSelector.createAgentFailed'));
		} finally {
			isCreating.value = false;
		}
	}

	async function createAndOpenBuilder() {
		if (isCreating.value) return;
		isCreating.value = true;

		try {
			const agent = await createDraft();
			if (!agent) return;

			// Persist the workflow so the new agent reference is saved before navigating
			// away. Otherwise leaving the (now-dirty) workflow and abandoning the builder
			// would drop the reference, orphaning the freshly-created draft. Saving also
			// clears the dirty state, so the route change doesn't prompt to save.
			const saved = await saveCurrentWorkflow({}, false);
			if (!saved) return;

			await nav.openBuilder(toValue(options.projectId), agent.id, options.getOriginNodeId?.());
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSelector.createAgentFailed'));
		} finally {
			isCreating.value = false;
		}
	}

	return { createAndSelect, createAndOpenBuilder, isCreating };
}
