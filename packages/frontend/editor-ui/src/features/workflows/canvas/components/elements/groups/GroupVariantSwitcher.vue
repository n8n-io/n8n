<script setup lang="ts">
// PROTOTYPE-ONLY: a discreet on-canvas control to flip between collapsed
// group-card variants during a usability session. Not for production.
import { useGroupCardVariant } from '../nodes/render-types/group-card-variants/useGroupCardVariant';

const { variants, activeVariantId, setVariant } = useGroupCardVariant();
</script>

<template>
	<div :class="$style.switcher" data-test-id="group-variant-switcher">
		<button
			v-for="variant in variants"
			:key="variant.id"
			type="button"
			:class="[$style.option, { [$style.active]: variant.id === activeVariantId }]"
			:aria-pressed="variant.id === activeVariantId"
			:data-test-id="`group-variant-option-${variant.id}`"
			@click="setVariant(variant.id)"
		>
			{{ variant.label }}
		</button>
	</div>
</template>

<style lang="scss" module>
.switcher {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--sm);
}

.option {
	border: none;
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	transition:
		background-color 0.1s ease-in,
		color 0.1s ease-in;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.active {
	background: var(--color--primary);
	color: var(--color--neutral-white);

	&:hover {
		background: var(--color--primary);
	}
}
</style>
