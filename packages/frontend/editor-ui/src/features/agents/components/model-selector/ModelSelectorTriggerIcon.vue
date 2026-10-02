<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

defineProps<{
	/** Credential type of the selected model's provider, or `null` when nothing is selected. */
	credentialTypeName: string | null;
}>();
</script>

<template>
	<CredentialIcon v-if="credentialTypeName" :credential-type-name="credentialTypeName" :size="18" />
	<N8nIcon v-else icon="bot" size="medium" />
</template>
