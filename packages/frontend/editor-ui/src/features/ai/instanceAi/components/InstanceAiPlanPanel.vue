<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import type { PlanStep } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';

const emit = defineEmits<{ close: [] }>();
const i18n = useI18n();
const store = useInstanceAiStore();

const plan = computed(() => store.currentPlan);

const completedCount = computed(() => {
	if (!plan.value) return 0;
	return plan.value.steps.filter((s) => s.status === 'completed').length;
});

const statusIconMap: Record<
	PlanStep['status'],
	{ icon: string; spin: boolean; className: string }
> = {
	pending: { icon: 'circle', spin: false, className: 'pendingIcon' },
	in_progress: { icon: 'spinner', spin: true, className: 'inProgressIcon' },
	completed: { icon: 'check', spin: false, className: 'completedIcon' },
	failed: { icon: 'x', spin: false, className: 'failedIcon' },
	skipped: { icon: 'minus', spin: false, className: 'skippedIcon' },
};
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="list-checks" size="small" />
				<span>{{ i18n.baseText('instanceAi.planPanel.title') }}</span>
			</div>
			<N8nIconButton icon="x" variant="ghost" size="small" @click="emit('close')" />
		</div>

		<template v-if="plan">
			<!-- Goal -->
			<div :class="$style.goalSection">
				<span :class="$style.label">{{ i18n.baseText('instanceAi.planCard.goal') }}</span>
				<span :class="$style.goalText">{{ plan.goal }}</span>
			</div>

			<!-- Phase + progress -->
			<div :class="$style.metaRow">
				<span :class="$style.phaseBadge">{{ plan.currentPhase }}</span>
				<span :class="$style.iteration">
					{{ i18n.baseText('instanceAi.planCard.iteration') }}: {{ plan.iteration }}
				</span>
				<span :class="$style.progress">
					{{ completedCount }}/{{ plan.steps.length }} steps done
				</span>
			</div>

			<!-- Steps list -->
			<div :class="$style.stepList">
				<div
					v-for="(step, idx) in plan.steps"
					:key="idx"
					:class="[$style.step, step.status === 'skipped' ? $style.skippedStep : '']"
				>
					<N8nIcon
						:icon="statusIconMap[step.status].icon as IconName"
						:class="$style[statusIconMap[step.status].className]"
						:spin="statusIconMap[step.status].spin"
						size="small"
					/>
					<div :class="$style.stepContent">
						<div :class="$style.stepHeader">
							<span :class="$style.stepPhase">{{ step.phase }}</span>
							<span v-if="step.toolCallId" :class="$style.linkedBadge">linked</span>
						</div>
						<span :class="$style.stepDescription">{{ step.description }}</span>
						<span v-if="step.result" :class="$style.stepResult">{{ step.result }}</span>
					</div>
				</div>
			</div>
		</template>

		<div v-else :class="$style.emptyState">
			{{ i18n.baseText('instanceAi.planPanel.noPlan') }}
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 360px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 10;
	overflow-y: auto;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.goalSection {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.label {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	font-size: var(--font-size--3xs);
	margin-right: var(--spacing--4xs);
}

.goalText {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.metaRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.phaseBadge {
	display: inline-block;
	padding: 1px var(--spacing--3xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
	border-radius: var(--radius--sm);
}

.iteration {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}

.progress {
	margin-left: auto;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}

.stepList {
	padding: var(--spacing--2xs) var(--spacing--sm);
	flex: 1;
}

.step {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);

	& + & {
		border-top: 1px solid var(--color--foreground--tint-2);
	}
}

.skippedStep {
	text-decoration: line-through;
	opacity: 0.6;
}

.stepContent {
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
	flex: 1;
}

.stepHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.stepPhase {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
}

.linkedBadge {
	padding: 0 var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-family: monospace;
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	color: var(--color--text--tint-2);
}

.stepDescription {
	color: var(--color--text);
}

.stepResult {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	font-style: italic;
}

.pendingIcon {
	color: var(--color--text--tint-2);
}

.inProgressIcon {
	color: var(--color--primary);
}

.completedIcon {
	color: var(--color--success);
}

.failedIcon {
	color: var(--color--danger);
}

.skippedIcon {
	color: var(--color--text--tint-2);
}

.emptyState {
	padding: var(--spacing--lg) var(--spacing--sm);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}
</style>
