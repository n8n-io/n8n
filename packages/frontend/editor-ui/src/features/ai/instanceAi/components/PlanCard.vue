<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { planObjectSchema } from '@n8n/api-types';
import type { PlanObject, PlanStep } from '@n8n/api-types';

const props = defineProps<{
	result: unknown;
}>();

const i18n = useI18n();
const isExpanded = ref(false);

const plan = computed((): PlanObject | undefined => {
	const raw = props.result;
	if (!raw || typeof raw !== 'object') return undefined;

	const obj = raw as Record<string, unknown>;
	// The tool result wraps the plan in { plan, message }
	const planData = obj.plan ?? obj;
	const parsed = planObjectSchema.safeParse(planData);
	return parsed.success ? parsed.data : undefined;
});

const statusIconMap: Record<PlanStep['status'], { icon: IconName; className: string }> = {
	pending: { icon: 'circle', className: 'pendingIcon' },
	in_progress: { icon: 'circle', className: 'inProgressIcon' },
	completed: { icon: 'check', className: 'completedIcon' },
	failed: { icon: 'x', className: 'failedIcon' },
	skipped: { icon: 'minus', className: 'skippedIcon' },
};
</script>

<template>
	<div v-if="plan" :class="$style.root">
		<!-- Compact header: goal + phase badge + iteration -->
		<div :class="$style.header">
			<div :class="$style.goal">
				<span :class="$style.label">{{ i18n.baseText('instanceAi.planCard.goal') }}</span>
				<span>{{ plan.goal }}</span>
			</div>
			<div :class="$style.meta">
				<span :class="$style.phaseBadge">{{ plan.currentPhase }}</span>
				<span :class="$style.iteration">
					{{ i18n.baseText('instanceAi.planCard.iteration') }}: {{ plan.iteration }}
				</span>
			</div>
		</div>

		<!-- Steps (expandable) -->
		<CollapsibleRoot v-if="plan.steps.length > 0" v-model:open="isExpanded">
			<CollapsibleTrigger :class="$style.stepsTrigger">
				<span>{{ i18n.baseText('instanceAi.planCard.steps') }} ({{ plan.steps.length }})</span>
				<N8nIcon :icon="isExpanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ul :class="$style.stepList">
					<li
						v-for="(step, idx) in plan.steps"
						:key="idx"
						:class="[$style.step, step.status === 'skipped' ? $style.skippedStep : '']"
					>
						<N8nIcon
							:icon="statusIconMap[step.status].icon"
							:class="$style[statusIconMap[step.status].className]"
							:spin="step.status === 'in_progress'"
							size="small"
						/>
						<div :class="$style.stepContent">
							<span :class="$style.stepPhase">{{ step.phase }}</span>
							<span :class="$style.stepDescription">{{ step.description }}</span>
							<span v-if="step.result" :class="$style.stepResult">{{ step.result }}</span>
						</div>
					</li>
				</ul>
			</CollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background: var(--color--background);
}

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.goal {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	color: var(--color--text);
	margin-bottom: var(--spacing--4xs);
}

.label {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	font-size: var(--font-size--3xs);
	margin-right: var(--spacing--4xs);
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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

.stepsTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--xs);
	background: none;
	border: none;
	border-top: var(--border);
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.stepList {
	list-style: none;
	margin: 0;
	padding: 0 var(--spacing--xs) var(--spacing--2xs);
}

.step {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
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
}

.stepPhase {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
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
</style>
