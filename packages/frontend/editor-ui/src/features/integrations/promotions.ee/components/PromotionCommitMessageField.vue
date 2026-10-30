<script setup lang="ts">
import { PROMOTION_COMMIT_MESSAGE_MAX_LENGTH } from '@n8n/api-types';
import { N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTemplateRef } from 'vue';

import CharacterCount from '@/app/components/CharacterCount.vue';

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
			:maxlength="PROMOTION_COMMIT_MESSAGE_MAX_LENGTH"
			:disabled="disabled"
			:placeholder="i18n.baseText('promotions.commitMessage.placeholder')"
			data-test-id="promote-commit-message"
		/>
		<CharacterCount
			:value="commitMessage"
			:max="PROMOTION_COMMIT_MESSAGE_MAX_LENGTH"
			data-test-id="promote-commit-message-character-count"
		/>
	</N8nInputLabel>
</template>
