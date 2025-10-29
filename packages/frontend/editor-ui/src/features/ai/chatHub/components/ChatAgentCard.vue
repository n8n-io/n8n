<script setup lang="ts">
import { getAgentRoute, getTimestamp } from '@/features/ai/chatHub/chat.utils';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import type { ChatHubAgentDto, ChatHubConversationModel } from '@n8n/api-types';
import type { IWorkflowDb } from '@/Interface';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import TimeAgo from '@/components/TimeAgo.vue';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const { model, agents, workflowsById } = defineProps<{
	model: ChatHubConversationModel;
	agents: ChatHubAgentDto[];
	workflowsById: Partial<Record<string, IWorkflowDb>>;
}>();

const emit = defineEmits<{
	edit: [];
	delete: [];
}>();

const description = computed(() => {
	if (model.provider === 'custom-agent') {
		const agent = agents.find((a) => a.id === model.agentId);

		if (agent?.description) {
			return agent.description;
		}
	}

	return 'No description';
});

const updatedAt = computed(() => getTimestamp(model, 'updatedAt', agents, workflowsById));
const createdAt = computed(() => getTimestamp(model, 'createdAt', agents, workflowsById));
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
			<div :class="$style.metadata">
				<N8nText size="small" color="text-light">
					{{ model.provider === 'n8n' ? 'n8n workflow' : 'Custom agent' }}
				</N8nText>
				<N8nText v-if="updatedAt" size="small" color="text-light">
					Last updated <TimeAgo :date="String(updatedAt)" />
				</N8nText>
				<N8nText v-if="createdAt" size="small" color="text-light">
					Created <TimeAgo :date="String(createdAt)" />
				</N8nText>
			</div>
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
	display: flex;
	align-items: center;

	& > * {
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	& > *:not(:last-child):after {
		content: '•';
		display: block;
		padding-inline: var(--spacing--3xs);
	}
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
