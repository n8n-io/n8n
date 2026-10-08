<script setup lang="ts">
import { computed, onScopeDispose, provide, ref, useTemplateRef, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import type { AgentN8nChatAgentDetails } from '@n8n/api-types';
import { N8nEmptyState, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { AgentJsonConfig } from '../types';
import {
	AGENT_BUILDER_VIEW,
	AGENT_N8N_CHAT_VIEW,
	AGENT_N8N_CHAT_RECENT_THREADS_LIMIT,
} from '../constants';
import { getN8nChatAgent } from '../composables/useAgentApi';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentProjectBreadcrumb } from '../composables/useAgentProjectBreadcrumb';
import { isNotFoundError } from '../utils/errors';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import { AGENT_SUB_AGENT_NAMES_KEY } from '../components/agentChatInjectionKeys';
import AgentPersonalisationIcon from '../components/AgentPersonalisationIcon.vue';
import N8nChatPageLayout from './components/N8nChatPageLayout.vue';
import N8nChatThreadHistory from './components/N8nChatThreadHistory.vue';
import { useAgentN8nChatThreadsStore } from './n8nChatThreads.store';
import { consumePendingN8nChatMessage, type PendingN8nChatMessage } from './pendingN8nChatMessage';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { firstMessageTitle } from '@/features/ai/instanceAi/instanceAi.threadRuntime';

// `agentThreadId` (not `threadId`): this route's sibling `InstanceAiLayout` reads
// `route.params.threadId` for an n8n Assistant thread id, and the two must not collide.
const props = defineProps<{ agentId: string; agentThreadId?: string }>();

const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const threadsStore = useAgentN8nChatThreadsStore();

const agent = ref<AgentN8nChatAgentDetails | null>(null);
const isLoading = ref(true);
const notFound = ref(false);
const loadFailed = ref(false);

let loadVersion = 0;
// Makes a response that settles after unmount stale, so it cannot toast on the next page.
onScopeDispose(() => loadVersion++);

async function loadAgent(id: string): Promise<void> {
	const version = ++loadVersion;
	isLoading.value = true;
	notFound.value = false;
	loadFailed.value = false;
	try {
		const result = await getN8nChatAgent(rootStore.restApiContext, id);
		if (version !== loadVersion) return;
		agent.value = result;
	} catch (error) {
		if (version !== loadVersion) return;
		agent.value = null;
		if (isNotFoundError(error)) {
			notFound.value = true;
		} else {
			loadFailed.value = true;
			toast.showError(error, i18n.baseText('agents.n8nChatPage.loadError'));
		}
	} finally {
		if (version === loadVersion) isLoading.value = false;
	}
}

function retryLoad(): void {
	void loadAgent(props.agentId);
}

// Minted once per (agent, no-thread) visit, like the builder's "new chat":
// sent as `sessionId` + `newSession: true` on the first message, so the
// server adopts this id as the thread instead of minting its own — letting
// `onSessionCreated` move it into the URL without remounting the panel.
const mintedSessionId = ref<string>();
// `||`, not `??`: an absent optional route param resolves to `''`.
const continueSessionId = computed(() => props.agentThreadId || mintedSessionId.value);
const isNewSession = computed(() => !props.agentThreadId);

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');

// Hand-off from the Assistant picker. Consumed per `agentId` because `RouterView`
// reuses this view across agents.
let pendingMessage: PendingN8nChatMessage | undefined;
watch(
	() => props.agentId,
	async (id) => {
		if (!id) return;
		pendingMessage = consumePendingN8nChatMessage(id);
		await loadAgent(id);
	},
	{ immediate: true },
);

// Mints a fresh session id every time there's no thread in the URL — on mount,
// after navigating back to the agent-only URL from a thread, and for a
// different agent — so "new chat" always starts a session the server hasn't
// seen. Cleared once a thread id is present; `continueSessionId` prefers that anyway.
watch(
	() => [props.agentId, props.agentThreadId] as const,
	([, threadId]) => {
		mintedSessionId.value = threadId ? undefined : crypto.randomUUID();
	},
	{ immediate: true },
);

watch(panel, (current) => {
	if (!current || !pendingMessage || props.agentThreadId) return;
	current.sendMessageFromOutside(pendingMessage.text, pendingMessage.files);
	pendingMessage = undefined;
});

// The same recent-threads list the sidebar shows, so both name the open chat the same way.
// A thread outside the newest page (e.g. opened directly by URL) is missing here until
// `loadThread` below adds it.
const firstUserMessage = ref<string>();
// Like the n8n Assistant: the generated title, else the first user message until the
// title arrives, else a generic label for a known but untitled thread.
const threadTitle = computed(() => {
	if (!props.agentThreadId) return undefined;
	const thread = threadsStore.threadsById.get(props.agentThreadId);
	if (thread?.title) return thread.title;
	if (firstUserMessage.value?.trim()) return firstMessageTitle(firstUserMessage.value);
	return thread ? i18n.baseText('commandBar.instanceAi.newThread') : undefined;
});

// Fetches a thread the store doesn't know yet, once per (agent, thread) pair — not on
// every store change, or a fetch that adds the thread would retrigger itself.
watch(
	() => [props.agentId, props.agentThreadId] as const,
	([, threadId]) => {
		if (!threadId) return;
		if (threadsStore.threadsById.has(threadId)) return;
		void threadsStore.loadThread(threadId);
	},
	{ immediate: true },
);

function onSessionCreated(sessionId: string): void {
	void router.replace({
		name: AGENT_N8N_CHAT_VIEW,
		params: { agentId: props.agentId, agentThreadId: sessionId },
	});
}

// `update:streaming` going false is this chat's "turn finished" signal — refresh the
// sidebar every turn, since a title or an order can change on any of them, not just
// the first.
let wasStreaming = false;
function onStreamingChange(streaming: boolean): void {
	if (wasStreaming && !streaming) {
		void threadsStore.fetchRecent(AGENT_N8N_CHAT_RECENT_THREADS_LIMIT);
	}
	wasStreaming = streaming;
}

// The route carries no project id — a chat-only member never gets one in the
// URL — so every API call derives it from the agent the cross-project lookup
// already resolved.
const projectId = computed(() => agent.value?.project.id ?? '');

const subAgentNameById = computed(() => {
	const map = new Map<string, string>();
	for (const subAgent of agent.value?.subAgents ?? []) map.set(subAgent.id, subAgent.name);
	return map;
});
provide(AGENT_SUB_AGENT_NAMES_KEY, subAgentNameById);

const agentConfig = computed<AgentJsonConfig | null>(() => {
	const current = agent.value;
	if (!current) return null;
	return {
		name: current.name,
		// The chat-only audience this page serves never receives the model or
		// instructions (see `AgentChatListItem`) — the model stays empty here,
		// and `AgentChatPanel` gets attachment support from the route's
		// `attachments` field instead of deriving it from this config.
		model: '',
		instructions: '',
		...(current.description !== undefined ? { description: current.description } : {}),
		...(current.personalisation ? { personalisation: current.personalisation } : {}),
	};
});

const { projectName, projectIcon } = useAgentProjectBreadcrumb(projectId);
// Falls back to the agent's own project name when the project isn't in the
// store — a chat-only member's projects list doesn't necessarily carry it.
const projectLabel = computed(() => projectName.value ?? agent.value?.project.name ?? '');

const { canRead } = useAgentPermissions(projectId);
const canOpenAgentPage = computed(() => agent.value !== null && canRead.value);

const agentPageRoute = computed(() => {
	const current = agent.value;
	if (!current) return undefined;
	return {
		name: AGENT_BUILDER_VIEW,
		params: { projectId: current.project.id, agentId: current.id },
	};
});
</script>

<template>
	<N8nChatPageLayout fill>
		<template v-if="agent" #leading>
			<N8nChatThreadHistory :agent-id="agentId" :title="threadTitle" />
		</template>

		<div v-if="isLoading" :class="$style.centered" data-testid="agent-n8n-chat-loading">
			<N8nSpinner size="xlarge" />
		</div>
		<N8nEmptyState
			v-else-if="notFound"
			:class="$style.centered"
			data-testid="agent-n8n-chat-unavailable"
			:icon="{ type: 'icon', value: 'circle-alert' }"
			:heading="i18n.baseText('agents.n8nChatPage.unavailable.title')"
		/>
		<N8nEmptyState
			v-else-if="loadFailed"
			:class="$style.centered"
			data-testid="agent-n8n-chat-load-error"
			:icon="{ type: 'icon', value: 'circle-alert' }"
			:heading="i18n.baseText('agents.n8nChatPage.loadFailed.title')"
			:button-text="i18n.baseText('generic.retry')"
			@click:button="retryLoad"
		/>
		<AgentChatPanel
			v-else-if="agent"
			ref="panel"
			:project-id="projectId"
			:agent-id="agentId"
			mode="inline"
			:continue-session-id="continueSessionId"
			:new-session="isNewSession"
			:agent-config="agentConfig"
			:attachment-capabilities="agent.attachments"
			agent-status="production"
			:connected-triggers="[]"
			channel="n8n-chat"
			:background-jobs-active="true"
			center-empty-state
			@session-created="onSessionCreated"
			@update:streaming="onStreamingChange"
			@first-user-message="firstUserMessage = $event"
		>
			<template #empty-state>
				<div :class="$style.emptyState" data-testid="agent-n8n-chat-empty-state">
					<AgentPersonalisationIcon :personalisation="agent.personalisation" :size="64" />
					<div :class="$style.nameRow">
						<N8nText tag="h2" bold>{{ agent.name }}</N8nText>
						<RouterLink
							v-if="canOpenAgentPage && agentPageRoute"
							:to="agentPageRoute"
							:aria-label="i18n.baseText('agents.n8nChatPage.openAgentPage')"
							:class="$style.openAgentPage"
							data-testid="agent-n8n-chat-open-page"
						>
							<N8nIcon icon="external-link" size="small" />
						</RouterLink>
					</div>
					<N8nText
						v-if="agent.description"
						color="text-light"
						data-testid="agent-n8n-chat-description"
					>
						{{ agent.description }}
					</N8nText>
				</div>
			</template>
			<template #input-footer>
				<div :class="$style.projectFooter" data-testid="agent-n8n-chat-project">
					<ProjectIcon :icon="projectIcon" border-less size="mini" aria-hidden="true" />
					{{ projectLabel }}
				</div>
			</template>
		</AgentChatPanel>
	</N8nChatPageLayout>
</template>

<style lang="scss" module>
.centered {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding-bottom: var(--spacing--lg);
	gap: var(--spacing--3xs);
	text-align: center;
}

.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

// Icon links follow the text color, not the link accent.
.openAgentPage {
	display: inline-flex;
	color: var(--text-color);

	&:hover {
		color: var(--text-color--subtle);
	}
}

// Same strip as the project picker under the n8n Assistant input
// (`InstanceAiEmptyView`'s `.inputFooter`): it tucks under the composer's rounded bottom.
.projectFooter {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-top: calc(-1 * var(--radius--xl));
	padding: calc(var(--spacing--2xs) + var(--radius--xl)) var(--spacing--xs) var(--spacing--2xs);
	background-color: light-dark(var(--color--neutral-150), var(--color--neutral-800));
	border-bottom-left-radius: var(--radius--xl);
	border-bottom-right-radius: var(--radius--xl);
	color: var(--text-color);
	font-size: var(--font-size--sm);
}
</style>
