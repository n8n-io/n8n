<script setup lang="ts">
import {
	MCP_SERVER_DESCRIPTION_MAX_LENGTH,
	type InstanceAiPrefillPayload,
	type McpServerResponse,
} from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nAlertDialog,
	N8nBreadcrumbs,
	N8nButton,
	N8nEmptyState,
	N8nHeading,
	N8nIconButton,
	N8nLoading,
	N8nTabs,
	N8nText,
	N8nTooltip,
	type PathItem,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry, componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import McpServerAssistantPanel from '../components/McpServerAssistantPanel.vue';
import McpServerConnectionsTab from '../components/McpServerConnectionsTab.vue';
import McpServerContentsTab from '../components/McpServerContentsTab.vue';
import { useMcpServerConnections } from '../composables/useMcpServerConnections';
import McpServerDescriptionEdit from '../components/McpServerDescriptionEdit.vue';
import RenameMcpServerDialog from '../components/RenameMcpServerDialog.vue';
import { useMcpServerUrl } from '../composables/useMcpServerUrl';
import { deleteMcpServer, getMcpServer, updateMcpServer } from '../mcp-servers.api';
import {
	MCP_SERVER_CONNECTIONS_VIEW,
	MCP_SERVER_VIEW,
	MCP_SERVERS_LIST_VIEW,
} from '../mcp-servers.constants';
import { getMcpServerPermissions } from '../mcp-servers.permissions';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const toast = useToast();
const { serverUrl, copyServerUrl, copyShareLink } = useMcpServerUrl();
const latestFetch = useLatestFetch();
const assistant = capabilityRegistry.use(capabilities.createMcpServerAssistantHandoff)();

const projectId = computed(() => String(route.params.projectId));
const serverId = computed(() => String(route.params.serverId));
const permissions = computed(() => getMcpServerPermissions(projectId.value));
const connections = useMcpServerConnections(projectId, serverId);
/** The Assistant on this page changes the server, so a project viewer does not get it. */
const canUseAssistant = computed(() => assistant.available.value && permissions.value.canUpdate);

const server = ref<McpServerResponse | null>(null);
const loading = ref(true);
const notFound = ref(false);
const renameOpen = ref(false);
const renaming = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);

const assistantOpen = ref(false);
const assistantPrefill = ref<InstanceAiPrefillPayload>();
/** A new value makes the Contents tab load the tools again. */
const contentsRefreshKey = ref(0);
/** The shell gives the docked panel. Without it, the page opens the full Assistant. */
const hasAssistantPanel = computed(() => componentRegistry.has('assistant-panel'));

const tabs = computed(() => [
	{ value: MCP_SERVER_VIEW, label: i18n.baseText('mcpServers.server.tabs.contents') },
	{
		value: MCP_SERVER_CONNECTIONS_VIEW,
		label:
			connections.rowCount.value === null
				? i18n.baseText('mcpServers.server.tabs.connections')
				: i18n.baseText('mcpServers.server.tabs.connectionsWithCount', {
						interpolate: { count: String(connections.rowCount.value) },
					}),
	},
]);

const selectedTab = computed(() =>
	route.name === MCP_SERVER_CONNECTIONS_VIEW ? MCP_SERVER_CONNECTIONS_VIEW : MCP_SERVER_VIEW,
);

const breadcrumbs = computed<PathItem[]>(() => [
	{
		id: VIEWS.WORKFLOWS,
		label: i18n.baseText('projects.menu.overview'),
		href: router.resolve({ name: VIEWS.WORKFLOWS }).href,
	},
	{
		id: MCP_SERVERS_LIST_VIEW,
		label: i18n.baseText('mcpServers.tab'),
		href: router.resolve({ name: MCP_SERVERS_LIST_VIEW }).href,
	},
	...(server.value ? [{ id: MCP_SERVER_VIEW, label: server.value.name }] : []),
]);

