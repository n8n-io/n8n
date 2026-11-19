<script lang="ts" setup>
import type {
	McpServerDetailDto,
	McpServerMissingCapabilityDto,
	PushMessage,
} from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nButton,
	N8nCanvasPill,
	N8nIcon,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nResizeWrapper,
	N8nSpinner,
	N8nSwitch,
	N8nTabs,
	N8nText,
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import type { ResizeData } from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import type { InstanceAiThreadLaunch } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import InstanceAiChatPanel from '@/features/ai/instanceAi/embed/InstanceAiChatPanel.vue';
import type { InstanceAiEmbedSubject } from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import McpServerAccessTab from '../components/McpServerAccessTab.vue';
import McpServerAnalyticsTab from '../components/McpServerAnalyticsTab.vue';
import McpServerBuildTab from '../components/McpServerBuildTab.vue';
import McpServerConnectTab from '../components/McpServerConnectTab.vue';
import McpServerLogsTab from '../components/McpServerLogsTab.vue';
import McpServerPlaygroundTab from '../components/McpServerPlaygroundTab.vue';
import {
	MCP_SERVERS_LIST_VIEW,
	MCP_SERVER_ASSISTANT_DEFAULT_WIDTH,
	MCP_SERVER_ASSISTANT_MAX_WIDTH,
	MCP_SERVER_ASSISTANT_MIN_WIDTH,
	MCP_SERVER_ASSISTANT_UPDATE_NOTICE_MS,
	MCP_SERVER_NEW_QUERY,
	MCP_SERVER_VIEW,
	isMcpServerTab,
	type McpServerTab,
} from '../constants';
import { useMcpServersStore } from '../mcpServers.store';

type HeaderAction = 'rename' | 'description' | 'delete';

const props = defineProps<{ serverId: string; tab?: string }>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const clipboard = useClipboard();
const store = useMcpServersStore();
const projectsStore = useProjectsStore();
const pushConnectionStore = usePushConnectionStore();
const documentTitle = useDocumentTitle();
const instanceAiAvailable = useInstanceAiAvailable();

const loading = ref(true);
const notFound = ref(false);
const server = computed<McpServerDetailDto | null>(() =>
	store.detail?.id === props.serverId ? store.detail : null,
);

// --- tabs -------------------------------------------------------------------

const activeTab = computed<McpServerTab>(() => (isMcpServerTab(props.tab) ? props.tab : 'build'));

const tabOptions = computed(() => [
	{ value: 'build' as const, label: i18n.baseText('mcpServers.tabs.build') },
	{ value: 'access' as const, label: i18n.baseText('mcpServers.tabs.access') },
	{ value: 'connect' as const, label: i18n.baseText('mcpServers.tabs.connect') },
	{ value: 'playground' as const, label: i18n.baseText('mcpServers.tabs.playground') },
	{ value: 'logs' as const, label: i18n.baseText('mcpServers.tabs.logs') },
	{ value: 'analytics' as const, label: i18n.baseText('mcpServers.tabs.analytics') },
]);

function setTab(tab: McpServerTab) {
	void router.replace({
		name: MCP_SERVER_VIEW,
		params: { serverId: props.serverId, tab: tab === 'build' ? undefined : tab },
		query: route.query,
	});
}

function onTabSelect(value: string | number) {
	if (isMcpServerTab(value)) setTab(value);
}

// --- Assistant panel --------------------------------------------------------

const showAssistant = ref(true);
const assistantWidth = ref(MCP_SERVER_ASSISTANT_DEFAULT_WIDTH);
const assistantThreadId = ref<string | undefined>();
const aiPanelRef = useTemplateRef<InstanceType<typeof InstanceAiChatPanel>>('aiPanel');
const asideRef = useTemplateRef<HTMLElement>('aside');
const personalProjectId = computed(() => projectsStore.personalProject?.id);

const assistantVisible = computed(
	() => instanceAiAvailable.value && showAssistant.value && Boolean(personalProjectId.value),
);

const assistantSubject = computed<InstanceAiEmbedSubject>(() => ({
	type: 'mcpServer',
	id: props.serverId,
	projectId: personalProjectId.value ?? '',
	name: server.value?.name,
}));

