<script setup lang="ts">
import { useSlots } from 'vue';
import { archetypeSections } from './archetypeSections';

const slots = useSlots();
</script>

<template>
	<section :class="$style.storyboard" role="region" aria-label="Adaptive storyboard">
		<div :class="$style.chapters">
			<article
				v-for="(section, index) in archetypeSections(slots.default?.())"
				:key="index"
				:class="$style.chapter"
				data-test-id="storyboard-chapter"
			>
				<component :is="section" />
			</article>
		</div>
	</section>
</template>

<style lang="scss" module>
.storyboard {
	min-width: 0;
}

.chapters {
	display: grid;
	gap: var(--spacing--md);
	min-width: 0;
}

.chapter {
	position: relative;
	min-width: 0;
	padding: var(--spacing--md) var(--spacing--md) var(--spacing--md) var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: inset var(--focus--border-width) 0 0 var(--border-color--stronger);
}

.chapter:first-child {
	box-shadow: inset var(--focus--border-width) 0 0
		light-dark(var(--color--green-600), var(--color--green-500));
}

.chapter:nth-child(2) {
	box-shadow: inset var(--focus--border-width) 0 0
		light-dark(var(--color--orange-600), var(--color--orange-500));
}

.chapter + .chapter::before {
	position: absolute;
	top: calc(var(--spacing--md) * -1);
	left: var(--spacing--xl);
	width: var(--spacing--sm);
	height: var(--spacing--md);
	border-bottom: var(--border);
	border-left: var(--border);
	border-radius: 0 0 0 var(--radius--md);
	content: '';
}

@media (max-width: 640px) {
	.chapter {
		padding-left: var(--spacing--md);
	}
}
</style>
