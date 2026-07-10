<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
	TaskList,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import {
	extractArtifacts,
	isStreamingTimelineEntry,
	isVisibleTimelineEntry,
	HIDDEN_TOOLS,
	type ArtifactInfo,
} from '../agentTimeline.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useThread } from '../instanceAi.store';
import { isActiveBuilderAgent } from '../builderAgents';
import AgentSection from './AgentSection.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import ArtifactCard from './ArtifactCard.vue';
import PlanReviewPanel, { type PlannedTaskArg, type PlanReviewStatus } from './PlanReviewPanel.vue';
import ReasoningBlock from './ReasoningBlock.vue';
import TaskChecklist from './TaskChecklist.vue';
import TimelineTextSegment from './TimelineTextSegment.vue';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';
import { N8nAiActivityStep as ToolCallStep } from '@n8n/design-system';
import { useToolLabel } from '../toolLabels';

const i18n = useI18n();
const thread = useThread();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const { getToolLabel } = useToolLabel();

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

	return parts.join(' \u2502 ');
}

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		compact?: boolean;
		/** When provided, renders only these entries instead of the full timeline. */
		visibleEntries?: InstanceAiTimelineEntry[];
	}>(),
	{
		compact: false,
		visibleEntries: undefined,
	},
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

function getPlanTasks(tc: InstanceAiToolCallState): PlannedTaskArg[] {
	return (
		tc.confirmation?.planItems ??
		(tc.args?.tasks as PlannedTaskArg[] | undefined) ??
		mapTaskItemsToPlannedTasks(tc.confirmation?.tasks) ??
		[]
	);
}

function getPlanReviewStatus(tc: InstanceAiToolCallState): PlanReviewStatus {
	const requestId = tc.confirmation?.requestId;
	const localStatus = requestId ? thread.resolvedConfirmationIds.get(requestId) : undefined;

	if (localStatus === 'approved' || tc.confirmationStatus === 'approved') return 'approved';
	if (localStatus === 'denied') return 'denied';
	// `confirmationStatus === 'denied'` covers re-renders where the local action
	// was lost (e.g. page reload): default to changes-requested since
	// create-tasks emits a revised plan card on top of the old one in that flow.
	if (localStatus === 'changes-requested' || tc.confirmationStatus === 'denied') {
		return 'changes-requested';
	}

	return 'pending';
}

function isPlanReviewUpdating(tc: InstanceAiToolCallState): boolean {
	const requestId = tc.confirmation?.requestId;
	if (!requestId || getPlanReviewStatus(tc) !== 'changes-requested') return false;
	return thread.updatingPlanRequestIds.has(requestId);
}

/** PlanReviewPanel is read-only when its tool call has settled OR when the
 *  underlying confirmation has already been resolved client-side. Without the
 *  resolvedConfirmationIds check, a freshly-loading create-tasks call could
 *  briefly re-enable the old card's footer (toolCall.isLoading flips back to
 *  true on tool-call-start before the previous card's read-only catches up). */
function isPlanCardReadOnly(tc: InstanceAiToolCallState): boolean {
	if (!tc.isLoading) return true;
	const requestId = tc.confirmation?.requestId;
	if (requestId && thread.resolvedConfirmationIds.has(requestId)) return true;
	return false;
}

/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});

/**
 * Whether any entry renders visible output. Segments made up entirely of
 * hidden tool calls (e.g. builder calls represented by artifact cards) skip
 * the wrapper div — an empty flex item would still add gap spacing.
 */
const hasVisibleEntries = computed(() =>
	timelineEntries.value.some((entry) =>
		isVisibleTimelineEntry(entry, toolCallsById.value, childrenById.value),
	),
);

function handlePlanApprove(tc: InstanceAiToolCallState) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;

	telemetry.track('User finished providing input', {
		thread_id: thread.id,
		input_thread_id: tc.confirmation?.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'plan-review',
		provided_inputs: [
			{
				label: 'plan',
				options: ['approve', 'ask-for-edits', 'deny'],
				option_chosen: 'approve',
			},
		],
		skipped_inputs: [],
		num_tasks: getPlanTasks(tc).length,
		plan_feedback_type: 'accept',
	});

	thread.resolveConfirmation(requestId, 'approved');
	if (thread.activePlanEdit?.requestId === requestId) {
		thread.cancelPlanEdit();
	}
	void thread.confirmAction(requestId, { kind: 'approval', approved: true });
}

function handlePlanAskForEdits(tc: InstanceAiToolCallState) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId || isPlanCardReadOnly(tc)) return;

	thread.startPlanEdit({
		requestId,
		inputThreadId: tc.confirmation?.inputThreadId,
		taskCount: getPlanTasks(tc).length,
	});
}

