<script lang="ts" setup>
/**
 * PlanReviewPanel.vue
 *
 * Single-card plan approval UI. Shows planned tasks as an accordion with
 * expandable specs, dependency info, and approve/request-changes controls.
 */
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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

const props = defineProps<{
	plannedTasks: PlannedTaskArg[];
	message?: string;
	disabled?: boolean;
	readOnly?: boolean;
	loading?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{
	approve: [];
	'request-changes': [feedback: string];
}>();

const feedback = ref('');
const isResolved = ref(false);
const resolvedAction = ref<'approved' | 'changes-requested' | null>(null);

const hasFeedback = computed(() => feedback.value.trim().length > 0);
const isExpanded = ref(!props.readOnly);

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

function handleRequestChanges() {
	if (isResolved.value || !hasFeedback.value) return;
	isResolved.value = true;
	resolvedAction.value = 'changes-requested';
	emit('request-changes', feedback.value.trim());
}
</script>

<template>
	<CollapsibleRoot
		v-model:open="isExpanded"
		:class="$style.root"
		data-test-id="instance-ai-plan-review"
	>
		<CollapsibleTrigger as-child>
			<!-- Header -->
			<div :class="$style.header">
				<N8nText bold>
					{{ i18n.baseText('instanceAi.planReview.title') }}
				</N8nText>
			</div>
		</CollapsibleTrigger>

		<AnimatedCollapsibleContent>
			<div :class="$style.tasks">
				<div v-for="(task, idx) in plannedTasks" :key="task.id" :class="$style.taskItem">
					<div :class="$style.taskRow">
						<span :class="$style.taskNumber">{{ idx + 1 }}</span>
						<N8nText :class="$style.taskTitle">{{ task.title }}</N8nText>
					</div>

					<div v-if="task.spec" :class="$style.taskDetail">
						<N8nText tag="p" color="text-light" :class="$style.taskSpec">{{
							getDescription(task)
						}}</N8nText>
					</div>
				</div>
			</div>

			<!-- Approval footer (hidden during loading and after resolution) -->
			<ConfirmationFooter v-if="!isResolved && !props.readOnly && !props.loading" layout="column">
				<N8nInput
					v-model="feedback"
					type="textarea"
					:placeholder="i18n.baseText('instanceAi.planReview.feedbackPlaceholder')"
					:disabled="disabled"
					:rows="2"
				/>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="medium"
						:disabled="disabled || !hasFeedback"
						data-test-id="instance-ai-plan-request-changes"
						@click="handleRequestChanges"
					>
						{{ i18n.baseText('instanceAi.planReview.requestChanges') }}
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
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
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

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
