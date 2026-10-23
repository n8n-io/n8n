<script setup lang="ts">
import { inject } from 'vue';
import { N8nIcon, N8nNodeIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { TOOL_ICON_AVATAR_RENDERER_KEY, type ToolIconSource } from './types';

withDefaults(
	defineProps<{
		source?: ToolIconSource | null;
		fallbackIcon?: IconName;
	}>(),
	{ source: null, fallbackIcon: 'toolbox' },
);

const avatarRenderer = inject(TOOL_ICON_AVATAR_RENDERER_KEY, null);

const INNER_SIZE = 20;
const AVATAR_SIZE = 40;
</script>

<template>
	<component
		:is="avatarRenderer"
		v-if="source?.type === 'avatar' && avatarRenderer"
		:personalisation="source.personalisation"
		:size="AVATAR_SIZE"
	/>
	<span v-else :class="$style.wrapper" aria-hidden="true">
		<N8nNodeIcon
			v-if="source && source.type !== 'avatar'"
			:type="source.type"
			:src="source.type === 'file' ? source.src : undefined"
			:name="source.type === 'icon' ? source.name : undefined"
			:color="source.type === 'icon' ? source.color : undefined"
			:size="INNER_SIZE"
		/>
		<N8nIcon v-else :icon="fallbackIcon" :size="INNER_SIZE" :class="$style.fallback" />
	</span>
</template>

<style lang="scss" module>
.wrapper {
	flex-shrink: 0;
	width: 40px;
	height: 40px;
	border-radius: 50%;
	background: var(--color--background--light-1);
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.fallback {
	color: var(--color--text--tint-1);
}
</style>
