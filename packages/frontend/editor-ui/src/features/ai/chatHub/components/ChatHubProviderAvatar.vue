<script setup lang="ts">
import { type ChatHubProvider, type ChatModelDto } from '@n8n/api-types';
import { computed } from 'vue';
import ChatHubAgentAvatar from './ChatHubAgentAvatar.vue';
import { createFakeAgent } from '../chat.utils';
import type { IconOrEmoji } from '@n8n/design-system';

const { provider, icon } = defineProps<{
	provider: ChatHubProvider;
	icon?: IconOrEmoji;
}>();

const agent = computed<ChatModelDto>(() =>
	createFakeAgent(
		provider === 'n8n'
			? { provider: 'n8n', workflowId: '' }
			: provider === 'custom-agent'
				? { provider: 'custom-agent', agentId: '' }
				: { provider, model: '' },
		{ icon },
	),
);
</script>

<template>
	<ChatHubAgentAvatar :agent="agent" size="sm" />
</template>
