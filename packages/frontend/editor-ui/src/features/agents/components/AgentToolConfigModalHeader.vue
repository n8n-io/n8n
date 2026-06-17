<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nIcon, N8nInlineTextEdit, N8nText } from '@n8n/design-system';
import type { INodeTypeDescription } from 'n8n-workflow';

type HeaderKind = 'node' | 'workflow' | 'custom' | 'mcp';

withDefaults(
	defineProps<{
		kind: HeaderKind;
		title: string;
		nodeTypeDescription?: INodeTypeDescription | null;
		editable?: boolean;
	}>(),
	{
		nodeTypeDescription: null,
		editable: true,
	},
);

const emit = defineEmits<{
	'update:title': [name: string];
}>();
</script>

<template>
	<div :class="$style.header">
		<NodeIcon
			v-if="(kind === 'node' || kind === 'mcp') && nodeTypeDescription"
			:node-type="nodeTypeDescription"
			:size="24"
			:circle="true"
			:class="$style.icon"
		/>
		<N8nIcon
			v-else-if="kind === 'workflow'"
			icon="workflow"
			:size="20"
			:class="$style.workflowHeaderIcon"
		/>
		<N8nIcon
			v-else-if="kind === 'custom'"
			icon="code"
			:size="20"
			:class="$style.customHeaderIcon"
		/>
		<N8nInlineTextEdit
			v-if="editable && kind !== 'custom'"
			:model-value="title"
			:max-width="400"
			:class="$style.title"
			@update:model-value="emit('update:title', $event)"
		/>
		<N8nText v-else :class="$style.title">
			{{ title }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	min-width: 0;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}

.workflowHeaderIcon {
	flex-shrink: 0;
	flex-grow: 0;
	color: var(--color--primary);
}

.customHeaderIcon {
	flex-shrink: 0;
	flex-grow: 0;
	color: var(--color--text--tint-1);
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);
	color: var(--color--text--shade-1);
	flex: 1;
	min-width: 0;
}
</style>
