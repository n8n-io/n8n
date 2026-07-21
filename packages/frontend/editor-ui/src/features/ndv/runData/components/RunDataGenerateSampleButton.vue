<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';

const locale = useI18n();

defineProps<{
	disabled: boolean;
	loading: boolean;
}>();

defineEmits<{
	generate: [];
}>();
</script>

<template>
	<N8nTooltip placement="bottom-end">
		<template #content>
			<strong>{{ locale.baseText('ndv.pinData.generate.title') }}</strong>
			<N8nText size="small" tag="p">
				{{ locale.baseText('ndv.pinData.generate.description') }}
			</N8nText>
		</template>
		<N8nIconButton
			variant="subtle"
			size="small"
			icon="wand-sparkles"
			:loading="loading"
			:disabled="disabled"
			:aria-label="locale.baseText('ndv.pinData.generate.title')"
			data-test-id="ndv-generate-sample-data"
			@click="$emit('generate')"
		/>
	</N8nTooltip>
</template>
