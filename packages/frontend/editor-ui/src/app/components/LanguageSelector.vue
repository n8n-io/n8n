<template>
	<div class="language-selector">
		<N8nSelect
			:model-value="modelValue"
			size="small"
			@update:model-value="$emit('update:modelValue', $event)"
			data-test-id="language-selector"
		>
			<N8nOption
				v-for="lang in availableLanguages"
				:key="lang.value"
				:value="lang.value"
				:label="lang.label"
			/>
		</N8nSelect>
	</div>
</template>

<script lang="ts" setup>
import { N8nSelect, N8nOption } from '@n8n/design-system';

// Props
defineProps<{
	modelValue: string;
}>();

// Emits
defineEmits<{
	'update:modelValue': [value: string];
}>();

// 可用语言列表
const availableLanguages = [
	{ value: 'zh', label: '简体中文' },
	{ value: 'en', label: 'English' },
];
</script>

<style lang="scss" scoped>
.language-selector {
	display: inline-block;
	min-width: 120px;
}
</style>
