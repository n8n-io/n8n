<script lang="ts" setup>
import { ref, computed, useCssModule } from 'vue';
import StatusBadge from './StatusBadge.vue';
import JsonViewer from './JsonViewer.vue';
import type { StepExecution } from '../stores/execution.store';

const props = withDefaults(
	defineProps<{
		step: StepExecution;
		isApprovalPending?: boolean;
		expanded?: boolean;
	}>(),
	{
		expanded: undefined,
	},
);

const emit = defineEmits<{
	approve: [stepId: string, approved: boolean];
	'update:expanded': [value: boolean];
}>();

const $style = useCssModule();
const internalExpanded = ref(false);

// Support both controlled (v-model:expanded) and uncontrolled usage
const expanded = computed({
	get() {
		return props.expanded !== undefined ? props.expanded : internalExpanded.value;
	},
	set(value: boolean) {
		internalExpanded.value = value;
		emit('update:expanded', value);
	},
});

const duration = computed(() => {
	if (props.step.durationMs === null || props.step.durationMs === undefined) return null;
	if (props.step.durationMs < 1000) return `${props.step.durationMs}ms`;
	if (props.step.durationMs < 60000) return `${(props.step.durationMs / 1000).toFixed(1)}s`;
	const mins = Math.floor(props.step.durationMs / 60000);
	const secs = ((props.step.durationMs % 60000) / 1000).toFixed(0);
	return `${mins}m ${secs}s`;
});

const stepTypeIcon = computed(() => {
	const icons: Record<string, string> = {
		trigger: '\u25B6',
		step: '\u25CB',
		condition: '\u25C7',
		approval: '\u2714',
	};
	return icons[props.step.stepType] ?? '\u25CB';
});

const cardClasses = computed(() => {
	return [
		$style.card,
		expanded.value ? $style.expanded : '',
		props.step.status === 'running' ? $style.running : '',
	];
});

function handleApprove(approved: boolean) {
	emit('approve', props.step.id, approved);
}
</script>

<template>
	<div :class="cardClasses" :data-step-id="step.stepId">
		<button :class="$style.header" @click="expanded = !expanded" type="button">
			<span :class="$style.icon">{{ stepTypeIcon }}</span>
			<div :class="$style.info">
				<span :class="$style.name">{{ step.stepId }}</span>
				<span :class="$style.type">{{ step.stepType }}</span>
			</div>
			<div :class="$style.meta">
				<StatusBadge :status="step.status" size="sm" />
				<span v-if="duration" :class="$style.duration">{{ duration }}</span>
				<span v-if="step.attempt > 1" :class="$style.attempt"> Attempt {{ step.attempt }} </span>
			</div>
			<span :class="[$style.chevron, expanded ? $style.chevronUp : '']"> &#9662; </span>
		</button>

		<div v-if="expanded" :class="$style.body">
			<!-- Approval actions -->
			<div v-if="step.status === 'waiting_approval'" :class="$style.approvalActions">
				<p :class="$style.approvalText">This step requires human approval to continue.</p>
				<div :class="$style.approvalButtons">
					<button :class="[$style.btn, $style.btnSuccess]" @click="handleApprove(true)">
						Approve
					</button>
					<button :class="[$style.btn, $style.btnDanger]" @click="handleApprove(false)">
						Decline
					</button>
				</div>
			</div>

			<!-- Error display -->
			<div v-if="step.error" :class="$style.section">
				<h4 :class="$style.sectionTitle">Error</h4>
				<div :class="$style.errorBox">
					<JsonViewer :data="step.error" max-height="200px" />
				</div>
			</div>

			<!-- Input -->
			<div v-if="step.input !== null && step.input !== undefined" :class="$style.section">
				<h4 :class="$style.sectionTitle">Input</h4>
				<JsonViewer :data="step.input" max-height="300px" />
			</div>

			<!-- Output -->
			<div v-if="step.output !== null && step.output !== undefined" :class="$style.section">
				<h4 :class="$style.sectionTitle">Output</h4>
				<JsonViewer :data="step.output" max-height="300px" />
			</div>

			<!-- Timing details -->
			<div :class="$style.timingRow">
				<span v-if="step.startedAt" :class="$style.timingItem">
					Started: {{ new Date(step.startedAt).toLocaleTimeString() }}
				</span>
				<span v-if="step.completedAt" :class="$style.timingItem">
					Completed: {{ new Date(step.completedAt).toLocaleTimeString() }}
				</span>
			</div>
		</div>
	</div>
