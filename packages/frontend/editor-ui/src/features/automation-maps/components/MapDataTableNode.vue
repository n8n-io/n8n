<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { Handle, Position } from '@vue-flow/core';

import type { MapDataTableNodeData } from '../automationMap.types';

defineProps<{ data: MapDataTableNodeData; selected?: boolean }>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="[
			$style.node,
			{
				[$style.selected]: selected || data.focus === 'focused',
				[$style.related]: data.focus === 'related',
				[$style.dimmed]: data.focus === 'dimmed' || !data.matchesSearch,
				[$style.missing]: data.dataTable.missing,
			},
		]"
		:data-test-id="`map-data-table-${data.dataTable.id}`"
	>
		<Handle type="target" :position="Position.Left" :class="$style.handle" />
		<span :class="$style.icon"><N8nIcon icon="table" :size="16" /></span>
		<div :class="$style.text">
			<N8nText bold size="small" :class="$style.name">{{ data.dataTable.name }}</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{
					i18n.baseText('automationMaps.dataTable.usage', {
						interpolate: { readers: String(data.readers), writers: String(data.writers) },
					})
				}}
			</N8nText>
		</div>
		<Handle type="source" :position="Position.Right" :class="$style.handle" />
	</div>
</template>

<style lang="scss" module>
.node {
	width: 240px;
	height: 52px;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm) 0 var(--spacing--2xs);
	background: var(--color--background--light-3);
	border: 1.5px solid var(--color--foreground--shade-1);
	border-radius: 26px;
	cursor: pointer;
	transition:
		opacity 0.2s ease,
		border-color 0.2s ease;
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
	flex-shrink: 0;
}

.text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.selected {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 4px var(--color--primary--tint-2);
}

.related {
	border-color: var(--color--secondary);
}

.dimmed {
	opacity: 0.25;
}

.missing {
	border-style: dashed;
}

.handle {
	opacity: 0;
	pointer-events: none;
}
</style>
