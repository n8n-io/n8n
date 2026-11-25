import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { Aa as require_isEqual, Dr as camelCase, Hf as shallowReactive, Nf as init_reactivity_esm_bundler, jf as effectScope } from "./vendor-Hx42-oQF.js";
import { $S as TIME, AN as i18n, Jg as useUIStore, Mp as useCredentialsStore, Or as useCredentialOAuth, dC as useToast, hC as useTelemetry, jp as listenForCredentialChanges, qg as listenForModalChanges, wy as TELEMETRY_EVENT } from "./app-D5flEmb-.js";
import { t as useInstanceAiMcpStore } from "./instanceAiMcp.store-DclLlpUY.js";
//#region src/features/ai/instanceAi/instanceAiMcp.telemetry.ts
function useInstanceAiMcpTelemetry() {
	const telemetry = useTelemetry();
	return {
		trackToolsListOpened(source) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.TOOLS_LIST_OPENED, { source });
		},
		trackSettingsOpened(serverSlug, source) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_SETTINGS_OPENED, {
				server_slug: serverSlug,
				source
			});
		},
		trackFirstCredentialConnectionStart(serverSlug) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_FIRST_CREDENTIAL_CONNECTION_STARTED, { server_slug: serverSlug });
		},
		trackCredentialDropdownOpened(serverSlug) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_CREDENTIAL_DROPDOWN_OPENED, { server_slug: serverSlug });
		},
		trackExistingCredentialSelected(serverSlug) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_EXISTING_CREDENTIAL_SELECTED, { server_slug: serverSlug });
		},
		trackNewCredentialConnectionStart(serverSlug) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_NEW_CREDENTIAL_CONNECTION_STARTED, { server_slug: serverSlug });
		},
		trackToolPermissionsUpdated(serverSlug, permissions) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.MCP_TOOL_PERMISSIONS_UPDATED, {
				server_slug: serverSlug,
				read_permission: permissions.categories.read,
				write_permission: permissions.categories.write,
				tool_override_count: Object.keys(permissions.tools ?? {}).length
			});
		}
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useMcpServerConnect.ts
init_reactivity_esm_bundler();
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var QUICK_CONNECT_LOCK = 2 * TIME.SECOND;
var connectAttemptsByServerSlug = /* @__PURE__ */ new Map();
var oauthLockedServerSlugs = shallowReactive(/* @__PURE__ */ new Set());
var credentialRequestLockedServerSlugs = shallowReactive(/* @__PURE__ */ new Set());
/**
* The credential half of connecting an MCP server, shared by the tools
* connection modal and the inline chat card. Connection state itself stays in
* `useInstanceAiMcpStore`; this only drives the flow that fills it.
*/
function useMcpServerConnect() {
	const mcpStore = useInstanceAiMcpStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const toast = useToast();
	const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();
	/**
	* Saves the wanted connection to a server and shows the success message. The
	* backend allows only one connection per server, so a saved one is updated
	* and not created again. An update sends only the credential and the
	* permissions that differ from the saved connection, and sends nothing when
	* both are the same. Null when the request failed.
	*/
	async function saveConnection({ serverSlug, credentialId, toolPermissions }) {
		const saved = mcpStore.connections.find((c) => c.serverSlug === serverSlug);
		const isCredentialChanged = saved?.credentialId !== credentialId;
		const changedPermissions = toolPermissions && !(0, import_isEqual.default)(saved?.toolPermissions, toolPermissions) ? toolPermissions : void 0;
		if (isCredentialChanged) credentialRequestLockedServerSlugs.add(serverSlug);
		try {
			let connection;
			if (!saved) connection = await mcpStore.connect({
				serverSlug,
				credentialId,
				...toolPermissions && { toolPermissions }
			});
			else if (!isCredentialChanged && !changedPermissions) connection = saved;
			else connection = await mcpStore.updateConnection(saved.id, {
				...isCredentialChanged && { credentialId },
				...changedPermissions && { toolPermissions: changedPermissions }
			});
			if (!connection) return null;
			toast.showMessage({
				type: "success",
				title: i18n.baseText(saved ? "instanceAi.mcp.settings.saved" : "instanceAi.mcp.success.connect")
			});
			return connection;
		} finally {
			if (isCredentialChanged) credentialRequestLockedServerSlugs.delete(serverSlug);
		}
	}
	/** Saves the credential at once. Null when nothing changed or failed. */
	async function connectWithCredential(serverSlug, credentialId) {
		if (mcpStore.connections.find((c) => c.serverSlug === serverSlug)?.credentialId === credentialId) return null;
		return (await saveConnection({
			serverSlug,
			credentialId
		}))?.id ?? null;
	}
	/**
	* Gets a credential for a server. OAuth types needing no manual input are
	* authorized in place. Other types use the credential edit modal. The default
	* handler saves the connection. A caller can handle the credential as a draft.
	*/
	async function connectServer(server, onCredentialSelected = async (serverSlug, credentialId) => await connectWithCredential(serverSlug, credentialId)) {
		const activeAttempt = connectAttemptsByServerSlug.get(server.slug);
		if (activeAttempt) {
			activeAttempt.state.onCredentialSelected = onCredentialSelected;
			if (!isConnectLocked(server.slug) && activeAttempt.state.reopen) {
				activeAttempt.state.acceptCredential = true;
				activeAttempt.state.reopen();
				lockConnect(server.slug, activeAttempt);
			}
			return await activeAttempt.promise;
		}
		const isQuickConnect = (server.credentialTypes?.length ?? 0) <= 1 && canOAuthCredentialQuickConnect(server.credentialType);
		const state = {
			onCredentialSelected,
			acceptCredential: true,
			reopen: void 0,
			unlockTimer: void 0
		};
		const promise = (isQuickConnect ? connectViaOAuth(server, state) : connectViaCredentialModal(server, state)).finally(() => {
			if (state.unlockTimer) clearTimeout(state.unlockTimer);
			connectAttemptsByServerSlug.delete(server.slug);
			oauthLockedServerSlugs.delete(server.slug);
		});
		const attempt = {
			promise,
			state
		};
		connectAttemptsByServerSlug.set(server.slug, attempt);
		if (isQuickConnect) lockConnect(server.slug, attempt);
		return await promise;
	}
	function lockConnect(serverSlug, attempt) {
		const { state } = attempt;
		if (state.unlockTimer) clearTimeout(state.unlockTimer);
		oauthLockedServerSlugs.add(serverSlug);
		state.unlockTimer = setTimeout(() => {
			oauthLockedServerSlugs.delete(serverSlug);
			state.unlockTimer = void 0;
		}, QUICK_CONNECT_LOCK);
	}
	async function connectViaOAuth(server, state) {
		const credential = await createAndAuthorize(server.credentialType, void 0, { onAuthorizationStarted: (reopen) => {
			state.reopen = reopen;
		} }).finally(() => {
			state.reopen = void 0;
		});
		if (!credential || !state.acceptCredential) return null;
		return await state.onCredentialSelected(server.slug, credential.id, credential.type);
	}
	function isConnectLocked(serverSlug) {
		return oauthLockedServerSlugs.has(serverSlug) || credentialRequestLockedServerSlugs.has(serverSlug);
	}
	function ignorePendingConnectResult(serverSlug) {
		const attempt = connectAttemptsByServerSlug.get(serverSlug);
		if (attempt) {
			attempt.state.acceptCredential = false;
			if (attempt.state.unlockTimer) clearTimeout(attempt.state.unlockTimer);
			attempt.state.unlockTimer = void 0;
		}
		oauthLockedServerSlugs.delete(serverSlug);
	}
	function registryContextNode(server) {
		return {
			id: server.slug,
			name: server.slug,
			type: `@n8n/mcp-registry.${camelCase(server.slug)}`,
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {}
		};
	}
	/**
	* Opens the credential edit modal for the server and passes the created
	* credential to the current handler. Nothing listens outside an attempt, so
	* unrelated credential edits stay free.
	*/
	async function connectViaCredentialModal(server, state) {
		return await new Promise((settle) => {
			let createdCredential = null;
			const credentialTypes = server.credentialTypes ?? [server.credentialType];
			const listeners = effectScope(true);
			listeners.run(() => {
				listenForCredentialChanges({
					store: credentialsStore,
					onCredentialCreated: (credential) => {
						if (credentialTypes.includes(credential.type)) createdCredential = {
							id: credential.id,
							type: credential.type
						};
					}
				});
				listenForModalChanges({
					store: uiStore,
					onModalClosed: (modalName) => {
						if (modalName !== "editCredential") return;
						listeners.stop();
						if (createdCredential === null) {
							settle(null);
							return;
						}
						state.onCredentialSelected(server.slug, createdCredential.id, createdCredential.type).catch(() => null).then(settle);
					}
				});
			});
			try {
				if (credentialTypes.length > 1) {
					const contextNode = registryContextNode(server);
					uiStore.openNewCredential(server.credentialType, true, false, void 0, void 0, contextNode.name, contextNode);
				} else uiStore.openNewCredential(server.credentialType);
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
	function openExistingCredential(credentialId) {
		if (!mcpStore.connections.some((connection) => connection.credentialId === credentialId)) {
			uiStore.openExistingCredential(credentialId);
			return;
		}
		const listeners = effectScope(true);
		listeners.run(() => {
			listenForModalChanges({
				store: uiStore,
				onModalClosed: (modalName) => {
					if (modalName !== "editCredential") return;
					listeners.stop();
					for (const connection of mcpStore.connections) if (connection.credentialId === credentialId) mcpStore.fetchConnectionTools(connection.id);
				}
			});
		});
		try {
			uiStore.openExistingCredential(credentialId);
		} catch (error) {
			listeners.stop();
			throw error;
		}
	}
	function createCredentialAdapter(openNewCredential) {
		return {
			getCredentialsByType: (authType) => credentialsStore.getCredentialsByType(authType).map((credential) => ({
				id: credential.id,
				name: credential.name,
				type: credential.type
			})),
			openNewCredential,
			openExistingCredential
		};
	}
	return {
		connectServer,
		connectWithCredential,
		createCredentialAdapter,
		ignorePendingConnectResult,
		isConnectLocked,
		saveConnection
	};
}
//#endregion
export { useInstanceAiMcpTelemetry as n, useMcpServerConnect as t };