type MenuAction = 'rename' | 'copy-share-link' | 'copy-url' | 'delete';

const menuActions = computed(() => {
	const actions: Array<{
		value: MenuAction;
		label: string;
		divided?: boolean;
		destructive?: boolean;
	}> = [];
	if (permissions.value.canUpdate) {
		actions.push({ value: 'rename', label: i18n.baseText('mcpServers.actions.rename') });
	}
	actions.push(
		{ value: 'copy-share-link', label: i18n.baseText('mcpServers.actions.copyShareLink') },
		{ value: 'copy-url', label: i18n.baseText('mcpServers.actions.copyUrl') },
	);
	if (permissions.value.canDelete) {
		actions.push({
			value: 'delete',
			label: i18n.baseText('mcpServers.actions.delete'),
			divided: true,
			destructive: true,
		});
	}
	return actions;
});

/** Keeps a response only while the route still shows the server that it is for. */
function applyResponse(response: McpServerResponse) {
	if (response.id === serverId.value) server.value = response;
}

/** `silent` keeps the page in place while it loads, for a change from the Assistant. */
async function load({ silent = false } = {}) {
	const isLatest = latestFetch.next();
	// Another server: drop the old one and its dialogs, so no action reaches the wrong server.
	if (server.value?.id !== serverId.value) {
		server.value = null;
		renameOpen.value = false;
		deleteOpen.value = false;
	}
	if (!silent) loading.value = true;
	notFound.value = false;
	try {
		const response = await getMcpServer(rootStore.restApiContext, projectId.value, serverId.value);
		if (!isLatest()) return;
		server.value = response;
	} catch (error) {
		if (!isLatest()) return;
		const missing = error instanceof ResponseError && error.httpStatusCode === 404;
		// A failed reload after an Assistant change keeps the page, and the panel, in place.
		if (!silent || missing) server.value = null;
		if (missing) {
			notFound.value = true;
		} else {
			toast.showError(error, i18n.baseText('mcpServers.server.load.error'));
		}
	}
	loading.value = false;
}

watch(
	[projectId, serverId],
	async () => {
		connections.data.value = null;
		await load();
		// A server that did not load has no connections, and their load would show a second error.
		if (server.value) await connections.load();
	},
	{ immediate: true },
);

// A panel binds one server, so a route to another server closes it.
watch(serverId, () => {
	assistantOpen.value = false;
	assistantPrefill.value = undefined;
});

async function openAssistant(prefill?: InstanceAiPrefillPayload) {
	if (!server.value) return;
	if (!hasAssistantPanel.value) {
		await assistant.openServer({
			serverId: server.value.id,
			projectId: server.value.projectId,
			serverName: server.value.name,
		});
		return;
	}
	assistantOpen.value = true;
	if (prefill) assistantPrefill.value = prefill;
}

async function onBuildWithAssistant() {
	if (!server.value) return;
	await openAssistant({
		text: i18n.baseText('mcpServers.assistant.build.prompt', {
			interpolate: { name: server.value.name },
		}),
		prefillType: 'mcp_server_build_prompt',
	});
}

function closeAssistant() {
	assistantOpen.value = false;
	assistantPrefill.value = undefined;
}

async function onAssistantChanged() {
	const name = server.value?.name ?? '';
	await load({ silent: true });
	if (notFound.value) {
		// The Assistant deleted the server: the page ends as after a delete from the menu.
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.delete.success', { interpolate: { name } }),
		});
		await router.push({ name: MCP_SERVERS_LIST_VIEW });
		return;
	}
	contentsRefreshKey.value++;
	await connections.load();
}

async function onSelectTab(tab: string) {
	// People connect at any time, so the tab shows the list as it is now.
	if (tab === MCP_SERVER_CONNECTIONS_VIEW) void connections.load();
	await router.push({ name: tab, params: route.params });
}

