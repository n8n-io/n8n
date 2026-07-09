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
import TaskChecklist from './TaskChecklist.vue';
import TimelineTextSegment from './TimelineTextSegment.vue';
import TraceChipStrip from './TraceChipStrip.vue';

const i18n = useI18n();
const thread = useThread();
const telemetry = useTelemetry();
const rootStore = useRootStore();

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

/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});

/** Tool render hints that produce no timeline output of their own. */
const INVISIBLE_RENDER_HINTS = new Set(['builder', 'data-table', 'eval-setup', 'planner']);

type TextEntry = Extract<InstanceAiTimelineEntry, { type: 'text' }>;

/**
 * The timeline reduced to renderable blocks. Consecutive "trace" entries
 * (reasoning + generic tool calls) merge into horizontal chip strips;
 * invisible entries (hidden tools, builder/planner hints, pending questions)
 * are dropped without splitting a strip. Everything else renders standalone
 * and splits the strip.
 */
type RenderBlock =
	| { type: 'strip'; key: string; entries: InstanceAiTimelineEntry[] }
	| { type: 'text'; key: string; entry: TextEntry }
	| { type: 'tasks'; key: string; toolCall: InstanceAiToolCallState }
	| { type: 'plan-review'; key: string; toolCall: InstanceAiToolCallState }
	| { type: 'questions'; key: string; toolCall: InstanceAiToolCallState }
	| { type: 'child'; key: string; child: InstanceAiAgentNode };

const renderBlocks = computed<RenderBlock[]>(() => {
	const blocks: RenderBlock[] = [];
	let strip: Extract<RenderBlock, { type: 'strip' }> | null = null;

	function pushStandalone(block: RenderBlock) {
		strip = null;
		blocks.push(block);
	}

	timelineEntries.value.forEach((entry, idx) => {
		if (entry.type === 'text') {
			pushStandalone({ type: 'text', key: `text-${idx}`, entry });
			return;
		}

		if (entry.type === 'child') {
			const child = childrenById.value[entry.agentId];
			// Running builder sub-agents are extracted and rendered at the bottom
			// of the conversation by InstanceAiView; once a builder finishes it
			// reappears here in its chronological slot.
			if (child && !isActiveBuilderAgent(child)) {
				pushStandalone({ type: 'child', key: `child-${idx}`, child });
			}
			return;
		}

		if (entry.type === 'tool-call') {
			const tc = toolCallsById.value[entry.toolCallId];
			if (!tc || HIDDEN_TOOLS.has(tc.toolName)) return;
			if (tc.renderHint === 'tasks') {
				pushStandalone({ type: 'tasks', key: `tasks-${idx}`, toolCall: tc });
				return;
			}
			if (tc.confirmation?.inputType === 'plan-review') {
				pushStandalone({ type: 'plan-review', key: `plan-${idx}`, toolCall: tc });
				return;
			}
			if (tc.renderHint && INVISIBLE_RENDER_HINTS.has(tc.renderHint)) return;
			if (tc.confirmation?.inputType === 'questions') {
				// Pending question forms are suppressed until answered.
				if (!tc.isLoading) {
					pushStandalone({ type: 'questions', key: `questions-${idx}`, toolCall: tc });
				}
				return;
			}
		}

		// Reasoning entries and generic tool calls join the current chip strip.
		if (!strip) {
			strip = { type: 'strip', key: `strip-${idx}`, entries: [] };
			blocks.push(strip);
		}
		strip.entries.push(entry);
	});

	return blocks;
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
	<div v-if="renderBlocks.length > 0" :class="$style.timeline">
		<template v-for="block in renderBlocks" :key="block.key">
			<!-- Trace chip strip: consecutive reasoning + generic tool calls -->
			<TraceChipStrip
				v-if="block.type === 'strip'"
				:agent-node="props.agentNode"
				:entries="block.entries"
			/>

			<!-- Text segment (leaf keeps the per-token content read out of this render) -->
			<TimelineTextSegment
				v-else-if="block.type === 'text'"
				:entry="block.entry"
				:compact="props.compact"
				:streaming="isStreamingTimelineEntry(props.agentNode, block.entry)"
				:class="$style.timelineItem"
			/>

			<TaskChecklist v-else-if="block.type === 'tasks'" :tasks="props.agentNode.tasks" />

			<PlanReviewPanel
				v-else-if="block.type === 'plan-review'"
				:key="block.toolCall.confirmation?.requestId"
				:planned-tasks="getPlanTasks(block.toolCall)"
				:status="getPlanReviewStatus(block.toolCall)"
				:updating="isPlanReviewUpdating(block.toolCall)"
				:read-only="isPlanCardReadOnly(block.toolCall)"
				:expired="block.toolCall.confirmation?.expired"
				@approve="handlePlanApprove(block.toolCall)"
				@ask-for-edits="handlePlanAskForEdits(block.toolCall)"
				@deny="handlePlanDeny(block.toolCall)"
			/>

			<!-- Answered questions (read-only after resolution) -->
			<AnsweredQuestions v-else-if="block.type === 'questions'" :tool-call="block.toolCall" />

			<!-- Child agent — flat section -->
			<template v-else-if="block.type === 'child'">
				<AgentSection :agent-node="block.child" />

				<!-- Artifact cards for completed subagents (skip when inside grouped view) -->
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
