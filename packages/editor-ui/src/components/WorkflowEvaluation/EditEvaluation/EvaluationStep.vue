<script setup lang="ts">
interface EvaluationStep {
	title: string;
	warning?: boolean;
	small?: boolean;
}

withDefaults(defineProps<EvaluationStep>(), {
	description: '',
	warning: false,
	small: false,
});
</script>
<template>
	<div :class="[$style.workflowStep, small && $style.small]">
		<div :class="$style.content">
			<div :class="$style.header">
				<div :class="[$style.icon, warning && $style.warning]">
					<slot name="icon" />
				</div>
				<h3 :class="$style.title">{{ title }}</h3>
				<span v-if="warning" :class="$style.warningIcon">⚠</span>
			</div>
			<div :class="$style.cardContent">
				<slot name="cardContent" />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.workflowStep {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: var(--spacing-m);
	background: var(--color-background-light);
	padding: var(--spacing-s);
	border-radius: var(--border-radius-xlarge);
	box-shadow: var(--box-shadow-base);
	border: var(--border-base);
	width: fit-content;
	color: var(--color-text-dark);
	max-width: 100%;
	&.small {
		width: 80%;
	}
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius-small);
	background-color: var(--color-background-light);

	&.warning {
		background-color: var(--color-warning-tint-2);
	}
}

.content {
	display: grid;
	gap: var(--spacing-2xs);
}

.header {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
}

.title {
	font-weight: var(--font-weight-regular);
	font-size: var(--font-size-2xs);
}

.warningIcon {
	color: var(--color-warning);
}

.cardContent {
	font-size: var(--font-size-s);
	margin-top: var(--spacing-xs);
}
</style>
