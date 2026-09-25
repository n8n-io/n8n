<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import {
	buildTimelineBlocks,
	extractArtifacts,
	isStreamingTimelineEntry,
	type ArtifactInfo,
} from '../agentTimeline.utils';
import { useThread } from '../instanceAi.store';
import AgentSection from './AgentSection.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import ArtifactCard from './ArtifactCard.vue';
import InstanceAiMcpConnect from './InstanceAiMcpConnect.vue';
import PreferenceCard from './PreferenceCard.vue';
import ThinkingBlock from './ThinkingBlock.vue';
import TimelineActivityIndicator from './TimelineActivityIndicator.vue';
import TimelineTextSegment from './TimelineTextSegment.vue';

const i18n = useI18n();
const thread = useThread();

/** Resolve artifact name from the enriched registry (falls back to extracted name). */
function resolveArtifactName(artifact: ArtifactInfo): string {
	const entry = thread.producedArtifacts.get(artifact.resourceId);
	return entry?.name ?? artifact.name;
}

function formatRelativeTime(isoTime: string): string {
	const diffMs = Date.now() - new Date(isoTime).getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) {
		return i18n.baseText('instanceAi.artifactCard.updatedJustNow');
	}
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 1) {
		const key =
			diffMin === 1 ? 'instanceAi.artifactCard.minute' : 'instanceAi.artifactCard.minutes';
		const time = i18n.baseText(key, {
			interpolate: { count: `${diffMin}` },
		});
		return i18n.baseText('instanceAi.artifactCard.updatedAgo', { interpolate: { time } });
	}
	const key = diffHours === 1 ? 'instanceAi.artifactCard.hour' : 'instanceAi.artifactCard.hours';
	const time = i18n.baseText(key, {
		interpolate: { count: `${diffHours}` },
	});
	return i18n.baseText('instanceAi.artifactCard.updatedAgo', { interpolate: { time } });
}

function formatCreatedDate(isoTime: string): string {
	const date = new Date(isoTime);
	const day = date.getDate();
	const month = date.toLocaleString('en', { month: 'long' });
	return i18n.baseText('instanceAi.artifactCard.createdAt', {
		interpolate: { date: `${day} ${month}` },
	});
}

function formatArtifactMetadata(artifact: ArtifactInfo): string {
	const parts: string[] = [];

	if (artifact.completedAt) {
		parts.push(formatRelativeTime(artifact.completedAt));
		parts.push(formatCreatedDate(artifact.completedAt));
	} else {
		parts.push(i18n.baseText('instanceAi.artifactCard.updatedJustNow'));
	}

	return parts.join(' │ ');
}

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		compact?: boolean;
		/** When provided, renders only these entries instead of the full timeline. */
		visibleEntries?: InstanceAiTimelineEntry[];
		/** The message this timeline belongs to — cards act only on the latest turn. */
		messageId?: string;
		/** The run this timeline belongs to — cards append their facts to it. */
		runId?: string;
	}>(),
	{
		compact: false,
		visibleEntries: undefined,
		messageId: undefined,
		runId: undefined,
	},
);

/**
 * A preference card acts only from the transcript tail, and only when the
 * message carries the run the endpoints must append the card fact to. A later
 * turn strands the card.
 */
const canActOnPreferenceCard = computed(
	() =>
		props.runId !== undefined &&
		props.messageId !== undefined &&
		props.messageId === thread.messages.at(-1)?.id,
);

const timelineEntries = computed(() => props.visibleEntries ?? props.agentNode.timeline);

/** Index tool calls by ID for O(1) lookup and proper reactivity tracking. */
const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});

/**
 * Changes whenever the run visibly advances: a new run, a new timeline entry,
 * or the tail entry growing. Drives the activity indicator's clock — an
 * entry-derived key can't, because the tail entry's identity is stable while
 * its content streams.
 */
const progressToken = computed(() => {
	const entries = timelineEntries.value;
	const tail = entries.at(-1);
	const tailSize =
		tail && (tail.type === 'text' || tail.type === 'reasoning') ? tail.content.length : 0;
	return `${thread.activeRunId}:${entries.length}:${tailSize}`;
});

const renderBlocks = computed(() =>
	buildTimelineBlocks(
		timelineEntries.value,
		toolCallsById.value,
		childrenById.value,
		props.agentNode.status,
	),
);

/** An in-transcript card is read-only once its tool call has settled OR its
 *  confirmation was resolved client-side. */
function isCardReadOnly(tc: InstanceAiToolCallState): boolean {
	if (!tc.isLoading) return true;
	const requestId = tc.confirmation?.requestId;
	return !!requestId && thread.resolvedConfirmationIds.has(requestId);
}
</script>

<template>
	<div v-if="renderBlocks.length > 0" :class="$style.timeline">
		<template v-for="block in renderBlocks" :key="block.key">
			<!-- Collapsible thinking trace: reasoning + narration + tool calls -->
			<ThinkingBlock
				v-if="block.type === 'thinking'"
				:agent-node="props.agentNode"
				:entries="block.entries"
				:active="block.active"
				:awaiting-input="block.active && thread.isAwaitingConfirmation"
			/>

			<!-- User-facing text (leaf keeps the per-token content read out of this render) -->
			<TimelineTextSegment
				v-else-if="block.type === 'text'"
				:entry="block.entry"
				:compact="props.compact"
				:streaming="isStreamingTimelineEntry(props.agentNode, block.entry)"
				:class="$style.timelineItem"
			/>

			<InstanceAiMcpConnect
				v-else-if="block.type === 'mcp-connect' && block.toolCall.confirmation?.mcpConnectRequest"
				:key="block.toolCall.confirmation.requestId"
				:request-id="block.toolCall.confirmation.requestId"
				:input-thread-id="block.toolCall.confirmation.inputThreadId"
				:servers="block.toolCall.confirmation.mcpConnectRequest.servers"
				:read-only="isCardReadOnly(block.toolCall)"
				:expired="block.toolCall.confirmation.expired"
			/>

			<!-- Answered questions (read-only after resolution) -->
			<AnsweredQuestions v-else-if="block.type === 'questions'" :tool-call="block.toolCall" />

			<!-- A preference the assistant saved: edit or undo it from the latest turn -->
			<PreferenceCard
				v-else-if="block.type === 'preference'"
				:tool-call="block.toolCall"
				:run-id="props.runId ?? ''"
				:read-only="!canActOnPreferenceCard"
				:class="$style.timelineItem"
			/>

			<!-- The run is live but a committed answer settled the block behind it -->
			<TimelineActivityIndicator
				v-else-if="block.type === 'activity' && !thread.isAwaitingConfirmation"
				:progress-token="progressToken"
			/>

			<!-- Child agent — flat section -->
			<template v-else-if="block.type === 'child'">
				<AgentSection :agent-node="block.child" />

				<!-- Artifact cards for completed subagents (skip when inside scoped view) -->
				<template v-if="!props.visibleEntries">
					<ArtifactCard
						v-for="artifact in extractArtifacts(block.child)"
						:key="artifact.resourceId"
						:type="artifact.type"
						:name="resolveArtifactName(artifact)"
						:resource-id="artifact.resourceId"
						:project-id="artifact.projectId"
						:archived="thread.producedArtifacts.get(artifact.resourceId)?.archived"
						:metadata="formatArtifactMetadata(artifact)"
					/>
				</template>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.timeline {
	/** Keep in sync with the nested activity rail overshoot in N8nAiActivityStep. */
	--n8n--ai-activity-step-gap: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--n8n--ai-activity-step-gap);
}

.timelineItem {
	max-width: 90%;
}
</style>
