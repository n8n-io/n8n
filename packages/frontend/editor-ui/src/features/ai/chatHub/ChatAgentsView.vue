<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { N8nButton, N8nText } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import type { ChatHubAgentDto } from '@n8n/api-types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useUIStore } from '@/stores/ui.store';
import AgentEditorModal from '@/features/ai/chatHub/components/AgentEditorModal.vue';
import ChatAgentCard from '@/features/ai/chatHub/components/ChatAgentCard.vue';
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import { chatHubProviderSchema, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

const chatStore = useChatStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const toast = useToast();
const message = useMessage();

const agents = computed(() => chatStore.agents);
const editingAgentId = ref<string | undefined>(undefined);

const autoSelectCredentials = computed<CredentialsMap>(() =>
	Object.fromEntries(
		chatHubProviderSchema.options.map((provider) => {
			if (provider === 'n8n' || provider === 'custom-agent') {
				return [provider, null];
			}

			const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
			if (!credentialType) {
				return [provider, null];
			}

			const lastCreatedCredential =
				credentialsStore
					.getCredentialsByType(credentialType)
					.toSorted((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.id ?? null;

			return [provider, lastCreatedCredential];
		}),
	),
);

function getAgentRoute(agent: ChatHubAgentDto) {
	return {
		name: CHAT_VIEW,
		query: {
			agentId: agent.id,
		},
	};
}

function handleCreateAgent() {
	chatStore.currentEditingAgent = null;
	editingAgentId.value = undefined;
	uiStore.openModal('agentEditor');
}

async function handleEditAgent(agent: ChatHubAgentDto, event?: MouseEvent) {
	// Prevent card click when clicking action buttons
	if (event) {
		event.stopPropagation();
	}

	try {
		await chatStore.fetchAgent(agent.id);
		editingAgentId.value = agent.id;
		uiStore.openModal('agentEditor');
	} catch (error) {
		toast.showError(error, 'Failed to load agent');
	}
}

function handleCloseAgentEditor() {
	editingAgentId.value = undefined;
}

async function handleAgentCreatedOrUpdated() {
	await chatStore.fetchAgents();
	editingAgentId.value = undefined;
}

async function handleDeleteAgent(agentId: string, event?: MouseEvent) {
	// Prevent card click when clicking delete button
	if (event) {
		event.stopPropagation();
	}
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

onMounted(async () => {
	await Promise.all([
		chatStore.fetchAgents(),
		credentialsStore.fetchCredentialTypes(false),
		credentialsStore.fetchAllCredentials(),
	]);
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

		<div v-else :class="$style.agentsGrid">
			<ChatAgentCard
				v-for="agent in agents"
				:key="agent.id"
				:agent="agent"
				:to="getAgentRoute(agent)"
				@edit="handleEditAgent(agent, $event)"
				@delete="handleDeleteAgent(agent.id, $event)"
			/>
		</div>

		<AgentEditorModal
			:agent-id="editingAgentId"
			:credentials="autoSelectCredentials"
			@create-agent="handleAgentCreatedOrUpdated"
			@close="handleCloseAgentEditor"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	padding: var(--spacing--xl);
	gap: var(--spacing--xl);
	overflow-y: auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--lg);
	width: 100%;
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
	flex: 1;
	width: 100%;
}

.agentsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: var(--spacing--lg);
}
</style>
