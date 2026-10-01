<script setup lang="ts">
import {
	WORKFLOW_VERSION_NAME_MAX_LENGTH,
	WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH,
} from '@n8n/api-types';
import { N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTemplateRef } from 'vue';

import CharacterCount from '@/app/components/CharacterCount.vue';

defineProps<{
	disabled?: boolean;
	versionNameTestId?: string;
	descriptionTestId?: string;
}>();

const versionName = defineModel<string>('versionName', { required: true });
const description = defineModel<string>('description', { required: true });
const nameInputRef = useTemplateRef<InstanceType<typeof N8nInput>>('nameInput');

const i18n = useI18n();

const emit = defineEmits<{
	submit: [];
}>();

const focusInput = () => {
	nameInputRef.value?.select();
};

const handleEnterKey = () => {
	emit('submit');
};

defineExpose({
	focusInput,
});
</script>

<template>
	<div :class="$style.formContainer">
		<N8nInputLabel
			input-name="workflow-version-name"
			:label="i18n.baseText('workflows.publishModal.versionNameLabel')"
			:required="true"
			:class="$style.inputWrapper"
		>
			<N8nInput
				id="workflow-version-name"
				ref="nameInput"
				v-model="versionName"
				:disabled="disabled"
				size="large"
				:maxlength="WORKFLOW_VERSION_NAME_MAX_LENGTH"
				:data-test-id="versionNameTestId"
				@keydown.enter.prevent="handleEnterKey"
			/>
			<CharacterCount
				:value="versionName"
				:max="WORKFLOW_VERSION_NAME_MAX_LENGTH"
				data-test-id="workflow-version-name-character-count"
			/>
		</N8nInputLabel>
		<N8nInputLabel
			input-name="workflow-version-description"
			:label="i18n.baseText('workflows.publishModal.descriptionPlaceholder')"
		>
			<N8nInput
				id="workflow-version-description"
				v-model="description"
				type="textarea"
				:rows="4"
				:disabled="disabled"
				size="large"
				:maxlength="WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH"
				:data-test-id="descriptionTestId"
			/>
			<CharacterCount
				:value="description"
				:max="WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH"
				data-test-id="workflow-version-description-character-count"
			/>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.formContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.inputWrapper {
	width: 100%;
}
</style>
