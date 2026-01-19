<script setup lang="ts">
/**
 * PlanDisplayMessage.vue
 *
 * Displays the generated workflow plan with summary, trigger, steps,
 * and an "Implement the plan" button.
 */
import { N8nButton, N8nText, N8nIcon } from '@n8n/design-system';
import type { PlanMode } from '../../assistant.types';

interface Props {
	plan: PlanMode.PlanOutput;
	disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	implement: [];
}>();

function onImplement() {
	emit('implement');
}
</script>

<template>
	<div :class="$style.container">
		<!-- Summary -->
		<div :class="$style.section">
			<N8nText tag="h4" :class="$style.sectionTitle">Summary</N8nText>
			<N8nText :class="$style.summary">{{ plan.summary }}</N8nText>
		</div>

		<!-- Trigger -->
		<div :class="$style.section">
			<N8nText tag="h4" :class="$style.sectionTitle">
				<N8nIcon icon="zap" size="small" :class="$style.triggerIcon" />
				Trigger
			</N8nText>
			<N8nText :class="$style.trigger">{{ plan.trigger }}</N8nText>
		</div>

		<!-- Steps -->
		<div :class="$style.section">
			<N8nText tag="h4" :class="$style.sectionTitle">Steps</N8nText>
			<ol :class="$style.stepsList">
				<li v-for="(step, index) in plan.steps" :key="index" :class="$style.step">
					<N8nText :class="$style.stepDescription">{{ step.description }}</N8nText>

					<!-- Sub-steps -->
					<ul v-if="step.subSteps && step.subSteps.length > 0" :class="$style.subSteps">
						<li v-for="(subStep, subIndex) in step.subSteps" :key="subIndex">
							<N8nText size="small" color="text-light">{{ subStep }}</N8nText>
						</li>
					</ul>

					<!-- Suggested nodes -->
					<div
						v-if="step.suggestedNodes && step.suggestedNodes.length > 0"
						:class="$style.suggestedNodes"
					>
						<span v-for="node in step.suggestedNodes" :key="node" :class="$style.nodeTag">
							{{ node }}
						</span>
					</div>
				</li>
			</ol>
		</div>

		<!-- Additional specs -->
		<div v-if="plan.additionalSpecs && plan.additionalSpecs.length > 0" :class="$style.section">
			<N8nText tag="h4" :class="$style.sectionTitle">Additional Notes</N8nText>
			<ul :class="$style.specsList">
				<li v-for="(spec, index) in plan.additionalSpecs" :key="index">
					<N8nText size="small" color="text-light">{{ spec }}</N8nText>
				</li>
			</ul>
		</div>

		<!-- Implement button -->
		<div :class="$style.actions">
			<N8nButton type="primary" size="medium" :disabled="disabled" @click="onImplement">
				<N8nIcon icon="play" size="small" />
				Implement the plan
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	margin: var(--spacing--xs) 0;
}

.section {
	margin-bottom: var(--spacing--sm);

	&:last-of-type {
		margin-bottom: var(--spacing--md);
	}
}

.sectionTitle {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--sm);
	margin-bottom: var(--spacing--2xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.triggerIcon {
	color: var(--color--warning);
}

.summary {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.trigger {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	padding: var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.stepsList {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style-type: decimal;
}

.step {
	margin-bottom: var(--spacing--xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.stepDescription {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.subSteps {
	margin: var(--spacing--3xs) 0 0 var(--spacing--sm);
	padding-left: var(--spacing--xs);
	list-style-type: disc;

	li {
		margin-bottom: var(--spacing--4xs);
	}
}

.suggestedNodes {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
}

.nodeTag {
	font-size: var(--font-size--2xs);
	background-color: var(--color--primary--tint-3);
	color: var(--color--primary--shade-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.specsList {
	margin: 0;
	padding-left: var(--spacing--sm);
	list-style-type: disc;

	li {
		margin-bottom: var(--spacing--4xs);
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
}
</style>
