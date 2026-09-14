<script setup lang="ts">
import type { CodeBlock } from '@n8n/api-types';

import { useAppsStore } from '@/features/apps/apps.store';
import AppCodeEditor from '@/features/apps/components/AppCodeEditor.vue';

type CodeBlockData = CodeBlock['data'];

defineProps<{
	modelValue: Partial<CodeBlockData>;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: CodeBlockData];
}>();

const appsStore = useAppsStore();

const onChange = (source: string) => emit('update:modelValue', { source });
</script>

<template>
	<div :class="$style.container" data-test-id="code-block-config">
		<AppCodeEditor
			:model-value="modelValue.source ?? ''"
			:components="appsStore.app?.components"
			@update:model-value="onChange"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	min-height: 240px;
}
</style>
