<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import { useElementSize } from '@vueuse/core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useTemplateRef } from 'vue';

import { N8nInlineTextEdit } from '@n8n/design-system';
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

const wrapperRef = useTemplateRef('wrapperRef');
const { width } = useElementSize(wrapperRef);
</script>

<template>
	<span :class="$style.container" data-test-id="node-title-container">
		<span :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="18" :show-tooltip="true" tooltip-position="left" />
		</span>
		<div ref="wrapperRef" :class="$style.textWrapper">
			<N8nInlineTextEdit
				:max-width="width"
				:model-value="modelValue"
				:read-only="readOnly"
				@update:model-value="onRename"
			/>
		</div>
	</span>
</template>

<style lang="scss" module>
.container {
	font-weight: var(--font-weight--medium);
	display: flex;
	font-size: var(--font-size--md);
	margin-right: var(--spacing--sm);
	color: var(--color--text--shade-1);
	width: 100%;
}

.textWrapper {
	display: flex;
	flex-grow: 1;
}

.iconWrapper {
	display: inline-flex;
	margin-right: var(--spacing--2xs);
}
</style>
