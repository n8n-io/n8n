<script setup lang="ts">
import { N8nInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ImageBlock } from '@n8n/api-types';
import { reactive, watch } from 'vue';

type ImageBlockData = ImageBlock['data'];

const props = defineProps<{
	modelValue: Partial<ImageBlockData>;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: ImageBlockData];
}>();

const i18n = useI18n();

const form = reactive({
	url: props.modelValue.url ?? '',
	alt: props.modelValue.alt ?? '',
	caption: props.modelValue.caption ?? '',
});

watch(form, () =>
	emit('update:modelValue', {
		url: form.url,
		...(form.alt ? { alt: form.alt } : {}),
		...(form.caption ? { caption: form.caption } : {}),
	}),
);
</script>

<template>
	<div :class="$style.container" data-test-id="image-block-config">
		<img v-if="form.url" :src="form.url" :alt="form.alt" :class="$style.preview" />
		<N8nInput
			v-model="form.url"
			size="medium"
			:placeholder="i18n.baseText('apps.block.image.url.placeholder')"
			data-test-id="image-block-url"
		/>
		<N8nInput
			v-model="form.alt"
			size="medium"
			:placeholder="i18n.baseText('apps.block.image.alt.placeholder')"
			data-test-id="image-block-alt"
		/>
		<N8nInput
			v-model="form.caption"
			size="medium"
			:placeholder="i18n.baseText('apps.block.image.caption.placeholder')"
			data-test-id="image-block-caption"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.preview {
	max-width: 100%;
	max-height: 320px;
	object-fit: contain;
	border-radius: var(--radius);
}
</style>
