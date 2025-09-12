<script lang="ts" setup>
import NodeExecuteButton from '@/components/NodeExecuteButton.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { type INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { type INodeProperties } from 'n8n-workflow';
import { computed } from 'vue';

const { node, parameter, isExecutable } = defineProps<{
	node: INodeUi;
	parameter?: INodeProperties;
	isExecutable: boolean;
}>();

const nodeTypesStore = useNodeTypesStore();
const nodeType = computed(() => nodeTypesStore.getNodeType(node.type, node.typeVersion));

const emit = defineEmits<{
	execute: [];
	openNdv: [];
	clearParameter: [];
}>();
</script>

<template>
	<N8nText tag="header" size="small" bold :class="$style.component">
		<NodeIcon :node-type="nodeType" :size="16" />
		<div :class="$style.breadcrumbs">
			<template v-if="parameter">
				<N8nText size="small" color="text-base" bold>
					{{ node.name }}
				</N8nText>
				<N8nText size="small" color="text-light">/</N8nText>
				{{ parameter.displayName }}
			</template>
			<template v-else>{{ node.name }}</template>
		</div>
		<N8nIconButton
			v-if="parameter"
			icon="x"
			size="small"
			type="tertiary"
			text
			@click="emit('clearParameter')"
		/>
		<N8nIconButton
			v-else
			icon="expand"
			size="small"
			type="tertiary"
			text
			@click="emit('openNdv')"
		/>
		<NodeExecuteButton
			v-if="isExecutable"
			data-test-id="node-execute-button"
			:node-name="node.name"
			:tooltip="`Execute ${node.name}`"
			type="secondary"
			size="small"
			icon="play"
			:square="true"
			:hide-label="true"
			telemetry-source="focus"
			@execute="emit('execute')"
		/>
	</N8nText>
</template>

<style lang="scss" module>
.component {
	display: flex;
	align-items: center;
	padding: var(--spacing-2xs);
	gap: var(--spacing-2xs);
	border-bottom: var(--border-base);
}

.breadcrumbs {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	flex-grow: 1;
	flex-shrink: 1;
}
</style>
