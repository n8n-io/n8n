<script setup lang="ts">
import { useSlots } from 'vue';
import { archetypeSections } from './archetypeSections';

const slots = useSlots();
</script>

<template>
	<section :class="$style.board" role="region" aria-label="Outcome board">
		<div :class="$style.panels">
			<article
				v-for="(section, index) in archetypeSections(slots.default?.())"
				:key="index"
				:class="$style.panel"
				data-test-id="outcome-panel"
			>
				<component :is="section" />
			</article>
		</div>
	</section>
</template>

<style lang="scss" module>
.board {
	min-width: 0;
}

.panels {
	display: grid;
	grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
	gap: var(--spacing--sm);
	align-items: stretch;
	min-width: 0;
}

.panel {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--lg);
	border-radius: var(--radius--xl);
	background: light-dark(var(--color--neutral-800), var(--color--neutral-900));
	color: var(--color--neutral-100);

	--text-color: var(--color--neutral-100);
	--text-color--subtle: var(--color--neutral-300);
	--text-color--subtler: var(--color--neutral-400);
	--border-color: var(--color--white-alpha-200);
	--background--surface: var(--color--white-alpha-100);
	--background--subtle: var(--color--white-alpha-100);
}

.panel:first-child {
	/* Height comes from the two panels it spans, so sparse content must not sink out of view. */
	justify-content: flex-start;
	grid-row: span 2;
	min-height: calc(var(--height--5xl) * 3);
	background: light-dark(var(--color--blue-900), var(--color--blue-800));
}

.panel:nth-child(2) {
	background: light-dark(var(--color--purple-900), var(--color--purple-800));
}

.panel:nth-child(3) {
	background: light-dark(var(--color--orange-900), var(--color--orange-800));
}

.panel:nth-child(n + 4) {
	grid-column: 1 / -1;
	padding: var(--spacing--md) var(--spacing--lg);
}

@media (max-width: 720px) {
	.panels {
		grid-template-columns: minmax(0, 1fr);
	}

	.panel:first-child {
		grid-row: auto;
		min-height: 0;
	}

	.panel:nth-child(n + 4) {
		grid-column: auto;
	}
}
</style>
