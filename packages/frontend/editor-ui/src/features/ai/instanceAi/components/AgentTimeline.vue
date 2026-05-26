<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
	TaskList,
} from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { extractArtifacts, HIDDEN_TOOLS, type ArtifactInfo } from '../agentTimeline.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useThread } from '../instanceAi.store';
import { isActiveBuilderAgent } from '../builderAgents';
import AgentSection from './AgentSection.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import ArtifactCard from './ArtifactCard.vue';
import DelegateCard from './DelegateCard.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import PlanReviewPanel, { type PlannedTaskArg, type PlanReviewStatus } from './PlanReviewPanel.vue';
import TaskChecklist from './TaskChecklist.vue';
import ToolCallStep from './ToolCallStep.vue';

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

defineSlots<{
	'after-tool-call'?: (props: { toolCall: InstanceAiToolCallState }) => unknown;
}>();

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
	if (localStatus === 'denied' || tc.confirmationStatus === 'denied') return 'changes-requested';

	return 'pending';
}

function isPlanReviewUpdating(tc: InstanceAiToolCallState): boolean {
	const requestId = tc.confirmation?.requestId;
	if (!requestId || getPlanReviewStatus(tc) !== 'changes-requested') return false;
	return thread.updatingPlanRequestIds.has(requestId) || thread.isStreaming;
}

/** PlanReviewPanel is read-only when its tool call has settled OR when the
 *  underlying confirmation has already been resolved client-side. Without the
 *  resolvedConfirmationIds check, a freshly-loading new plan tool call could
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

function handlePlanConfirm(tc: InstanceAiToolCallState, approved: boolean, feedback?: string) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;

	const numTasks = getPlanTasks(tc).length;
	const eventProps = {
		thread_id: thread.id,
		input_thread_id: tc.confirmation?.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'plan-review',
		provided_inputs: [
			{
				label: 'plan',
				options: ['approve', 'ask-for-edits', 'deny'],
				option_chosen: approved ? 'approve' : 'ask-for-edits',
			},
		],
		skipped_inputs: [],
		num_tasks: numTasks,
		...(feedback ? { feedback } : {}),
	};
	telemetry.track('User finished providing input', eventProps);

	thread.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	if (thread.activePlanEdit?.requestId === requestId) {
		thread.cancelPlanEdit();
	}
	void thread.confirmAction(requestId, {
		kind: 'approval',
		approved,
		...(feedback ? { userInput: feedback } : {}),
	});
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
	});

	if (thread.activePlanEdit?.requestId === requestId) {
		thread.cancelPlanEdit();
	}
	thread.resolveConfirmation(requestId, 'denied');
	void thread.confirmAction(requestId, { kind: 'planDeny' });
}

/** Find the latest plan-review confirmation from a planner child's submit-plan tool call.
 *  Prefers pending (isLoading) over resolved — handles revision loops where
 *  multiple submit-plan calls exist. */
const plannerConfirmation = computed<InstanceAiToolCallState | undefined>(() => {
	let latest: InstanceAiToolCallState | undefined;
	for (const child of props.agentNode.children) {
		if (child.role !== 'planner') continue;
		for (const tc of child.toolCalls) {
			if (tc.toolName === 'submit-plan' && tc.confirmation?.inputType === 'plan-review') {
				if (tc.isLoading) return tc;
				latest = tc;
			}
		}
	}
	return latest;
});

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
	<div :class="$style.timeline">
		<template v-for="(entry, idx) in timelineEntries" :key="idx">
			<!-- Text segment -->
			<N8nText
				v-if="entry.type === 'text'"
				size="large"
				:compact="props.compact"
				:class="$style.timelineItem"
			>
				<InstanceAiMarkdown :content="entry.content" />
			</N8nText>

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
				<DelegateCard
					v-else-if="toolCallsById[entry.toolCallId].renderHint === 'delegate'"
					:args="toolCallsById[entry.toolCallId].args"
					:result="toolCallsById[entry.toolCallId].result"
					:is-loading="toolCallsById[entry.toolCallId].isLoading"
					:tool-call-id="toolCallsById[entry.toolCallId].toolCallId"
				/>
				<!-- Hidden tool calls (builder/data-table/researcher/eval-setup handled by child agent via AgentSection) -->
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'builder'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'data-table'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'researcher'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'eval-setup'" />
				<!-- Plan review must match before the planner renderHint suppression:
				     when the plan tool attaches the confirmation to its own tool call
				     (no planner child agent), that suppression would otherwise hide it. -->
				<PlanReviewPanel
					v-else-if="toolCallsById[entry.toolCallId].confirmation?.inputType === 'plan-review'"
					:key="toolCallsById[entry.toolCallId].confirmation?.requestId"
					:planned-tasks="getPlanTasks(toolCallsById[entry.toolCallId])"
					:status="getPlanReviewStatus(toolCallsById[entry.toolCallId])"
					:updating="isPlanReviewUpdating(toolCallsById[entry.toolCallId])"
					:read-only="isPlanCardReadOnly(toolCallsById[entry.toolCallId])"
					@approve="handlePlanConfirm(toolCallsById[entry.toolCallId], true)"
					@ask-for-edits="handlePlanAskForEdits(toolCallsById[entry.toolCallId])"
					@deny="handlePlanDeny(toolCallsById[entry.toolCallId])"
				/>
				<!-- Planner: suppress tool call — PlanReviewPanel renders after the child AgentSection -->
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
				<ToolCallStep v-else :tool-call="toolCallsById[entry.toolCallId]" :show-connector="true">
					<slot name="after-tool-call" :tool-call="toolCallsById[entry.toolCallId]" />
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

				<!-- Planner child: render PlanReviewPanel below the agent section -->
				<PlanReviewPanel
					v-if="
						childrenById[entry.agentId].role === 'planner' &&
						(plannerConfirmation ||
							props.agentNode.planItems?.length ||
							props.agentNode.tasks?.tasks?.length)
					"
					:key="plannerConfirmation?.confirmation?.requestId ?? 'plan-loading'"
					:planned-tasks="
						plannerConfirmation?.confirmation?.planItems ??
						props.agentNode.planItems ??
						mapTaskItemsToPlannedTasks(props.agentNode.tasks) ??
						[]
					"
					:loading="!plannerConfirmation"
					:status="plannerConfirmation ? getPlanReviewStatus(plannerConfirmation) : 'pending'"
					:updating="!!plannerConfirmation && isPlanReviewUpdating(plannerConfirmation)"
					:read-only="!!plannerConfirmation && isPlanCardReadOnly(plannerConfirmation)"
					@approve="plannerConfirmation && handlePlanConfirm(plannerConfirmation, true)"
					@ask-for-edits="plannerConfirmation && handlePlanAskForEdits(plannerConfirmation)"
					@deny="plannerConfirmation && handlePlanDeny(plannerConfirmation)"
				/>

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
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.timelineItem {
	max-width: 90%;
}
</style>
