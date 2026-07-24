<script lang="ts" setup>
import { CollapsibleContent } from 'reka-ui';

/**
 * When set, the height slide is paired with an opacity fade and a subtle blur
 * that mimics motion blur — the same motion as N8nSettingsRow's expand region.
 */
withDefaults(defineProps<{ blur?: boolean }>(), { blur: false });
</script>

<template>
	<CollapsibleContent :class="[$style.content, blur && $style.blurred]">
		<slot />
	</CollapsibleContent>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

// The blurred variant matches N8nSettingsRow's expand motion. No DS duration
// token equals 350ms (snappy=200, base=400) and the curve has no token either,
// so both live here as local constants per the motion spec (see SettingsRow.vue).
$blurred-duration: 350ms;
$blurred-easing: cubic-bezier(0.32, 0.72, 0, 1);

.content {
	overflow: hidden;

	&[data-state='open'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-down;
	}

	&[data-state='closed'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-up;
	}
}

.blurred {
	&[data-state='open'] {
		animation: collapsibleSlideDownBlurred $blurred-duration $blurred-easing;
	}

	&[data-state='closed'] {
		animation: collapsibleSlideUpBlurred $blurred-duration $blurred-easing;
	}

	/* Must live here: the mixins' own reduced-motion rules are emitted earlier
	 * in the file, so these later, equal-specificity rules would re-enable the
	 * animation without an override of their own. */
	@media (prefers-reduced-motion: reduce) {
		&[data-state='open'],
		&[data-state='closed'] {
			animation: none;
		}
	}
}

/* The filter only exists inside the keyframes: once the animation finishes the
 * element returns to its unfiltered base styles, so no stacking context (or
 * compositing surface) stays active on open content. */
@keyframes collapsibleSlideDownBlurred {
	from {
		height: 0;
		opacity: 0;
		filter: blur(4px);
	}
	to {
		height: var(--reka-collapsible-content-height);
		opacity: 1;
		filter: blur(0);
	}
}

@keyframes collapsibleSlideUpBlurred {
	from {
		height: var(--reka-collapsible-content-height);
		opacity: 1;
		filter: blur(0);
	}
	to {
		height: 0;
		opacity: 0;
		filter: blur(4px);
	}
}
</style>
