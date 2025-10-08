<script lang="ts" setup>
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import ProjectIcon from '@/components/Projects/ProjectIcon.vue';

interface Props {
	title: string;
	suffix?: string;
	suffixIcon?: IconOrEmoji;
	actionText?: string;

	// passed from CommandBarItem
	isSelected?: boolean;
	isHovered?: boolean;
}

defineProps<Props>();
</script>

<template>
	<span :class="$style.container">
		<span :class="$style.title">{{ title }}</span>
		<span v-if="suffix" :class="$style.suffix">
			<ProjectIcon v-if="suffixIcon" :icon="suffixIcon" size="mini" :border-less="true" />
			{{ suffix }}
		</span>
		<span v-if="actionText && (isSelected || isHovered)" :class="$style.action">{{
			actionText
		}}</span>
	</span>
</template>

<style lang="scss" module>
.container {
	display: flex;
	gap: var(--spacing-3xs);
	align-items: center;
	min-width: 0;
}

.title {
	color: var(--color-text-dark);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex-shrink: 1;
	min-width: 0;
}

.suffix {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	color: var(--color-text-light);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 50%;
}

.action {
	color: var(--color-text-light);
	margin-left: auto;
	flex-shrink: 0;
}
</style>
