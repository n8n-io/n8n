<script setup lang="ts">
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import type { ITemplatesNode } from '@n8n/rest-api-client/api/templates';
import { filterTemplateNodes } from '@/utils/nodeTypesUtils';

const props = withDefaults(
	defineProps<{
		nodes: ITemplatesNode[];
		limit?: number;
		size?: string;
	}>(),
	{
		limit: 4,
		size: 'sm',
	},
);

const filteredCoreNodes = computed(() => {
	return filterTemplateNodes(props.nodes);
});

const hiddenNodes = computed(() => {
	return filteredCoreNodes.value.length - countNodesToBeSliced(filteredCoreNodes.value);
});

const slicedNodes = computed(() => {
	return filteredCoreNodes.value.slice(0, countNodesToBeSliced(filteredCoreNodes.value));
});

const countNodesToBeSliced = (nodes: ITemplatesNode[]): number => {
	if (nodes.length > props.limit) {
		return props.limit - 1;
	} else {
		return props.limit;
	}
};
</script>

<template>
	<div :class="$style.list">
		<div v-for="node in slicedNodes" :key="node.name" :class="[$style.container, $style[size]]">
			<NodeIcon :node-type="node" :size="size === 'md' ? 24 : 18" :show-tooltip="true" />
		</div>
		<div
			v-if="filteredCoreNodes.length > limit + 1"
			:class="[$style.button, size === 'md' ? $style.buttonMd : $style.buttonSm]"
		>
			+{{ hiddenNodes }}
		</div>
	</div>
</template>

<style lang="scss" module>
.list {
	max-width: 100px;
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
}
.container {
	position: relative;
	display: block;
}
.sm {
	margin-left: var(--spacing--2xs);
}
.md {
	margin-left: var(--spacing--xs);
}
.button {
	top: 0;
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	background: var(--color--background--light-2);
	border: 1px var(--color--foreground) solid;
	border-radius: var(--radius);
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}
.buttonSm {
	margin-left: var(--spacing--2xs);
	width: 20px;
	min-width: 20px;
	height: 20px;
}
.buttonMd {
	margin-left: var(--spacing--xs);
	width: 24px;
	min-width: 24px;
	height: 24px;
}
</style>
