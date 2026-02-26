<script setup lang="ts">
import { computed } from 'vue';
import type { IconOrEmoji } from '@n8n/design-system';
import type { ZoneLayout } from '../agents.types';
import { ZONE_COLORS, EXTERNAL_ZONE_COLOR } from '../agents.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';

const props = defineProps<{
	zone: ZoneLayout;
}>();

const isNeutral = props.zone.colorIndex === -1;
const isExternal = props.zone.colorIndex === -2;
const color = isExternal
	? EXTERNAL_ZONE_COLOR
	: isNeutral
		? 'var(--color--foreground)'
		: ZONE_COLORS[props.zone.colorIndex % ZONE_COLORS.length];

const iconProp = computed<IconOrEmoji | null>(() => {
	if (!props.zone.icon) return null;
	return props.zone.icon as IconOrEmoji;
});
</script>

<template>
	<div
		v-if="zone.rect.width > 0"
		:class="[$style.zone, { [$style.neutral]: isNeutral, [$style.external]: isExternal }]"
		:style="{
			left: `${zone.rect.x}px`,
			top: `${zone.rect.y}px`,
			width: `${zone.rect.width}px`,
			height: `${zone.rect.height}px`,
			borderColor: color,
			boxShadow:
				isNeutral || isExternal
					? undefined
					: `0 0 20px color-mix(in srgb, ${color} 15%, transparent), inset 0 0 20px color-mix(in srgb, ${color} 5%, transparent)`,
		}"
		data-testid="permission-zone"
	>
		<div :class="$style.header">
			<span v-if="!isNeutral" :class="$style.accent" :style="{ backgroundColor: color }" />
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
	border-radius: var(--radius--xl);
	pointer-events: none;
	z-index: 1;
}

.neutral {
	border-style: dashed;
}

.external {
	border-style: dotted;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	pointer-events: auto;
}

.accent {
	width: 3px;
	height: 16px;
	border-radius: 2px;
	flex-shrink: 0;
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
