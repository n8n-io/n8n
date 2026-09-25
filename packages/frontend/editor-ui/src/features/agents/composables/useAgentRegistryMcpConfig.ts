import type {
	AgentJsonMcpServerConfig,
	McpRegistryDiscoveryResponse,
	McpRegistryServerResponse,
} from '@n8n/api-types';
import { computed, effectScope, onScopeDispose, ref, watch, type ComputedRef } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { iconForMcpRegistryServer } from '@/features/shared/toolsConnection/mcpRegistryIcon';
import type {
	McpServerConnectionItem,
	McpServerTool,
	McpToolSettings,
} from '@/features/shared/toolsConnection/types';

import { useAgentMcpDiscovery } from './useAgentMcpDiscovery';

export const MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS = 1;
export const DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS = 60_000;
export const MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS = 120_000;

export type AgentRegistryMcpDraft = Pick<
	AgentJsonMcpServerConfig,
	| 'name'
	| 'description'
	| 'authentication'
	| 'credential'
	| 'metadata'
	| 'toolPermissions'
	| 'connectionTimeoutMs'
>;

export interface AgentRegistryMcpModalData {
	kind: 'registryMcpServer';
	mcpServer: AgentRegistryMcpDraft;
	existingToolNames?: string[];
	isNew?: boolean;
	supportsToolApproval?: boolean;
	onConfirm: (updatedServer: AgentJsonMcpServerConfig) => void;
	onRemove?: () => void;
}

function toMcpServerTool(tool: {
	name: string;
	title?: string;
	description?: string;
	category?: 'read' | 'write';
}): McpServerTool {
	return {
		id: tool.name,
		name: tool.name,
		...(tool.description || tool.title ? { description: tool.description ?? tool.title } : {}),
		...(tool.category ? { category: tool.category } : {}),
	};
}

function applyDiscoveredConnection(
	server: AgentRegistryMcpDraft,
	connection: Extract<McpRegistryDiscoveryResponse, { status: 'connected' }>['connection'],
): AgentJsonMcpServerConfig {
	return {
		...server,
		url: connection.url,
		transport: connection.transport,
		authentication: connection.authentication,
		...(connection.credentialId ? { credential: connection.credentialId } : {}),
		metadata: { ...server.metadata, ...connection.metadata },
	};
}

