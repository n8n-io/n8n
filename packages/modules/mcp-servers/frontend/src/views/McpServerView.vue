<script setup lang="ts">
import type { InstanceAiPrefillPayload, McpServerResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nAlertDialog,
	N8nBreadcrumbs,
	N8nButton,
	N8nEmptyState,
	N8nHeading,
	N8nLoading,
	N8nTabs,
	N8nText,
	N8nTooltip,
	N8nVisuallyHidden,
	type PathItem,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import McpServerConnectionsTab from '../components/McpServerConnectionsTab.vue';
import McpServerContentsTab from '../components/McpServerContentsTab.vue';
import RenameMcpServerDialog from '../components/RenameMcpServerDialog.vue';
import { useMcpServerConnections } from '../composables/useMcpServerConnections';
import { useMcpServerUrl } from '../composables/useMcpServerUrl';
import { deleteMcpServer, getMcpServer, updateMcpServer } from '../mcp-servers.api';
import {
	MCP_SERVER_CONNECTIONS_VIEW,
	MCP_SERVER_VIEW,
	MCP_SERVERS_LIST_VIEW,
} from '../mcp-servers.constants';
import { getMcpServerPermissions } from '../mcp-servers.permissions';

const props = withDefaults(
	defineProps<{
		/** Rendered inside an Assistant preview tab: hides breadcrumbs and switches tabs locally. */
		artifactMode?: boolean;
		artifactProjectId?: string;
		artifactServerId?: string;
	}>(),
	{
		artifactMode: false,
		artifactProjectId: undefined,
		artifactServerId: undefined,
	},
);

const emit = defineEmits<{
	deleted: [serverId: string];
	renamed: [name: string];
}>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const toast = useToast();
const { serverUrl, copyServerUrl, copyShareLink } = useMcpServerUrl();
const latestFetch = useLatestFetch();
const assistant = capabilityRegistry.use(capabilities.createMcpServerAssistantHandoff)();

const projectId = computed(() =>
	props.artifactMode && props.artifactProjectId !== undefined
		? props.artifactProjectId
		: String(route.params.projectId),
);
const serverId = computed(() =>
	props.artifactMode && props.artifactServerId !== undefined
		? props.artifactServerId
		: String(route.params.serverId),
);
const permissions = computed(() => getMcpServerPermissions(projectId.value));
const connections = useMcpServerConnections(projectId, serverId);
/** The Assistant changes the server, so a project viewer does not get it. Artifact mode is already in the Assistant. */
const canUseAssistant = computed(
	() => !props.artifactMode && assistant.available.value && permissions.value.canUpdate,
);

const server = ref<McpServerResponse | null>(null);
/** The share page omits broken tools, so Share waits for at least one working tool. */
const shareableToolCount = ref<number | null>(null);
const canShare = computed(() => (shareableToolCount.value ?? 0) > 0);
const shareDisabledReasonId = useId();
const loading = ref(true);
const notFound = ref(false);
const renameOpen = ref(false);
const renaming = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);

const localTab = ref<string>(MCP_SERVER_VIEW);
/** A new value makes the Build tab load the server again. */
const contentsRefreshKey = ref(0);

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

