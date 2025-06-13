<script lang="ts" setup>
import type { IconSize, IconColor } from '@n8n/design-system/types/icon';

import type { IconName } from './icons';
import { icons } from './icons';
import N8nText from '../N8nText';

interface IconProps {
	icon: IconName;
	size?: IconSize;
	spin?: boolean;
	color?: IconColor;
}

defineOptions({ name: 'N8nIcon' });

withDefaults(defineProps<IconProps>(), {
	// todo fix sizes
	size: 'medium',
	// todo fix spin
	spin: false,
});
</script>

<template>
	<N8nText class="n8n-icon" :size="size" :color="color" :compact="true" :class="$style[size]">
		<Component :is="icons[icon]" v-if="icons[icon]" :spin="spin" />
		<span v-else>[{{ icon }}]</span>
	</N8nText>
</template>

<style>
.n8n-icon {
	display: inline-flex;
	justify-content: center;
	align-items: center;
}
</style>

<style lang="scss" module>
.xlarge {
	width: var(--font-size-xl) !important;
}
.large {
	width: var(--font-size-m) !important;
}
.medium {
	width: var(--font-size-s) !important;
}
.small {
	width: var(--font-size-2xs) !important;
}
.xsmall {
	width: var(--font-size-3xs) !important;
}
</style>
