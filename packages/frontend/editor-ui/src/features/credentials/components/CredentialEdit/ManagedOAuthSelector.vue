<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { N8nInputLabel, N8nRadioButtons } from '@n8n/design-system';

const useCustomOAuth = defineModel<boolean>('useCustomOAuth', { default: false });

const i18n = useI18n();

const selected = computed({
	get: () => (useCustomOAuth.value ? 'custom' : 'managed'),
	set: (val: 'managed' | 'custom') => {
		useCustomOAuth.value = val === 'custom';
	},
});

const options = computed(() => [
	{
		label: i18n.baseText('credentialEdit.credentialConfig.oauthModeManaged'),
		value: 'managed' as const,
	},
	{
		label: i18n.baseText('credentialEdit.credentialConfig.oauthModeCustom'),
		value: 'custom' as const,
	},
]);
</script>

<template>
	<div data-test-id="managed-oauth-selector">
		<N8nInputLabel
			:label="i18n.baseText('credentialEdit.credentialConfig.oauthModeLabel')"
			:required="true"
		/>
		<N8nRadioButtons v-model="selected" :options="options" />
	</div>
</template>
