<script setup lang="ts">
import { N8nIcon, type AiModelSelectorMenuItem } from '@n8n/design-system';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

defineProps<{
	item: AiModelSelectorMenuItem;
}>();
</script>

<template>
	<N8nIcon v-if="item.data?.leadingIcon" :icon="item.data.leadingIcon" size="large" />
	<CredentialIcon
		v-else-if="item.data?.credentialType"
		:credential-type-name="item.data.credentialType"
		:size="16"
	/>
</template>
