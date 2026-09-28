import { effectScope, toValue, type MaybeRefOrGetter } from 'vue';
import type { McpRegistryDiscoveryResponse, McpRegistryServerResponse } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import {
	discoverMcpConnection,
	fetchMcpRegistryCatalog,
} from '@/features/shared/toolsConnection/mcpRegistry.api';
import type {
	McpServerConnectionItem,
	ToolConnectionCredentialAdapter,
} from '@/features/shared/toolsConnection/types';

interface CredentialCreatedContext {
	authType: string;
	credentialId: string;
	item: McpServerConnectionItem;
}

export function useAgentMcpDiscovery(projectId: MaybeRefOrGetter<string>) {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();

	async function fetchCatalog(): Promise<McpRegistryServerResponse[]> {
		return await fetchMcpRegistryCatalog(rootStore.restApiContext);
	}

	async function discoverRegistry(
		serverSlug: string,
		credentialId: string,
	): Promise<McpRegistryDiscoveryResponse> {
		return await discoverMcpConnection(rootStore.restApiContext, {
			slug: serverSlug,
			credentialId,
		});
	}

	async function preloadCredentials() {
		const resolvedProjectId = toValue(projectId);
		await Promise.all([
			credentialsStore.fetchCredentialTypes(false),
			credentialsStore.fetchUsableCredentials({ projectId: resolvedProjectId }),
		]);
	}

	function registryContextNode(server: McpRegistryServerResponse): INode {
		return {
			id: server.slug,
			name: server.slug,
			type: server.nodeTypeName,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
	}

	function createCredentialAdapter(
		resolveServer: (item: McpServerConnectionItem) => McpRegistryServerResponse | undefined,
		onCredentialCreated: (context: CredentialCreatedContext) => void,
	): ToolConnectionCredentialAdapter {
		return {
			getCredentialsByType: (authType) => {
				const scope = { projectId: toValue(projectId) };
				if (!credentialsStore.hasUsableCredentialsForScope(scope)) return [];

				return credentialsStore.getUsableCredentialByType(authType).map((credential) => ({
					id: credential.id,
					name: credential.name,
					type: credential.type,
				}));
			},
			openExistingCredential: (credentialId) => uiStore.openExistingCredential(credentialId),
			openNewCredential: (authType, item, credentialTypes) => {
				const resolvedProjectId = toValue(projectId);
				if (item.kind !== 'mcp-server') {
					uiStore.openNewCredential(authType, false, false, resolvedProjectId);
					return;
				}
				const server = resolveServer(item);
				if (!server) {
					uiStore.openNewCredential(authType, false, false, resolvedProjectId);
					return;
				}

				const acceptedTypes = credentialTypes ?? [authType];
				if (acceptedTypes.length === 1 && canOAuthCredentialQuickConnect(authType)) {
					void createAndAuthorize(authType, undefined, { projectId: resolvedProjectId }).then(
						(credential) => {
							if (credential) {
								onCredentialCreated({
									authType: credential.type,
									credentialId: credential.id,
									item,
								});
							}
						},
					);
					return;
				}

				let createdCredentialId: string | null = null;
				const listeners = effectScope(true);
				listeners.run(() => {
					listenForCredentialChanges({
						store: credentialsStore,
						onCredentialCreated: (credential) => {
							if (acceptedTypes.includes(credential.type)) createdCredentialId = credential.id;
						},
					});
					listenForModalChanges({
						store: uiStore,
						onModalClosed: (modalName) => {
							if (modalName !== CREDENTIAL_EDIT_MODAL_KEY) return;
							listeners.stop();
							if (createdCredentialId) {
								const createdCredential = credentialsStore.getCredentialById(createdCredentialId);
								onCredentialCreated({
									authType: createdCredential?.type ?? authType,
									credentialId: createdCredentialId,
									item,
								});
							}
						},
					});
				});

				try {
					if (acceptedTypes.length > 1) {
						const node = registryContextNode(server);
						uiStore.openNewCredential(
							authType,
							true,
							false,
							resolvedProjectId,
							undefined,
							node.name,
							node,
						);
					} else {
						uiStore.openNewCredential(authType, false, false, resolvedProjectId);
					}
				} catch (error) {
					listeners.stop();
					throw error;
				}
			},
		};
	}

	return {
		createCredentialAdapter,
		discoverRegistry,
		fetchCatalog,
		preloadCredentials,
	};
}
