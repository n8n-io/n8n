<script setup lang="ts">
const props = defineProps<{
	current: number;
	total: number;
}>();

const steps = Array.from({ length: props.total }, (_, i) => i + 1);
</script>

<template>
	<div :class="$style.bar" data-test-id="mfa-wizard-steps">
		<div
			v-for="step in steps"
			:key="step"
			:class="[
				$style.segment,
				{
					[$style.done]: step < current,
					[$style.active]: step === current,
				},
			]"
		/>
	</div>
</template>

<style module lang="scss">
.bar {
	display: flex;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--md);
}

.segment {
	height: var(--spacing--5xs);
	flex: 1;
	border-radius: var(--radius--4xs);
	background: var(--color--foreground--tint-2);
}

.done {
	background: var(--color--primary);
}

.active {
	background: var(--color--primary);
	opacity: 0.5;
}
</style>
