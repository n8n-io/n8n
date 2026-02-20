<script setup lang="ts">
import { computed } from 'vue';
import type { IconOrEmoji } from '@n8n/design-system';
import type { ZoneLayout } from '../agents.types';
import { ZONE_COLORS } from '../agents.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';

const props = defineProps<{
	zone: ZoneLayout;
}>();

const color = ZONE_COLORS[props.zone.colorIndex % ZONE_COLORS.length];

const iconProp = computed<IconOrEmoji | null>(() => {
	if (!props.zone.icon) return null;
	return props.zone.icon as IconOrEmoji;
});
</script>

<template>
	<div
		:class="$style.zone"
		:style="{
			left: `${zone.rect.x}px`,
			top: `${zone.rect.y}px`,
			width: `${zone.rect.width}px`,
			height: `${zone.rect.height}px`,
			borderColor: color,
			backgroundColor: `color-mix(in srgb, ${color} 5%, transparent)`,
		}"
		data-testid="permission-zone"
	>
		<div :class="$style.header">
			<ProjectIcon v-if="iconProp" :icon="iconProp" size="mini" :border-less="true" />
			<span :class="$style.name">{{ zone.name }}</span>
			<span :class="$style.badge">{{ zone.memberCount }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.zone {
	position: absolute;
	border: 2px solid;
	border-radius: var(--radius--lg);
	pointer-events: none;
	z-index: 1;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	pointer-events: auto;
}

.name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.badge {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: 1px var(--spacing--4xs);
	min-width: 20px;
	text-align: center;
}
</style>
