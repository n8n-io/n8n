<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

defineProps<{
	stepNumber: number;
	isCompleted: boolean;
	isActive?: boolean;
}>();
</script>

<template>
	<div
		:class="[
			$style.stepIndicator,
			isCompleted && $style.completed,
			isActive && $style.active,
			!isActive && !isCompleted && $style.inactive,
		]"
	>
		<template v-if="isCompleted">
			<N8nIcon icon="check" size="xsmall" />
		</template>
		<template v-else>
			{{ stepNumber }}
		</template>
	</div>
</template>

<style module lang="scss">
.stepIndicator {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px solid var(--color--text--tint-1);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	flex-shrink: 0;
	transition: all 0.2s ease;

	&.active {
		border-color: var(--color--primary);
		color: var(--color--text--shade-1);
	}

	&.completed {
		background-color: var(--color--success);
		border-color: var(--color--success);
		color: var(--prim-color-white);
	}

	&.inactive {
		color: var(--color--text--tint-1);
		border-color: var(--color--text);
		opacity: 0.7;
	}
}
</style>
