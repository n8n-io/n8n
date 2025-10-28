<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { N8nButton, N8nText } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import AgentEditorModal from '@/features/ai/chatHub/components/AgentEditorModal.vue';
import ChatAgentCard from '@/features/ai/chatHub/components/ChatAgentCard.vue';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { useUsersStore } from '@/features/settings/users/users.store';
import { type ChatHubConversationModel } from '@n8n/api-types';

const chatStore = useChatStore();
const uiStore = useUIStore();
const toast = useToast();
const message = useMessage();
const usersStore = useUsersStore();

const editingAgentId = ref<string | undefined>(undefined);

const { credentialsByProvider } = useChatCredentials(usersStore.currentUserId ?? 'anonymous');

const models = computed(() =>
	chatStore.agents
		.map<ChatHubConversationModel>((agent) => ({
			provider: 'custom-agent',
			agentId: agent.id,
			name: agent.name,
		}))
		.concat(
			(chatStore.models?.n8n?.models ?? []).flatMap((model) =>
				model.provider === 'n8n' ? [{ ...model, type: 'n8n-workflow' }] : [],
			),
		),
);

function handleCreateAgent() {
	chatStore.currentEditingAgent = null;
	editingAgentId.value = undefined;
	uiStore.openModal('agentEditor');
}

async function handleEditAgent(model: ChatHubConversationModel) {
	if (model.provider !== 'custom-agent') {
		return;
	}

	try {
		await chatStore.fetchAgent(model.agentId);
		editingAgentId.value = model.agentId;
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

onMounted(async () => {
	await Promise.all([
		chatStore.fetchAgents(),
		chatStore.fetchChatModels(credentialsByProvider.value),
	]);
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.headerContent">
				<N8nText tag="h1" size="xlarge" bold>Custom Agents</N8nText>
				<N8nText color="text-light">
					Use n8n workflow agents or create custom AI agents with specific instructions and
					behaviors
				</N8nText>
			</div>
			<N8nButton icon="plus" type="primary" size="large" @click="handleCreateAgent">
				New Agent
			</N8nButton>
		</div>

		<div v-if="models.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="medium">
				No agents available. Create your first custom agent to get started.
			</N8nText>
		</div>

		<div v-else :class="$style.agentsGrid">
			<ChatAgentCard
				v-for="model in models"
				:key="`${model.provider}::${model.provider === 'custom-agent' ? model.agentId : model.provider === 'n8n' ? model.workflowId : model.model}`"
				:model="model"
				:agents="chatStore.agents"
				@edit="handleEditAgent(model)"
				@delete="model.provider === 'custom-agent' ? handleDeleteAgent(model.agentId) : undefined"
			/>
		</div>

		<AgentEditorModal
			:agent-id="editingAgentId"
			:credentials="credentialsByProvider"
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
	max-width: var(--content-container-width);
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
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
</style>
