<script lang="ts" setup>
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiMcpConnectServer, McpRegistryServerResponse } from '@n8n/api-types';
import { computed, provide, ref, watch } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY } from '../constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ToolCredentialPicker from '@/features/shared/toolsConnection/ToolCredentialPicker.vue';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	hasToolConnection,
	type McpServerConnectionItem,
	type ToolCredentialRef,
} from '@/features/shared/toolsConnection/types';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';
import { useInstanceAiMcpTelemetry } from '../instanceAiMcp.telemetry';
import { useMcpServerConnect } from '../composables/useMcpServerConnect';
import { iconForTool } from '../toolIcons';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConnectionRow, { type ConnectionRowIcon } from './ConnectionRow.vue';

const props = defineProps<{
	servers: InstanceAiMcpConnectServer[];
	readOnly?: boolean;
	expired?: boolean;
}>();

const emit = defineEmits<{
	resolve: [{ approved: boolean; connectedSlugs: string[] }];
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const mcpStore = useInstanceAiMcpStore();
const mcpTelemetry = useInstanceAiMcpTelemetry();
const { connectServer, connectWithCredential, createCredentialAdapter } = useMcpServerConnect();

const isConnecting = ref(false);

const preConnectedSlugs = ref<Set<string> | null>(null);

void mcpStore.fetchCatalogLazy();
void (async () => {
	await mcpStore.fetchConnectionsLazy();
	preConnectedSlugs.value = new Set(mcpStore.connections.map((c) => c.serverSlug));
})();
void (async () => {
	try {
		await credentialsStore.fetchAllCredentials();
	} catch (error) {
		console.warn('Failed to preload credentials for the tools card', error);
	}
})();

const catalogBySlug = computed(() => {
	const map = new Map<string, McpRegistryServerResponse>();
	for (const server of mcpStore.catalog ?? []) map.set(server.slug, server);
	return map;
});

interface CardRow {
	serverSlug: string;
	subtitle: string;
	icon: ConnectionRowIcon;
	credentialType: string;
	item: McpServerConnectionItem & { credentials: ToolCredentialRef[] };
}

const rows = computed<CardRow[]>(() =>
	props.servers.map((server) => {
		const entry = catalogBySlug.value.get(server.serverSlug);
		const connection = mcpStore.connections.find((c) => c.serverSlug === server.serverSlug);
		const credentialType =
			connection?.credentialType ?? entry?.credentialType ?? server.credentialType;
		return {
			serverSlug: server.serverSlug,
			subtitle: entry?.tagline ?? server.tagline ?? '',
			icon: iconForTool(entry?.icons ?? [], uiStore.appliedTheme),
			credentialType,
			item: {
				id: connection?.id ?? server.serverSlug,
				kind: 'mcp-server',
				title: entry?.title ?? server.title,
				status: connection?.status ?? 'none',
				credentials: [
					{ authType: credentialType, credentialId: connection?.credentialId, required: true },
				],
				availableTools: [],
			},
		};
	}),
);

const isActionable = computed(() => !props.readOnly && !props.expired);
const anyConnected = computed(() => rows.value.some(hasConnection));

function hasConnection(row: CardRow): boolean {
	return hasToolConnection(row.item.status);
}

function finish(approved: boolean) {
	if (!isActionable.value) return;
	emit('resolve', {
		approved,
		connectedSlugs: rows.value.filter(hasConnection).map((row) => row.serverSlug),
	});
}

const autoFinished = ref(false);
watch(
	[isActionable, rows, preConnectedSlugs],
	([actionable, currentRows, preConnected]) => {
		if (!actionable || autoFinished.value || !preConnected) return;
		const connectedHere = currentRows.some(
			(row) => !preConnected.has(row.serverSlug) && hasConnection(row),
		);
		if (connectedHere && currentRows.every(hasConnection)) {
			autoFinished.value = true;
			finish(true);
		}
	},
	{ immediate: true },
);

function showsCredentialPicker(row: CardRow): boolean {
	return hasConnection(row) || isActionable.value;
}

async function runConnect(attempt: () => Promise<unknown>) {
	if (isConnecting.value) return;
	isConnecting.value = true;
	try {
		await attempt();
	} finally {
		isConnecting.value = false;
	}
}

async function connect(row: CardRow) {
	await runConnect(
		async () => await connectServer({ slug: row.serverSlug, credentialType: row.credentialType }),
	);
}

async function handleSelectCredential(row: CardRow, credentialId: string) {
	await runConnect(async () => {
		mcpTelemetry.trackExistingCredentialSelected(row.serverSlug);
		return await connectWithCredential(row.serverSlug, credentialId);
	});
}

provide(
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	createCredentialAdapter((_authType, item) => {
		const row = rows.value.find((candidate) => candidate.item.id === item.id);
		if (row) void connect(row);
	}),
);

function handleBrowseAll() {
	mcpTelemetry.trackToolsListOpened();
	uiStore.openModal(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
}

function openSettings(row: CardRow) {
	if (!hasConnection(row)) return;
	mcpTelemetry.trackSettingsOpened(row.serverSlug);
	uiStore.openModalWithData({
		name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
		data: { connectionId: row.item.id },
	});
}
</script>

<template>
	<div
		:class="[$style.card, isActionable && $style.awaitingInput]"
		data-test-id="instance-ai-mcp-connect-card"
	>
		<header :class="$style.header">
			<N8nIcon icon="plug" size="medium" />
			<N8nText size="medium" color="text-dark" bold>
				{{
					i18n.baseText(
						expired ? 'instanceAi.mcpConnect.titleExpired' : 'instanceAi.mcpConnect.title',
					)
				}}
			</N8nText>
		</header>

		<div :class="$style.rows">
			<ConnectionRow
				v-for="row in rows"
				:key="row.serverSlug"
				:name="row.item.title"
				:subtitle="row.subtitle"
				:icon="row.icon"
				size="default"
				:clickable="hasConnection(row)"
				@open-settings="openSettings(row)"
			>
				<template #action>
					<ToolCredentialPicker
						v-if="showsCredentialPicker(row)"
						teleported
						:item="row.item"
						:credentials="row.item.credentials"
						@select-credential="
							(_item, _authType, credentialId) => handleSelectCredential(row, credentialId)
						"
						@credential-dropdown-open="mcpTelemetry.trackCredentialDropdownOpened(row.serverSlug)"
						@first-credential-connect="
							mcpTelemetry.trackFirstCredentialConnectionStart(row.serverSlug)
						"
						@new-credential-connect="mcpTelemetry.trackNewCredentialConnectionStart(row.serverSlug)"
					/>
				</template>
			</ConnectionRow>
		</div>

		<ConfirmationFooter v-if="isActionable" layout="row-between" bordered>
			<span :class="$style.browseAll">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.mcpConnect.browseAll.prompt') }}
				</N8nText>
				<button
					type="button"
					:class="$style.browseAllLink"
					data-test-id="instance-ai-mcp-connect-browse-all"
					@click="handleBrowseAll"
				>
					<N8nText size="small" color="text-dark">
						{{ i18n.baseText('instanceAi.mcpConnect.browseAll.link') }}
					</N8nText>
				</button>
			</span>
			<N8nButton
				variant="ghost"
				size="small"
				:disabled="isConnecting"
				data-test-id="instance-ai-mcp-connect-resolve"
				@click="finish(anyConnected)"
			>
				{{
					i18n.baseText(
						anyConnected ? 'instanceAi.mcpConnect.continue' : 'instanceAi.mcpConnect.skip',
					)
				}}
			</N8nButton>
		</ConfirmationFooter>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	max-width: 90%;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
}

.awaitingInput {
	border: 2px solid var(--color--primary);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.rows {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) var(--spacing--sm) var(--spacing--2xs)
		calc(var(--spacing--sm) - var(--spacing--2xs));
}

.browseAll {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.browseAllLink {
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	text-decoration: underline;
}
</style>