const selectedTab = computed(() => {
	if (props.artifactMode) return localTab.value;
	return route.name === MCP_SERVER_CONNECTIONS_VIEW ? MCP_SERVER_CONNECTIONS_VIEW : MCP_SERVER_VIEW;
});

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
		disabled?: boolean;
		divided?: boolean;
		destructive?: boolean;
	}> = [];
	if (permissions.value.canUpdate) {
		actions.push({ value: 'rename', label: i18n.baseText('mcpServers.actions.rename') });
	}
	actions.push(
		{
			value: 'copy-share-link',
			label: i18n.baseText('mcpServers.actions.copyShareLink'),
			disabled: !canShare.value,
		},
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
		shareableToolCount.value = null;
		renameOpen.value = false;
		deleteOpen.value = false;
	}
	if (!silent) loading.value = true;
	notFound.value = false;
	try {
		const response = await getMcpServer(rootStore.restApiContext, projectId.value, serverId.value);
		if (!isLatest()) return;
		server.value = response;
		shareableToolCount.value = response.tools.filter((tool) => tool.brokenReason === null).length;
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

watch(serverId, () => {
	localTab.value = MCP_SERVER_VIEW;
});

async function openAssistant(prefill?: InstanceAiPrefillPayload) {
	if (!server.value) return;
	await assistant.openServer({
		serverId: server.value.id,
		projectId: server.value.projectId,
		serverName: server.value.name,
		...(prefill ? { prefill } : {}),
	});
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

/** Reloads the server, its tools, and its connections in place after an Assistant change. */
async function refresh() {
	const name = server.value?.name ?? '';
	await load({ silent: true });
	if (notFound.value) {
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('mcpServers.delete.success', { interpolate: { name } }),
		});
		if (props.artifactMode) {
			emit('deleted', serverId.value);
		} else {
			await router.push({ name: MCP_SERVERS_LIST_VIEW });
		}
		return;
	}
	contentsRefreshKey.value++;
	await connections.load();
}

async function onSelectTab(tab: string) {
	// People connect at any time, so the tab shows the list as it is now.
	if (tab === MCP_SERVER_CONNECTIONS_VIEW) void connections.load();
	if (props.artifactMode) {
		localTab.value = tab;
		return;
	}
	await router.push({ name: tab, params: route.params });
}

function onMenu(action: MenuAction) {
	if (action === 'rename') renameOpen.value = true;
	if (action === 'copy-share-link' && server.value && canShare.value) {
		void copyShareLink(server.value);
	}
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
		const updated = await updateMcpServer(rootStore.restApiContext, current.projectId, current.id, {
			name,
		});
		applyResponse(updated);
		emit('renamed', updated.name);
		renameOpen.value = false;
		toast.showMessage({ type: 'success', title: i18n.baseText('mcpServers.rename.success') });
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.rename.error'));
	} finally {
		renaming.value = false;
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
		if (props.artifactMode) {
			emit('deleted', current.id);
		} else {
			await router.push({ name: MCP_SERVERS_LIST_VIEW });
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.delete.error'));
	} finally {
		deleting.value = false;
	}
}

async function onBreadcrumbSelected(item: PathItem) {
	if (item.id !== MCP_SERVER_VIEW) await router.push({ name: item.id });
}

defineExpose({ refresh });
</script>

