<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nHeading, N8nIconButton, N8nResizeWrapper } from '@n8n/design-system';
import { computed, ref } from 'vue';

const props = defineProps<{
	node: INodeUi;
}>();

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion),
);

const panelWidth = ref(350);
function onResize({ width }: { width: number }) {
	panelWidth.value = width;
}

const outputFormat = ref<'side-by-side' | 'line-by-line'>('line-by-line');

const emit = defineEmits<{
	close: [];
}>();
</script>

<template>
	<N8nResizeWrapper
		:class="$style.workflowDiffAside"
		:width="panelWidth"
		:min-width="260"
		:supported-directions="['left']"
		:grid-size="8"
		outset
		@resize="onResize"
	>
		<div
			style="display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 12px 10px"
		>
			<NodeIcon class="ml-xs" :node-type :size="16" />
			<N8nHeading size="small" color="text-dark" bold :class="$style.nodeTitle">
				{{ node.name }}
			</N8nHeading>
			<N8nIconButton
				icon="x"
				type="secondary"
				text
				class="ml-auto"
				@click="emit('close')"
			></N8nIconButton>
		</div>
		<slot v-bind="{ outputFormat }" />
	</N8nResizeWrapper>
</template>

<style module lang="scss">
.workflowDiffAside {
	width: calc(v-bind(panelWidth) * 1px);
	display: flex;
	flex-direction: column;
	height: 100%;
	border-left: 1px solid var(--color-foreground-base);
	border-top: 1px solid var(--color-foreground-base);
}

.nodeTitle {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