// Reuses the agent builder source: the thread source taxonomy has no MCP server value yet.
const assistantLaunch = computed<InstanceAiThreadLaunch>(() => ({
	source: 'agent_builder_page',
	origin: 'internal',
	sourceContext: { mcpServerId: props.serverId },
}));

const suggestions = computed(() => [
	{ id: 'marketing', prompt: i18n.baseText('mcpServers.assistant.suggestion.marketing') },
	{ id: 'warehouse', prompt: i18n.baseText('mcpServers.assistant.suggestion.warehouse') },
	{ id: 'research', prompt: i18n.baseText('mcpServers.assistant.suggestion.research') },
]);

function onSuggestion(index: number) {
	const suggestion = suggestions.value[index];
	aiPanelRef.value?.submitSuggestion({
		prompt: suggestion.prompt,
		suggestionId: `mcp-server-${suggestion.id}`,
		suggestionKind: 'prompt',
		position: index + 1,
		prefillType: 'suggestion_catalog',
	});
}

/** Asks the Assistant to build a tool that AI clients asked for but did not find. */
async function onBuildMissingTool(item: McpServerMissingCapabilityDto) {
	showAssistant.value = true;
	await nextTick();
	const evidence = item.precedingTools.length
		? ` ${i18n.baseText('mcpServers.assistant.buildMissingTool.before', {
				interpolate: { tools: item.precedingTools.join(', ') },
			})}`
		: '';
	const toolName = item.label
		? ` ${i18n.baseText('mcpServers.assistant.buildMissingTool.name', {
				interpolate: { name: item.label },
			})}`
		: '';
	aiPanelRef.value?.submitSuggestion({
		prompt:
			i18n.baseText('mcpServers.assistant.buildMissingTool', {
				interpolate: {
					request: item.examples.join(' / '),
					count: item.count,
					sessions: item.sessions,
				},
			}) +
			evidence +
			toolName,
		suggestionId: 'mcp-server-missing-tool',
		suggestionKind: 'prompt',
		position: 1,
		prefillType: 'suggestion_catalog',
	});
}

const logsSession = ref<string | null>(null);

function onShowSession(sessionId: string) {
	logsSession.value = sessionId;
	setTab('logs');
}

function onAssistantResize(data: ResizeData) {
	assistantWidth.value = Math.min(
		MCP_SERVER_ASSISTANT_MAX_WIDTH,
		Math.max(MCP_SERVER_ASSISTANT_MIN_WIDTH, data.width),
	);
}

/** After "Create MCP server": put the cursor in the Assistant composer. */
async function focusAssistantComposer() {
	for (let attempt = 0; attempt < 20; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 150));
		const textarea = asideRef.value?.querySelector('textarea');
		if (textarea) {
			textarea.focus();
			return;
		}
	}
}

// --- loading ----------------------------------------------------------------

async function load() {
	loading.value = true;
	notFound.value = false;
	try {
		await store.fetchServer(props.serverId);
	} catch (error) {
		notFound.value = true;
		toast.showError(error, i18n.baseText('mcpServers.server.loadError'));
	} finally {
		loading.value = false;
	}
}

watch(
	() => props.serverId,
	() => {
		assistantThreadId.value = undefined;
		void load();
	},
);

watch(
	() => server.value?.name,
	(name) => documentTitle.set(name ?? i18n.baseText('mcpServers.heading')),
);

// --- live updates -----------------------------------------------------------

const liveTick = ref(0);
const assistantUpdated = ref(false);
const highlightToolIds = ref<string[]>([]);
let assistantNoticeTimer: ReturnType<typeof setTimeout> | undefined;
let callRefreshTimer: ReturnType<typeof setTimeout> | undefined;

function changedToolIds(before: McpServerDetailDto | null, after: McpServerDetailDto): string[] {
	const previous = new Map((before?.tools ?? []).map((tool) => [tool.id, JSON.stringify(tool)]));
	return after.tools
		.filter((tool) => previous.get(tool.id) !== JSON.stringify(tool))
		.map((tool) => tool.id);
}