</template>

<style module>
.card {
	border: 1px solid var(--color-border-light);
	border-radius: var(--radius-md);
	background: var(--color-bg);
	transition:
		border-color var(--transition-fast),
		box-shadow var(--transition-fast);
}

.card:hover {
	border-color: var(--color-border);
}

.expanded {
	border-color: var(--color-border);
	box-shadow: var(--shadow-sm);
}

@keyframes shimmer {
	0% {
		border-color: var(--color-warning-tint);
	}
	50% {
		border-color: var(--color-warning);
	}
	100% {
		border-color: var(--color-warning-tint);
	}
}

.running {
	animation: shimmer 2s ease-in-out infinite;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-md);
	width: 100%;
	border: none;
	background: none;
	cursor: pointer;
	text-align: left;
	font-family: inherit;
}

.icon {
	font-size: var(--font-size-lg);
	color: var(--color-text-lighter);
	width: 24px;
	text-align: center;
	flex-shrink: 0;
}

.info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
	min-width: 0;
}

.name {
	font-weight: var(--font-weight-semibold);
	font-size: var(--font-size-md);
	color: var(--color-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.type {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	text-transform: capitalize;
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	flex-shrink: 0;
}

.duration {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	font-family: var(--font-family-mono);
}

.attempt {
	font-size: var(--font-size-xs);
	color: var(--color-warning-shade);
	background: var(--color-warning-tint);
	padding: var(--spacing-3xs) var(--spacing-2xs);
	border-radius: var(--radius-sm);
}

.chevron {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	transition: transform var(--transition-fast);
	flex-shrink: 0;
}

.chevronUp {
	transform: rotate(180deg);
}

.body {
	padding: 0 var(--spacing-md) var(--spacing-md);
	border-top: 1px solid var(--color-border-light);
}

.section {
	margin-top: var(--spacing-sm);
}

.sectionTitle {
	font-size: var(--font-size-xs);
	font-weight: var(--font-weight-semibold);
	color: var(--color-text-lighter);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: var(--spacing-2xs);
}

.errorBox {
	border-left: 3px solid var(--color-danger);
	border-radius: var(--radius-sm);
}

.approvalActions {
	margin-top: var(--spacing-sm);
	padding: var(--spacing-md);
	background: var(--color-info-tint);
	border-radius: var(--radius-md);
	border: 1px solid var(--color-info);
}

.approvalText {
	font-size: var(--font-size-sm);
	color: var(--color-info-shade);
	margin-bottom: var(--spacing-sm);
}

.approvalButtons {
	display: flex;
	gap: var(--spacing-xs);
}

.btn {
	padding: var(--spacing-2xs) var(--spacing-md);
	border-radius: var(--radius-sm);
	border: none;
	font-size: var(--font-size-sm);
	font-weight: var(--font-weight-medium);
	cursor: pointer;
	transition: opacity var(--transition-fast);
}

.btn:hover {
	opacity: 0.85;
}

.btnSuccess {
	background: var(--color-success);
	color: white;
}

.btnDanger {
	background: var(--color-danger);
	color: white;
}

.timingRow {
	display: flex;
	gap: var(--spacing-md);
	margin-top: var(--spacing-sm);
	padding-top: var(--spacing-xs);
	border-top: 1px solid var(--color-border-light);
}

.timingItem {
	font-size: var(--font-size-xs);
	color: var(--color-text-lighter);
	font-family: var(--font-family-mono);
}
</style>
