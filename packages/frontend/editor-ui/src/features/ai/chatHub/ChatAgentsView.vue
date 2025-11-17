<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import ChatAgentCard from '@/features/ai/chatHub/components/ChatAgentCard.vue';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { useUsersStore } from '@/features/settings/users/users.store';
import { type ChatHubConversationModel } from '@n8n/api-types';
import { filterAndSortAgents, stringifyModel } from '@/features/ai/chatHub/chat.utils';
import type { ChatAgentFilter } from '@/features/ai/chatHub/chat.types';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { useMediaQuery } from '@vueuse/core';
import { AGENT_EDITOR_MODAL_KEY, MOBILE_MEDIA_QUERY } from '@/features/ai/chatHub/constants';
import { useRouter } from 'vue-router';

const chatStore = useChatStore();
const uiStore = useUIStore();
const toast = useToast();
const message = useMessage();
const usersStore = useUsersStore();
const sidebar = useChatHubSidebarState();
const router = useRouter();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);

const agentFilter = ref<ChatAgentFilter>({
	search: '',
	provider: '',
	sortBy: 'updatedAt',
});

const { credentialsByProvider } = useChatCredentials(usersStore.currentUserId ?? 'anonymous');

const readyToShowList = computed(() => chatStore.agentsReady);
const allModels = computed(() =>
	chatStore.agents.n8n.models.concat(chatStore.agents['custom-agent'].models),
);

const agents = computed(() => filterAndSortAgents(allModels.value, agentFilter.value));

const providerOptions = [
	{ label: 'All', value: '' },
	{ label: 'Custom agents', value: 'custom-agent' },
	{ label: 'n8n workflows', value: 'n8n' },
] as const;

const sortOptions = [
	{ label: 'Sort by last updated', value: 'updatedAt' },
	{ label: 'Sort by created', value: 'createdAt' },
];

function handleCreateAgent() {
	chatStore.currentEditingAgent = null;
	uiStore.openModalWithData({
		name: AGENT_EDITOR_MODAL_KEY,
		data: {
			credentials: credentialsByProvider,
		},
	});
}

async function handleEditAgent(model: ChatHubConversationModel) {
	if (model.provider === 'n8n') {
		const routeData = router.resolve({
			name: VIEWS.WORKFLOW,
			params: {
				name: model.workflowId,
			},
		});

		window.open(routeData.href, '_blank');
		return;
	}

	if (model.provider === 'custom-agent') {
		try {
			await chatStore.fetchCustomAgent(model.agentId);
			uiStore.openModalWithData({
				name: AGENT_EDITOR_MODAL_KEY,
				data: {
					agentId: model.agentId,
					credentials: credentialsByProvider,
				},
			});
		} catch (error) {
			toast.showError(error, 'Failed to load agent');
		}
	}
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

	if (confirmed !== MODAL_CONFIRM || !credentialsByProvider.value) {
		return;
	}

	try {
		await chatStore.deleteCustomAgent(agentId, credentialsByProvider.value);
		toast.showMessage({ type: 'success', title: 'Agent deleted successfully' });
	} catch (error) {
		toast.showError(error, 'Could not delete the agent');
	}
}

watch(
	credentialsByProvider,
	(credentials) => {
		if (credentials) {
			void chatStore.fetchAgents(credentials);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="[$style.container, { [$style.isMobileDevice]: isMobileDevice }]">
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

		<div v-if="readyToShowList && allModels.length > 0" :class="$style.controls">
			<N8nInput v-model="agentFilter.search" :class="$style.search" placeholder="Search" clearable>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>

			<N8nSelect v-model="agentFilter.provider" :class="$style.filter">
				<N8nOption
					v-for="option in providerOptions"
					:key="String(option.value)"
					:label="option.label"
					:value="option.value"
				/>
			</N8nSelect>

			<N8nSelect v-model="agentFilter.sortBy" :class="$style.sort" placeholder="Sort by">
				<N8nOption
					v-for="option in sortOptions"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
			</N8nSelect>
		</div>

		<template v-if="!readyToShowList" />

		<div v-else-if="allModels.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="medium">
				No agents available. Create your first custom agent to get started.
			</N8nText>
		</div>

		<div v-else-if="agents.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="medium"> No agents match your search criteria. </N8nText>
		</div>

		<div v-else :class="$style.agentsGrid">
			<ChatAgentCard
				v-for="agent in agents"
				:key="stringifyModel(agent.model)"
				:agent="agent"
				@edit="handleEditAgent(agent.model)"
				@delete="
					agent.model.provider === 'custom-agent'
						? handleDeleteAgent(agent.model.agentId)
						: undefined
				"
			/>
		</div>

		<N8nIconButton
			v-if="!sidebar.isStatic.value"
			:class="$style.menuButton"
			type="secondary"
			icon="panel-left"
			text
			icon-size="large"
			@click="sidebar.toggleOpen(true)"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--xl);
	gap: var(--spacing--xl);
	overflow-y: auto;
	position: relative;
}

.menuButton {
	position: fixed;
	top: 0;
	left: 0;
	margin: var(--spacing--sm);

	.isMobileDevice & {
		margin: var(--spacing--2xs);
	}
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

.controls {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.search {
	flex: 1;
	min-width: 200px;
}

.filter {
	width: 200px;
}

.sort {
	width: 200px;
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
	gap: var(--spacing--2xs);
}
</style>
