<script setup lang="ts">
import { computed } from 'vue';
import { signpostLabels, type SignpostRole } from '../signposts';

const props = defineProps<{
	role: SignpostRole;
	title?: string | null;
}>();

const label = computed(() => signpostLabels[props.role]);
</script>

<template>
	<section :class="[$style.lane, $style[role]]" data-test-id="flow-lane" :data-role="role">
		<header :class="$style.header">
			<span :class="$style.signpost" data-test-id="lane-signpost">{{ label }}</span>
			<h3 v-if="title" :class="$style.title">{{ title }}</h3>
		</header>
		<div v-if="$slots.default" :class="$style.content"><slot /></div>
	</section>
</template>

<style lang="scss" module>
.lane {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md);
}

.comesIn {
	border-left: var(--spacing--4xs) solid
		light-dark(var(--color--green-600), var(--color--green-500));
}

.works {
	border-left: var(--spacing--4xs) solid
		light-dark(var(--color--orange-600), var(--color--orange-500));
}

.goesOut {
	border-left: var(--spacing--4xs) solid light-dark(var(--color--blue-600), var(--color--blue-500));
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.signpost {
	align-self: flex-start;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
	background: var(--background--subtle);
	border-radius: var(--radius--full);
}

.title {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
