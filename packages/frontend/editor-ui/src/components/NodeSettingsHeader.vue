<script setup lang="ts">
import type { INodeUi } from '@/Interface';
import NodeTitle from './NodeTitle.vue';
import type { INodeTypeDescription } from 'n8n-workflow';

const { node, nodeType, isReadOnly } = defineProps<{
	node: INodeUi | null;
	nodeType: INodeTypeDescription | null;
	isReadOnly: boolean;
}>();

const slots = defineSlots<{ actions?: {} }>();

const emit = defineEmits<{ nameChanges: [string] }>();
</script>

<template>
	<div class="header-side-menu">
		<NodeTitle
			v-if="node"
			class="node-name"
			:model-value="node.name"
			:node-type="nodeType"
			:read-only="isReadOnly"
			@update:model-value="emit('nameChanges', $event)"
		/>
		<div v-if="slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	gap: var(--spacing-4xs);
	align-items: center;
}
</style>
