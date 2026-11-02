<script setup lang="ts">
import { computed } from 'vue';
import { N8nAiActivityStepButton, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import type { AgentChatResumeDto, AgentJsonConfig } from '@n8n/api-types';
import { parseApprovalInput } from '@/features/ai/shared/agentsChat/messageMappers';
import type { ApprovalResume } from '@/features/ai/shared/agentsChat/types';
import AgentChatMessageAttachments from '../AgentChatMessageAttachments.vue';
import ApprovalCard from '../interactive/ApprovalCard.vue';
import { useI18n } from '@n8n/i18n';
import { formatTimelineTime } from '../../utils/timeline-time';
import type { TimelineItem } from '../../session-timeline.types';
import { backgroundTaskPresentation } from '../../utils/background-task-timeline';

const props = defineProps<{
	item: TimelineItem;
	respondToApproval?: (payload: AgentChatResumeDto) => Promise<void>;
	approvalPending?: boolean;
	selected: boolean;
	searchQuery?: string;
	projectId?: string;
	agentId?: string;
	agentName?: string;
	personalisation?: AgentJsonConfig['personalisation'] | null;
	tools?: AgentJsonConfig['tools'];
	threadId?: string;
}>();

const i18n = useI18n();
const task = computed(() => props.item.backgroundTask);
const presentation = computed(() => task.value && backgroundTaskPresentation[task.value.status]);
const statusLabel = computed(
	() => presentation.value && i18n.baseText(presentation.value.labelKey),
);
const label = computed(() => {
	if (!task.value) return '';
	if (task.value.status === 'running') return task.value.title;
	return i18n.baseText('agentSessions.timeline.backgroundTaskStatus', {
		interpolate: { title: task.value.title, status: statusLabel.value ?? '' },
	});
});
const time = computed(() => formatTimelineTime(props.item.timestamp));
const approvalInput = computed(() => {
	if (task.value?.status !== 'suspended' || !task.value.approval || !props.respondToApproval) {
		return undefined;
	}
	return parseApprovalInput(task.value.approval.suspendPayload);
});

function submitApproval(resumeData: ApprovalResume) {
	const approval = task.value?.approval;
	if (!approval || !approvalInput.value || props.approvalPending) return;
	void props.respondToApproval?.({
		runId: approval.runId,
		toolCallId: approval.toolCallId,
		resumeData,
	});
}
</script>

<template>
	<div
		v-if="task && presentation"
		data-test-id="session-background-task-item"
		:class="[
			$style.row,
			task.status === 'failed' && $style.failed,
			task.status === 'cancelled' && $style.cancelled,
		]"
	>
		<div
			v-if="approvalInput && task.approval"
			:class="$style.approvalTimelineItem"
			@click.stop
			@keydown.stop
		>
			<div :class="$style.approvalRail" aria-hidden="true"></div>
			<ApprovalCard
				:key="`${task.approval.runId}:${task.approval.toolCallId}`"
				:input="approvalInput"
				:agent-name="agentName"
				:tools="tools"
				:disabled="approvalPending"
				:auto-focus="false"
				:use-key-shortcuts="false"
				@submit="submitApproval"
			/>
			<div :class="$style.approvalRail" aria-hidden="true"></div>
		</div>
		<div v-else :class="$style.header">
			<TransitionGroup
				tag="div"
				:class="$style.stateTransition"
				:enter-active-class="$style.stateEnterActive"
				:leave-active-class="$style.stateLeaveActive"
				:enter-from-class="$style.stateEnterFrom"
				:leave-to-class="$style.stateLeaveTo"
			>
				<div :key="`${task.id}:${task.status}`" :class="$style.stateContent">
					<N8nAiActivityStepButton
						:class="$style.activityButton"
						size="small"
						:loading="task.status === 'running'"
						:interactive="false"
						full-width
						:tabindex="-1"
					>
						<template #prefix>
							<span role="img" :aria-label="statusLabel" :class="$style.icon">
								<N8nSpinner v-if="task.status === 'running'" type="grid" size="medium" />
								<N8nIcon
									v-else-if="presentation.icon"
									:icon="presentation.icon"
									size="medium"
									:class="task.status === 'cancelled' && $style.cancelledIcon"
								/>
							</span>
						</template>
						{{ label }}
					</N8nAiActivityStepButton>
				</div>
			</TransitionGroup>
			<div :class="$style.actions">
				<N8nText step="xs" color="text-light" bold :class="$style.time">{{ time }}</N8nText>
			</div>
		</div>
		<AgentChatMessageAttachments
			v-if="task.files?.length && projectId && agentId"
			:class="$style.files"
			:attachments="task.files"
			:project-id="projectId"
			:agent-id="agentId"
			:thread-id="threadId"
			data-test-id="session-background-task-files"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.row .activityButton {
	--ai-activity-step--padding: var(--spacing--2xs);
	--button--color--background-hover: var(--background--hover);
	--button--color--background-active: var(--background--active);
}

.row {
	display: flex;
	flex-direction: column;
	width: 100%;
	--ai-activity-step--color: var(--text-color--subtle);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-inline: var(--spacing--2xs);
	padding-inline-end: var(--spacing--2xs);
}

.stateTransition {
	display: grid;
	flex: 1;
	min-width: 0;
}

.stateContent {
	grid-area: 1 / 1;
	min-width: 0;
	pointer-events: none;
}

.stateEnterActive,
.stateLeaveActive {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.stateEnterFrom,
.stateLeaveTo {
	opacity: 0;
}

.stateEnterFrom {
	transform: translateY(var(--spacing--2xs));
}

.stateLeaveTo {
	transform: translateY(calc(-1 * var(--spacing--2xs)));
}

.files {
	margin: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs);
}

.failed {
	--ai-activity-step--color: var(--color--text--danger);
}

.cancelled {
	--ai-activity-step--color: var(--text-color--disabled);
}

.cancelledIcon {
	color: var(--icon-color--subtle);
}

.icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.time {
	flex-shrink: 0;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.approvalTimelineItem {
	width: 100%;
	min-width: 0;
}

.approvalRail {
	width: 1px;
	height: var(--spacing--sm);
	margin-inline-start: calc(var(--spacing--lg) + var(--spacing--5xs));
	background-color: var(--border-color);
}
</style>