function onMenu(action: MenuAction) {
	if (action === 'rename') renameOpen.value = true;
	if (action === 'copy-share-link' && server.value) void copyShareLink(server.value);
	if (action === 'copy-url' && server.value) void copyServerUrl(server.value);
	if (action === 'delete') deleteOpen.value = true;
}

/** A double-click on the title opens the rename dialog. The title has no inline edit. */
function onTitleDoubleClick() {
	if (!permissions.value.canUpdate) return;
	// The double-click also selects a word of the title. The dialog replaces that selection.
	window.getSelection()?.removeAllRanges();
	renameOpen.value = true;
}

async function onRename(name: string) {
	const current = server.value;
	if (!current) return;
	renaming.value = true;
	try {
		applyResponse(
			await updateMcpServer(rootStore.restApiContext, current.projectId, current.id, { name }),
		);
		renameOpen.value = false;
		toast.showMessage({ type: 'success', title: i18n.baseText('mcpServers.rename.success') });
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.rename.error'));
	} finally {
		renaming.value = false;
	}
}

async function onDescription(description: string) {
	const current = server.value;
	if (!current) return;
	try {
		applyResponse(
			await updateMcpServer(rootStore.restApiContext, current.projectId, current.id, {
				description,
			}),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.server.description.error'));
	}
}

async function onDelete() {
	const current = server.value;
	if (!current) return;
	deleting.value = true;
	const { name } = current;
	try {
		await deleteMcpServer(rootStore.restApiContext, current.projectId, current.id);
		deleteOpen.value = false;
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.delete.success', { interpolate: { name } }),
		});
		await router.push({ name: MCP_SERVERS_LIST_VIEW });
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.delete.error'));
	} finally {
		deleting.value = false;
	}
}

async function onBreadcrumbSelected(item: PathItem) {
	if (item.id !== MCP_SERVER_VIEW) await router.push({ name: item.id });
}
</script>

