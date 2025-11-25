<script setup lang="ts">
import { N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	disabled?: boolean;
	versionNameTestId?: string;
	descriptionTestId?: string;
}>();

const versionName = defineModel<string>('versionName', { required: true });
const description = defineModel<string>('description', { required: true });

const i18n = useI18n();
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
				v-model="versionName"
				:disabled="disabled"
				size="large"
				:data-test-id="versionNameTestId"
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
				:data-test-id="descriptionTestId"
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
