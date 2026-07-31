<script setup lang="ts">
import { N8nMarkdownEditor } from '@n8n/design-system';
import { computed, nextTick, ref, useAttrs, watch } from 'vue';

import AgentExpressionInput from './AgentExpressionInput.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		modelValue: string;
		disabled?: boolean;
		readonly?: boolean;
		rows?: number;
		path?: string;
		showToolbar?: 'never' | 'hover' | 'always';
		maxHeight?: string | number;
		variant?: 'ghost' | 'contained';
		containerClass?: string;
	}>(),
	{
		disabled: false,
		readonly: false,
		rows: 5,
		path: 'agent.instructions',
		showToolbar: 'never',
		maxHeight: '480px',
		variant: 'contained',
		containerClass: '',
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
	focus: [];
	blur: [];
}>();

const attrs = useAttrs();
const value = ref(props.modelValue);
const expressionInput = ref<InstanceType<typeof AgentExpressionInput>>();
const markdownInput = ref<InstanceType<typeof N8nMarkdownEditor>>();
const isExpression = computed(() => value.value.startsWith('='));

watch(
	() => props.modelValue,
	(nextValue) => {
		if (nextValue !== value.value) value.value = nextValue;
	},
);

async function updateValue(nextValue: string) {
	const wasExpression = isExpression.value;
	value.value = nextValue;
	emit('update:modelValue', nextValue);

	if (wasExpression === isExpression.value) return;
	await nextTick();
	if (isExpression.value) expressionInput.value?.focus();
	else markdownInput.value?.focus();
}

function focus() {
	if (isExpression.value) expressionInput.value?.focus();
	else markdownInput.value?.focus();
}

defineExpose({ focus });
</script>

<template>
	<AgentExpressionInput
		v-if="isExpression"
		ref="expressionInput"
		v-bind="attrs"
		:model-value="value"
		:path="props.path"
		:rows="props.rows"
		:disabled="props.disabled"
		:readonly="props.readonly"
		:container-class="props.containerClass"
		:fill-height="Boolean(props.containerClass || attrs.class)"
		@update:model-value="updateValue"
		@focus="emit('focus')"
		@blur="emit('blur')"
	/>
	<N8nMarkdownEditor
		v-else
		ref="markdownInput"
		v-bind="attrs"
		:model-value="value"
		:disabled="props.disabled"
		:readonly="props.disabled || props.readonly"
		:show-toolbar="props.showToolbar"
		:max-height="props.maxHeight"
		:variant="props.variant"
		:container-class="props.containerClass"
		@update:model-value="updateValue"
		@focus="emit('focus')"
		@blur="emit('blur')"
	/>
</template>
