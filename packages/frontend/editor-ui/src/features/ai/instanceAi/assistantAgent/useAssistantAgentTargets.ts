import type { AssistantAgentTargetsState } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { readonly, shallowRef } from 'vue';

import type { ArtifactAgentTarget, ArtifactAgentTargets } from '../artifactAgentTargets';
import {
	bindAssistantAgentTarget,
	fetchAssistantAgentTargets,
	persistAssistantPendingAgent,
} from './assistantAgentTargets.api';

interface UseAssistantAgentTargetsOptions {
	threadId: string;
	/** The server knows the thread only after its first message, so a load waits until then. */
	canLoad: () => boolean;
}

/**
 * The agent bindings of an Assistant agent thread, from the metadata of its
 * Agents thread. The turns change them on the server, so the view refreshes
 * them after each turn.
 */
export function useAssistantAgentTargets(options: UseAssistantAgentTargetsOptions) {
	const rootStore = useRootStore();
	const state = shallowRef<AssistantAgentTargetsState | null>(null);
	// A response that is older than the last write must not replace it.
	let generation = 0;
	// The last agent that the preview bound before the server knew the thread.
	let deferredBind: ArtifactAgentTarget | undefined;

	function apply(targets: AssistantAgentTargetsState): void {
		generation += 1;
		state.value = targets;
	}

	async function refresh(): Promise<void> {
		if (!options.canLoad()) return;
		const current = ++generation;
		try {
			const { targets } = await fetchAssistantAgentTargets(
				rootStore.restApiContext,
				options.threadId,
			);
			if (current === generation) state.value = targets;
		} catch (error) {
			// The previews still show the agents of the chat messages without the bindings.
			console.warn('Failed to load the agents of the Assistant thread', error);
		}
		// The first message bound the subject, so a later change in the preview applies now.
		const deferred = deferredBind;
		deferredBind = undefined;
		if (deferred) {
			await agentTargets.bind(deferred).catch((error: unknown) => {
				console.warn('Failed to bind the agent of the Assistant thread', error);
			});
		}
	}

	const agentTargets: ArtifactAgentTargets = {
		bind: async (target) => {
			// The server does not know a new thread before its first message. Keep the
			// latest target, and bind it on the first refresh after that message.
			if (!options.canLoad()) {
				deferredBind = target;
				return;
			}
			const { bound, pending } = state.value ?? {};
			if (
				bound?.agentId === target.agentId &&
				bound.projectId === target.projectId &&
				bound.name === target.name &&
				!pending
			) {
				return;
			}
			const { targets } = await bindAssistantAgentTarget(
				rootStore.restApiContext,
				options.threadId,
				target,
			);
			apply(targets);
		},
		persistPendingAgent: async (request) => {
			const { agent, targets } = await persistAssistantPendingAgent(
				rootStore.restApiContext,
				options.threadId,
				request,
			);
			return { agent, commit: () => apply(targets) };
		},
	};

	return { state: readonly(state), refresh, agentTargets };
}
