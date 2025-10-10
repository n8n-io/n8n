<script lang="ts" setup>
import { computed } from 'vue';

import N8nNodeIcon from '.';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import { isSupportedIconName } from '../N8nIcon/icons';

type IconType = 'file' | 'icon' | 'unknown';

interface IconContentProps {
	type: IconType;
	src?: string;
	name?: string;
	nodeTypeName?: string;
	size?: number;
	badge?: { src: string; type: IconType };
}

const props = defineProps<IconContentProps>();

const badgeSize = computed((): number => {
	switch (props.size) {
		case 40:
			return 18;
		case 24:
			return 10;
		case 18:
		default:
			return 12;
	}
});

const fontStyleData = computed((): Record<string, string> => {
	if (!props.size) {
		return {};
	}

	return {
		'max-width': `${props.size}px`,
	};
});

const badgeStyleData = computed((): Record<string, string> => {
	const size = badgeSize.value;
	return {
		padding: `${Math.floor(size / 4)}px`,
		right: `-${Math.floor(size / 2)}px`,
		bottom: `-${Math.floor(size / 2)}px`,
	};
});

const supportedIconName = computed((): IconName | undefined => {
	return isSupportedIconName(props.name) ? props.name : undefined;
});
</script>

<template>
	<div v-if="type !== 'unknown'" :class="$style.icon">
		<img v-if="type === 'file'" :src="src" :class="$style.nodeIconImage" />
		<N8nIcon v-else-if="supportedIconName" :icon="supportedIconName" :style="fontStyleData" />
		<div v-else :class="$style.nodeIconPlaceholder">
			{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
		</div>

		<!-- Badge icon, for example used for HTTP based nodes -->
		<div v-if="badge" :class="$style.badge" :style="badgeStyleData">
			<N8nNodeIcon :type="badge.type" :src="badge.src" :size="badgeSize" />
		</div>
	</div>
	<div v-else :class="$style.nodeIconPlaceholder">
		{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
	</div>
</template>

<style lang="scss" module>
.icon {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;

	svg {
		max-width: 100%;
		max-height: 100%;
	}

	img,
	svg {
		pointer-events: none;
	}
}

.nodeIconPlaceholder {
	text-align: center;
}

.nodeIconImage {
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
}

.badge {
	position: absolute;
	background: var(--color-background-node-icon-badge, var(--color--background));
	border-radius: 50%;
}
</style>
