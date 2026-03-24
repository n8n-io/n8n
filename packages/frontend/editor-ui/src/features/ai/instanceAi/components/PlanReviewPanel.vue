<script lang="ts" setup>
/**
 * PlanReviewPanel.vue
 *
 * Standalone plan approval component for Instance AI. Shows the plan as a task
 * checklist with approve/request-changes controls. Renders inline in the chat
 * when the plan tool suspends for user review.
 */
import { ref, computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { TaskList } from '@n8n/api-types';
import TaskChecklist from './TaskChecklist.vue';

const props = defineProps<{
	tasks?: TaskList;
	message?: string;
	disabled?: boolean;
}>();

const i18n = useI18n();

const emit = defineEmits<{
	approve: [];
	'request-changes': [feedback: string];
}>();

const feedback = ref('');
const isResolved = ref(false);

const hasFeedback = computed(() => feedback.value.trim().length > 0);

function handleApprove() {
	if (isResolved.value) return;
	isResolved.value = true;
	emit('approve');
}

function handleRequestChanges() {
	if (isResolved.value || !hasFeedback.value) return;
	isResolved.value = true;
	emit('request-changes', feedback.value.trim());
}
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-plan-review">
		<!-- Task checklist -->
		<TaskChecklist v-if="props.tasks" :tasks="props.tasks" />

		<!-- Review section -->
		<div v-if="!isResolved" :class="$style.review">
			<div :class="$style.reviewHeader">
				<N8nIcon icon="circle-pause" size="small" :class="$style.headerIcon" />
				<span :class="$style.headerLabel">
					{{ i18n.baseText('instanceAi.planReview.title') }}
				</span>
				<span :class="$style.badge">
					{{ i18n.baseText('instanceAi.planReview.awaitingApproval') }}
				</span>
			</div>

			<p :class="$style.reviewMessage">
				{{ props.message ?? i18n.baseText('instanceAi.planReview.description') }}
			</p>

			<textarea
				v-model="feedback"
				:class="$style.feedbackTextarea"
				:placeholder="i18n.baseText('instanceAi.planReview.feedbackPlaceholder')"
				:disabled="disabled"
				rows="3"
			/>

			<div :class="$style.actions">
				<button
					:class="[$style.btn, $style.requestChangesBtn]"
					:disabled="disabled || !hasFeedback"
					data-test-id="instance-ai-plan-request-changes"
					@click="handleRequestChanges"
				>
					{{ i18n.baseText('instanceAi.planReview.requestChanges') }}
				</button>
				<button
					:class="[$style.btn, $style.approveBtn]"
					:disabled="disabled"
					data-test-id="instance-ai-plan-approve"
					@click="handleApprove"
				>
					{{ i18n.baseText('instanceAi.planReview.approve') }}
				</button>
			</div>
		</div>

		<!-- Resolved state -->
		<div v-else :class="$style.resolved">
			<N8nIcon icon="check" size="small" :class="$style.resolvedIcon" />
			<span>{{ i18n.baseText('instanceAi.planReview.approved') }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) 0;
}

.review {
	border: 1px solid var(--color--warning--tint-1);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	overflow: hidden;
}

.reviewHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--warning--tint-2);
}

.headerIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.headerLabel {
	font-weight: var(--font-weight--bold);
	flex: 1;
	min-width: 0;
}

.badge {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	white-space: nowrap;
}

.reviewMessage {
	padding: var(--spacing--2xs) var(--spacing--xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin: 0;
}

.feedbackTextarea {
	display: block;
	width: calc(100% - 2 * var(--spacing--xs));
	margin: var(--spacing--2xs) var(--spacing--xs);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	background: var(--color--background);
	color: var(--color--text);
	resize: vertical;
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-2);
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs) var(--spacing--xs);
}

.btn {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	border: var(--border);
	white-space: nowrap;

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.requestChangesBtn {
	background: var(--color--background);
	color: var(--color--danger);
	border-color: var(--color--danger);

	&:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color--danger) 10%, var(--color--background));
	}
}

.approveBtn {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}
}

.resolved {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--2xs);
	color: var(--color--success);
}

.resolvedIcon {
	color: var(--color--success);
}
</style>
