<script setup lang="ts">
import { describeConversationModel } from '@/features/ai/chatHub/chat.utils';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { type ChatHubConversationModel, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { N8nAvatar, N8nIcon, N8nTooltip } from '@n8n/design-system';

defineProps<{
	model: ChatHubConversationModel;
	size: 'sm' | 'md' | 'lg';
	tooltip?: boolean;
}>();
</script>

<template>
	<N8nTooltip :show-after="100" placement="left" :disabled="!tooltip">
		<template #content>{{ describeConversationModel(model) }}</template>
		<N8nAvatar
			v-if="model.provider === 'custom-agent'"
			:first-name="model.name"
			:size="size === 'lg' ? 'medium' : size === 'sm' ? 'xxsmall' : 'xsmall'"
		/>
		<N8nIcon
			v-else-if="model.provider === 'n8n'"
			icon="robot"
			:size="size === 'lg' ? 'xxlarge' : size === 'sm' ? 'large' : 'xlarge'"
		/>
		<CredentialIcon
			v-else
			:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[model.provider]"
			:size="size === 'sm' ? 16 : size === 'lg' ? 40 : 20"
		/>
	</N8nTooltip>
</template>