async function onServerUpdated(source: 'user' | 'assistant') {
	const before = server.value;
	let after: McpServerDetailDto;
	try {
		after = await store.fetchServer(props.serverId);
	} catch {
		return;
	}
	if (source !== 'assistant') return;
	clearTimeout(assistantNoticeTimer);
	assistantUpdated.value = true;
	highlightToolIds.value = changedToolIds(before, after);
	assistantNoticeTimer = setTimeout(() => {
		assistantUpdated.value = false;
		highlightToolIds.value = [];
	}, MCP_SERVER_ASSISTANT_UPDATE_NOTICE_MS);
}

function onPushMessage(event: PushMessage) {
	if (event.type === 'mcpServerUpdated' && event.data.serverId === props.serverId) {
		void onServerUpdated(event.data.source);
		return;
	}
	if (event.type === 'mcpServerCallRecorded' && event.data.serverId === props.serverId) {
		// Calls can arrive in bursts. One reload covers a burst.
		clearTimeout(callRefreshTimer);
		callRefreshTimer = setTimeout(() => {
			liveTick.value++;
			void store.fetchServers().catch(() => {});
		}, 500);
	}
}

pushConnectionStore.pushConnect();
const removePushListener = pushConnectionStore.addEventListener(onPushMessage);

// --- header -----------------------------------------------------------------

const headerActions = computed(() => [
	{
		id: 'rename' as const,
		label: i18n.baseText('mcpServers.server.action.rename'),
		icon: 'pencil' as const,
	},
	{
		id: 'description' as const,
		label: i18n.baseText('mcpServers.server.action.description'),
		icon: 'text' as const,
	},
	{
		id: 'delete' as const,
		label: i18n.baseText('mcpServers.server.action.delete'),
		icon: 'trash-2' as const,
		destructive: true,
		divided: true,
	},
]);

async function patchServer(body: Parameters<typeof store.updateServer>[1]) {
	try {
		await store.updateServer(props.serverId, body);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.saveError'));
	}
}

function onRename(name: string) {
	const value = name.trim();
	if (!value || value === server.value?.name) return;
	void patchServer({ name: value });
}

