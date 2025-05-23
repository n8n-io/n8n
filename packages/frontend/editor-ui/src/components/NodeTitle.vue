<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import { N8nInlineTextEdit } from '@n8n/design-system';
import type { INodeTypeDescription } from 'n8n-workflow';

type Props = {
	modelValue: string;
	nodeType?: INodeTypeDescription | null;
	readOnly?: boolean;
};

withDefaults(defineProps<Props>(), {
	modelValue: '',
	nodeType: undefined,
	readOnly: false,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

function onRename(value: string) {
	if (value.trim() !== '') {
		emit('update:model-value', value.trim());
	}
}
</script>

<template>
	<span :class="$style.container" data-test-id="node-title-container">
		<span :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="18" />
		</span>
		<N8nInlineTextEdit
			:max-width="1000"
			:model-value="modelValue"
			:read-only="readOnly"
			@update:model-value="onRename"
		/>
	</span>
</template>

<style lang="scss" module>
.container {
	font-weight: var(--font-weight-medium);
	display: flex;
	font-size: var(--font-size-m);
	padding-right: var(--spacing-s);
	color: var(--color-text-dark);
}

.iconWrapper {
	display: inline-flex;
	margin-right: var(--spacing-2xs);
}
</style>
