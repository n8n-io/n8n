<script lang="ts" setup>
/**
 * PlanReviewPanel.vue
 *
 * Single-card plan approval UI. Shows planned tasks as an accordion with
 * expandable specs, dependency info, and approve/ask-for-edits/deny controls.
 * "Ask for edits" hands off feedback collection to the main chat input.
 */
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import ConfirmationFooter from './ConfirmationFooter.vue';

export interface PlannedTaskArg {
	id: string;
	title: string;
	kind: string;
	spec: string;
	deps: string[];
	tools?: string[];
	workflowId?: string;
}

export type PlanReviewStatus = 'pending' | 'approved' | 'changes-requested' | 'denied';

const props = defineProps<{
	plannedTasks: PlannedTaskArg[];
	message?: string;
	disabled?: boolean;
	readOnly?: boolean;
	loading?: boolean;
	status?: PlanReviewStatus;
	updating?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{
	approve: [];
	'ask-for-edits': [];
	deny: [];
}>();

const isResolved = ref(false);
const resolvedAction = ref<PlanReviewStatus | null>(null);

const reviewStatus = computed<PlanReviewStatus>(
	() => props.status ?? resolvedAction.value ?? 'pending',
);

const isExpanded = ref(!props.readOnly);

const titleKey = computed<BaseTextKey>(() =>
	isResolved.value || props.readOnly
		? 'instanceAi.planReview.titleResolved'
		: 'instanceAi.planReview.title',
);

const showActions = computed(
	() =>
		reviewStatus.value === 'pending' &&
		!isResolved.value &&
		!props.readOnly &&
		!props.loading &&
		props.plannedTasks.length > 0,
);

const showChangesRequested = computed(() => reviewStatus.value === 'changes-requested');

const isShimmering = computed(() => Boolean(props.loading || props.updating));

function getDescription(task: PlannedTaskArg): string {
	let text = task.spec;
	if (task.deps.length) {
		const depNames = task.deps.map((depId) => {
			const dep = props.plannedTasks.find((t) => t.id === depId);
			return dep?.title ?? depId;
		});
		text += `\nDepends on: ${depNames.join(', ')}`;
	}
	return text;
}

function handleApprove() {
	if (isResolved.value) return;
	isResolved.value = true;
	resolvedAction.value = 'approved';
	emit('approve');
}

function handleAskForEdits() {
	if (isResolved.value) return;
	emit('ask-for-edits');
}

function handleDeny() {
	if (isResolved.value) return;
	isResolved.value = true;
	resolvedAction.value = 'denied';
	emit('deny');
}
</script>

<template>
	<CollapsibleRoot
		v-model:open="isExpanded"
		:class="$style.root"
		:aria-busy="isShimmering ? 'true' : undefined"
		:data-loading="isShimmering ? 'true' : undefined"
		data-test-id="instance-ai-plan-review"
	>
		<CollapsibleTrigger as-child>
			<div :class="$style.header">
				<N8nText bold>
					{{ i18n.baseText(titleKey) }}
				</N8nText>
				<N8nText v-if="reviewStatus === 'approved'" size="small" bold color="success">
					{{ i18n.baseText('instanceAi.planReview.approved') }}
				</N8nText>
				<N8nText
					v-else-if="reviewStatus === 'denied'"
					size="small"
					bold
					color="text-light"
					data-test-id="instance-ai-plan-denied"
				>
					{{ i18n.baseText('instanceAi.planReview.denied') }}
				</N8nText>
				<div v-else-if="showChangesRequested && updating" :class="$style.headerStatus">
					<N8nIcon icon="loader" size="small" :class="$style.loadingIcon" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.planReview.updating') }}
					</N8nText>
				</div>
				<div
					v-else-if="props.loading && plannedTasks.length > 0"
					:class="$style.headerStatus"
					data-test-id="instance-ai-plan-building"
				>
					<N8nIcon icon="loader" size="small" :class="$style.loadingIcon" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.planReview.building') }}
					</N8nText>
				</div>
			</div>
		</CollapsibleTrigger>

		<AnimatedCollapsibleContent>
			<div v-if="props.loading && plannedTasks.length === 0" :class="$style.loadingState">
				<N8nIcon icon="loader" size="medium" :class="$style.loadingIcon" />
				<N8nText color="text-light">
					{{ i18n.baseText('instanceAi.planReview.building') }}
				</N8nText>
			</div>

			<div v-else :class="$style.tasks">
				<div v-for="(task, idx) in plannedTasks" :key="task.id" :class="$style.taskItem">
					<div :class="$style.taskRow">
						<span :class="$style.taskNumber">{{ idx + 1 }}</span>
						<N8nText :class="$style.taskTitle">{{ task.title }}</N8nText>
					</div>

					<div v-if="task.spec" :class="$style.taskDetail">
						<N8nText tag="p" :class="$style.taskSpec">{{ getDescription(task) }}</N8nText>
					</div>
				</div>
			</div>

			<ConfirmationFooter v-if="showActions" layout="row-end" bordered>
				<N8nButton
					variant="outline"
					size="medium"
					:disabled="disabled"
					data-test-id="instance-ai-plan-deny"
					@click="handleDeny"
				>
					{{ i18n.baseText('instanceAi.planReview.deny') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					size="medium"
					:disabled="disabled"
					data-test-id="instance-ai-plan-ask-for-edits"
					@click="handleAskForEdits"
				>
					{{ i18n.baseText('instanceAi.planReview.askForEdits') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					size="medium"
					:disabled="disabled"
					data-test-id="instance-ai-plan-approve"
					@click="handleApprove"
				>
					{{ i18n.baseText('instanceAi.planReview.approve') }}
				</N8nButton>
			</ConfirmationFooter>

			<ConfirmationFooter v-else-if="showChangesRequested" layout="row-end" bordered>
				<N8nButton
					variant="outline"
					size="medium"
					disabled
					data-test-id="instance-ai-plan-changes-requested"
				>
					{{ i18n.baseText('instanceAi.planReview.changesRequested') }}
				</N8nButton>
			</ConfirmationFooter>
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background-color: var(--color--background--light-3);
	max-width: 90%;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	cursor: pointer;
}

.headerStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.loadingState {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
}

.loadingIcon {
	@include motion.spin;
}

.tasks {
	display: flex;
	flex-direction: column;
}

.taskItem {
	&:first-child {
		padding-top: var(--spacing--3xs);
	}
}

.taskRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm) 0;
}

.taskNumber {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--color--foreground);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
}

.taskTitle {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.taskDetail {
	padding: var(--spacing--4xs) var(--spacing--sm) var(--spacing--2xs);
	padding-left: calc(var(--spacing--sm) + 20px + var(--spacing--2xs));
}

.taskSpec {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
