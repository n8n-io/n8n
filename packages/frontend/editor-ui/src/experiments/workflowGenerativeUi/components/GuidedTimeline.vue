<script setup lang="ts">
import { useSlots } from 'vue';
import { archetypeSections } from './archetypeSections';

const slots = useSlots();

function ordinal(index: number): string {
	return String(index + 1).padStart(2, '0');
}
</script>

<template>
	<section :class="$style.timeline" role="region" aria-label="Guided timeline">
		<ol :class="$style.rail">
			<li
				v-for="(section, index) in archetypeSections(slots.default?.())"
				:key="index"
				:class="$style.stop"
				data-test-id="timeline-stop"
			>
				<span :class="$style.ordinal" data-test-id="archetype-ordinal">{{ ordinal(index) }}</span>
				<div :class="$style.body"><component :is="section" /></div>
			</li>
		</ol>
	</section>
</template>

<style lang="scss" module>
.timeline {
	min-width: 0;
}

.rail {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	margin: 0;
	padding: 0 0 0 var(--spacing--xl);
	list-style: none;
}

.rail::before {
	position: absolute;
	top: var(--spacing--md);
	bottom: var(--spacing--md);
	left: var(--spacing--2xs);
	width: var(--focus--border-width);
	background: var(--border-color--strong);
	content: '';
}

.stop {
	position: relative;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: var(--spacing--sm);
	align-items: start;
	min-width: 0;
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.stop::before {
	position: absolute;
	top: var(--spacing--md);
	left: calc(var(--spacing--2xs) - var(--spacing--xl));
	width: var(--spacing--xs);
	aspect-ratio: 1;
	border-radius: var(--radius--full);
	background: var(--background--surface);
	box-shadow: 0 0 0 var(--focus--border-width) var(--border-color--stronger);
	content: '';
	transform: translateX(-25%);
}

.stop:first-child::before {
	box-shadow: 0 0 0 var(--focus--border-width)
		light-dark(var(--color--green-600), var(--color--green-500));
}

.stop:nth-child(2)::before {
	box-shadow: 0 0 0 var(--focus--border-width)
		light-dark(var(--color--orange-600), var(--color--orange-500));
}

.stop:nth-child(3)::before {
	box-shadow: 0 0 0 var(--focus--border-width)
		light-dark(var(--color--blue-600), var(--color--blue-500));
}

.ordinal {
	display: grid;
	place-items: center;
	min-width: var(--spacing--lg);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--md);
	background: var(--background--subtle);
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wider);
}

.body {
	min-width: 0;
}
</style>
