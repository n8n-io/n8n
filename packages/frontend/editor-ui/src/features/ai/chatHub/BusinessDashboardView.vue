<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { useMediaQuery } from '@vueuse/core';
import { N8nButton, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { CHAT_VIEW, CHAT_AGENTS_VIEW, MOBILE_MEDIA_QUERY } from '@/features/ai/chatHub/constants';
import { BUSINESS_AGENT_TEMPLATES } from '@/features/ai/chatHub/business-templates';

const router = useRouter();
const chatStore = useChatStore();
const usersStore = useUsersStore();
const uiStore = useUIStore();
const sidebar = useChatHubSidebarState();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);

const { credentialsByProvider } = useChatCredentials(usersStore.currentUserId ?? 'anonymous');

// Load agents and sessions data
watch(
	credentialsByProvider,
	(credentials) => {
		if (credentials) {
			void chatStore.fetchAgents(credentials);
		}
	},
	{ immediate: true },
);

watch(
	() => chatStore.sessionsReady,
	(ready) => {
		if (!ready) {
			void chatStore.fetchSessions();
		}
	},
	{ immediate: true },
);

const totalAgents = computed(() => {
	const customAgents = chatStore.agents['custom-agent'].models.length;
	const n8nAgents = chatStore.agents.n8n.models.length;
	return customAgents + n8nAgents;
});

const totalConversations = computed(() => chatStore.sessions.length);

const recentSessions = computed(() =>
	[...chatStore.sessions]
		.sort((a, b) => {
			const aTime = a.lastMessageAt ?? a.createdAt;
			const bTime = b.lastMessageAt ?? b.createdAt;
			return bTime.localeCompare(aTime);
		})
		.slice(0, 5),
);

const featuredTemplates = computed(() => BUSINESS_AGENT_TEMPLATES.slice(0, 3));

const integrationCards = [
	{
		id: 'crm',
		title: 'Connect your CRM',
		description: 'Link agents to HubSpot, Salesforce, or Pipedrive to manage leads automatically.',
		icon: 'database' as const,
		action: 'Set up CRM workflow',
		color: 'crm',
	},
	{
		id: 'documents',
		title: 'Add a knowledge base',
		description: 'Connect documents, PDFs, or Notion pages so agents can answer questions.',
		icon: 'file-text' as const,
		action: 'Connect documents',
		color: 'docs',
	},
	{
		id: 'embed',
		title: 'Embed on your website',
		description: 'Deploy a chat widget on your website for customer-facing interactions.',
		icon: 'code' as const,
		action: 'Get embed code',
		color: 'embed',
	},
];

function navigateToChat() {
	void router.push({ name: CHAT_VIEW });
}

function navigateToAgents() {
	void router.push({ name: CHAT_AGENTS_VIEW });
}

function openNewAgentModal() {
	chatStore.currentEditingAgent = null;
	uiStore.openModal('agentEditor');
}

function openConversation(sessionId: string) {
	void router.push({ name: 'chat-conversation', params: { id: sessionId } });
}

function formatRelativeTime(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}
</script>

