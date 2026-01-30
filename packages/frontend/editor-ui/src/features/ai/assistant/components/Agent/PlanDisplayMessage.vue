<script setup lang="ts">
/**
 * PlanDisplayMessage.vue
 *
 * Displays the generated workflow plan with summary, trigger, steps,
 * and an "Implement the plan" button.
 */
import { N8nButton, N8nText } from '@n8n/design-system';
import type { PlanMode } from '../../assistant.types';

interface Props {
	plan: PlanMode.PlanOutput;
	disabled?: boolean;
	showImplementButton?: boolean;
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
		<!-- Summary (bold, no header) -->
		<N8nText size="medium" tag="p" :bold="true" :class="$style.summary">{{ plan.summary }}</N8nText>

		<!-- Trigger -->
		<div :class="$style.triggerSection">
			<N8nText size="medium" :bold="true" :class="$style.triggerLabel">
				Trigger: <span :class="$style.triggerText">{{ plan.trigger }}</span>
			</N8nText>
		</div>

		<!-- Steps -->
		<div :class="$style.stepsSection">
			<N8nText size="medium" :bold="true">Steps:</N8nText>
			<ol :class="$style.stepsList">
				<li v-for="(step, index) in plan.steps" :key="index" :class="$style.step">
					<span :class="$style.stepDescription">{{ step.description }}</span>

					<!-- Sub-steps (compact) -->
					<ul v-if="step.subSteps && step.subSteps.length > 0" :class="$style.subSteps">
						<li v-for="(subStep, subIndex) in step.subSteps" :key="subIndex">
							{{ subStep }}
						</li>
					</ul>
				</li>
			</ol>
		</div>

		<!-- Additional specs -->
		<div
			v-if="plan.additionalSpecs && plan.additionalSpecs.length > 0"
			:class="$style.specsSection"
		>
			<N8nText size="medium" :bold="true" :class="$style.specsTitle">Additional Notes</N8nText>
			<ul :class="$style.specsList">
				<li v-for="(spec, index) in plan.additionalSpecs" :key="index">
					{{ spec }}
				</li>
			</ul>
		</div>

		<!-- Implement button (only shown when plan is the last message) -->
		<div v-if="showImplementButton" :class="$style.actions">
			<N8nButton type="primary" size="medium" :disabled="disabled" @click="onImplement">
				Implement the plan
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--2xs) 0;
	font-size: var(--font-size--sm);
}

.summary {
	line-height: var(--line-height--xl);
	margin-bottom: var(--spacing--sm);
}

.triggerSection {
	margin-bottom: var(--spacing--sm);
}

.triggerLabel {
	margin-bottom: var(--spacing--4xs);
}

.triggerText {
	font-weight: normal;
}

.triggerIcon {
	color: var(--color--warning);
}

.stepsSection {
	margin-bottom: var(--spacing--sm);
}

.stepsList {
	margin: var(--spacing--3xs) 0 0;
	padding-left: var(--spacing--md);
	list-style-type: decimal;
	line-height: var(--line-height--xl);
}

.step {
	margin-bottom: var(--spacing--3xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.subSteps {
	margin: var(--spacing--4xs) 0 var(--spacing--2xs);
	padding-left: var(--spacing--sm);
	list-style-type: disc;
	line-height: var(--line-height--lg);

	li {
		margin-bottom: var(--spacing--5xs);
	}
}

.specsSection {
	margin-bottom: var(--spacing--sm);
}

.specsList {
	margin: var(--spacing--3xs) 0 0;
	padding-left: var(--spacing--md);
	list-style-type: disc;
	line-height: var(--line-height--lg);

	li {
		margin-bottom: var(--spacing--5xs);
	}
}

.actions {
	margin-top: var(--spacing--xs);
}
</style>
