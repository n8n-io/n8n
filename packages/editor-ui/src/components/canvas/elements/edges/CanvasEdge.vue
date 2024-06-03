<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import type { Connection, EdgeProps } from '@vue-flow/core';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';
import { computed, onMounted, onUnmounted, toRef, useCssModule } from 'vue';
import { useI18n } from '@/composables/useI18n';

const emit = defineEmits<{
	delete: [connection: Connection];
}>();

const props = defineProps<EdgeProps>();

const i18n = useI18n();
const $style = useCssModule();

const selected = toRef(props, 'selected');

const edgeStyle = computed(() => ({
	strokeWidth: 2,
	...props.style,
}));

const edgeLabelStyle = computed(() => ({
	transform: `translate(-50%, -50%) translate(${path.value[1]}px,${path.value[2]}px)`,
}));

const path = computed(() =>
	getBezierPath({
		sourceX: props.sourceX,
		sourceY: props.sourceY,
		sourcePosition: props.sourcePosition,
		targetX: props.targetX,
		targetY: props.targetY,
		targetPosition: props.targetPosition,
	}),
);

const connection = computed<Connection>(() => ({
	source: props.source,
	target: props.target,
	sourceHandle: props.sourceHandleId,
	targetHandle: props.targetHandleId,
}));

onMounted(() => {
	document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
	document.removeEventListener('keydown', onKeyDown);
});

function onDelete() {
	emit('delete', connection.value);
}

function onKeyDown(e: KeyboardEvent) {
	if (!selected.value) {
		return;
	}

	if (e.key === 'Delete') {
		onDelete();
	}
}
</script>

<template>
	<BaseEdge
		:id="id"
		:style="edgeStyle"
		:path="path[0]"
		:marker-end="markerEnd"
		:label="data?.label"
		:label-x="path[1]"
		:label-y="path[2]"
		:label-style="{ fill: 'white' }"
		:label-show-bg="true"
		:label-bg-style="{ fill: 'red' }"
		:label-bg-padding="[2, 4]"
		:label-bg-border-radius="2"
		tabindex="2"
	/>
	<EdgeLabelRenderer>
		<div :class="[$style.edgeToolbar, 'nodrag', 'nopan']" :style="edgeLabelStyle">
			<N8nIconButton
				data-test-id="delete-connection-button"
				type="tertiary"
				size="small"
				icon="trash"
				:title="i18n.baseText('node.delete')"
				@click="onDelete"
			/>
		</div>
	</EdgeLabelRenderer>
</template>

<style lang="scss" module>
.edgeToolbar {
	pointer-events: all;
	position: absolute;
}
</style>