function handlePlanDeny(tc: InstanceAiToolCallState) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;

	const numTasks = getPlanTasks(tc).length;
	telemetry.track('User finished providing input', {
		thread_id: thread.id,
		input_thread_id: tc.confirmation?.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'plan-review',
		provided_inputs: [
			{
				label: 'plan',
				options: ['approve', 'ask-for-edits', 'deny'],
				option_chosen: 'deny',
			},
		],
		skipped_inputs: [],
		num_tasks: numTasks,
		plan_feedback_type: 'deny',
	});

	if (thread.activePlanEdit?.requestId === requestId) {
		thread.cancelPlanEdit();
	}
	thread.resolveConfirmation(requestId, 'denied');
	void thread.confirmAction(requestId, { kind: 'planDeny' });
}

/** Map simplified TaskList items to PlannedTaskArg shape for loading preview */
function mapTaskItemsToPlannedTasks(tasks?: TaskList): PlannedTaskArg[] | undefined {
	if (!tasks?.tasks?.length) return undefined;
	return tasks.tasks.map((t) => ({
		id: t.id,
		title: t.description,
		kind: '',
		spec: '',
		deps: [],
	}));
}
</script>

<template>
	<div v-if="hasVisibleEntries" :class="$style.timeline">
		<template v-for="(entry, idx) in timelineEntries" :key="idx">
			<!-- Text segment (leaf keeps the per-token content read out of this render) -->
			<TimelineTextSegment
				v-if="entry.type === 'text'"
				:entry="entry"
				:compact="props.compact"
				:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
				:class="$style.timelineItem"
			/>

			<!-- Reasoning segment — one collapsible block per reasoning stage -->
			<ReasoningBlock
				v-else-if="entry.type === 'reasoning'"
				:entry="entry"
				:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
			/>

			<!-- Tool call (skip internal tools like updateWorkingMemory) -->
			<template
				v-else-if="
					entry.type === 'tool-call' &&
					toolCallsById[entry.toolCallId] &&
					!HIDDEN_TOOLS.has(toolCallsById[entry.toolCallId].toolName)
				"
			>
				<TaskChecklist
					v-if="toolCallsById[entry.toolCallId].renderHint === 'tasks'"
					:tasks="props.agentNode.tasks"
				/>
				<!-- Hidden tool calls (builder/data-table/eval-setup handled by child agent via AgentSection) -->
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'builder'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'data-table'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'eval-setup'" />
				<PlanReviewPanel
					v-else-if="toolCallsById[entry.toolCallId].confirmation?.inputType === 'plan-review'"
					:key="toolCallsById[entry.toolCallId].confirmation?.requestId"
					:planned-tasks="getPlanTasks(toolCallsById[entry.toolCallId])"
					:status="getPlanReviewStatus(toolCallsById[entry.toolCallId])"
					:updating="isPlanReviewUpdating(toolCallsById[entry.toolCallId])"
					:read-only="isPlanCardReadOnly(toolCallsById[entry.toolCallId])"
					:expired="toolCallsById[entry.toolCallId].confirmation?.expired"
					@approve="handlePlanApprove(toolCallsById[entry.toolCallId])"
					@ask-for-edits="handlePlanAskForEdits(toolCallsById[entry.toolCallId])"
					@deny="handlePlanDeny(toolCallsById[entry.toolCallId])"
				/>
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'planner'" />
				<!-- Answered questions (read-only after resolution) -->
				<AnsweredQuestions
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						!toolCallsById[entry.toolCallId].isLoading
					"
					:tool-call="toolCallsById[entry.toolCallId]"
				/>
				<!-- Suppress default tool call while questions are pending -->
				<template
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						toolCallsById[entry.toolCallId].isLoading
					"
				/>
				<ToolCallStep
					v-else
					:label="
						getToolLabel(
							toolCallsById[entry.toolCallId].toolName,
							toolCallsById[entry.toolCallId].args,
						)
					"
					:loading="toolCallsById[entry.toolCallId].isLoading"
					:error="toolCallsById[entry.toolCallId].error"
				>
					<ToolResultJson
						v-if="toolCallsById[entry.toolCallId].args"
						:value="toolCallsById[entry.toolCallId].args"
					/>
					<ToolResultRenderer
						v-if="toolCallsById[entry.toolCallId].result !== undefined"
						:result="toolCallsById[entry.toolCallId].result"
						:tool-name="toolCallsById[entry.toolCallId].toolName"
						:tool-args="toolCallsById[entry.toolCallId].args"
					/>
				</ToolCallStep>
			</template>

			<!-- Child agent — flat section. Running builder sub-agents are
				 extracted and rendered at the bottom of the conversation by
				 InstanceAiView; once a builder finishes it reappears here in its
				 chronological slot. -->
			<template
				v-else-if="
					entry.type === 'child' &&
					childrenById[entry.agentId] &&
					!isActiveBuilderAgent(childrenById[entry.agentId])
				"
			>
				<AgentSection :agent-node="childrenById[entry.agentId]" />

				<!-- Artifact cards for completed subagents (skip when inside grouped view) -->
				<template v-if="!props.visibleEntries">
					<ArtifactCard
						v-for="artifact in extractArtifacts(childrenById[entry.agentId])"
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
