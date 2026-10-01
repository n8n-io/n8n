<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import type { AgentChatListItem } from '@n8n/api-types';
import { N8nEmptyState, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { AgentJsonConfig } from '../types';
import { AGENT_BUILDER_VIEW, AGENT_N8N_CHAT_VIEW } from '../constants';
import { getN8nChatAgent } from '../composables/useAgentApi';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentProjectBreadcrumb } from '../composables/useAgentProjectBreadcrumb';
import { isNotFoundError } from '../utils/errors';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentPersonalisationIcon from '../components/AgentPersonalisationIcon.vue';
import N8nChatPageLayout from './components/N8nChatPageLayout.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';

// `agentThreadId` (not `threadId`): this route's sibling `InstanceAiLayout` reads
// `route.params.threadId` for an n8n Assistant thread id, and the two must not collide.
const props = defineProps<{ agentId: string; agentThreadId?: string }>();

const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const agent = ref<AgentChatListItem | null>(null);
const isLoading = ref(true);
const notFound = ref(false);
const loadFailed = ref(false);

let loadVersion = 0;
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
const continueSessionId = computed(() => props.agentThreadId ?? mintedSessionId.value);
const isNewSession = computed(() => !props.agentThreadId);

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');

watch(
	() => props.agentId,
	async (id) => {
		if (!id) return;
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

function onSessionCreated(sessionId: string): void {
	void router.replace({
		name: AGENT_N8N_CHAT_VIEW,
		params: { agentId: props.agentId, agentThreadId: sessionId },
	});
}

// The route carries no project id — a chat-only member never gets one in the
// URL — so every API call derives it from the agent the cross-project lookup
// already resolved.
const projectId = computed(() => agent.value?.project.id ?? '');

const agentConfig = computed<AgentJsonConfig | null>(() => {
	const current = agent.value;
	if (!current) return null;
	return {
		name: current.name,
		// The chat-only audience this page serves never receives the model or
		// instructions (see `AgentChatListItem`) — an empty draft model is a
		// valid `AgentJsonConfig` and only disables attachment-capability
		// detection, which already requires that field.
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
			agent-status="production"
			:connected-triggers="[]"
			channel="n8n-chat"
			center-empty-state
			@session-created="onSessionCreated"
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