<template>
	<section :class="$style.editorColumn" data-test-id="mcp-server-page">
		<div :class="$style.panelArea">
			<div v-if="loading && !server" :class="$style.panelAreaContainer">
				<N8nLoading :rows="3" />
			</div>
			<div v-else-if="notFound" :class="$style.panelAreaContainer">
				<N8nEmptyState
					:icon="{ type: 'icon', value: 'mcp' }"
					:heading="i18n.baseText('mcpServers.server.notFound.heading')"
					:description="i18n.baseText('mcpServers.server.notFound.description')"
					:button-text="
						props.artifactMode ? undefined : i18n.baseText('mcpServers.server.notFound.button')
					"
					data-test-id="mcp-server-not-found"
					@click:button="router.push({ name: MCP_SERVERS_LIST_VIEW })"
				/>
			</div>
			<template v-else-if="server">
				<header :class="$style.headerRow" data-test-id="mcp-server-header">
					<div :class="$style.headerContent">
						<N8nBreadcrumbs
							v-if="!props.artifactMode"
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
										<N8nButton
											variant="ghost"
											size="xsmall"
											icon="copy"
											:label="i18n.baseText('mcpServers.actions.copyUrlShort')"
											data-test-id="mcp-server-copy-url"
											data-attr="mcp-server-copy-url"
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
									data-test-id="mcp-server-assistant-button"
									data-attr="mcp-server-assistant-button"
									@click="openAssistant()"
								/>
								<N8nTooltip
									as-child
									:disabled="canShare"
									:content="i18n.baseText('mcpServers.actions.share.noTools')"
								>
									<N8nButton
										variant="outline"
										size="small"
										icon="share"
										:label="i18n.baseText('mcpServers.actions.share')"
										:disabled="!canShare"
										focusable-when-disabled
										:aria-describedby="!canShare ? shareDisabledReasonId : undefined"
										data-test-id="mcp-server-share-button"
										data-attr="mcp-server-share-button"
										@click="copyShareLink(server)"
									/>
								</N8nTooltip>
								<N8nVisuallyHidden v-if="!canShare" :id="shareDisabledReasonId">
									{{ i18n.baseText('mcpServers.actions.share.noTools') }}
								</N8nVisuallyHidden>
								<N8nActionToggle
									:actions="menuActions"
									:aria-label="i18n.baseText('mcpServers.server.menu')"
									placement="bottom-end"
									data-test-id="mcp-server-menu"
									@action="onMenu"
								/>
							</div>
						</div>
					</div>
				</header>

				<div :class="$style.tabsRow">
					<div :class="$style.tabsRule">
						<N8nTabs
							:model-value="selectedTab"
							:options="tabs"
							:class="$style.tabs"
							show-border
							data-test-id="mcp-server-tabs"
							@update:model-value="onSelectTab"
						/>
					</div>
				</div>

				<div :class="$style.panelAreaContainer">
					<McpServerContentsTab
						v-if="selectedTab === MCP_SERVER_VIEW"
						:key="serverId"
						:project-id="projectId"
						:server-id="serverId"
						:assistant-available="canUseAssistant"
						:refresh-key="contentsRefreshKey"
						@build-with-assistant="onBuildWithAssistant"
						@server-updated="applyResponse"
						@tools-changed="shareableToolCount = $event"
					/>
					<McpServerConnectionsTab
						v-else
						:server="server"
						:connections="connections.data.value"
						:loading="connections.loading.value"
						:load-failed="connections.loadFailed.value"
						:can-share="canShare"
						@changed="connections.load"
					/>
				</div>

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
	</section>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

.editorColumn {
	display: flex;
	flex: 1;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
	background-color: light-dark(var(--background--surface), var(--background));
	container: mcp-server-editor / inline-size;
}

.panelArea {
	--mcp-server--content-max-width: 56rem;
	--mcp-server--content-padding-inline: var(--spacing--2xl);

	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	overflow: auto;
	scrollbar-gutter: stable;
	@include scrollbar-mixins.hoverable-scroll-bar;
}

@container mcp-server-editor (max-width: 40rem) {
	.panelArea {
		--mcp-server--content-padding-inline: var(--spacing--sm);
	}
}

.headerRow {
	flex-shrink: 0;
	display: flex;
	width: 100%;
}

.headerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	box-sizing: border-box;
	width: 100%;
	max-width: var(--mcp-server--content-max-width);
	margin: 0 auto;
	padding: var(--spacing--lg) var(--mcp-server--content-padding-inline) var(--spacing--md);
}

.titleRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	flex-wrap: wrap;
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

.actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.url {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.urlText {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tabsRow {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	width: 100%;
}

.tabsRule {
	box-sizing: border-box;
	width: 100%;
	max-width: var(--mcp-server--content-max-width);
	margin: 0 auto;
	padding: 0 var(--mcp-server--content-padding-inline);
}

.tabs {
	width: 100%;
}

.panelAreaContainer {
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1 0 auto;
	box-sizing: border-box;
	max-width: var(--mcp-server--content-max-width);
	width: 100%;
	padding: var(--spacing--lg) var(--mcp-server--content-padding-inline);
	margin: 0 auto;
}

@include breakpoints.breakpoint('xs-only') {
	.titleRow {
		flex-direction: column;
	}
}
</style>
