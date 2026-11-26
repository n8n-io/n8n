import {
	computed,
	defineAsyncComponent,
	inject,
	provide,
	type ComputedRef,
	type InjectionKey,
} from 'vue';

import {
	extractBuiltAgentArtifacts,
	extractBuiltWorkflowArtifacts,
	type ArtifactInfo,
} from '@/features/ai/instanceAi/agentTimeline.utils';
import type { ArtifactThread } from '@/features/ai/instanceAi/artifactThread';
import type { ArtifactTurn } from '@/features/ai/instanceAi/artifactTurns';
import {
	INSTANCE_AI_EMBED_SUBJECT_KEY,
	isEmbedSubject,
	type InstanceAiEmbedSubject,
} from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';

/** The artifact cards of the open thread, by the tool call that shows each card. */
export const ASSISTANT_ARTIFACT_CARDS: InjectionKey<
	ComputedRef<ReadonlyMap<string, ArtifactInfo>>
> = Symbol('assistantArtifactCards');

/**
 * The artifact cards of an Assistant agent thread, by the tool call that shows
 * each card. The rules are the same as in `AgentTimeline` on the current runtime:
 * - A workflow card shows only in an embedded panel, because the full view
 *   opens the built workflow in its preview panel. It shows at the first
 *   successful build of the workflow in a turn.
 * - An Agent card shows at the last call of a turn that changed the Agent,
 *   after the turn ends.
 * - The subject of the embedded panel gets no card: the user already sees it.
 */
export function findAssistantArtifactCards(
	turns: readonly ArtifactTurn[],
	embedSubject: InstanceAiEmbedSubject | undefined,
): Map<string, ArtifactInfo> {
	const isVisible = (artifact: ArtifactInfo) =>
		!isEmbedSubject(embedSubject, artifact.type, artifact.resourceId);
	const cards = new Map<string, ArtifactInfo>();
	for (const turn of turns) {
		if (turn.role !== 'assistant') continue;
		const seenWorkflowIds = new Set<string>();
		const latestAgents = new Map<string, { toolCallId: string; artifact: ArtifactInfo }>();
		for (const toolCall of turn.toolCalls) {
			const [workflow] = embedSubject ? extractBuiltWorkflowArtifacts([toolCall]) : [];
			if (workflow && isVisible(workflow) && !seenWorkflowIds.has(workflow.resourceId)) {
				seenWorkflowIds.add(workflow.resourceId);
				cards.set(toolCall.toolCallId, workflow);
			}

			const [agent] = turn.isLive ? [] : extractBuiltAgentArtifacts([toolCall]);
			if (!agent || !isVisible(agent)) continue;
			const previous = latestAgents.get(agent.resourceId)?.artifact;
			latestAgents.set(agent.resourceId, {
				toolCallId: toolCall.toolCallId,
				artifact: { ...agent, projectId: agent.projectId ?? previous?.projectId },
			});
		}
		for (const { toolCallId, artifact } of latestAgents.values()) cards.set(toolCallId, artifact);
	}
	return cards;
}

/**
 * Provides the artifact cards of `thread` to the card component, and returns
 * the chat extension that shows each card as the footer of its tool step. Call
 * it in the setup of the chat host: it also reads the subject of the embedded
 * panel.
 */
export function provideAssistantArtifactCards(
	thread: ArtifactThread,
): AgentsChatInteractionExtension {
	const embedSubject = inject(INSTANCE_AI_EMBED_SUBJECT_KEY, undefined);
	const cards = computed(() =>
		findAssistantArtifactCards(thread.artifactTurns, embedSubject?.value),
	);
	provide(ASSISTANT_ARTIFACT_CARDS, cards);

	return {
		key: 'assistant_artifact_card',
		matchToolFooter: (toolCall) => cards.value.has(toolCall.toolCallId),
		toolFooterComponent: defineAsyncComponent(
			async () => await import('./AssistantArtifactCard.vue'),
		),
	};
}
