<script lang="ts" setup>
import type { IconSize, IconColor } from '@n8n/design-system/types/icon';

import type { IconName } from './icons';
import { fontAwesomeIcons, customIcons } from './icons';
import N8nText from '../N8nText';

interface IconProps {
	icon: IconName;
	size?: IconSize;
	spin?: boolean;
	color?: IconColor;
}

defineOptions({ name: 'N8nIcon' });

withDefaults(defineProps<IconProps>(), {
	spin: false,
	size: undefined,
	color: undefined,
});
</script>

<template>
	<N8nText
		class="n8n-icon"
		:data-icon="icon"
		:size="size"
		:color="color"
		:compact="true"
		:class="{ [$style[size]]: true, [$style.spin]: spin }"
	>
		<Component :is="fontAwesomeIcons[icon]" v-if="fontAwesomeIcons[icon]" :spin="spin" />
		<!-- height and width as to match Lucide icons  -->
		<Component
			:is="customIcons[icon]"
			v-else-if="customIcons[icon]"
			aria-hidden="true"
			focusable="false"
			role="img"
			width="1.2em"
			height="1.2em"
		/>
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

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
