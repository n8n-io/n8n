<script lang="ts" setup>
/* eslint-disable import/extensions, import/no-unresolved */
import type { IconSize, IconColor } from '@n8n/design-system/types/icon';

import N8nText from '../N8nText';

import IconLucideHouse from '~icons/lucide/house';
import IconLucidePlus from '~icons/lucide/plus';
import IconLucideShare from '~icons/lucide/share';
import IconLucideUserRound from '~icons/lucide/user-round';

const icons = {
	home: IconLucideHouse,
	plus: IconLucidePlus,
	user: IconLucideUserRound,
	share: IconLucideShare,
} as const;

export type IconName = keyof typeof icons;

interface IconProps {
	icon: IconName;
	size?: IconSize;
	spin?: boolean;
	color?: IconColor;
}

defineOptions({ name: 'N8nIcon' });

const props = withDefaults(defineProps<IconProps>(), {
	size: 'medium',
	spin: false,
});
</script>

<template>
	<N8nText class="n8n-icon" :size="size" :color="color" :compact="true">
		<Component v-if="icons[icon]" :is="icons[icon]" :spin="spin" />
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