export function useAgentRegistryMcpConfig(
	data: ComputedRef<AgentRegistryMcpModalData | null>,
	onCredentialDeleted: () => void,
) {
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const { createCredentialAdapter, discoverRegistry, fetchCatalog, preloadCredentials } =
		useAgentMcpDiscovery();
	const catalogServer = ref<McpRegistryServerResponse | null>(null);
	const draftServer = ref<AgentRegistryMcpDraft | null>(null);
	const discovery = ref<McpRegistryDiscoveryResponse | { status: 'connecting' } | null>(null);
	let requestId = 0;
	const title = computed(() => draftServer.value?.name ?? data.value?.mcpServer.name ?? '');
	const normalizedTitle = computed(() => title.value.trim());
	const hasDuplicateTitle = computed(
		() => data.value?.existingToolNames?.includes(normalizedTitle.value) === true,
	);
	const isConnected = computed(() => discovery.value?.status === 'connected');
	const canSave = computed(
		() => isConnected.value && normalizedTitle.value.length > 0 && !hasDuplicateTitle.value,
	);

	const item = computed<McpServerConnectionItem | null>(() => {
		const server = catalogServer.value;
		const draft = draftServer.value;
		if (!server || !draft) return null;
		const liveTools =
			discovery.value?.status === 'connected' ? discovery.value.tools : server.tools;
		const settings: McpToolSettings = {
			...(draft.toolPermissions ?? {
				categories: { read: 'always_allow', write: 'always_allow' },
			}),
			connectionTimeoutMs: draft.connectionTimeoutMs ?? DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS,
		};
		const status =
			discovery.value?.status === 'connecting'
				? 'connecting'
				: discovery.value?.status === 'disconnected'
					? 'disconnected'
					: 'connected';
		return {
			id: `registry-config:${server.slug}`,
			kind: 'mcp-server',
			category: 'mcp',
			title: server.title,
			description: server.tagline,
			longDescription: server.description,
			status,
			...(discovery.value?.status === 'disconnected'
				? { connectionFailureReason: discovery.value.failureReason }
				: {}),
			iconSource: iconForMcpRegistryServer(server.icons, uiStore.appliedTheme),
			credentials: server.credentials.map(({ credentialType, name }) => ({
				authType: credentialType,
				displayName: name,
				credentialId: draft.authentication === credentialType ? draft.credential : undefined,
				required: true,
			})),
			availableTools: liveTools.map(toMcpServerTool),
			isOfficial: server.isOfficial,
			settings,
			publisher:
				server.isOfficial || server.websiteUrl
					? { name: server.title, url: server.websiteUrl }
					: undefined,
			version: server.version,
		};
	});

	async function discover(credentialId = draftServer.value?.credential) {
		const server = catalogServer.value;
		if (!server || !credentialId) {
			discovery.value = {
				status: 'disconnected',
				failureReason: 'authentication',
				tools: [],
			};
			return;
		}
		const currentRequestId = ++requestId;
		discovery.value = { status: 'connecting' };
		const result = await discoverRegistry(server.slug, credentialId).catch(
			(): McpRegistryDiscoveryResponse => ({
				status: 'disconnected',
				failureReason: 'unknown',
				tools: [],
			}),
		);
		if (currentRequestId !== requestId) return;
		discovery.value = result;
	}

	async function initialize(modalData: AgentRegistryMcpModalData) {
		const currentRequestId = ++requestId;
		draftServer.value = { ...modalData.mcpServer };
		discovery.value = { status: 'connecting' };
		const [catalog] = await Promise.all([fetchCatalog(), preloadCredentials()]);
		if (currentRequestId !== requestId) return;
		catalogServer.value =
			catalog.find(
				(server) => server.nodeTypeName === modalData.mcpServer.metadata?.nodeTypeName,
			) ?? null;
		await discover();
	}

	watch(
		data,
		(modalData) => {
			if (modalData) {
				void initialize(modalData);
				return;
			}
			requestId++;
			catalogServer.value = null;
			draftServer.value = null;
			discovery.value = null;
		},
		{ immediate: true },
	);

	const credentialAdapter = createCredentialAdapter(
		() => catalogServer.value ?? undefined,
		({ authType, credentialId }) => {
			void selectCredential(authType, credentialId);
		},
	);

	async function selectCredential(authType: string, credentialId: string) {
		if (!draftServer.value) return;
		draftServer.value = {
			...draftServer.value,
			authentication: authType,
			credential: credentialId,
		};
		await discover(credentialId);
	}

	function save(settings: McpToolSettings): boolean {
		const result = discovery.value;
		const { connectionTimeoutMs, ...toolPermissions } = settings;
		if (
			!draftServer.value ||
			!canSave.value ||
			result?.status !== 'connected' ||
			connectionTimeoutMs === undefined ||
			!Number.isInteger(connectionTimeoutMs) ||
			connectionTimeoutMs < MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS ||
			connectionTimeoutMs > MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS
		) {
			return false;
		}
		const connectedServer = applyDiscoveredConnection(draftServer.value, result.connection);
		data.value?.onConfirm({
			...connectedServer,
			name: normalizedTitle.value,
			toolPermissions,
			connectionTimeoutMs,
		});
		return true;
	}

	function changeTitle(name: string) {
		if (!draftServer.value) return;
		draftServer.value = { ...draftServer.value, name };
	}

	const credentialListeners = effectScope(true);
	credentialListeners.run(() => {
		listenForCredentialChanges({
			store: credentialsStore,
			onCredentialUpdated: (credential) => {
				if (draftServer.value?.credential === credential.id) void discover();
			},
			onCredentialDeleted: (credentialId) => {
				if (draftServer.value?.credential !== credentialId) return;
				data.value?.onRemove?.();
				onCredentialDeleted();
			},
		});
	});
	onScopeDispose(() => credentialListeners.stop());

	return {
		canSave,
		changeTitle,
		credentialAdapter,
		discover,
		item,
		save,
		selectCredential,
		title,
	};
}
