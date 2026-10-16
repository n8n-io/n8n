<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { MapServiceNodeData } from '../automationMap.types';

const props = defineProps<{ data: MapServiceNodeData; selected?: boolean }>();

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() =>
	props.data.service.nodeType ? nodeTypesStore.getNodeType(props.data.service.nodeType) : null,
);
</script>

<template>
	<div
		:class="[
			$style.wrapper,
			{
				[$style.selected]: selected || data.focus === 'focused',
				[$style.related]: data.focus === 'related',
				[$style.dimmed]: data.focus === 'dimmed' || !data.matchesSearch,
			},
		]"
		:data-test-id="`map-service-${data.service.key}`"
	>
		<div :class="$style.box">
			<Handle type="target" :position="Position.Left" :class="$style.handle" />
			<NodeIcon v-if="nodeType" :node-type="nodeType" :size="36" />
			<N8nIcon v-else icon="globe" :size="32" :class="$style.globe" />
			<Handle type="source" :position="Position.Right" :class="$style.handle" />
		</div>
		<N8nText size="small" bold :class="$style.label">{{ data.service.name }}</N8nText>
		<N8nText v-if="data.service.credentials.length" size="xsmall" color="text-light">
			<N8nIcon icon="key-round" :size="10" />
			{{ data.service.credentials.length }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	width: 128px;
	height: 116px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	cursor: pointer;
	transition: opacity 0.2s ease;
}

.box {
	position: relative;
	width: 72px;
	height: 72px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--node--color--background, var(--color--background--light-3));
	border: 1.5px solid var(--color--foreground--shade-1);
	border-radius: var(--radius--lg);
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease;
}

.globe {
	color: var(--color--text--tint-1);
}

.label {
	max-width: 100%;
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.selected .box {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 4px var(--color--primary--tint-2);
}

.related .box {
	border-color: var(--color--secondary);
}

.dimmed {
	opacity: 0.25;
}

.handle {
	opacity: 0;
	pointer-events: none;
}
</style>