<template>
	<div :class="[$style.container, { [$style.isMobileDevice]: isMobileDevice }]">
		<!-- Page header -->
		<div :class="$style.pageHeader">
			<div>
				<N8nText tag="h1" size="xlarge" bold>AI Agent Hub</N8nText>
				<N8nText color="text-light">
					Manage your business AI agents, conversations, and integrations.
				</N8nText>
			</div>
			<div :class="$style.headerActions">
				<N8nButton type="secondary" size="large" @click="navigateToChat">
					Open Chat
				</N8nButton>
				<N8nButton type="primary" size="large" icon="plus" @click="openNewAgentModal">
					New Agent
				</N8nButton>
			</div>
		</div>

		<!-- Stats row -->
		<div :class="$style.statsRow">
			<div :class="$style.statCard" data-test-id="stat-agents">
				<div :class="$style.statIcon">
					<N8nIcon icon="bot" size="large" />
				</div>
				<div :class="$style.statContent">
					<N8nText tag="p" size="2xlarge" bold :class="$style.statNumber">
						{{ totalAgents }}
					</N8nText>
					<N8nText color="text-light" size="small">Active agents</N8nText>
				</div>
			</div>

			<div :class="$style.statCard" data-test-id="stat-conversations">
				<div :class="$style.statIcon">
					<N8nIcon icon="message-circle" size="large" />
				</div>
				<div :class="$style.statContent">
					<N8nText tag="p" size="2xlarge" bold :class="$style.statNumber">
						{{ totalConversations }}
					</N8nText>
					<N8nText color="text-light" size="small">Conversations</N8nText>
				</div>
			</div>

			<div :class="$style.statCard" data-test-id="stat-integrations">
				<div :class="$style.statIcon">
					<N8nIcon icon="layers" size="large" />
				</div>
				<div :class="$style.statContent">
					<N8nText tag="p" size="2xlarge" bold :class="$style.statNumber">3</N8nText>
					<N8nText color="text-light" size="small">Integrations available</N8nText>
				</div>
			</div>
		</div>

		<!-- Main content grid -->
		<div :class="$style.mainGrid">
			<!-- Left column -->
			<div :class="$style.leftColumn">
				<!-- Quick start with templates -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nText tag="h2" size="large" bold>Quick start</N8nText>
						<N8nButton type="tertiary" size="small" @click="navigateToAgents">
							View all agents
						</N8nButton>
					</div>
					<div :class="$style.templateGrid">
						<button
							v-for="template in featuredTemplates"
							:key="template.id"
							:class="[$style.templateCard, $style[template.category]]"
							data-test-id="dashboard-template-card"
							@click="openNewAgentModal"
						>
							<div :class="$style.templateCardIcon">
								<N8nIcon :icon="template.icon" size="medium" />
							</div>
							<N8nText bold size="small" :class="$style.templateName">
								{{ template.name }}
							</N8nText>
							<N8nText color="text-light" size="xsmall" :class="$style.templateDesc">
								{{ template.description.slice(0, 80) }}...
							</N8nText>
						</button>
					</div>
				</div>

				<!-- Integration cards -->
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nText tag="h2" size="large" bold>Integrations</N8nText>
					</div>
					<div :class="$style.integrationList">
						<div
							v-for="card in integrationCards"
							:key="card.id"
							:class="$style.integrationCard"
							:data-test-id="`integration-card-${card.id}`"
						>
							<div :class="[$style.integrationIcon, $style[`icon-${card.color}`]]">
								<N8nIcon :icon="card.icon" size="medium" />
							</div>
							<div :class="$style.integrationContent">
								<N8nText bold size="small">{{ card.title }}</N8nText>
								<N8nText color="text-light" size="xsmall">{{ card.description }}</N8nText>
							</div>
							<N8nButton type="tertiary" size="small" :class="$style.integrationAction">
								{{ card.action }}
							</N8nButton>
						</div>
					</div>
				</div>
			</div>

			<!-- Right column: Recent conversations -->
			<div :class="$style.rightColumn">
				<div :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nText tag="h2" size="large" bold>Recent conversations</N8nText>
						<N8nButton type="tertiary" size="small" @click="navigateToChat">
							View all
						</N8nButton>
					</div>

					<div v-if="recentSessions.length === 0" :class="$style.emptyState">
						<N8nIcon icon="message-circle" size="xlarge" color="text-light" />
						<N8nText color="text-light" size="small">No conversations yet.</N8nText>
						<N8nButton type="secondary" size="small" @click="navigateToChat">
							Start a chat
						</N8nButton>
					</div>

					<div v-else :class="$style.sessionList">
						<button
							v-for="session in recentSessions"
							:key="session.id"
							:class="$style.sessionItem"
							:data-test-id="`session-item-${session.id}`"
							@click="openConversation(session.id)"
						>
							<div :class="$style.sessionAvatar">
								<N8nIcon icon="message-circle" size="small" />
							</div>
							<div :class="$style.sessionContent">
								<N8nText bold size="small" :class="$style.sessionTitle">
									{{ session.title }}
								</N8nText>
								<N8nText color="text-light" size="xsmall">
									{{ session.agentName ?? session.provider ?? 'Chat' }}
								</N8nText>
							</div>
							<N8nText color="text-light" size="xsmall" :class="$style.sessionTime">
								{{ formatRelativeTime(session.lastMessageAt ?? session.createdAt) }}
							</N8nText>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Sidebar toggle on mobile -->
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

.pageHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--lg);
	flex-wrap: wrap;
}

.headerActions {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

/* Stats */
.statsRow {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--sm);

	.isMobileDevice & {
		grid-template-columns: 1fr;
	}
}

.statCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	background: var(--color--background);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
}

.statIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
	border-radius: var(--radius--lg);
	flex-shrink: 0;
}

.statContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.statNumber {
	margin: 0;
	line-height: 1;
}

/* Main grid */
.mainGrid {
	display: grid;
	grid-template-columns: 1fr 360px;
	gap: var(--spacing--lg);

	.isMobileDevice & {
		grid-template-columns: 1fr;
	}
}

.leftColumn,
.rightColumn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

/* Sections */
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.sectionHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

/* Template cards */
.templateGrid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--2xs);

	.isMobileDevice & {
		grid-template-columns: 1fr;
	}
}

.templateCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	cursor: pointer;
	text-align: left;
	transition: all 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
		background: var(--color--primary--tint-3);
	}

	&.sales .templateCardIcon {
		background: var(--color--success--tint-4);
		color: var(--color--success--shade-1);
	}

	&.support .templateCardIcon {
		background: var(--color--primary--tint-3);
		color: var(--color--primary--shade-1);
	}

	&.operations .templateCardIcon {
		background: var(--color--warning--tint-2);
		color: var(--color--warning--shade-1);
	}

	&.crm .templateCardIcon {
		background: var(--color--secondary--tint-2);
		color: var(--color--secondary--shade-1);
	}
}

.templateCardIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: var(--radius);
	margin-bottom: var(--spacing--4xs);
}

.templateName {
	display: block;
}

.templateDesc {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--xl);
}

/* Integration cards */
.integrationList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.integrationCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--color--background);
}

.integrationIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: var(--radius);
	flex-shrink: 0;

	&.icon-crm {
		background: var(--color--secondary--tint-2);
		color: var(--color--secondary--shade-1);
	}

	&.icon-docs {
		background: var(--color--warning--tint-2);
		color: var(--color--warning--shade-1);
	}

	&.icon-embed {
		background: var(--color--primary--tint-3);
		color: var(--color--primary--shade-1);
	}
}

.integrationContent {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.integrationAction {
	flex-shrink: 0;
}

/* Recent sessions */
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	min-height: 160px;
}

.sessionList {
	display: flex;
	flex-direction: column;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.sessionItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	background: var(--color--background);
	cursor: pointer;
	text-align: left;
	border: none;
	width: 100%;
	transition: background 0.1s ease;

	&:not(:last-child) {
		border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	}

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.sessionAvatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	background: var(--color--primary--tint-3);
	color: var(--color--primary);
	border-radius: 50%;
	flex-shrink: 0;
}

.sessionContent {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.sessionTitle {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sessionTime {
	flex-shrink: 0;
}
</style>
