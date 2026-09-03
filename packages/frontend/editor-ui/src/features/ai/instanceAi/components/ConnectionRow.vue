<script lang="ts" setup>
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import ToolIcon from '@/features/shared/toolsConnection/ToolIcon.vue';
import type { ToolIconSource } from '@/features/shared/toolsConnection/types';

export type ConnectionRowIcon = IconName | ToolIconSource;

const props = withDefaults(
	defineProps<{
		name: string;
		subtitle: string;
		icon: ConnectionRowIcon;
		clickable?: boolean;
	}>(),
	{ clickable: true },
);

const iconSource = computed<ToolIconSource>(() => {
	if (typeof props.icon === 'string') {
		return { type: 'icon', name: props.icon, color: 'var(--color--text)' };
	}
	return props.icon.type === 'icon' && !props.icon.color
		? { ...props.icon, color: 'var(--color--text)' }
		: props.icon;
});

const emit = defineEmits<{
	openSettings: [];
}>();

function handleRowClick() {
	if (!props.clickable) return;
	emit('openSettings');
}
</script>

<template>
	<div
		:class="[$style.row, !clickable && $style.rowStatic]"
		@click="handleRowClick"
		role="button"
		tabindex="0"
		@keydown.enter.self="handleRowClick"
		@keydown.space.self.prevent="handleRowClick"
	>
		<ToolIcon :source="iconSource" />
		<div :class="$style.labels">
			<N8nText bold size="medium" :class="$style.name">{{ name }}</N8nText>
			<N8nText size="small" color="text-light">{{ subtitle }}</N8nText>
		</div>
		<div :class="$style.action" @click.stop>
			<slot name="action" />
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0;
	margin-left: var(--spacing--2xs);
	cursor: pointer;
}

.rowStatic {
	cursor: default;
}

.labels {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	gap: var(--spacing--5xs);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.action {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-shrink: 0;
}
</style>
