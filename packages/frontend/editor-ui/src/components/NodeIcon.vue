<script setup lang="ts">
import type { SimplifiedNodeType } from '@/Interface';
import { getNodeIconSource, type NodeIconSource } from '@/utils/nodeIcon';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';
import { computed } from 'vue';

import { N8nNodeIcon } from '@n8n/design-system';
type Props = {
	size?: number;
	disabled?: boolean;
	circle?: boolean;
	colorDefault?: string;
	showTooltip?: boolean;
	tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
	nodeName?: string;
	// NodeIcon needs iconSource OR nodeType, would be better with an intersection type
	// but it breaks Vue template type checking
	iconSource?: NodeIconSource;
	nodeType?: SimplifiedNodeType | VersionNode | null;
};

const props = withDefaults(defineProps<Props>(), {
	nodeType: undefined,
	iconSource: undefined,
	size: undefined,
	circle: false,
	disabled: false,
	showTooltip: false,
	tooltipPosition: 'top',
	colorDefault: '',
	nodeName: '',
	badgeIconUrl: undefined,
});

const emit = defineEmits<{
	click: [];
}>();

const iconSource = computed(() => {
	if (props.iconSource) return props.iconSource;
	return getNodeIconSource(props.nodeType);
});

const iconType = computed(() => iconSource.value?.type ?? 'unknown');
const src = computed(() => {
	if (iconSource.value?.type !== 'file') return;
	return iconSource.value.src;
});

const iconName = computed(() => {
	if (iconSource.value?.type !== 'icon') return;
	return iconSource.value.name;
});

const iconColor = computed(() => {
	if (iconSource.value?.type !== 'icon') return;
	return iconSource.value.color ?? props.colorDefault;
});

const badge = computed(() => {
	if (iconSource.value?.badge?.type !== 'file') return;
	return iconSource.value.badge;
});

const nodeTypeName = computed(() =>
	props.nodeName && props.nodeName !== '' ? props.nodeName : props.nodeType?.displayName,
);
</script>

<template>
	<N8nNodeIcon
		:type="iconType"
		:src="src"
		:name="iconName"
		:disabled="disabled"
		:size="size"
		:circle="circle"
		:node-type-name="nodeTypeName"
		:show-tooltip="showTooltip"
		:tooltip-position="tooltipPosition"
		:badge="badge"
		:class="$style.nodeIcon"
		@click="emit('click')"
	></N8nNodeIcon>
</template>

<style lang="scss" module>
.nodeIcon {
	--node-icon-color: var(--canvas-node-icon-color, v-bind(iconColor));
}
</style>
