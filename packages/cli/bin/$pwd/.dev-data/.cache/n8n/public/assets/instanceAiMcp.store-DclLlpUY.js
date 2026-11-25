import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, lo as defineStore, zf as reactive } from "./vendor-Hx42-oQF.js";
import { AN as i18n, Fw as makeRestApiRequest, Mp as useCredentialsStore, _O as isMcpAiGatewayAuthentication, bC as useRootStore, dC as useToast, jp as listenForCredentialChanges } from "./app-D5flEmb-.js";
import { n as fetchMcpRegistryCatalog } from "./mcpRegistry.api-Ck2JWrEp.js";
//#region src/features/ai/instanceAi/instanceAi.mcp.api.ts
async function fetchMcpConnections(context) {
	return await makeRestApiRequest(context, "GET", "/instance-ai/mcp/connections");
}
async function fetchMcpConnectionTools(context, id) {
	return await makeRestApiRequest(context, "GET", `/instance-ai/mcp/connections/${encodeURIComponent(id)}/tools`);
}
async function fetchAllMcpConnectionTools(context) {
	return await makeRestApiRequest(context, "GET", "/instance-ai/mcp/connections/tools");
}
async function createMcpConnection(context, body) {
	return await makeRestApiRequest(context, "POST", "/instance-ai/mcp/connections", body);
}
async function updateMcpConnection(context, id, body) {
	return await makeRestApiRequest(context, "PATCH", `/instance-ai/mcp/connections/${encodeURIComponent(id)}`, body);
}
async function deleteMcpConnection(context, id) {
	await makeRestApiRequest(context, "DELETE", `/instance-ai/mcp/connections/${encodeURIComponent(id)}`);
}
//#endregion
//#region src/features/ai/instanceAi/instanceAiMcp.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var useInstanceAiMcpStore = defineStore("instanceAiMcp", () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const credentialsStore = useCredentialsStore();
	const connections = ref([]);
	let connectionsLoad = null;
	const catalog = ref(null);
	let catalogLoad = null;
	const connectionToolsById = reactive(/* @__PURE__ */ new Map());
	const isLoadingConnections = ref(false);
	const isLoadingCatalog = ref(false);
	let hasLoadedConnections = false;
	const inFlightConnectionToolsById = /* @__PURE__ */ new Map();
	let bulkToolsRequestVersion = 0;
	const connectionsByServerSlug = computed(() => {
		const map = /* @__PURE__ */ new Map();
		for (const connection of connections.value) {
			const list = map.get(connection.serverSlug) ?? [];
			list.push(connection);
			map.set(connection.serverSlug, list);
		}
		return map;
	});
	async function fetchConnections() {
		connectionsLoad ??= loadConnections();
		await connectionsLoad;
	}
	async function fetchConnectionsLazy() {
		if (hasLoadedConnections) return;
		await fetchConnections();
	}
	async function loadConnections() {
		isLoadingConnections.value = true;
		try {
			const fetched = await fetchMcpConnections(rootStore.restApiContext);
			connections.value = fetched.map((connection) => ({
				...connection,
				status: "connecting"
			}));
			hasLoadedConnections = true;
			fetchAllConnectionTools();
		} catch (error) {
			toast.showError(error, i18n.baseText("instanceAi.mcp.error.fetchConnections"));
		} finally {
			connectionsLoad = null;
			isLoadingConnections.value = false;
		}
	}
	async function fetchCatalogLazy() {
		catalogLoad ??= loadCatalog();
		await catalogLoad;
	}
	async function loadCatalog() {
		isLoadingCatalog.value = true;
		try {
			const servers = await fetchMcpRegistryCatalog(rootStore.restApiContext);
			catalog.value = servers.filter((server) => !server.isTemplated).map((server) => ({
				...server,
				credentials: server.credentials.filter(({ credentialType }) => !isMcpAiGatewayAuthentication(credentialType))
			})).filter((server) => server.credentials.length > 0);
		} catch (error) {
			catalogLoad = null;
			toast.showError(error, i18n.baseText("instanceAi.mcp.error.fetchCatalog"));
		} finally {
			isLoadingCatalog.value = false;
		}
	}
	function clearConnectionTools(id) {
		connectionToolsById.delete(id);
		inFlightConnectionToolsById.delete(id);
	}
	function setConnectionStatus(id, status, failureReason) {
		connections.value = connections.value.map((connection) => {
			if (connection.id !== id) return connection;
			const next = {
				...connection,
				status
			};
			delete next.failureReason;
			if (status === "disconnected") next.failureReason = failureReason ?? "unknown";
			return next;
		});
	}
	function applyToolsResult(result) {
		setConnectionStatus(result.id, result.status, result.status === "disconnected" ? result.failureReason : void 0);
		if (result.status === "connected") connectionToolsById.set(result.id, result.tools);
		else connectionToolsById.delete(result.id);
	}
	function connectionErrorMessage(reason) {
		switch (reason) {
			case "server_unavailable": return i18n.baseText("instanceAi.mcp.error.connection.serverUnavailable");
			case "authentication": return i18n.baseText("instanceAi.mcp.error.connection.authentication");
			default: return i18n.baseText("instanceAi.mcp.error.connection.unknown");
		}
	}
	function showConnectionError(reason) {
		toast.showMessage({
			type: "error",
			title: i18n.baseText("instanceAi.mcp.error.connection.title"),
			message: connectionErrorMessage(reason)
		});
	}
	async function fetchAllConnectionTools() {
		const requestVersion = ++bulkToolsRequestVersion;
		if (connections.value.length === 0) return;
		try {
			const results = await fetchAllMcpConnectionTools(rootStore.restApiContext);
			if (requestVersion !== bulkToolsRequestVersion) return;
			results.forEach((result) => {
				if (connections.value.find((item) => item.id === result.id)?.status === "connecting" && !inFlightConnectionToolsById.has(result.id)) applyToolsResult(result);
			});
		} catch (error) {
			if (requestVersion !== bulkToolsRequestVersion) return;
			connections.value = connections.value.map((connection) => ({
				...connection,
				status: connection.status === "connecting" ? "disconnected" : connection.status,
				...connection.status === "connecting" ? { failureReason: "unknown" } : {}
			}));
			toast.showError(error, i18n.baseText("instanceAi.mcp.error.checkConnections"));
		}
	}
	async function fetchConnectionTools(id) {
		setConnectionStatus(id, "connecting");
		const promise = fetchMcpConnectionTools(rootStore.restApiContext, id);
		const isCurrent = () => inFlightConnectionToolsById.get(id) === promise;
		inFlightConnectionToolsById.set(id, promise);
		try {
			const result = await promise;
			if (isCurrent()) {
				applyToolsResult(result);
				if (result.status === "disconnected") showConnectionError(result.failureReason);
			}
		} catch {
			if (isCurrent()) {
				setConnectionStatus(id, "disconnected", "unknown");
				connectionToolsById.delete(id);
				showConnectionError("unknown");
			}
		} finally {
			if (isCurrent()) inFlightConnectionToolsById.delete(id);
		}
	}
	async function fetchConnectionToolsLazy(id) {
		const connection = connections.value.find((item) => item.id === id);
		if (!connection || connection.status === "connecting") return;
		if (connection.status === "connected" && connectionToolsById.has(id)) return;
		await fetchConnectionTools(id);
	}
	function handleToolCallFailed(id) {
		if (!connections.value.some((connection) => connection.id === id)) return;
		fetchConnectionTools(id);
	}
	async function connect(body) {
		try {
			const connection = {
				...await createMcpConnection(rootStore.restApiContext, body),
				status: "connecting"
			};
			connections.value = [...connections.value, connection];
			fetchConnectionTools(connection.id);
			return connection;
		} catch (error) {
			toast.showError(error, i18n.baseText("instanceAi.mcp.error.connect"));
			return null;
		}
	}
	async function updateConnection(id, body) {
		try {
			const updated = await updateMcpConnection(rootStore.restApiContext, id, body);
			const current = connections.value.find((connection) => connection.id === id);
			const connection = {
				...updated,
				status: body.credentialId ? "connecting" : current?.status ?? "connecting"
			};
			connections.value = connections.value.map((item) => item.id === id ? connection : item);
			if (body.credentialId) {
				clearConnectionTools(id);
				fetchConnectionTools(id);
			}
			return connection;
		} catch (error) {
			toast.showError(error, i18n.baseText("instanceAi.mcp.error.updateSettings"));
			return null;
		}
	}
	async function disconnect(id) {
		try {
			await deleteMcpConnection(rootStore.restApiContext, id);
			connections.value = connections.value.filter((c) => c.id !== id);
			clearConnectionTools(id);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText("instanceAi.mcp.error.disconnect"));
			return false;
		}
	}
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialDeleted: (deletedCredentialId) => {
			const orphaned = connections.value.filter((c) => c.credentialId === deletedCredentialId);
			if (orphaned.length === 0) return;
			connections.value = connections.value.filter((c) => c.credentialId !== deletedCredentialId);
			for (const connection of orphaned) clearConnectionTools(connection.id);
		}
	});
	function reset() {
		connections.value = [];
		connectionsLoad = null;
		catalog.value = null;
		catalogLoad = null;
		connectionToolsById.clear();
		inFlightConnectionToolsById.clear();
		hasLoadedConnections = false;
		bulkToolsRequestVersion++;
	}
	return {
		connections,
		catalog,
		connectionToolsById,
		isLoadingConnections,
		isLoadingCatalog,
		connectionsByServerSlug,
		fetchConnections,
		fetchConnectionsLazy,
		fetchCatalogLazy,
		fetchConnectionTools,
		fetchConnectionToolsLazy,
		handleToolCallFailed,
		connect,
		updateConnection,
		disconnect,
		reset
	};
});
//#endregion
export { useInstanceAiMcpStore as t };
