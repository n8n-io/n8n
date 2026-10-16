import { effectScope, shallowReactive } from 'vue';
import { camelCase } from 'change-case';
import type { INode } from 'n8n-workflow';
import { i18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { TIME } from '@/app/constants/durations';
import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import type { ToolConnectionCredentialAdapter } from '@/features/shared/toolsConnection/types';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';

export interface McpConnectTarget {
	slug: string;
	credentialType: string;
	credentialTypes?: readonly string[];
}

interface McpConnectAttemptState {
	acceptCredential: boolean;
	reopen: (() => void) | undefined;
	unlockTimer: ReturnType<typeof setTimeout> | undefined;
}

interface McpConnectAttempt {
	promise: Promise<string | null>;
	state: McpConnectAttemptState;
}

const QUICK_CONNECT_LOCK = 2 * TIME.SECOND;
const connectAttemptsByServerSlug = new Map<string, McpConnectAttempt>();
const oauthLockedServerSlugs = shallowReactive(new Set<string>());
const credentialRequestLockedServerSlugs = shallowReactive(new Set<string>());

/**
 * The credential half of connecting an MCP server, shared by the tools
 * connection modal and the inline chat card. Connection state itself stays in
 * `useInstanceAiMcpStore`; this only drives the flow that fills it.
 */
export function useMcpServerConnect() {
	const mcpStore = useInstanceAiMcpStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const toast = useToast();
	const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();

	/**
	 * Patches the existing connection instead of creating a second one — the
	 * backend allows only one per server. Null when nothing changed or failed.
	 */
	async function connectWithCredential(
		serverSlug: string,
		credentialId: string,
	): Promise<string | null> {
		credentialRequestLockedServerSlugs.add(serverSlug);
		try {
			const existing = mcpStore.connections.find((c) => c.serverSlug === serverSlug);
			if (existing?.credentialId === credentialId) return null;

			const connection = existing
				? await mcpStore.updateConnection(existing.id, { credentialId })
				: await mcpStore.connect({ serverSlug, credentialId });
			if (!connection) return null;

			toast.showMessage({
				type: 'success',
				title: i18n.baseText(
					existing ? 'instanceAi.mcp.success.changeCredential' : 'instanceAi.mcp.success.connect',
				),
			});
			return connection.id;
		} finally {
			credentialRequestLockedServerSlugs.delete(serverSlug);
		}
	}

	/**
	 * Connects a server the user has no credential for yet: OAuth types needing no
	 * manual input are authorized in place, the rest go through the credential edit
	 * modal. Resolves once the user is done, with null if they backed out.
	 */
	async function connectServer(server: McpConnectTarget): Promise<string | null> {
		const activeAttempt = connectAttemptsByServerSlug.get(server.slug);
		if (activeAttempt) {
			if (!isConnectLocked(server.slug) && activeAttempt.state.reopen) {
				activeAttempt.state.acceptCredential = true;
				activeAttempt.state.reopen();
				lockConnect(server.slug, activeAttempt);
			}
			return await activeAttempt.promise;
		}

		const hasOneOption = (server.credentialTypes?.length ?? 0) <= 1;
		const isQuickConnect = hasOneOption && canOAuthCredentialQuickConnect(server.credentialType);
		const state: McpConnectAttemptState = {
			acceptCredential: true,
			reopen: undefined,
			unlockTimer: undefined,
		};

		const connecting = isQuickConnect
			? connectViaOAuth(server, state)
			: connectViaCredentialModal(server);
		const promise = connecting.finally(() => {
			if (state.unlockTimer) clearTimeout(state.unlockTimer);
			connectAttemptsByServerSlug.delete(server.slug);
			oauthLockedServerSlugs.delete(server.slug);
		});
		const attempt: McpConnectAttempt = {
			promise,
			state,
		};
		connectAttemptsByServerSlug.set(server.slug, attempt);

		if (isQuickConnect) lockConnect(server.slug, attempt);

		return await promise;
	}

	function lockConnect(serverSlug: string, attempt: McpConnectAttempt): void {
		const { state } = attempt;
		if (state.unlockTimer) clearTimeout(state.unlockTimer);
		oauthLockedServerSlugs.add(serverSlug);
		state.unlockTimer = setTimeout(() => {
			oauthLockedServerSlugs.delete(serverSlug);
			state.unlockTimer = undefined;
		}, QUICK_CONNECT_LOCK);
	}

	async function connectViaOAuth(
		server: McpConnectTarget,
		state: McpConnectAttemptState,
	): Promise<string | null> {
		const credential = await createAndAuthorize(server.credentialType, undefined, {
			onAuthorizationStarted: (reopen) => {
				state.reopen = reopen;
			},
		}).finally(() => {
			state.reopen = undefined;
		});
		if (!credential || !state.acceptCredential) return null;
		return await connectWithCredential(server.slug, credential.id);
	}

	function isConnectLocked(serverSlug: string): boolean {
		return (
			oauthLockedServerSlugs.has(serverSlug) || credentialRequestLockedServerSlugs.has(serverSlug)
		);
	}

	function ignorePendingConnectResult(serverSlug: string): void {
		const attempt = connectAttemptsByServerSlug.get(serverSlug);
		if (attempt) {
			attempt.state.acceptCredential = false;
			if (attempt.state.unlockTimer) clearTimeout(attempt.state.unlockTimer);
			attempt.state.unlockTimer = undefined;
		}
		oauthLockedServerSlugs.delete(serverSlug);
	}

	function registryContextNode(server: McpConnectTarget): INode {
		return {
			id: server.slug,
			name: server.slug,
			type: `@n8n/mcp-registry.${camelCase(server.slug)}`,
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {},
		};
	}

	/**
	 * Opens the credential edit modal for the server and connects whatever
	 * credential the user created there once they close it. Nothing is listening
	 * outside an attempt, so unrelated credential edits stay free.
	 */
	async function connectViaCredentialModal(server: McpConnectTarget): Promise<string | null> {
		return await new Promise<string | null>((settle) => {
			let createdCredentialId: string | null = null;
			const credentialTypes = server.credentialTypes ?? [server.credentialType];

			// Detached because pinia disposes subscriptions with the effect scope they
			// were created in, and an attempt outlives the surface that started it
			const listeners = effectScope(true);
			listeners.run(() => {
				listenForCredentialChanges({
					store: credentialsStore,
					onCredentialCreated: (credential) => {
						if (credentialTypes.includes(credential.type)) createdCredentialId = credential.id;
					},
				});

				listenForModalChanges({
					store: uiStore,
					onModalClosed: (modalName) => {
						if (modalName !== CREDENTIAL_EDIT_MODAL_KEY) return;
						listeners.stop();

						if (createdCredentialId === null) {
							settle(null);
							return;
						}
						// A failed connect settles the attempt rather than leaving it hanging
						void connectWithCredential(server.slug, createdCredentialId)
							.catch(() => null)
							.then(settle);
					},
				});
			});

			try {
				if (credentialTypes.length > 1) {
					const contextNode = registryContextNode(server);
					uiStore.openNewCredential(
						server.credentialType,
						true,
						false,
						undefined,
						undefined,
						contextNode.name,
						contextNode,
					);
				} else {
					uiStore.openNewCredential(server.credentialType);
				}
			} catch (error) {
				listeners.stop();
				throw error;
			}
		});
	}

	/**
	 * The adapter `ToolCredentialPicker` injects. Only the "create a new
	 * credential" leg differs per surface, so callers pass just that.
	 */
	function openExistingCredential(credentialId: string): void {
		const hasConnections = mcpStore.connections.some(
			(connection) => connection.credentialId === credentialId,
		);
		if (!hasConnections) {
			uiStore.openExistingCredential(credentialId);
			return;
		}

		const listeners = effectScope(true);
		listeners.run(() => {
			listenForModalChanges({
				store: uiStore,
				onModalClosed: (modalName) => {
					if (modalName !== CREDENTIAL_EDIT_MODAL_KEY) return;
					listeners.stop();
					for (const connection of mcpStore.connections) {
						if (connection.credentialId === credentialId) {
							void mcpStore.fetchConnectionTools(connection.id);
						}
					}
				},
			});
		});

		try {
			uiStore.openExistingCredential(credentialId);
		} catch (error) {
			listeners.stop();
			throw error;
		}
	}

	function createCredentialAdapter(
		openNewCredential: ToolConnectionCredentialAdapter['openNewCredential'],
	): ToolConnectionCredentialAdapter {
		return {
			getCredentialsByType: (authType) =>
				credentialsStore.getCredentialsByType(authType).map((credential) => ({
					id: credential.id,
					name: credential.name,
					type: credential.type,
				})),
			openNewCredential,
			openExistingCredential,
		};
	}

	return {
		connectServer,
		connectWithCredential,
		createCredentialAdapter,
		ignorePendingConnectResult,
		isConnectLocked,
	};
}
