<script setup lang="ts">
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INode } from 'n8n-workflow';
import { computed } from 'vue';

const emit = defineEmits<{ close: []; 'selected-node-update': [id: string] }>();

const props = defineProps<{
	selectedNodeId: string;
	nodes: INode[];
}>();

const nodeTypesStore = useNodeTypesStore();

const i18n = useI18n();

const nodesById = computed(() =>
	props.nodes.reduce(
		(acc, node) => {
			acc[node.id] = node;
			return acc;
		},
		{} as Record<string, INode>,
	),
);

const nodesWithType = computed(() =>
	props.nodes.map((node) => ({
		node,
		type: nodeTypesStore.getNodeType(node.type, node.typeVersion),
	})),
);
const selectedNode = computed(() => nodesById.value[props.selectedNodeId]);
const selectedNodeType = computed(() =>
	nodeTypesStore.getNodeType(selectedNode.value.type, selectedNode.value.typeVersion),
);
</script>

<template>
	<header :class="$style.formPreviewHeader">
		<div :class="$style.content">
			<N8nSelect
				:model-value="selectedNodeId"
				teleported
				filterable
				@update:model-value="emit('selected-node-update', $event)"
			>
				<template #prefix>
					<NodeIcon
						:disabled="selectedNode.disabled"
						:node-type="selectedNodeType"
						:size="14"
						:shrink="false"
					/>
				</template>

				<N8nOption
					v-for="{ node, type } of nodesWithType"
					:key="node.id"
					:value="node.id"
					:class="[$style.node, { [$style.disabled]: node.disabled }]"
					:label="node.name"
				>
					<NodeIcon
						:disabled="node.disabled"
						:node-type="type"
						:size="14"
						:shrink="false"
						:class="$style.icon"
					/>
					<span :class="$style.title">
						{{ node.name }}
						<span v-if="node.disabled">({{ i18n.baseText('node.disabled') }})</span>
					</span>
				</N8nOption>
			</N8nSelect>
		</div>
		<N8nIconButton icon="x" type="tertiary" @click="emit('close')" />
	</header>
</template>

<style lang="css" module>
.formPreviewHeader {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs);
	background: var(--color-background-xlight);
}

.content {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing-2xs);
	margin-left: var(--spacing-2xs);
}

.node {
	--select-option-padding: 0 var(--spacing-s);
	display: flex;
	align-items: center;
	font-size: var(--font-size-2xs);
	gap: var(--spacing-4xs);
}

.icon {
	padding-right: var(--spacing-4xs);
}

.title {
	color: var(--color-text-dark);
	font-weight: var(--font-weight-regular);
	max-width: var(--max-select-width);
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
