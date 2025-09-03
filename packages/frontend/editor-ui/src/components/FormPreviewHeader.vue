<script setup lang="ts">
import { N8nIconButton } from '@n8n/design-system';
import type { INode } from 'n8n-workflow';

const emit = defineEmits<{ close: []; 'selected-node-update': [id: string] }>();

defineProps<{
	selectedNodeId: string;
	nodes: INode[];
}>();
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
				<N8nOption
					v-for="node of nodes"
					:key="node.id"
					:value="node.id"
					:class="[$style.node, { [$style.disabled]: node.disabled }]"
					:label="node.name"
				>
					<span :class="$style.title">
						{{ node.name }}
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
