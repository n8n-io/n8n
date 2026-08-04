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

/* The blurred mixins carry their own reduced-motion overrides, and because
 * they're included here — after .content's rules in the cascade — they win at
 * equal specificity in both directions (motion on, motion off). */
.blurred {
	&[data-state='open'] {
		@include motion.collapsible-slide-down-blurred;
	}

	&[data-state='closed'] {
		@include motion.collapsible-slide-up-blurred;
	}
}
</style>
