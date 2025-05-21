<script lang="ts" setup>
import { computed, defineProps, type PropType } from 'vue';
import type { PaneNode, LeafPane, SplitPane } from '@/components/WindowManager/types';
import { cloneStore } from '@/stores/workflows.store';
import NodeView from '@/views/NodeView.vue';

const props = defineProps({
	node: { type: Object as PropType<PaneNode>, required: true },
});

const isSplit = computed(() => props.node.nodeType === 'split');
const splitNode = computed(() => (isSplit.value ? (props.node as SplitPane) : null));
const leafProps = computed(() => (!isSplit.value ? (props.node as LeafPane) : null));
const workflowId = computed(() => {
	if (isSplit.value) return undefined;

	return leafProps.value?.content.meta?.workflowId as string | undefined;
});

const flexValues = computed(() => {
	if (!isSplit.value || !splitNode.value) return [] as number[];
	const { weights, children } = splitNode.value;
	if (weights && weights.length === children.length) {
		return weights.map((w) => w * 100);
	}
	return Array(children.length).fill(100);
});
</script>

<template>
	<div
		:class="{
			[$style.container]: true,
			[$style.vertical]: isSplit && splitNode!.direction === 'vertical',
			[$style.horizontal]: isSplit && splitNode!.direction === 'horizontal',
		}"
	>
		<template v-if="isSplit">
			<div
				v-for="(child, idx) in splitNode!.children"
				:key="idx"
				:style="{ flex: `${flexValues[idx]} 1 0%` }"
				class="$style.wrapper"
			>
				<Pane :node="child" />
			</div>
		</template>

		<template v-else-if="workflowId">
			<NodeView :stop-time="true" :workflows-store-impl="cloneStore(workflowId)" />
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	width: 100%;
	height: 100%;
}

.vertical {
	flex-direction: column;
}
.horizontal {
	flex-direction: row;
}
.wrapper {
	min-width: 0;
	min-height: 0;
	display: flex;
}
</style>
