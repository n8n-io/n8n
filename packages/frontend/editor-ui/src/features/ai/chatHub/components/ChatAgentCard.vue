<script setup lang="ts">
import { getAgentRoute } from '@/features/ai/chatHub/chat.utils';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import type { ChatHubAgentDto, ChatHubConversationModel } from '@n8n/api-types';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const { model, agents } = defineProps<{
	model: ChatHubConversationModel;
	agents: ChatHubAgentDto[];
}>();

const emit = defineEmits<{
	edit: [];
	delete: [];
}>();

const description = computed(() => {
	if (model.provider === 'custom-agent') {
		return agents.find((agent) => agent.id === model.agentId)?.description || 'No description';
	}

	if (model.provider === 'n8n') {
		return 'n8n workflow';
	}

	return '';
});

const metadata = computed(() => {
	const parts = [];

	if (model.provider === 'custom-agent') {
		parts.push(providerDisplayNames[model.provider]);
		parts.push(model.name);
		parts.push('Private');
	} else {
		parts.push('n8n workflow');
	}

	return parts.join(' • ');
});
</script>

<template>
	<RouterLink :to="getAgentRoute(model)" :class="$style.card">
		<ChatAgentAvatar :model="model" size="lg" />

		<div :class="$style.content">
			<N8nText tag="h3" size="medium" bold :class="$style.title">
				{{ model.name }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ description }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.metadata">
				{{ metadata }}
			</N8nText>
		</div>

		<div v-if="model.provider === 'custom-agent'" :class="$style.actions">
			<N8nIconButton
				icon="pen"
				type="tertiary"
				size="medium"
				title="Edit"
				@click.prevent="emit('edit')"
			/>
			<N8nIconButton
				icon="trash-2"
				type="tertiary"
				size="medium"
				title="More options"
				@click.prevent="emit('delete')"
			/>
		</div>
	</RouterLink>
</template>

<style lang="scss" module>
.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--md);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	text-decoration: none;
	color: inherit;
	transition: border-color 0.2s ease;

	&:hover {
		border-color: var(--color--primary);
	}
}

.avatar {
	flex-shrink: 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metadata {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
