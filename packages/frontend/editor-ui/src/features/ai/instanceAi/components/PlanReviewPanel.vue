<script lang="ts" setup>
import {
	N8nButton,
	N8nIcon,
	N8nText,
	N8nAnimatedCollapsibleContent as AnimatedCollapsibleContent,
} from '@n8n/design-system';
/**
 * PlanReviewPanel.vue
 *
 * Single-card plan approval UI. Shows planned tasks as an accordion with
 * expandable specs, dependency info, and approve/ask-for-edits/deny controls.
 * "Ask for edits" hands off feedback collection to the main chat input.
 */
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
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
	/** The underlying pending confirmation is gone (TTL prune, restart, cancel)
	 *  — render a terminal "expired" state with no actionable footer. */
	expired?: boolean;
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

const isExpanded = ref(!props.readOnly && !props.expired);

const titleKey = computed<BaseTextKey>(() => {
	if (props.expired) return 'instanceAi.planReview.titleExpired';
	if (isResolved.value || props.readOnly) return 'instanceAi.planReview.titleResolved';
	return 'instanceAi.planReview.title';
});

const showActions = computed(
	() =>
		reviewStatus.value === 'pending' &&
		!isResolved.value &&
		!props.readOnly &&
		!props.loading &&
		!props.expired &&
		props.plannedTasks.length > 0,
);

const showChangesRequested = computed(
	() => reviewStatus.value === 'changes-requested' && !props.expired,
);

const isShimmering = computed(() => Boolean(props.loading || props.updating));

function isVerificationTask(task: PlannedTaskArg): boolean {
	return task.kind === 'checkpoint' || task.title.toLowerCase().startsWith('verify ');
}

function isTaskExpandedByDefault(task: PlannedTaskArg): boolean {
	return !isVerificationTask(task);
}

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
			<div
				:class="[$style.header, !isExpanded && $style.headerCollapsed]"
				data-test-id="instance-ai-plan-review-header"
			>
				<span :class="$style.headerTitleGroup">
					<N8nText size="large">
						{{ i18n.baseText(titleKey) }}
					</N8nText>
					<N8nIcon
						icon="chevron-right"
						size="medium"
						:class="[$style.headerChevron, isExpanded && $style.headerChevronOpen]"
						data-test-id="instance-ai-plan-review-chevron"
					/>
				</span>
				<N8nText
					v-if="reviewStatus === 'denied'"
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
				<CollapsibleRoot
					v-for="(task, idx) in plannedTasks"
					v-slot="{ open: isTaskOpen }"
					:key="task.id"
					:class="$style.taskItem"
					:default-open="isTaskExpandedByDefault(task)"
				>
					<CollapsibleTrigger as-child>
						<button type="button" :class="$style.taskRow">
							<span :class="$style.taskNumber">{{ idx + 1 }}</span>
							<span :class="$style.taskTitleGroup">
								<N8nText bold size="large" :class="$style.taskTitle">{{ task.title }}</N8nText>
								<N8nIcon
									icon="chevron-right"
									size="medium"
									:class="[$style.taskChevron, isTaskOpen && $style.taskChevronOpen]"
								/>
							</span>
						</button>
					</CollapsibleTrigger>

					<AnimatedCollapsibleContent>
						<div v-if="task.spec" :class="$style.taskDetail">
							<N8nText tag="p" :class="$style.taskSpec">{{ getDescription(task) }}</N8nText>
						</div>
					</AnimatedCollapsibleContent>
				</CollapsibleRoot>
			</div>

			<ConfirmationFooter v-if="showActions" layout="row-between" bordered>
				<N8nButton
					variant="outline"
					size="medium"
					:disabled="disabled"
					data-test-id="instance-ai-plan-deny"
					@click="handleDeny"
				>
					{{ i18n.baseText('instanceAi.planReview.deny') }}
				</N8nButton>
				<div :class="$style.footerActions">
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
				</div>
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

			<!-- Expired hint replaces the approval footer once the underlying state is gone. -->
			<div v-else-if="props.expired" :class="$style.expiredHint">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.planReview.expiredHint') }}
				</N8nText>
			</div>
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

.expiredHint {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
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

.headerCollapsed {
	border-bottom: 0;
}

.headerTitleGroup {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.headerChevron {
	flex-shrink: 0;
	color: var(--text-color--subtle);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	transform-origin: center;
}

.headerChevronOpen {
	transform: rotate(90deg);
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
	padding-bottom: var(--spacing--xs);
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
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
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--sm) 0;
	border: 0;
	background: transparent;
	color: var(--text-color);
	text-align: left;
	cursor: pointer;
}

.taskNumber {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: light-dark(var(--color--neutral-100), var(--color--neutral-800));
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	flex-shrink: 0;
}

.taskTitle {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.taskTitleGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.taskChevron {
	flex-shrink: 0;
	color: var(--text-color--subtle);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	transform-origin: center;
}

.taskChevronOpen {
	transform: rotate(90deg);
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

@media (prefers-reduced-motion: reduce) {
	.headerChevron,
	.taskChevron {
		transition: none;
	}
}
</style>
