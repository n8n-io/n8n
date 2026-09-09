<script setup lang="ts">
import { N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { HtmlBlock } from '@n8n/api-types';

type HtmlBlockData = HtmlBlock['data'];

const props = defineProps<{
	modelValue: Partial<HtmlBlockData>;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: HtmlBlockData];
}>();

const i18n = useI18n();

const onInput = (value: string) => {
	emit('update:modelValue', { ...props.modelValue, template: value });
};
</script>

<template>
	<div :class="$style.container" data-test-id="html-block-config">
		<N8nInput
			:class="$style.mono"
			size="medium"
			type="textarea"
			:model-value="modelValue.template ?? ''"
			:rows="6"
			:placeholder="i18n.baseText('apps.block.html.placeholder')"
			data-test-id="html-block-template"
			@update:model-value="onInput"
		/>
		<N8nText color="text-light" size="small">
			{{ i18n.baseText('apps.block.html.allowlistHint') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.mono textarea {
	font-family: var(--font-family--monospace);
}
</style>