async function onHeaderAction(action: HeaderAction) {
	if (!server.value) return;
	if (action === 'rename') {
		const result = await message.prompt(
			i18n.baseText('mcpServers.server.rename.message'),
			i18n.baseText('mcpServers.server.action.rename'),
			{
				inputValue: server.value.name,
				confirmButtonText: i18n.baseText('generic.save'),
				cancelButtonText: i18n.baseText('generic.cancel'),
				inputValidator: (value: string) =>
					value.trim().length > 0 || i18n.baseText('mcpServers.server.rename.invalid'),
			},
		);
		if (result.action === MODAL_CONFIRM) onRename(result.value);
		return;
	}
	if (action === 'description') {
		const result = await message.prompt(
			i18n.baseText('mcpServers.server.description.message'),
			i18n.baseText('mcpServers.server.action.description'),
			{
				inputValue: server.value.description,
				inputType: 'textarea',
				confirmButtonText: i18n.baseText('generic.save'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (result.action === MODAL_CONFIRM) void patchServer({ description: result.value.trim() });
		return;
	}
	const choice = await message.confirm(
		i18n.baseText('mcpServers.server.delete.message', {
			interpolate: { name: server.value.name },
		}),
		i18n.baseText('mcpServers.server.delete.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('mcpServers.server.delete.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (choice !== MODAL_CONFIRM) return;
	try {
		await store.deleteServer(props.serverId);
		await router.push({ name: MCP_SERVERS_LIST_VIEW });
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.server.delete.error'));
	}
}

async function copyUrl() {
	if (!server.value) return;
	await clipboard.copy(server.value.url);
	toast.showMessage({ type: 'success', title: i18n.baseText('mcpServers.server.urlCopied') });
}

function openSharePage() {
	if (server.value) window.open(server.value.shareUrl, '_blank', 'noopener');
}

onMounted(async () => {
	await load();
	if (route.query[MCP_SERVER_NEW_QUERY]) {
		showAssistant.value = true;
		const query = { ...route.query };
		delete query[MCP_SERVER_NEW_QUERY];
		void router.replace({ query });
		await nextTick();
		if (assistantVisible.value) void focusAssistantComposer();
	}
});

onBeforeUnmount(() => {
	removePushListener();
	clearTimeout(assistantNoticeTimer);
	clearTimeout(callRefreshTimer);
	store.clearDetail();
});
</script>

<template>
	<div :class="$style.root" data-testid="mcp-server-view">
		<aside
			v-if="assistantVisible"
			ref="aside"
			:class="$style.assistant"
			:style="{ width: `${assistantWidth}px` }"
			data-testid="mcp-server-assistant"
		>
			<N8nResizeWrapper
				:class="$style.resize"
				:width="assistantWidth"
				:min-width="MCP_SERVER_ASSISTANT_MIN_WIDTH"
				:max-width="MCP_SERVER_ASSISTANT_MAX_WIDTH"
				:default-width="MCP_SERVER_ASSISTANT_DEFAULT_WIDTH"
				:grid-size="20"
				:supported-directions="['right']"
				@resize="onAssistantResize"
			>
				<InstanceAiChatPanel
					ref="aiPanel"
					:key="serverId"
					v-model:thread-id="assistantThreadId"
					:subject="assistantSubject"
					:launch="assistantLaunch"
					:show-open-full-assistant="false"
					:placeholder="i18n.baseText('mcpServers.assistant.placeholder')"
					data-testid="mcp-server-assistant-panel"
					@close="showAssistant = false"
				>
					<template #empty>
						<div :class="$style.welcome">
							<N8nIcon icon="n8n-assistant" :size="28" :class="$style.welcomeIcon" />
							<N8nText tag="p">{{ i18n.baseText('mcpServers.assistant.welcome') }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('mcpServers.assistant.tryOne') }}
							</N8nText>
							<button
								v-for="(suggestion, index) in suggestions"
								:key="suggestion.id"
								type="button"
								:class="$style.suggestion"
								data-testid="mcp-server-assistant-suggestion"
								@click="onSuggestion(index)"
							>
								<N8nIcon icon="sparkles" size="small" />
								<span>{{ suggestion.prompt }}</span>
							</button>
						</div>
					</template>
				</InstanceAiChatPanel>
			</N8nResizeWrapper>
		</aside>

		<main :class="$style.main">
			<div v-if="loading && !server" :class="$style.center">
				<N8nSpinner type="brand" size="xlarge" />
			</div>
			<div v-else-if="notFound || !server" :class="$style.center">
				<N8nText color="text-light">{{ i18n.baseText('mcpServers.server.notFound') }}</N8nText>
				<N8nButton variant="outline" @click="router.push({ name: MCP_SERVERS_LIST_VIEW })">
					{{ i18n.baseText('mcpServers.server.backToList') }}
				</N8nButton>
			</div>
			<div v-else :class="$style.content">
				<div :class="$style.notice" role="status" aria-live="polite">
					<N8nCanvasPill
						v-if="assistantUpdated"
						:class="$style.noticePill"
						data-testid="mcp-server-assistant-update"
					>
						<template #icon>
							<N8nIcon icon="n8n-assistant" aria-hidden="true" />
						</template>
						{{ i18n.baseText('mcpServers.server.updatedByAssistant') }}
					</N8nCanvasPill>
				</div>

				<header :class="$style.header">
					<div :class="$style.titleBlock">
						<div :class="$style.titleRow">
							<N8nTooltip
								v-if="instanceAiAvailable && !assistantVisible"
								:content="i18n.baseText('mcpServers.assistant.open')"
							>
								<N8nButton
									variant="outline"
									icon-only
									:aria-label="i18n.baseText('mcpServers.assistant.open')"
									data-testid="mcp-server-assistant-toggle"
									@click="showAssistant = true"
								>
									<template #icon>
										<N8nIcon icon="n8n-assistant" :size="18" />
									</template>
								</N8nButton>
							</N8nTooltip>
							<N8nIcon icon="mcp" :size="20" :class="$style.titleIcon" />
							<N8nInlineTextEdit
								:model-value="server.name"
								:max-width="480"
								:max-length="128"
								:class="$style.title"
								data-testid="mcp-server-name"
								@update:model-value="onRename"
							/>
							<N8nText v-if="store.saving" size="small" color="text-light">
								{{ i18n.baseText('mcpServers.saving') }}
							</N8nText>
						</div>
						<div :class="$style.urlRow">
							<code :class="$style.url" data-testid="mcp-server-url">{{ server.url }}</code>
							<N8nIconButton
								icon="copy"
								variant="ghost"
								size="small"
								:aria-label="i18n.baseText('mcpServers.server.copyUrl')"
								data-testid="mcp-server-copy-url"
								@click="copyUrl"
							/>
						</div>
					</div>
					<div :class="$style.headerActions">
						<label :class="$style.activeToggle">
							<N8nSwitch
								:model-value="server.active"
								:aria-label="i18n.baseText('mcpServers.status.active')"
								data-testid="mcp-server-active"
								@update:model-value="(value: boolean) => patchServer({ active: value })"
							/>
							<N8nText size="small">
								{{
									i18n.baseText(
										server.active ? 'mcpServers.status.active' : 'mcpServers.status.inactive',
									)
								}}
							</N8nText>
						</label>
						<N8nButton
							variant="outline"
							icon="share"
							data-testid="mcp-server-share"
							@click="openSharePage"
						>
							{{ i18n.baseText('mcpServers.server.share') }}
						</N8nButton>
						<N8nButton
							variant="brand"
							icon="plug"
							data-testid="mcp-server-connect"
							@click="setTab('connect')"
						>
							{{ i18n.baseText('mcpServers.server.connect') }}
						</N8nButton>
						<N8nActionToggle
							:actions="headerActions"
							size="medium"
							:aria-label="i18n.baseText('mcpServers.server.actions')"
							data-testid="mcp-server-actions"
							@action="onHeaderAction"
						/>
					</div>
				</header>

				<N8nTabs
					:model-value="activeTab"
					:options="tabOptions"
					data-testid="mcp-server-tabs"
					@update:model-value="onTabSelect"
				/>

				<div :class="$style.tabBody">
					<McpServerBuildTab
						v-if="activeTab === 'build'"
						:server="server"
						:assistant-available="instanceAiAvailable"
						:highlight-tool-ids="highlightToolIds"
						@open-tab="setTab"
					/>
					<McpServerAccessTab v-else-if="activeTab === 'access'" :server="server" />
					<McpServerConnectTab v-else-if="activeTab === 'connect'" :server="server" />
					<McpServerPlaygroundTab v-else-if="activeTab === 'playground'" :server="server" />
					<McpServerLogsTab
						v-else-if="activeTab === 'logs'"
						:server-id="server.id"
						:live-tick="liveTick"
						:initial-session="logsSession"
						@session-change="logsSession = $event"
					/>
					<McpServerAnalyticsTab
						v-else-if="activeTab === 'analytics'"
						:server-id="server.id"
						:live-tick="liveTick"
						:can-build="instanceAiAvailable"
						@build-tool="onBuildMissingTool"
						@show-session="onShowSession"
					/>
				</div>
			</div>
		</main>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	height: 100%;
	min-height: 0;
	width: 100%;
	overflow: hidden;
}

.assistant {
	flex-shrink: 0;
	height: 100%;
	border-right: var(--border);
	background: var(--background--surface);
}

.resize {
	height: 100%;
}

.welcome {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
}

.welcomeIcon {
	color: var(--color--primary);
}

.suggestion {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);

	// Two-line labels must not squeeze the icon.
	> :first-child {
		flex-shrink: 0;
		margin-top: var(--spacing--5xs);
	}

	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	font-size: var(--font-size--sm);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}
}

.main {
	position: relative;
	flex: 1;
	min-width: 0;
	height: 100%;
	overflow-y: auto;
}

.center {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	height: 100%;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: 1080px;
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--xl) var(--spacing--3xl);
}

.notice {
	position: sticky;
	top: 0;
	z-index: 10;
	display: flex;
	justify-content: center;
	height: 0;
	pointer-events: none;
}

.noticePill {
	margin-top: var(--spacing--xs);
	color: var(--color--neutral-white);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
	flex-wrap: wrap;
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.titleIcon {
	color: var(--text-color--subtle);
}

.title {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
}

.urlRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.url {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.activeToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	cursor: pointer;
}

.tabBody {
	padding-top: var(--spacing--xs);
}
</style>
