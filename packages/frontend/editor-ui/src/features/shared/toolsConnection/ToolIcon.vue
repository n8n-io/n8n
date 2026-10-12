<script setup lang="ts">
import { N8nIcon, N8nNodeIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { ToolIconSource } from './types';

withDefaults(
	defineProps<{
		source?: ToolIconSource | null;
		fallbackIcon?: IconName;
	}>(),
	{ source: null, fallbackIcon: 'toolbox' },
);

const INNER_SIZE = 20;
</script>

<template>
	<span :class="$style.wrapper" aria-hidden="true">
		<N8nNodeIcon
			v-if="source"
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
