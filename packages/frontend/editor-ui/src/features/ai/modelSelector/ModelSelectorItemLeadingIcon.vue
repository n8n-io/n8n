<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import type { AiModelSelectorMenuItem } from './types';

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
