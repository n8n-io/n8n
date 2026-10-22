<script setup lang="ts">
import { N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTemplateRef } from 'vue';

defineProps<{ disabled?: boolean }>();

/** Optional. The backend generates the message when the trimmed value is empty. */
const commitMessage = defineModel<string>({ required: true });

const i18n = useI18n();
const input = useTemplateRef<InstanceType<typeof N8nInput>>('input');

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
	<N8nInputLabel
		input-name="promote-commit-message"
		:label="i18n.baseText('promotions.commitMessage.label')"
	>
		<N8nInput
			id="promote-commit-message"
			ref="input"
			v-model="commitMessage"
			type="textarea"
			:rows="3"
			:disabled="disabled"
			:placeholder="i18n.baseText('promotions.commitMessage.placeholder')"
			data-test-id="promote-commit-message"
		/>
	</N8nInputLabel>
</template>
