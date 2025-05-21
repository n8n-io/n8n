<script lang="ts" setup>
import { computed, defineProps, type PropType } from 'vue';
import type { PaneNode, LeafPane, SplitPane } from '@/components/WindowManager/types';
import { SplitDirection } from '@/components/WindowManager/types';
import { cloneStore } from '@/stores/workflows.store';
import NodeView from '@/views/NodeView.vue';

const props = defineProps({
	node: { type: Object as PropType<PaneNode>, required: true },
});
defineEmits<{
	close: [id: string];
	split: [id: string, direction: SplitDirection];
}>();

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

function startDrag(idx: number, event: MouseEvent) {
	if (!splitNode.value) return;

	const container = (event.currentTarget as HTMLElement).parentElement as HTMLElement;
	const isHorizontal = splitNode.value.direction === SplitDirection.Horizontal;

	const total = isHorizontal ? container.clientWidth : container.clientHeight;
	const startClient = isHorizontal ? event.clientX : event.clientY;
	const weight1Start = splitNode.value.weights[idx];
	const weight2Start = splitNode.value.weights[idx + 1];

	function onMove(moveEvent: MouseEvent) {
		if (!splitNode.value) return;

		const current = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
		const delta = current - startClient;
		const weightChange = delta / total;

		const weight1 = weight1Start + weightChange;
		const weight2 = weight2Start - weightChange;

		splitNode.value.weights[idx] = weight1;
		splitNode.value.weights[idx + 1] = weight2;
	}

	function stopDrag() {
		document.removeEventListener('mousemove', onMove);
		document.removeEventListener('mouseup', stopDrag);
	}

	document.addEventListener('mousemove', onMove);
	document.addEventListener('mouseup', stopDrag);
	event.preventDefault();
}
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
			<template v-for="(child, idx) in splitNode!.children" :key="idx">
				<div :style="{ flex: `${flexValues[idx]} 1 0%` }" class="$style.wrapper">
					<Pane
						:node="child"
						@close="(id) => $emit('close', id)"
						@split="(id, direction) => $emit('split', id, direction)"
					/>
				</div>

				<div
					v-if="idx < splitNode!.children.length - 1"
					:class="[
						$style.resizer,
						splitNode!.direction === 'horizontal'
							? $style.resizerVertical
							: $style.resizerHorizontal,
					]"
					@mousedown="startDrag(idx, $event)"
				/>
			</template>
		</template>

		<template v-else-if="workflowId">
			<NodeView :stop-time="true" :workflows-store-impl="cloneStore(workflowId)">
				<template #close>
					<n8n-icon-button
						:class="$style.close"
						type="secondary"
						icon="times"
						aria-label="Close"
						@click="$emit('close', node.id)"
					/>
				</template>
				<template #split>
					<n8n-icon-button
						:class="$style.splitVertical"
						type="secondary"
						icon="arrow-right"
						aria-label="Split"
						@click="$emit('split', node.id, SplitDirection.Vertical)"
					/>
					<n8n-icon-button
						:class="$style.splitHorizontal"
						type="secondary"
						icon="arrow-down"
						aria-label="Split"
						@click="$emit('split', node.id, SplitDirection.Horizontal)"
					/>
				</template>
			</NodeView>
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
.resizer {
	background: var(--color-background-xlight);
	transition: background 0.2s;
	&:hover {
		background: var(--color-primary);
	}
}
.resizerVertical {
	width: 5px;
	cursor: col-resize;
}
.resizerHorizontal {
	height: 5px;
	cursor: row-resize;
}
.close {
	position: absolute;
	left: var(--spacing-s);
	top: var(--spacing-s);
	z-index: var(--z-index-ask-assistant-floating-button);
}

.splitVertical {
	position: absolute;
	left: var(--spacing-s);
	top: calc(var(--spacing-s) + 40px);
	z-index: var(--z-index-ask-assistant-floating-button);
}
.splitHorizontal {
	position: absolute;
	left: var(--spacing-s);
	top: calc(var(--spacing-s) + 80px);
	z-index: var(--z-index-ask-assistant-floating-button);
}
</style>
