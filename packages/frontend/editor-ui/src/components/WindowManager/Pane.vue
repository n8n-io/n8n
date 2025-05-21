<script lang="ts" setup>
import { computed, defineProps, type PropType } from 'vue';
import type { PaneNode, LeafPane, SplitPane } from '@/components/WindowManager/types';

const props = defineProps({
	node: { type: Object as PropType<PaneNode>, required: true },
});

const isSplit = computed(() => props.node.nodeType === 'split');
const splitNode = computed(() => (isSplit.value ? (props.node as SplitPane) : null));
const leafProps = computed(() => (!isSplit.value ? (props.node as LeafPane) : null));
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
			<Pane v-for="(child, idx) in splitNode!.children" :key="idx" :node="child" />
		</template>

		<template v-else>
			<div>
				{{ leafProps?.nodeType }}
			</div>
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
</style>