<template>
	<div :class="$style.layout">
		<aside
			v-if="assistantOpen && server"
			:class="$style.assistantDock"
			data-test-id="mcp-server-assistant-dock"
		>
			<McpServerAssistantPanel
				:class="$style.assistantPanel"
				:server="server"
				:prefill="assistantPrefill"
				@changed="onAssistantChanged"
				@close="closeAssistant"
			/>
		</aside>
		<div :class="$style.page" data-test-id="mcp-server-page">
			<N8nLoading v-if="loading && !server" :rows="3" />
			<N8nEmptyState
				v-else-if="notFound"
				:icon="{ type: 'icon', value: 'mcp' }"
				:heading="i18n.baseText('mcpServers.server.notFound.heading')"
				:description="i18n.baseText('mcpServers.server.notFound.description')"
				:button-text="i18n.baseText('mcpServers.server.notFound.button')"
				data-test-id="mcp-server-not-found"
				@click:button="router.push({ name: MCP_SERVERS_LIST_VIEW })"
			/>
			<template v-else-if="server">
				<header :class="$style.header" data-test-id="mcp-server-header">
					<N8nBreadcrumbs
						:items="breadcrumbs"
						data-test-id="mcp-server-breadcrumbs"
						@item-selected="onBreadcrumbSelected"
					/>
					<div :class="$style.titleRow">
						<div :class="$style.title">
							<N8nHeading
								bold
								tag="h1"
								size="xlarge"
								:class="$style.name"
								data-test-id="mcp-server-name"
								@dblclick="onTitleDoubleClick"
							>
								{{ server.name }}
							</N8nHeading>
							<McpServerDescriptionEdit
								v-if="permissions.canUpdate"
								:key="server.id"
								:model-value="server.description"
								:placeholder="i18n.baseText('mcpServers.server.description.placeholder')"
								:max-length="MCP_SERVER_DESCRIPTION_MAX_LENGTH"
								data-test-id="mcp-server-description"
								@update:model-value="onDescription"
							/>
							<N8nText
								v-else
								size="small"
								color="text-light"
								:class="$style.description"
								data-test-id="mcp-server-description"
							>
								{{ server.description }}
							</N8nText>
							<div :class="$style.url">
								<N8nText
									size="small"
									color="text-light"
									:class="$style.urlText"
									data-test-id="mcp-server-url"
								>
									{{ serverUrl(server.slug) }}
								</N8nText>
								<N8nTooltip :content="i18n.baseText('mcpServers.copyUrl.tooltip')">
									<N8nIconButton
										icon="copy"
										variant="ghost"
										size="mini"
										:aria-label="i18n.baseText('mcpServers.actions.copyUrl')"
										data-test-id="mcp-server-copy-url"
										@click="copyServerUrl(server)"
									/>
								</N8nTooltip>
							</div>
						</div>
						<div :class="$style.actions">
							<N8nButton
								v-if="canUseAssistant"
								variant="outline"
								size="small"
								icon="n8n-assistant"
								:label="i18n.baseText('mcpServers.assistant.open')"
								:disabled="assistantOpen"
								data-test-id="mcp-server-assistant-button"
								data-attr="mcp-server-assistant-button"
								@click="openAssistant()"
							/>
							<N8nActionToggle
								:actions="menuActions"
								:aria-label="i18n.baseText('mcpServers.server.menu')"
								placement="bottom-end"
								data-test-id="mcp-server-menu"
								@action="onMenu"
							/>
						</div>
					</div>
					<N8nTabs
						:model-value="selectedTab"
						:options="tabs"
						data-test-id="mcp-server-tabs"
						@update:model-value="onSelectTab"
					/>
				</header>
				<McpServerContentsTab
					v-if="selectedTab === MCP_SERVER_VIEW"
					:key="serverId"
					:class="$style.panel"
					:project-id="projectId"
					:server-id="serverId"
					:assistant-available="assistant.available.value"
					:assistant-open="assistantOpen"
					:refresh-key="contentsRefreshKey"
					@build-with-assistant="onBuildWithAssistant"
				/>
				<McpServerConnectionsTab
					v-else
					:class="$style.panel"
					:server="server"
					:connections="connections.data.value"
					:loading="connections.loading.value"
					:load-failed="connections.loadFailed.value"
					@changed="connections.load"
				/>

				<RenameMcpServerDialog
					v-model:open="renameOpen"
					:name="server.name"
					:url="serverUrl(server.slug)"
					:saving="renaming"
					@rename="onRename"
				/>
				<N8nAlertDialog
					:open="deleteOpen"
					:title="i18n.baseText('mcpServers.delete.title', { interpolate: { name: server.name } })"
					:description="
						i18n.baseText('mcpServers.delete.description', {
							interpolate: { url: serverUrl(server.slug) },
						})
					"
					:action-label="i18n.baseText('mcpServers.delete.confirm')"
					:cancel-label="i18n.baseText('generic.cancel')"
					action-variant="destructive"
					:loading="deleting"
					@update:open="!deleting && (deleteOpen = $event)"
					@action="onDelete"
					@cancel="!deleting && (deleteOpen = false)"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	display: flex;
	width: 100%;
	height: 100%;
	min-height: 0;
}

.assistantDock {
	display: flex;
	flex-shrink: 0;
	width: calc(var(--spacing--5xl) * 1.5);
	height: 100%;
	border-right: var(--border);
	background-color: var(--background--surface);
}

.assistantPanel {
	flex: 1;
	min-width: 0;
	height: 100%;
}

.page {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-width: 0;
	overflow-y: auto;
	width: 100%;
	max-width: var(--content-container--width);
	box-sizing: border-box;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.titleRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.title {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.name {
	user-select: none;
}

.description {
	color: var(--text-color--subtler);
	white-space: pre-wrap;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.url {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.urlText {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.panel {
	min-height: 0;
}

@include breakpoints.breakpoint('xs-only') {
	.titleRow {
		flex-direction: column;
	}
}
</style>
