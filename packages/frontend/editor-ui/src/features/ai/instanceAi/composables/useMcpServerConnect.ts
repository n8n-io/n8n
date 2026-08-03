import { effectScope } from 'vue';
import { i18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useInstanceAiMcpStore } from '../instanceAiMcp.store';

export interface McpConnectTarget {
	slug: string;
	credentialType: string;
}

const inFlightConnectsByServerSlug = new Map<string, Promise<string | null>>();

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
		const existing = mcpStore.connections.find((c) => c.serverSlug === serverSlug);

		if (!existing) {
			const created = await mcpStore.connect({ serverSlug, credentialId });
			if (!created) return null;
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('instanceAi.mcp.success.connect'),
			});
			return created.id;
		}

		if (existing.credentialId === credentialId) return null;

		const updated = await mcpStore.updateConnection(existing.id, { credentialId });
		if (!updated) return null;
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('instanceAi.mcp.success.changeCredential'),
		});
		return updated.id;
	}

	/**
	 * Connects a server the user has no credential for yet: OAuth types needing no
	 * manual input are authorized in place, the rest go through the credential edit
	 * modal. Resolves once the user is done, with null if they backed out.
	 */
	async function connectServer(server: McpConnectTarget): Promise<string | null> {
		const inFlight = inFlightConnectsByServerSlug.get(server.slug);
		if (inFlight) return await inFlight;

		const attempt = startConnect(server);
		inFlightConnectsByServerSlug.set(server.slug, attempt);
		try {
			return await attempt;
		} finally {
			inFlightConnectsByServerSlug.delete(server.slug);
		}
	}

	async function startConnect(server: McpConnectTarget): Promise<string | null> {
		if (canOAuthCredentialQuickConnect(server.credentialType)) {
			const credential = await createAndAuthorize(server.credentialType);
			return credential ? await connectWithCredential(server.slug, credential.id) : null;
		}
		return await connectViaCredentialModal(server);
	}

	/**
	 * Opens the credential edit modal for the server and connects whatever
	 * credential the user created there once they close it. Nothing is listening
	 * outside an attempt, so unrelated credential edits stay free.
	 */
	async function connectViaCredentialModal(server: McpConnectTarget): Promise<string | null> {
		return await new Promise<string | null>((settle) => {
			let createdCredentialId: string | null = null;

			// Detached because pinia disposes subscriptions with the effect scope they
			// were created in, and an attempt outlives the surface that started it
			const listeners = effectScope(true);
			listeners.run(() => {
				listenForCredentialChanges({
					store: credentialsStore,
					onCredentialCreated: (credential) => {
						// Credential types are per server, so this only ever matches ours
						if (credential.type === server.credentialType) createdCredentialId = credential.id;
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
				uiStore.openNewCredential(server.credentialType);
			} catch (error) {
				listeners.stop();
				throw error;
			}
		});
	}

	return { connectServer, connectWithCredential };
}
