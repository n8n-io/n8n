<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

export type CredentialOption = {
	id: string;
	name: string;
	typeDisplayName: string | undefined;
};

const props = defineProps<{
	credentialOptions: CredentialOption[];
	selectedCredentialId: string | null;
}>();

const emit = defineEmits<{
	credentialSelected: [credentialId: string];
	newCredential: [];
}>();

const i18n = useI18n();

const NEW_CREDENTIALS_TEXT = `- ${i18n.baseText('nodeCredentials.createNew')} -`;

const onCredentialSelected = (credentialId: string) => {
	if (credentialId === NEW_CREDENTIALS_TEXT) {
		emit('newCredential');
	} else {
		emit('credentialSelected', credentialId);
	}
};
</script>

<template>
	<n8n-select
		size="small"
		:model-value="props.selectedCredentialId"
		@update:model-value="onCredentialSelected"
	>
		<n8n-option
			v-for="item in props.credentialOptions"
			:key="item.id"
			:data-test-id="`node-credentials-select-item-${item.id}`"
			:label="item.name"
			:value="item.id"
		>
			<div :class="[$style.credentialOption, 'mt-2xs mb-2xs']">
				<n8n-text bold>{{ item.name }}</n8n-text>
				<n8n-text size="small">{{ item.typeDisplayName }}</n8n-text>
			</div>
		</n8n-option>
		<n8n-option
			:key="NEW_CREDENTIALS_TEXT"
			data-test-id="node-credentials-select-item-new"
			:value="NEW_CREDENTIALS_TEXT"
			:label="NEW_CREDENTIALS_TEXT"
		>
		</n8n-option>
	</n8n-select>
</template>

<style lang="scss" module>
.credentialOption {
	display: flex;
	flex-direction: column;
}
</style>
