<script setup lang="ts">
import type { AgentCardData } from '@/features/ai/chatHub/chat.types';
import { N8nAvatar, N8nIconButton, N8nText } from '@n8n/design-system';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
import { getAgentRoute } from '@/features/ai/chatHub/chat.utils';

const props = defineProps<{
	data: AgentCardData;
}>();

const emit = defineEmits<{
	edit: [];
	delete: [];
}>();

const isCustomAgent = computed(() => props.data.type === 'custom-agent');

const name = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.name;
	}
	return props.data.name;
});

const description = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.description || 'No description';
	}
	return 'n8n workflow agent';
});

const provider = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.provider;
	}
	return 'n8n';
});

const model = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.model;
	}
	return null;
});

const metadata = computed(() => {
	const parts = [];

	if (props.data.type === 'custom-agent') {
		parts.push(`${providerDisplayNames[provider.value]} • ${model.value}`);
		parts.push('Private');
	} else {
		parts.push(`${providerDisplayNames[provider.value]} workflow`);
	}

	return parts.join(' • ');
});

const avatarText = computed(() => {
	return name.value.charAt(0).toUpperCase();
});
</script>

<template>
	<RouterLink :to="getAgentRoute(data)" :class="$style.card">
		<N8nAvatar :class="$style.avatar" size="large">{{ avatarText }}</N8nAvatar>

		<div :class="$style.content">
			<N8nText tag="h3" size="medium" bold :class="$style.title">
				{{ name }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ description }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.metadata">
				{{ metadata }}
			</N8nText>
		</div>

		<div v-if="isCustomAgent" :class="$style.actions">
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
