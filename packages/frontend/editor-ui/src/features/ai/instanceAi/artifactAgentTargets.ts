import type { AgentJsonConfig } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { inject, provide, type InjectionKey } from 'vue';

import type { AgentCreationResource } from '@/features/agents/types';

import {
	INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_PENDING_AGENT_METADATA_KEY,
} from './constants';
import { persistPendingAgent } from './instanceAi.memory.api';
import { useInstanceAiStore, useThread } from './instanceAi.store';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
} from './instanceAi.threadRuntime';

export interface ArtifactAgentTarget {
	agentId: string;
	projectId: string;
	name: string;
}

export interface PendingAgentRequest {
	projectId: string;
	agentId: string;
	name: string;
	config?: AgentJsonConfig;
}

export interface PersistedPendingAgent {
	agent: AgentCreationResource;
	/** Applies the new thread binding to the local thread state. */
	commit: () => void;
}

/**
 * The agent bindings of a thread, which the agent preview reads and writes.
 * The thread runtime keeps them in its thread metadata. The Assistant agent
 * view keeps them in the metadata of its Agents thread.
 */
export interface ArtifactAgentTargets {
	/** Binds a saved agent with its current name, so the next turn edits it. Drops the pending agent. */
	bind: (target: ArtifactAgentTarget) => Promise<void>;
	/**
	 * Saves the pending agent under its minted id and binds it in one request.
	 * The caller commits the result only when it still shows that agent.
	 */
	persistPendingAgent: (request: PendingAgentRequest) => Promise<PersistedPendingAgent>;
}

const ArtifactAgentTargetsKey: InjectionKey<ArtifactAgentTargets> = Symbol('ArtifactAgentTargets');

export function provideArtifactAgentTargets(targets: ArtifactAgentTargets): void {
	provide(ArtifactAgentTargetsKey, targets);
}

/** The provided agent bindings, else the ones of the thread runtime. */
export function useArtifactAgentTargets(): ArtifactAgentTargets {
	return inject(ArtifactAgentTargetsKey, null) ?? useThreadRuntimeAgentTargets();
}

/** The agent bindings in the thread metadata of the current runtime. */
function useThreadRuntimeAgentTargets(): ArtifactAgentTargets {
	const thread = useThread();
	const instanceAiStore = useInstanceAiStore();
	const rootStore = useRootStore();

	return {
		bind: async (target) => {
			const metadata = instanceAiStore.getThreadMetadata(thread.id);
			const bound = getAgentBuilderTargetFromThreadMetadata(metadata);
			const pending = getPendingAgentTargetFromThreadMetadata(metadata);
			if (
				bound?.agentId === target.agentId &&
				bound.projectId === target.projectId &&
				bound.name === target.name &&
				!pending
			) {
				return;
			}

			await instanceAiStore.updateThreadMetadata(thread.id, {
				[INSTANCE_AI_PENDING_AGENT_METADATA_KEY]: null,
				[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: { ...target },
			});
		},
		persistPendingAgent: async (request) => {
			const { agent, thread: updatedThread } = await persistPendingAgent(
				rootStore.restApiContext,
				thread.id,
				request,
			);
			return {
				agent,
				// Authoritative: the server dropped the pending key, which a merge would keep.
				commit: () => instanceAiStore.setThreadMetadata(thread.id, updatedThread.metadata),
			};
		},
	};
}
