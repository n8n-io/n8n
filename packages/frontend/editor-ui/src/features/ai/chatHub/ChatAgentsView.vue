<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { N8nButton, N8nCard, N8nIconButton, N8nText } from '@n8n/design-system';
import { computed, onMounted } from 'vue';
import type { ChatHubAgentDto } from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';

const chatStore = useChatStore();
const toast = useToast();
const message = useMessage();

const agents = computed(() => chatStore.agents);

function handleCreateAgent() {
	// TODO: Integrate with AgentEditorModal when it's available
	chatStore.currentEditingAgent = null;
}

function handleEditAgent(agent: ChatHubAgentDto) {
	// TODO: Integrate with AgentEditorModal when it's available
	chatStore.currentEditingAgent = agent;
}

async function handleDeleteAgent(agentId: string) {
	const confirmed = await message.confirm(
		'Are you sure you want to delete this agent?',
		'Delete agent',
		{
			confirmButtonText: 'Delete',
			cancelButtonText: 'Cancel',
		},
	);

	if (confirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await chatStore.deleteAgent(agentId);
		toast.showMessage({ type: 'success', title: 'Agent deleted successfully' });
	} catch (error) {
		toast.showError(error, 'Could not delete the agent');
	}
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffInMs = now.getTime() - date.getTime();
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (diffInDays === 0) {
		return 'Today';
	}
	if (diffInDays === 1) {
		return 'Yesterday';
	}
	if (diffInDays < 7) {
		return `${diffInDays} days ago`;
	}

	return date.toLocaleDateString();
}

onMounted(async () => {
	await chatStore.fetchAgents();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.headerContent">
				<N8nText tag="h1" size="xlarge" bold>Custom Agents</N8nText>
				<N8nText color="text-light">
					Create and manage custom AI agents with specific instructions and behaviors
				</N8nText>
			</div>
			<N8nButton icon="plus" type="primary" size="large" @click="handleCreateAgent">
				New Agent
			</N8nButton>
		</div>

		<div v-if="agents.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="medium">
				No custom agents yet. Create your first agent to get started.
			</N8nText>
		</div>

		<div :class="$style.agentsGrid">
			<N8nCard
				v-for="agent in agents"
				:key="agent.id"
				:class="$style.agentCard"
				hoverable
				@click="handleEditAgent(agent)"
			>
				<div :class="$style.cardContent">
					<div :class="$style.cardHeader">
						<N8nText tag="h3" size="medium" bold>{{ agent.name }}</N8nText>
						<div :class="$style.cardActions" @click.stop>
							<N8nIconButton
								icon="pen"
								type="tertiary"
								size="small"
								title="Edit agent"
								@click="handleEditAgent(agent)"
							/>
							<N8nIconButton
								icon="trash-2"
								type="tertiary"
								size="small"
								title="Delete agent"
								@click="handleDeleteAgent(agent.id)"
							/>
						</div>
					</div>

					<N8nText v-if="agent.description" :class="$style.description" color="text-light">
						{{ agent.description }}
					</N8nText>

					<div :class="$style.metadata">
						<N8nText size="xsmall" color="text-light">
							<span v-if="agent.provider && agent.model">
								{{ providerDisplayNames[agent.provider] }} • {{ agent.model }}
							</span>
							<span v-else>No model configured</span>
						</N8nText>
						<N8nText size="xsmall" color="text-light" :class="$style.lastUpdate">
							Updated {{ formatDate(agent.updatedAt) }}
						</N8nText>
					</div>
				</div>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: var(--spacing--xl);
	gap: var(--spacing--xl);
	overflow-y: auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--lg);
}

.headerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}

.agentsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: var(--spacing--lg);
}

.agentCard {
	cursor: pointer;
	transition: transform 0.2s ease;

	&:hover {
		transform: translateY(-2px);
	}
}

.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	min-width: 0;
	overflow: hidden;
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--xs);
	min-width: 0;

	h3 {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 1;
	}
}

.cardActions {
	display: flex;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.description {
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	text-overflow: ellipsis;
	min-height: 2.6em;
	word-break: break-word;
}

.metadata {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	min-width: 0;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
}

.lastUpdate {
	flex-shrink: 0;
}
</style>
