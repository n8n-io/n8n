import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Bn as EditorView, Df as withCtx, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yn as lineNumbers, _p as normalizeClass, bf as useId, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, j as javascript, jd as vShow, jf as effectScope, lf as onMounted, mf as renderList, nf as mergeModels, of as onBeforeUnmount, pf as provide, tr as EditorState, xf as useModel, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { ET as AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES, Gp as disposeNDVStore, Jg as useUIStore, Jp as useNDVStore, Kf as RestrictedTypeCallout_default, LM as N8nCallout_default, Lk as isCommunityPackageName, Mk as extractFromAICalls, Mp as useCredentialsStore, Or as useCredentialOAuth, Qd as disposeWorkflowDocumentStore, SE as AI_GATEWAY_MANAGED_TAG, SN as _plugin_vue_export_helper_default, Vd as useWorkflowExecutionStateStore, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, Xy as CUSTOM_API_CALL_KEY, _N as N8nText_default, _O as isMcpAiGatewayAuthentication, bC as useRootStore, bN as N8nSpinner_default, cN as Input_default, cS as ExpressionLocalResolveContextSymbol, dA as WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE, eD as SUPPORTED_WORKFLOW_TOOL_TRIGGERS, fC as VIEWS, fM as Switch_default, fN as N8nTooltip_default, fS as ResourceMapperRefreshEmptySchemaKey, gr as codeEditorTheme, hS as WorkflowDocumentStoreKey, hu as NodeIcon_default, jN as useI18n, jk as NodeConnectionTypes, jp as listenForCredentialChanges, mM as N8nOption_default, nf as useWorkflowDocumentStore, pM as N8nSelect_default, pS as ResourceMapperSchemaAutoRefreshKey, pp as useNodeTypeRestriction, qg as listenForModalChanges, tD as getWorkflowToolIncompatibilityReason, tE as UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS, uf as useNodeTypesStore, vN as N8nIconButton_default, wn as ParameterInputFull_default, xN as N8nIcon_default, yN as N8nButton_default, zd as disposeWorkflowExecutionStateStore, zl as _virtual_node_popularity_data_default } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { n as isRestrictedByInlineTool, o as workflowToolTriggerLabel } from "./validationIssues-CnPTm-2x.js";
import { a as nodeToMcpServer, d as updateWorkflowToolRef, l as toolRefToNode, r as isMcpRelatedNodeType, u as updateToolRefFromNode } from "./useMcpServerAdapter-xfJVDU-E.js";
import { t as ToolCredentialPicker_default } from "./ToolCredentialPicker-Clmo6S9M.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { n as McpDetailBody_default, r as McpConnectionStatusCallout_default, t as McpToolPermissionsEditor_default } from "./McpToolPermissionsEditor-nRVRNnRu.js";
import { t as iconForMcpRegistryServer } from "./mcpRegistryIcon-BDkbIdlc.js";
import { n as fetchMcpRegistryCatalog, t as discoverMcpConnection } from "./mcpRegistry.api-Ck2JWrEp.js";
import { t as AgentFormSettingRow_default } from "./AgentFormSettingRow-Bt9I4Pbf.js";
import { t as AgentApprovalSelector_default } from "./AgentApprovalSelector-BEv8kXQY.js";
import { t as NodeToolSettingsContent_default } from "./NodeToolSettingsContent-BQ9He6el.js";
//#region src/features/agents/composables/useAgentMcpDiscovery.ts
init_reactivity_esm_bundler();
function useAgentMcpDiscovery(projectId) {
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const { canOAuthCredentialQuickConnect, createAndAuthorize } = useCredentialOAuth();
	async function fetchCatalog() {
		return await fetchMcpRegistryCatalog(rootStore.restApiContext);
	}
	async function discoverRegistry(request) {
		return await discoverMcpConnection(rootStore.restApiContext, request);
	}
	async function preloadCredentials() {
		const resolvedProjectId = toValue(projectId);
		await Promise.all([credentialsStore.fetchCredentialTypes(false), credentialsStore.fetchUsableCredentials({ projectId: resolvedProjectId })]);
	}
	function registryContextNode(server) {
		return {
			id: server.slug,
			name: server.slug,
			type: server.nodeTypeName,
			typeVersion: 1,
			position: [0, 0],
			parameters: {}
		};
	}
	function createCredentialAdapter(resolveServer, onCredentialCreated) {
		return {
			getCredentialsByType: (authType) => {
				const scope = { projectId: toValue(projectId) };
				if (!credentialsStore.hasUsableCredentialsForScope(scope)) return [];
				return credentialsStore.getUsableCredentialByType(authType).map((credential) => ({
					id: credential.id,
					name: credential.name,
					type: credential.type
				}));
			},
			openExistingCredential: (credentialId) => uiStore.openExistingCredential(credentialId),
			openNewCredential: (authType, item, credentialTypes) => {
				const resolvedProjectId = toValue(projectId);
				if (item.kind !== "mcp-server") {
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
					createAndAuthorize(authType, void 0, { projectId: resolvedProjectId }).then((credential) => {
						if (credential) onCredentialCreated({
							authType: credential.type,
							credentialId: credential.id,
							item
						});
					});
					return;
				}
				let createdCredentialId = null;
				const listeners = effectScope(true);
				listeners.run(() => {
					listenForCredentialChanges({
						store: credentialsStore,
						onCredentialCreated: (credential) => {
							if (acceptedTypes.includes(credential.type)) createdCredentialId = credential.id;
						}
					});
					listenForModalChanges({
						store: uiStore,
						onModalClosed: (modalName) => {
							if (modalName !== "editCredential") return;
							listeners.stop();
							if (createdCredentialId) onCredentialCreated({
								authType: credentialsStore.getCredentialById(createdCredentialId)?.type ?? authType,
								credentialId: createdCredentialId,
								item
							});
						}
					});
				});
				try {
					if (acceptedTypes.length > 1) {
						const node = registryContextNode(server);
						uiStore.openNewCredential(authType, true, false, resolvedProjectId, void 0, node.name, node);
					} else uiStore.openNewCredential(authType, false, false, resolvedProjectId);
				} catch (error) {
					listeners.stop();
					throw error;
				}
			}
		};
	}
	return {
		createCredentialAdapter,
		discoverRegistry,
		fetchCatalog,
		preloadCredentials
	};
}
//#endregion
//#region src/features/agents/utils/mcpRegistryCredentialRefs.ts
/** A registry entry on Gateway credits carries the same marker as Gateway credits models. */
function isAiGatewayMcpEntry(server) {
	return Boolean(server.metadata?.nodeTypeName) && server.credential === "__AI_GATEWAY_MANAGED__";
}
/** The entry fields for a picked credential. Gateway credits keep their marker and no auth type. */
function toMcpEntryAuth(authType, credentialId) {
	return {
		authentication: credentialId === "__AI_GATEWAY_MANAGED__" ? "none" : authType,
		credential: credentialId
	};
}
/**
* The credential references of a catalog row, Gateway credits first. Marks the
* option that `selected` uses.
*/
function toMcpRegistryCredentialRefs(server, selected) {
	const refs = server.credentials.map(({ credentialType, name }) => {
		const ref = {
			authType: credentialType,
			displayName: name,
			required: true
		};
		if (!isMcpAiGatewayAuthentication(credentialType)) {
			const credentialId = selected?.authentication === credentialType ? selected.credential : void 0;
			return {
				...ref,
				credentialId
			};
		}
		const isSelected = selected !== void 0 && isAiGatewayMcpEntry(selected);
		return {
			...ref,
			credentialId: isSelected ? AI_GATEWAY_MANAGED_TAG : void 0,
			aiGateway: true
		};
	});
	return [...refs.filter((ref) => ref.aiGateway), ...refs.filter((ref) => !ref.aiGateway)];
}
//#endregion
//#region src/features/agents/composables/useAgentRegistryMcpConfig.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS = 1e3;
var DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS = 6e4;
var MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS = 12e4;
function toMcpServerTool(tool) {
	return {
		id: tool.name,
		name: tool.name,
		...tool.description || tool.title ? { description: tool.description ?? tool.title } : {},
		...tool.category ? { category: tool.category } : {}
	};
}
function applyDiscoveredConnection(server, connection) {
	return {
		...server,
		url: connection.url,
		transport: connection.transport,
		authentication: connection.authentication,
		...connection.credentialId ? { credential: connection.credentialId } : {},
		metadata: {
			...server.metadata,
			...connection.metadata
		}
	};
}
/** Gateway credits discover without a stored credential (see the discovery endpoint). */
function toDiscoveryRequest(slug, draft, credentialId) {
	if (draft && isAiGatewayMcpEntry(draft)) return {
		slug,
		aiGateway: true
	};
	return credentialId ? {
		slug,
		credentialId
	} : void 0;
}
function removeApprovalRequirements(toolPermissions) {
	return {
		categories: {
			read: toolPermissions.categories.read === "require_approval" ? "always_allow" : toolPermissions.categories.read,
			write: toolPermissions.categories.write === "require_approval" ? "always_allow" : toolPermissions.categories.write
		},
		...toolPermissions.tools ? { tools: Object.fromEntries(Object.entries(toolPermissions.tools).map(([name, permission]) => [name, permission === "require_approval" ? "always_allow" : permission])) } : {}
	};
}
function useAgentRegistryMcpConfig(data, onCredentialDeleted) {
	const uiStore = useUIStore();
	const credentialsStore = useCredentialsStore();
	const { createCredentialAdapter, discoverRegistry, fetchCatalog, preloadCredentials } = useAgentMcpDiscovery(() => data.value.projectId);
	const catalogServer = ref(null);
	const draftServer = ref(null);
	const persistedServer = ref(null);
	const discovery = ref(null);
	const { invalidate, next } = useLatestFetch();
	const title = computed(() => draftServer.value?.name ?? data.value?.mcpServer.name ?? "");
	const normalizedTitle = computed(() => title.value.trim());
	const hasDuplicateTitle = computed(() => data.value?.existingToolNames?.includes(normalizedTitle.value) === true);
	const isConnected = computed(() => discovery.value?.status === "connected");
	const canSave = computed(() => isConnected.value && normalizedTitle.value.length > 0 && !hasDuplicateTitle.value);
	const item = computed(() => {
		const server = catalogServer.value;
		const draft = draftServer.value;
		if (!server || !draft) return null;
		const settings = {
			...draft.toolPermissions ?? { categories: {
				read: "always_allow",
				write: "always_allow"
			} },
			connectionTimeoutMs: draft.connectionTimeoutMs ?? 6e4
		};
		const liveTools = discovery.value?.status === "connected" ? discovery.value.tools : [];
		const status = discovery.value?.status === "connecting" ? "connecting" : discovery.value?.status === "disconnected" ? "disconnected" : "connected";
		return {
			id: `registry-config:${server.slug}`,
			kind: "mcp-server",
			category: "mcp",
			title: server.title,
			description: server.tagline,
			longDescription: server.description,
			status,
			...discovery.value?.status === "disconnected" ? { connectionFailureReason: discovery.value.failureReason } : {},
			iconSource: iconForMcpRegistryServer(server.icons, uiStore.appliedTheme),
			credentials: toMcpRegistryCredentialRefs(server, draft),
			availableTools: liveTools.map(toMcpServerTool),
			isOfficial: server.isOfficial,
			settings,
			publisher: server.isOfficial || server.websiteUrl ? {
				name: server.title,
				url: server.websiteUrl
			} : void 0,
			version: server.version
		};
	});
	async function discover(credentialId = draftServer.value?.credential) {
		const server = catalogServer.value;
		const request = server && toDiscoveryRequest(server.slug, draftServer.value, credentialId);
		if (!request) {
			discovery.value = {
				status: "disconnected",
				failureReason: "authentication",
				tools: []
			};
			return;
		}
		const isCurrent = next();
		discovery.value = { status: "connecting" };
		const result = await discoverRegistry(request).catch(() => ({
			status: "disconnected",
			failureReason: "unknown",
			tools: []
		}));
		if (!isCurrent()) return;
		discovery.value = result;
	}
	async function initialize(modalData) {
		const isCurrent = next();
		draftServer.value = { ...modalData.mcpServer };
		persistedServer.value = modalData.isNew ? null : { ...modalData.mcpServer };
		discovery.value = { status: "connecting" };
		const [catalog] = await Promise.all([fetchCatalog(), preloadCredentials()]);
		if (!isCurrent()) return;
		catalogServer.value = catalog.find((server) => server.nodeTypeName === modalData.mcpServer.metadata?.nodeTypeName) ?? null;
		await discover();
	}
	watch(data, (modalData) => {
		if (modalData) {
			initialize(modalData);
			return;
		}
		invalidate();
		catalogServer.value = null;
		draftServer.value = null;
		persistedServer.value = null;
		discovery.value = null;
	}, { immediate: true });
	const credentialAdapter = createCredentialAdapter(() => catalogServer.value ?? void 0, ({ authType, credentialId }) => {
		selectCredential(authType, credentialId);
	});
	async function selectCredential(authType, credentialId) {
		if (!draftServer.value) return;
		draftServer.value = {
			...draftServer.value,
			...toMcpEntryAuth(authType, credentialId)
		};
		await discover(credentialId);
	}
	function save(settings) {
		const result = discovery.value;
		const { connectionTimeoutMs, ...toolPermissions } = settings;
		if (!draftServer.value || !canSave.value || result?.status !== "connected" || connectionTimeoutMs === void 0 || !Number.isInteger(connectionTimeoutMs) || connectionTimeoutMs < 1e3 || connectionTimeoutMs > 12e4) return false;
		const connectedServer = applyDiscoveredConnection(draftServer.value, result.connection);
		const normalizedToolPermissions = data.value?.supportsToolApproval === false ? removeApprovalRequirements(toolPermissions) : toolPermissions;
		data.value?.onConfirm({
			...connectedServer,
			name: normalizedTitle.value,
			toolPermissions: normalizedToolPermissions,
			connectionTimeoutMs
		});
		return true;
	}
	function changeTitle(name) {
		if (!draftServer.value) return;
		draftServer.value = {
			...draftServer.value,
			name
		};
	}
	const credentialListeners = effectScope(true);
	credentialListeners.run(() => {
		listenForCredentialChanges({
			store: credentialsStore,
			onCredentialDeleted: (credentialId) => {
				if (draftServer.value?.credential !== credentialId) return;
				const persisted = persistedServer.value;
				if (persisted?.credential && persisted.credential !== credentialId) {
					draftServer.value.credential = persisted.credential;
					discover(persisted.credential);
					return;
				}
				data.value?.onRemove?.();
				onCredentialDeleted();
			}
		});
		listenForModalChanges({
			store: uiStore,
			onModalClosed: (modalName) => {
				if (modalName === "editCredential" && draftServer.value?.credential) discover();
			}
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
		title
	};
}
//#endregion
//#region src/features/agents/components/AgentRegistryMcpConfigForm.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentRegistryMcpConfigForm_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentRegistryMcpConfigForm",
	props: { data: {} },
	emits: [
		"credential-deleted",
		"request-credential-picker",
		"update:title"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const config = useAgentRegistryMcpConfig(computed(() => props.data), () => emit("credential-deleted"));
		const item = config.item;
		const title = config.title;
		const submitted = ref(false);
		const initialConnectionTimeoutMs = props.data.mcpServer.connectionTimeoutMs ?? 6e4;
		const draftSettings = ref({
			categories: {
				read: "always_allow",
				write: "always_allow"
			},
			connectionTimeoutMs: initialConnectionTimeoutMs
		});
		const draftPermissions = computed({
			get: () => draftSettings.value,
			set: (permissions) => {
				draftSettings.value = {
					...permissions,
					connectionTimeoutMs: draftSettings.value.connectionTimeoutMs
				};
			}
		});
		const timeoutInputSeconds = computed({
			get: () => draftSettings.value.connectionTimeoutMs === void 0 ? "" : String(draftSettings.value.connectionTimeoutMs / 1e3),
			set: (value) => {
				draftSettings.value = {
					...draftSettings.value,
					connectionTimeoutMs: value.trim() ? Number(value) * 1e3 : void 0
				};
			}
		});
		watch(() => config.item.value?.id, () => {
			const settings = config.item.value?.settings;
			if (settings) draftSettings.value = {
				...settings,
				connectionTimeoutMs: settings.connectionTimeoutMs ?? initialConnectionTimeoutMs
			};
		}, { immediate: true });
		watch(title, (value) => emit("update:title", value), { immediate: true });
		const normalizedTitle = computed(() => title.value.trim());
		const titleError = computed(() => {
			if (!submitted.value) return "";
			if (!normalizedTitle.value) return i18n.baseText("agents.toolConfig.name.validation.required");
			if (props.data.existingToolNames?.includes(normalizedTitle.value)) return i18n.baseText("agents.toolConfig.name.validation.duplicate");
			return "";
		});
		const parsedTimeout = computed(() => {
			const timeout = draftSettings.value.connectionTimeoutMs;
			return timeout !== void 0 && Number.isInteger(timeout) && timeout % 1e3 === 0 && timeout >= 1e3 && timeout <= 12e4 ? timeout : null;
		});
		const timeoutError = computed(() => submitted.value && parsedTimeout.value === null ? i18n.baseText("agents.toolConfig.mcp.timeout.validation", { interpolate: {
			min: MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS / 1e3,
			max: MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS / 1e3
		} }) : "");
		const saveDisabled = computed(() => item.value?.status !== "connected");
		function confirm() {
			submitted.value = true;
			if (parsedTimeout.value === null) return false;
			return config.save(draftSettings.value);
		}
		async function remove() {
			if (!props.data.onRemove) return false;
			if (await openAgentConfirmationModal({
				title: i18n.baseText("tools.connection.settings.removeConfirm.title", { interpolate: { name: title.value } }),
				description: i18n.baseText("tools.connection.settings.removeConfirm.description", { interpolate: {
					item: "tool",
					service: title.value
				} }),
				isDestructive: true,
				confirmButtonText: i18n.baseText("tools.connection.settings.removeConfirm.confirmButton", { interpolate: { item: "tool" } }),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm") return false;
			props.data.onRemove();
			return true;
		}
		function changeTitle(title) {
			config.changeTitle(title);
		}
		__expose({
			changeTitle,
			confirm,
			credentialAdapter: config.credentialAdapter,
			headerItem: item,
			remove,
			saveDisabled,
			selectCredential: config.selectCredential,
			title,
			titleError
		});
		return (_ctx, _cache) => {
			return !unref(item) ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.loading)
			}, [createVNode(unref(N8nSpinner_default))], 2)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.content)
			}, [
				createVNode(McpDetailBody_default, { item: unref(item) }, null, 8, ["item"]),
				unref(item).status === "disconnected" ? (openBlock(), createBlock(McpConnectionStatusCallout_default, {
					key: 0,
					"failure-reason": unref(item).connectionFailureReason,
					onReconnect: _cache[0] || (_cache[0] = ($event) => emit("request-credential-picker")),
					onRetry: _cache[1] || (_cache[1] = ($event) => unref(config).discover())
				}, null, 8, ["failure-reason"])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.settings) }, [createVNode(McpToolPermissionsEditor_default, {
					modelValue: draftPermissions.value,
					"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => draftPermissions.value = $event),
					actor: "agent",
					"available-tools": unref(item).availableTools,
					"server-title": unref(title),
					status: unref(item).status,
					"exclude-permissions": __props.data.supportsToolApproval === false ? ["require_approval"] : []
				}, null, 8, [
					"modelValue",
					"available-tools",
					"server-title",
					"status",
					"exclude-permissions"
				]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.timeoutSection) }, [
					createVNode(unref(N8nText_default), {
						tag: "label",
						for: "agent-mcp-connection-timeout",
						size: "medium",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.mcp.timeout.label")), 1)]),
						_: 1
					}),
					createVNode(unref(Input_default), {
						id: "agent-mcp-connection-timeout",
						"model-value": timeoutInputSeconds.value,
						type: "number",
						min: unref(MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS) / 1e3,
						max: unref(MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS) / 1e3,
						step: 1,
						disabled: unref(item).status !== "connected",
						"aria-invalid": Boolean(timeoutError.value),
						"aria-describedby": timeoutError.value ? "agent-mcp-connection-timeout-help agent-mcp-connection-timeout-error" : "agent-mcp-connection-timeout-help",
						"data-testid": "agent-mcp-connection-timeout",
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => timeoutInputSeconds.value = $event)
					}, {
						suffix: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.mcp.timeout.unit")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, [
						"model-value",
						"min",
						"max",
						"disabled",
						"aria-invalid",
						"aria-describedby"
					]),
					createVNode(unref(N8nText_default), {
						id: "agent-mcp-connection-timeout-help",
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.mcp.timeout.help")), 1)]),
						_: 1
					}),
					timeoutError.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						id: "agent-mcp-connection-timeout-error",
						size: "small",
						color: "danger",
						"data-testid": "agent-mcp-timeout-error"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(timeoutError.value), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2)], 2)
			], 2));
		};
	}
}), [["__cssModules", { "$style": {
	loading: "_loading_zz9y8_1",
	content: "_content_zz9y8_8",
	settings: "_settings_zz9y8_16",
	timeoutSection: "_timeoutSection_zz9y8_17"
} }]]);
//#endregion
//#region src/features/agents/components/AgentToolConfigApprovalSetting.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigApprovalSetting.vue
var AgentToolConfigApprovalSetting_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigApprovalSetting",
	props: {
		modelValue: { type: Boolean },
		disabled: { type: Boolean }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentFormSettingRow_default, {
				"control-id": "agent-tool-approval-toggle",
				title: unref(i18n).baseText("agents.toolConfig.approval.label"),
				description: unref(i18n).baseText("agents.toolConfig.approval.hint")
			}, {
				default: withCtx(() => [createVNode(unref(Switch_default), {
					id: "agent-tool-approval-toggle",
					"model-value": __props.modelValue,
					disabled: __props.disabled,
					"aria-label": unref(i18n).baseText("agents.toolConfig.approval.label"),
					"data-test-id": "agent-tool-approval-toggle",
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event))
				}, null, 8, [
					"model-value",
					"disabled",
					"aria-label"
				])]),
				_: 1
			}, 8, ["title", "description"]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentCustomToolViewer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AgentCustomToolViewer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentCustomToolViewer",
	props: { code: {} },
	setup(__props) {
		/**
		* Read-only TypeScript viewer for a custom tool's compiled source.
		* Shown in the editor column when the tree selects a `type: 'custom'` tool.
		*/
		const props = __props;
		const container = ref();
		let view = null;
		function createEditor(doc) {
			if (!container.value) return;
			view = new EditorView({
				state: EditorState.create({
					doc,
					extensions: [
						javascript({ typescript: true }),
						lineNumbers(),
						EditorView.lineWrapping,
						EditorState.readOnly.of(true),
						EditorView.editable.of(false),
						codeEditorTheme({
							isReadOnly: true,
							maxHeight: "100%"
						})
					]
				}),
				parent: container.value
			});
		}
		onMounted(() => createEditor(props.code ?? ""));
		onBeforeUnmount(() => {
			view?.destroy();
			view = null;
		});
		watch(() => props.code, (next) => {
			if (!view) return;
			const nextDoc = next ?? "";
			if (view.state.doc.toString() === nextDoc) return;
			view.dispatch({ changes: {
				from: 0,
				to: view.state.doc.length,
				insert: nextDoc
			} });
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.wrapper),
				"data-test-id": "agent-custom-tool-viewer"
			}, [createBaseVNode("div", {
				ref_key: "container",
				ref: container,
				class: normalizeClass(_ctx.$style.editor)
			}, null, 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_1dag9_1",
	editor: "_editor_1dag9_8"
} }]]);
//#endregion
//#region src/features/agents/components/AgentToolConfigCustomContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigCustomContent.vue
var AgentToolConfigCustomContent_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigCustomContent",
	props: { code: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentCustomToolViewer_default, { code: __props.code }, null, 8, ["code"]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentToolConfigMcpApprovalSetting.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigMcpApprovalSetting.vue
var AgentToolConfigMcpApprovalSetting_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigMcpApprovalSetting",
	props: {
		modelValue: {},
		node: {},
		projectId: {},
		disabled: { type: Boolean }
	},
	emits: ["update:modelValue", "update:valid"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const tools = ref([]);
		const isLoadingTools = ref(false);
		const loadingError = ref(null);
		const exposedToolNames = computed(() => {
			const names = tools.value.map((tool) => String(tool.value));
			const includeMode = props.node.parameters.include;
			const includeTools = toStringArray(props.node.parameters.includeTools);
			const excludeTools = new Set(toStringArray(props.node.parameters.excludeTools));
			if (includeMode === "selected" && includeTools.length > 0) {
				const allowedTools = new Set(includeTools);
				return names.filter((name) => allowedTools.has(name));
			}
			if (includeMode === "except") return names.filter((name) => !excludeTools.has(name));
			return names;
		});
		const askSelectedChosen = ref(false);
		const selectorValue = computed(() => {
			const { categories, tools } = props.modelValue;
			if (categories.read === "require_approval" && categories.write === "require_approval") return { mode: "global" };
			const selectedTools = Object.entries(tools ?? {}).flatMap(([name, permission]) => permission === "require_approval" ? [name] : []);
			if (selectedTools.length > 0 || askSelectedChosen.value) return {
				mode: "selected",
				tools: selectedTools
			};
		});
		const toolOptions = computed(() => {
			const exposed = new Set(exposedToolNames.value);
			return tools.value.filter((tool) => exposed.has(String(tool.value))).map((tool) => ({
				label: tool.name,
				value: String(tool.value)
			}));
		});
		onMounted(() => {
			if (props.node.parameters.endpointUrl || props.node.parameters.sseEndpoint) refreshTools();
		});
		function toStringArray(value) {
			return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
		}
		async function refreshTools() {
			isLoadingTools.value = true;
			loadingError.value = null;
			try {
				tools.value = await nodeTypesStore.getNodeParameterOptions({
					nodeTypeAndVersion: {
						name: props.node.type,
						version: props.node.typeVersion
					},
					path: "parameters.includeTools",
					methodName: "getTools",
					currentNodeParameters: props.node.parameters,
					credentials: props.node.credentials,
					projectId: props.projectId
				});
			} catch (error) {
				loadingError.value = error instanceof Error ? error.message : String(error);
			} finally {
				isLoadingTools.value = false;
			}
		}
		function handleModeUpdate(mode) {
			askSelectedChosen.value = mode === "selected";
			if (mode === "selected" && tools.value.length === 0 && !isLoadingTools.value) refreshTools();
		}
		function toToolPermissions(approval) {
			if (approval?.mode === "global") return { categories: {
				read: "require_approval",
				write: "require_approval"
			} };
			const categories = {
				read: "always_allow",
				write: "always_allow"
			};
			if (approval?.mode !== "selected" || approval.tools.length === 0) return { categories };
			return {
				categories,
				tools: Object.fromEntries(approval.tools.map((toolName) => [toolName, "require_approval"]))
			};
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentApprovalSelector_default, {
				"model-value": selectorValue.value,
				options: toolOptions.value,
				label: unref(i18n).baseText("agents.toolConfig.mcpApproval.label"),
				hint: unref(i18n).baseText("agents.toolConfig.mcpApproval.hint"),
				placeholder: unref(i18n).baseText("agents.toolConfig.mcpApproval.tools.placeholder"),
				loading: isLoadingTools.value,
				disabled: props.disabled,
				error: loadingError.value ? unref(i18n).baseText("agents.toolConfig.mcpApproval.loadError") : null,
				"test-id-prefix": "agent-mcp-approval",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", toToolPermissions($event))),
				"onUpdate:valid": _cache[1] || (_cache[1] = ($event) => emit("update:valid", $event)),
				"onUpdate:mode": handleModeUpdate
			}, {
				controls: withCtx(({ mode }) => [mode === "selected" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: unref(i18n).baseText("agents.toolConfig.mcpApproval.refresh.hint")
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						"icon-only": "",
						disabled: props.disabled,
						loading: isLoadingTools.value,
						"aria-label": unref(i18n).baseText("agents.toolConfig.mcpApproval.refresh"),
						"data-test-id": "agent-mcp-approval-refresh",
						onClick: refreshTools
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "refresh-cw",
							size: 14
						})]),
						_: 1
					}, 8, [
						"disabled",
						"loading",
						"aria-label"
					])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"model-value",
				"options",
				"label",
				"hint",
				"placeholder",
				"loading",
				"disabled",
				"error"
			]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentToolConfigNodeContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigNodeContent.vue
var AgentToolConfigNodeContent_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigNodeContent",
	props: {
		initialNode: {},
		existingToolNames: {},
		projectId: {},
		contentTestId: {},
		hiddenParameters: {},
		parameterIssues: {},
		fromAiDisabledParameters: {},
		readOnly: { type: Boolean }
	},
	emits: [
		"update:valid",
		"update:node-name",
		"update:node"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const HIDDEN_AGENT_NODE_TOOL_OPERATIONS = [...UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS, CUSTOM_API_CALL_KEY];
		const props = __props;
		const emit = __emit;
		const contentRef = ref(null);
		provide(ResourceMapperSchemaAutoRefreshKey, false);
		provide(ResourceMapperRefreshEmptySchemaKey, true);
		function handleChangeName(name) {
			contentRef.value?.handleChangeName(name);
		}
		function getNode() {
			return contentRef.value?.node ?? null;
		}
		function getNodeTypeDescription() {
			return contentRef.value?.nodeTypeDescription ?? null;
		}
		__expose({
			getNode,
			getNodeTypeDescription,
			handleChangeName
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(NodeToolSettingsContent_default, {
				ref_key: "contentRef",
				ref: contentRef,
				"initial-node": props.initialNode,
				"existing-tool-names": props.existingToolNames,
				"project-id": props.projectId,
				"for-agent": "",
				"hidden-operations": HIDDEN_AGENT_NODE_TOOL_OPERATIONS,
				"hidden-parameters": props.hiddenParameters,
				"parameter-issues": props.parameterIssues,
				"from-ai-disabled-parameters": props.fromAiDisabledParameters,
				"read-only": props.readOnly,
				"sync-node-to-ndv": true,
				"data-test-id": props.contentTestId,
				"onUpdate:valid": _cache[0] || (_cache[0] = ($event) => emit("update:valid", $event)),
				"onUpdate:nodeName": _cache[1] || (_cache[1] = ($event) => emit("update:node-name", $event)),
				"onUpdate:node": _cache[2] || (_cache[2] = ($event) => emit("update:node", $event))
			}, null, 8, [
				"initial-node",
				"existing-tool-names",
				"project-id",
				"hidden-parameters",
				"parameter-issues",
				"from-ai-disabled-parameters",
				"read-only",
				"data-test-id"
			]);
		};
	}
});
//#endregion
//#region src/features/agents/composables/useAgentToolCatalog.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var nodePopularityMap = new Map(_virtual_node_popularity_data_default.map((node) => [node.id, node.popularity]));
var hiddenAvailableToolNodeTypes = new Set(AGENT_BUILDER_HIDDEN_AVAILABLE_TOOL_NODE_TYPES);
function hasInputs(nodeType) {
	const { inputs } = nodeType;
	if (Array.isArray(inputs)) return inputs.length > 0;
	return true;
}
function isHiddenAvailableToolType(nodeType) {
	return hiddenAvailableToolNodeTypes.has(nodeType.name);
}
function isWorkflowCompatibleWithAgentTools(workflow) {
	return getWorkflowToolIncompatibilityReason(workflow) === null;
}
/**
* Tab a node type belongs to in the tools connection modal.
*
* MCP tools keep their own tab. All other tools use the n8n nodes tab.
* Community packages are still matched first by provenance so they cannot
* claim another category through their metadata.
*/
function toolCategoryForNodeType(nodeType) {
	if (isCommunityPackageName(nodeType.name)) return "app-action";
	if (isMcpRelatedNodeType(nodeType.name)) return "mcp";
	return "app-action";
}
/**
* Ordering within a tab, derived from the category so there is one source of
* truth. Every category `toolCategoryForNodeType` can return must appear here:
* `indexOf` returns -1 for a missing one, which would sort it ahead of the rest.
*/
var NODE_CATEGORY_ORDER = ["mcp", "app-action"];
function nodeTypeOrderRank(nodeType) {
	return NODE_CATEGORY_ORDER.indexOf(toolCategoryForNodeType(nodeType));
}
/**
* Catalog of node types and project workflows eligible as agent tools.
* Node types are sorted by category first, then popularity, so each category
* tab lists its most-used tools first.
*/
function useAgentToolCatalog() {
	const nodeTypesStore = useNodeTypesStore();
	const workflowsListStore = useWorkflowsListStore();
	/**
	* Fetched workflows kept local — do NOT write into workflowsListStore's
	* shared cache (would clobber the Workflows list page).
	*/
	const projectWorkflows = ref([]);
	/**
	* Falls back to the community preview description so uninstalled verified
	* community tools (already in the AiTool name index via visibleNodeTypes)
	* are not dropped — same catalog the canvas Tools picker uses.
	*/
	function resolveToolNodeType(name) {
		return nodeTypesStore.getNodeType(name) ?? nodeTypesStore.communityNodeType(name)?.nodeDescription ?? null;
	}
	const availableToolTypes = computed(() => {
		const names = nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ?? [];
		return [...new Set(names)].map((name) => resolveToolNodeType(name)).filter((nt) => nt !== null && !nt.hidden && !isHiddenAvailableToolType(nt) && !hasInputs(nt)).sort((a, b) => {
			const rankDiff = nodeTypeOrderRank(a) - nodeTypeOrderRank(b);
			if (rankDiff !== 0) return rankDiff;
			const popA = nodePopularityMap.get(a.name) ?? 0;
			return (nodePopularityMap.get(b.name) ?? 0) - popA;
		});
	});
	const availableWorkflows = computed(() => projectWorkflows.value.filter((workflow) => !workflow.isArchived && isWorkflowCompatibleWithAgentTools(workflow)));
	async function loadWorkflows(projectId) {
		try {
			projectWorkflows.value = await workflowsListStore.searchWorkflows({
				projectId,
				select: [
					"id",
					"name",
					"description",
					"isArchived",
					"activeVersionId",
					"nodes",
					"connections",
					"updatedAt"
				]
			});
			return true;
		} catch (error) {
			console.warn("[useAgentToolCatalog] failed to load workflows for project", error);
			return false;
		}
	}
	return {
		availableToolTypes,
		availableWorkflows,
		projectWorkflows,
		loadWorkflows,
		resolveToolNodeType
	};
}
//#endregion
//#region src/features/agents/utils/workflowToolInputFields.ts
var SUPPORTED_TRIGGER_TYPES = new Set(SUPPORTED_WORKFLOW_TOOL_TRIGGERS);
/**
* Mirror of the backend `detectTriggerNode` rule: the first node in workflow
* order whose type is in `SUPPORTED_WORKFLOW_TOOL_TRIGGERS`. Keeping this in
* sync prevents the UI from offering bindings for a trigger the runtime
* ignores (e.g. an Execute Workflow Trigger placed after a Chat Trigger).
*/
function detectWorkflowToolTrigger(workflow) {
	if (!workflow) return void 0;
	return (workflow.nodes ?? []).find((node) => SUPPORTED_TRIGGER_TYPES.has(node.type));
}
/**
* Read declared Execute Workflow Trigger input fields from a project workflow.
* Returns an empty list unless the runtime-selected trigger is the Execute
* Workflow Trigger and it is not in passthrough mode.
*/
function listWorkflowToolInputFields(workflow) {
	if (!workflow) return [];
	const trigger = detectWorkflowToolTrigger(workflow);
	if (!trigger || trigger.type !== "n8n-nodes-base.executeWorkflowTrigger") return [];
	const params = trigger.parameters ?? {};
	const defaultInputSource = trigger.typeVersion >= 1.1 ? "workflowInputs" : "passthrough";
	const inputSource = typeof params.inputSource === "string" ? params.inputSource : defaultInputSource;
	if (inputSource === "passthrough") return [];
	if (inputSource === "jsonExample") {
		const jsonExample = params.jsonExample;
		if (!jsonExample) return [];
		let parsed;
		try {
			parsed = JSON.parse(jsonExample);
		} catch {
			return [];
		}
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return [];
		return Object.entries(parsed).map(([name, value]) => ({
			name,
			type: value === null ? "any" : Array.isArray(value) ? "array" : typeof value
		}));
	}
	return (params.workflowInputs?.values ?? []).filter((field) => typeof field.name === "string" && field.name.length > 0);
}
/** Format a stored fixed binding for the text input. */
function formatWorkflowToolFixedValue(value) {
	if (value === null || value === void 0) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
/**
* Type guard for a recursive JSON value. Used to safely narrow `JSON.parse`
* output before storing it as a fixed binding value typed `JsonValue`.
*/
function isJsonValue(value) {
	if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
	if (Array.isArray(value)) return value.every(isJsonValue);
	if (typeof value === "object") return Object.values(value).every(isJsonValue);
	return false;
}
/**
* Convert a typed text-input value into the Execute Workflow Trigger field type.
* Incomplete JSON / numbers stay as the raw string so the user can keep typing.
*/
function parseWorkflowToolFixedValue(raw, type) {
	if (type === "string" || type === void 0) return raw;
	const trimmed = raw.trim();
	if (trimmed === "") return null;
	switch (type) {
		case "number": {
			const parsed = Number(trimmed);
			return Number.isFinite(parsed) ? parsed : raw;
		}
		case "boolean": {
			const lower = trimmed.toLowerCase();
			if (lower === "true") return true;
			if (lower === "false") return false;
			return raw;
		}
		case "array":
		case "object":
			try {
				const parsed = JSON.parse(trimmed);
				if (!isJsonValue(parsed)) return raw;
				if (type === "array" && Array.isArray(parsed)) return parsed;
				if (type === "object" && typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
			} catch {}
			return raw;
		case "any":
			try {
				const parsed = JSON.parse(trimmed);
				if (isJsonValue(parsed)) return parsed;
			} catch {}
			return raw;
		default: return raw;
	}
}
//#endregion
//#region src/features/agents/components/WorkflowToolInputs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["data-test-id", "aria-label"];
var _hoisted_2 = ["for"];
var WorkflowToolInputs_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowToolInputs",
	props: /*@__PURE__*/ mergeModels({
		fields: {},
		toolName: {},
		submitted: { type: Boolean }
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["update:valid"], ["update:modelValue"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const inputs = useModel(__props, "modelValue");
		const emit = __emit;
		const i18n = useI18n();
		const id = useId();
		const rawValues = ref({});
		const documentId = createWorkflowDocumentId(`workflow-tool-inputs-${id}`);
		const documentStore = useWorkflowDocumentStore(documentId);
		const ndvStore = useNDVStore(documentId);
		const executionStore = useWorkflowExecutionStateStore(documentId);
		provide(WorkflowDocumentStoreKey, computed(() => documentStore));
		provide(ExpressionLocalResolveContextSymbol, computed(() => ({
			localResolve: true,
			nodeName: props.toolName,
			additionalKeys: {}
		})));
		watch(() => props.toolName, (name) => {
			documentStore.setNodes([{
				id,
				name,
				type: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
				typeVersion: 2.2,
				position: [0, 0],
				parameters: {}
			}]);
			ndvStore.setActiveNodeName(name, "other");
		}, { immediate: true });
		onBeforeUnmount(() => {
			disposeNDVStore(ndvStore);
			disposeWorkflowExecutionStateStore(executionStore);
			disposeWorkflowDocumentStore(documentStore);
		});
		function bindingFor(name) {
			const bindings = toRaw(inputs.value);
			return Object.hasOwn(bindings, name) ? bindings[name] : { mode: "ai" };
		}
		function descriptionFor(name) {
			const binding = bindingFor(name);
			return binding.mode === "ai" ? binding.description ?? "" : "";
		}
		function parameterFor(field) {
			let type = "string";
			if (field.type === "number" || field.type === "boolean") type = field.type;
			if ([
				"array",
				"object",
				"any"
			].includes(field.type ?? "")) type = "json";
			return {
				displayName: `${field.name} (${field.type ?? "string"})`,
				name: field.name,
				type,
				default: "",
				typeOptions: { rows: 3 }
			};
		}
		function displayValue(field) {
			const binding = bindingFor(field.name);
			if (binding.mode === "ai") return "";
			if (binding.mode === "expression") return binding.value;
			if (field.type === "boolean") return binding.value === true;
			const raw = toRaw(rawValues.value);
			if (Object.hasOwn(raw, field.name)) return raw[field.name];
			if (field.type === "any") return JSON.stringify(binding.value);
			return formatWorkflowToolFixedValue(binding.value);
		}
		function setMode(field, mode) {
			let next = { ...toRaw(inputs.value) };
			delete rawValues.value[field.name];
			if (mode === "ai") delete next[field.name];
			else if (mode === "expression") next = {
				...next,
				[field.name]: {
					mode,
					value: "="
				}
			};
			else next = {
				...next,
				[field.name]: {
					mode,
					value: field.type === "boolean" ? false : parseWorkflowToolFixedValue("", field.type)
				}
			};
			inputs.value = next;
		}
		function updateValue(field, update) {
			const raw = formatWorkflowToolFixedValue(update.value);
			const mode = bindingFor(field.name).mode;
			if (mode === "ai") return;
			if (mode === "fixed") rawValues.value = {
				...toRaw(rawValues.value),
				[field.name]: raw
			};
			const binding = mode === "expression" ? {
				mode,
				value: raw
			} : {
				mode,
				value: parseWorkflowToolFixedValue(raw, field.type)
			};
			inputs.value = {
				...toRaw(inputs.value),
				[field.name]: binding
			};
		}
		function updateDescription(name, description) {
			let next = { ...toRaw(inputs.value) };
			if (description.trim()) next = {
				...next,
				[name]: {
					mode: "ai",
					description
				}
			};
			else delete next[name];
			inputs.value = next;
		}
		function inputError(field) {
			const binding = bindingFor(field.name);
			if (binding.mode === "ai") return void 0;
			if (binding.mode === "expression") return binding.value.slice(1).trim() ? void 0 : i18n.baseText("agents.toolConfig.workflow.inputs.expression.empty");
			const value = parseWorkflowToolFixedValue(formatWorkflowToolFixedValue(binding.value), field.type);
			if (value === null) return void 0;
			let valid = true;
			switch (field.type) {
				case "number":
					valid = typeof value === "number" && Number.isFinite(value);
					break;
				case "boolean":
					valid = typeof value === "boolean";
					break;
				case "array":
					valid = Array.isArray(value);
					break;
				case "object":
					valid = typeof value === "object" && !Array.isArray(value);
					break;
				case "any": try {
					JSON.parse(String(displayValue(field)));
				} catch {
					valid = false;
				}
			}
			return valid ? void 0 : i18n.baseText("agents.toolConfig.workflow.inputs.value.invalid", { interpolate: { type: field.type ?? "string" } });
		}
		const fieldsWithErrors = computed(() => props.fields.filter((field) => inputError(field)));
		watch(fieldsWithErrors, (fields) => emit("update:valid", fields.length === 0), { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.fields),
				"data-test-id": "agent-workflow-tool-inputs"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.fields, (field, index) => {
				return openBlock(), createElementBlock("div", {
					key: field.name,
					class: normalizeClass(_ctx.$style.field),
					"data-test-id": `agent-workflow-tool-input-${encodeURIComponent(field.name)}`,
					role: "group",
					"aria-label": field.name
				}, [
					createVNode(ParameterInputFull_default, {
						parameter: parameterFor(field),
						value: displayValue(field),
						"input-mode": bindingFor(field.name).mode,
						path: `inputs.${field.name}`,
						rows: 3,
						"display-options": true,
						"options-overrides": { hideFocusPanelButton: true },
						"external-issues": __props.submitted && inputError(field) ? [inputError(field)] : [],
						onUpdate: ($event) => updateValue(field, $event),
						onTextInput: ($event) => updateValue(field, $event),
						"onUpdate:inputMode": ($event) => setMode(field, $event)
					}, null, 8, [
						"parameter",
						"value",
						"input-mode",
						"path",
						"external-issues",
						"onUpdate",
						"onTextInput",
						"onUpdate:inputMode"
					]),
					bindingFor(field.name).mode === "ai" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("label", {
						for: `${unref(id)}-${index}-description`,
						class: normalizeClass(_ctx.$style.descriptionLabel)
					}, toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.inputs.description")), 11, _hoisted_2), createVNode(unref(Input_default), {
						id: `${unref(id)}-${index}-description`,
						"model-value": descriptionFor(field.name),
						type: "textarea",
						rows: 2,
						placeholder: unref(i18n).baseText("agents.toolConfig.workflow.inputs.description.placeholder"),
						"onUpdate:modelValue": ($event) => updateDescription(field.name, String($event))
					}, null, 8, [
						"id",
						"model-value",
						"placeholder",
						"onUpdate:modelValue"
					])], 64)) : createCommentVNode("", true),
					__props.submitted && inputError(field) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "xsmall",
						color: "danger",
						role: "alert"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(inputError(field)), 1)]),
						_: 2
					}, 1024)) : createCommentVNode("", true)
				], 10, _hoisted_1$1);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	fields: "_fields_1mm2d_1",
	field: "_field_1mm2d_1",
	descriptionLabel: "_descriptionLabel_1mm2d_14"
} }]]);
//#endregion
//#region src/features/agents/components/WorkflowToolConfigContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["aria-expanded"];
var WorkflowToolConfigContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowToolConfigContent",
	props: {
		initialRef: {},
		projectId: {},
		submitCount: {}
	},
	emits: ["update:valid", "update:node-name"],
	setup(__props, { expose: __expose, emit: __emit }) {
		/** Configure a workflow tool without changing its trigger. */
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const triggerLabel = workflowToolTriggerLabel();
		const router = useRouter();
		const { availableWorkflows, projectWorkflows, loadWorkflows } = useAgentToolCatalog();
		const name = ref(props.initialRef.name ?? props.initialRef.workflow ?? "");
		const description = ref(props.initialRef.description ?? "");
		const showDescriptionError = computed(() => (props.submitCount ?? 0) > 0 && description.value.trim().length === 0);
		const allOutputs = ref(props.initialRef.allOutputs ?? false);
		const workflow = ref(props.initialRef.workflow ?? "");
		const workflowId = ref(props.initialRef.workflowId);
		const inputs = ref({ ...toRaw(props.initialRef.inputs ?? {}) });
		const isLoadingWorkflows = ref(true);
		const workflowsLoaded = ref(false);
		const inputsValid = ref(true);
		const advancedExpanded = ref(false);
		const mode = ref("list");
		const enteredId = ref("");
		const isIdUnresolvable = ref(false);
		async function reloadWorkflows() {
			isLoadingWorkflows.value = true;
			workflowsLoaded.value = await loadWorkflows(props.projectId);
			isLoadingWorkflows.value = false;
		}
		onMounted(reloadWorkflows);
		watch(() => props.initialRef, (updated) => {
			name.value = updated.name ?? updated.workflow ?? "";
			description.value = updated.description ?? "";
			allOutputs.value = updated.allOutputs ?? false;
			workflow.value = updated.workflow ?? "";
			workflowId.value = updated.workflowId;
			inputs.value = { ...toRaw(updated.inputs ?? {}) };
			mode.value = "list";
			enteredId.value = "";
			isIdUnresolvable.value = false;
		});
		function matchesReference(candidate) {
			return workflowId.value !== void 0 ? candidate.id === workflowId.value : candidate.name === workflow.value;
		}
		const matchingProjectWorkflows = computed(() => projectWorkflows.value.filter(matchesReference));
		const matchingAvailableWorkflows = computed(() => availableWorkflows.value.filter(matchesReference));
		/** Resolve an exact id, or a unique legacy name. */
		const targetWorkflow = computed(() => {
			if (workflowId.value !== void 0) return matchingProjectWorkflows.value[0];
			return matchingProjectWorkflows.value.length === 1 ? matchingProjectWorkflows.value[0] : void 0;
		});
		/** Target is gone from the project entirely — deleted, moved, or inaccessible. */
		const isMissing = computed(() => workflowsLoaded.value && !isLoadingWorkflows.value && workflow.value.length > 0 && matchingProjectWorkflows.value.length === 0);
		/** Target still exists but is archived or holds a node that can't run as a tool. */
		const isUnusable = computed(() => workflowsLoaded.value && !isLoadingWorkflows.value && !isMissing.value && workflow.value.length > 0 && matchingAvailableWorkflows.value.length === 0);
		/** Only legacy name-based refs can be ambiguous. */
		const isAmbiguous = computed(() => workflowId.value === void 0 && matchingProjectWorkflows.value.length > 1);
		/** Target works in preview, but the published agent cannot call it until it is published. */
		const isUnpublished = computed(() => workflowsLoaded.value && !isLoadingWorkflows.value && !isUnusable.value && targetWorkflow.value?.activeVersionId === null);
		/**
		* Options are keyed by id so same-named workflows remain individually
		* selectable.
		*/
		const workflowOptions = computed(() => [...availableWorkflows.value].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((candidate) => ({
			id: candidate.id,
			name: candidate.name,
			meta: [(0, import_dateformat.default)(candidate.updatedAt, "d mmm yyyy, HH:MM"), candidate.description].filter(Boolean).join(" · ")
		})));
		const targetWorkflowId = computed(() => targetWorkflow.value?.id ?? workflowId.value);
		/** Falls back to the raw stored name so an unresolved target still displays. */
		const selectedOptionId = computed(() => targetWorkflowId.value ?? workflowId.value ?? workflow.value);
		const declaredInputFields = computed(() => listWorkflowToolInputFields(targetWorkflow.value));
		const inputSchemaLoaded = computed(() => workflowsLoaded.value && !isLoadingWorkflows.value && Array.isArray(targetWorkflow.value?.nodes));
		const hasInputErrors = computed(() => inputSchemaLoaded.value && declaredInputFields.value.length > 0 && !inputsValid.value);
		watch([
			name,
			description,
			workflow,
			hasInputErrors
		], ([nameValue, descriptionValue, workflowValue]) => {
			emit("update:valid", nameValue.trim().length > 0 && descriptionValue.trim().length > 0 && workflowValue.trim().length > 0 && !hasInputErrors.value);
			emit("update:node-name", nameValue);
		}, { immediate: true });
		watch([() => props.submitCount, hasInputErrors], ([submitCount, hasErrors]) => {
			if (submitCount && hasErrors) advancedExpanded.value = true;
		});
		function handleChangeName(newName) {
			name.value = newName;
		}
		function applyTarget(next) {
			if (next.id === workflowId.value || workflowId.value === void 0 && next.name === workflow.value) {
				workflowId.value = next.id;
				return;
			}
			if (name.value === workflow.value) name.value = next.name;
			workflowId.value = next.id;
			workflow.value = next.name;
			description.value = "";
			inputs.value = {};
		}
		function handleSelectWorkflow(optionId) {
			const selected = workflowOptions.value.find((option) => option.id === optionId);
			if (selected) applyTarget(selected);
		}
		function openTargetWorkflow() {
			if (!targetWorkflowId.value) return;
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId: targetWorkflowId.value }
			});
			window.open(href, "_blank");
		}
		function handleModeSwitch(next) {
			mode.value = next;
			isIdUnresolvable.value = false;
			enteredId.value = targetWorkflowId.value ?? "";
		}
		/** Only IDs offered in list mode can be used as workflow tools here. */
		function handleEnterWorkflowId(id) {
			const trimmed = id.trim();
			if (!trimmed) return;
			const known = availableWorkflows.value.find((candidate) => candidate.id === trimmed);
			isIdUnresolvable.value = !known;
			if (known) applyTarget(known);
		}
		function getWorkflow() {
			return targetWorkflow.value?.name ?? workflow.value;
		}
		function getWorkflowId() {
			return targetWorkflowId.value;
		}
		function getInputs() {
			const bindings = toRaw(inputs.value);
			if (Object.keys(bindings).length === 0) return void 0;
			if (!inputSchemaLoaded.value) return bindings;
			const allowed = new Set(declaredInputFields.value.map((field) => field.name));
			const pruned = {};
			for (const [key, binding] of Object.entries(bindings)) if (allowed.has(key)) pruned[key] = binding;
			return Object.keys(pruned).length > 0 ? pruned : void 0;
		}
		__expose({
			name,
			description,
			allOutputs,
			getWorkflow,
			getWorkflowId,
			getInputs,
			handleChangeName,
			/** Fixed for parity with the node content's `nodeTypeDescription` expose — the
			*  workflow form has no node type to render in the header icon. */
			nodeTypeDescription: null
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
					createBaseVNode("label", {
						class: normalizeClass(_ctx.$style.label),
						for: "workflow-tool-description"
					}, [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.description")) + " ", 1), createVNode(unref(N8nText_default), {
						color: "primary",
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [..._cache[8] || (_cache[8] = [createTextVNode("*", -1)])]),
						_: 1
					})], 2),
					createVNode(unref(Input_default), {
						id: "workflow-tool-description",
						modelValue: description.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => description.value = $event),
						class: normalizeClass({ [_ctx.$style.invalidDescription]: showDescriptionError.value }),
						type: "textarea",
						rows: 4,
						"aria-required": "true",
						"aria-invalid": showDescriptionError.value,
						placeholder: unref(i18n).baseText("agents.toolConfig.workflow.description.placeholder"),
						"data-test-id": "agent-workflow-tool-description"
					}, null, 8, [
						"modelValue",
						"class",
						"aria-invalid",
						"placeholder"
					]),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.description.hint")), 1)]),
						_: 1
					})
				], 2),
				createVNode(unref(N8nCallout_default), {
					theme: "warning",
					"data-test-id": "agent-workflow-tool-target-notice"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.target.notice", { interpolate: { trigger: unref(triggerLabel) } })), 1)]),
					_: 1
				}),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
					createBaseVNode("label", {
						class: normalizeClass(_ctx.$style.label),
						for: "workflow-tool-target"
					}, [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.target")) + " ", 1), createVNode(unref(N8nText_default), {
						color: "primary",
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [..._cache[9] || (_cache[9] = [createTextVNode("*", -1)])]),
						_: 1
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.controlRow) }, [
						createVNode(unref(N8nSelect_default), {
							"model-value": mode.value,
							class: normalizeClass(_ctx.$style.modeSelector),
							"data-test-id": "agent-workflow-tool-target-mode",
							"onUpdate:modelValue": handleModeSwitch
						}, {
							default: withCtx(() => [createVNode(unref(N8nOption_default), {
								value: "list",
								label: unref(i18n).baseText("resourceLocator.mode.list")
							}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
								value: "id",
								label: unref(i18n).baseText("resourceLocator.mode.id")
							}, null, 8, ["label"])]),
							_: 1
						}, 8, ["model-value", "class"]),
						mode.value === "list" ? (openBlock(), createBlock(unref(N8nSelect_default), {
							key: 0,
							id: "workflow-tool-target",
							"model-value": selectedOptionId.value,
							class: normalizeClass(_ctx.$style.controlInput),
							filterable: "",
							loading: isLoadingWorkflows.value,
							placeholder: unref(i18n).baseText("agents.toolConfig.workflow.target.placeholder"),
							"popper-class": _ctx.$style.popper,
							"data-test-id": "agent-workflow-tool-target",
							"onUpdate:modelValue": handleSelectWorkflow
						}, {
							default: withCtx(() => [isMissing.value || isUnusable.value || isAmbiguous.value ? (openBlock(), createBlock(unref(N8nOption_default), {
								key: workflowId.value ?? workflow.value,
								value: workflowId.value ?? workflow.value,
								label: workflow.value
							}, null, 8, ["value", "label"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(workflowOptions.value, (option) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: option.id,
									value: option.id,
									label: option.name
								}, {
									default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.option) }, [createVNode(unref(N8nText_default), {
										size: "small",
										bold: ""
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(option.name), 1)]),
										_: 2
									}, 1024), createVNode(unref(N8nText_default), {
										size: "xsmall",
										color: "text-light",
										class: normalizeClass(_ctx.$style.optionMeta)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(option.meta), 1)]),
										_: 2
									}, 1032, ["class"])], 2)]),
									_: 2
								}, 1032, ["value", "label"]);
							}), 128))]),
							_: 1
						}, 8, [
							"model-value",
							"class",
							"loading",
							"placeholder",
							"popper-class"
						])) : (openBlock(), createBlock(unref(Input_default), {
							key: 1,
							id: "workflow-tool-target",
							modelValue: enteredId.value,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => enteredId.value = $event),
							class: normalizeClass(_ctx.$style.controlInput),
							placeholder: unref(i18n).baseText("resourceLocator.id.placeholder"),
							"data-test-id": "agent-workflow-tool-target-id",
							onBlur: _cache[2] || (_cache[2] = ($event) => handleEnterWorkflowId(enteredId.value)),
							onKeyup: _cache[3] || (_cache[3] = withKeys(($event) => handleEnterWorkflowId(enteredId.value), ["enter"]))
						}, null, 8, [
							"modelValue",
							"class",
							"placeholder"
						])),
						targetWorkflowId.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
							key: 2,
							icon: "external-link",
							variant: "ghost",
							size: "small",
							class: normalizeClass(_ctx.$style.openTarget),
							title: unref(i18n).baseText("agents.toolConfig.workflow.target.open"),
							"aria-label": unref(i18n).baseText("agents.toolConfig.workflow.target.open"),
							"data-test-id": "agent-workflow-tool-target-open",
							onClick: openTargetWorkflow
						}, null, 8, [
							"class",
							"title",
							"aria-label"
						])) : createCommentVNode("", true)
					], 2),
					isIdUnresolvable.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "xsmall",
						color: "danger",
						"data-test-id": "agent-workflow-tool-target-id-unresolvable"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.target.idNotFound", { interpolate: { trigger: unref(triggerLabel) } })), 1)]),
						_: 1
					})) : isMissing.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "xsmall",
						color: "danger",
						"data-test-id": "agent-workflow-tool-target-missing"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.target.unavailable", { interpolate: { name: workflow.value } })), 1)]),
						_: 1
					})) : isUnusable.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 2,
						size: "xsmall",
						color: "danger",
						"data-test-id": "agent-workflow-tool-target-unusable"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.validation.issue.tool.workflow.incompatibleReference", { interpolate: { id: workflow.value } })), 1)]),
						_: 1
					})) : isAmbiguous.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 3,
						size: "xsmall",
						color: "warning",
						"data-test-id": "agent-workflow-tool-target-duplicate"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.target.duplicateName", { interpolate: { name: workflow.value } })), 1)]),
						_: 1
					})) : isUnpublished.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 4,
						size: "xsmall",
						color: "warning",
						"data-test-id": "agent-workflow-tool-target-unpublished"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.target.notPublished")), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2),
				renderSlot(_ctx.$slots, "commonSettings"),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createBaseVNode("button", {
					type: "button",
					class: normalizeClass(_ctx.$style.advancedTrigger),
					"aria-expanded": advancedExpanded.value,
					"aria-controls": "workflow-tool-advanced",
					"data-test-id": "agent-workflow-tool-advanced",
					onClick: _cache[4] || (_cache[4] = ($event) => advancedExpanded.value = !advancedExpanded.value)
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.advanced")), 1)]),
					_: 1
				}), createVNode(unref(N8nIcon_default), {
					icon: advancedExpanded.value ? "chevron-up" : "chevron-down",
					size: "medium"
				}, null, 8, ["icon"])], 10, _hoisted_1), withDirectives(createBaseVNode("div", {
					id: "workflow-tool-advanced",
					class: normalizeClass(_ctx.$style.advancedContent)
				}, [
					createVNode(AgentFormSettingRow_default, {
						"control-id": "agent-workflow-tool-all-outputs",
						title: unref(i18n).baseText("agents.toolConfig.workflow.allOutputs"),
						description: unref(i18n).baseText("agents.toolConfig.workflow.allOutputs.hint")
					}, {
						default: withCtx(() => [createVNode(unref(Switch_default), {
							id: "agent-workflow-tool-all-outputs",
							"model-value": allOutputs.value,
							"aria-label": unref(i18n).baseText("agents.toolConfig.workflow.allOutputs"),
							"data-test-id": "agent-workflow-tool-all-outputs",
							"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => allOutputs.value = $event)
						}, null, 8, ["model-value", "aria-label"])]),
						_: 1
					}, 8, ["title", "description"]),
					createVNode(unref(N8nText_default), {
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.inputs")), 1)]),
						_: 1
					}),
					isLoadingWorkflows.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-light",
						role: "status"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.inputs.loading")), 1)]),
						_: 1
					})) : !workflowsLoaded.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "danger",
						role: "alert"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.inputs.loadError")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						label: unref(i18n).baseText("generic.retry"),
						onClick: reloadWorkflows
					}, null, 8, ["label"])], 64)) : inputSchemaLoaded.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [!declaredInputFields.value.length ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "xsmall",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.workflow.inputs.empty")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(WorkflowToolInputs_default, {
						key: targetWorkflowId.value,
						modelValue: inputs.value,
						"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => inputs.value = $event),
						fields: declaredInputFields.value,
						"tool-name": name.value,
						submitted: (__props.submitCount ?? 0) > 0,
						"onUpdate:valid": _cache[7] || (_cache[7] = ($event) => inputsValid.value = $event)
					}, null, 8, [
						"modelValue",
						"fields",
						"tool-name",
						"submitted"
					]))], 64)) : createCommentVNode("", true)
				], 2), [[vShow, advancedExpanded.value]])], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_xnrdk_3",
	field: "_field_xnrdk_9",
	invalidDescription: "_invalidDescription_xnrdk_15",
	label: "_label_xnrdk_21",
	controlRow: "_controlRow_xnrdk_27",
	modeSelector: "_modeSelector_xnrdk_33",
	controlInput: "_controlInput_xnrdk_38",
	openTarget: "_openTarget_xnrdk_43",
	popper: "_popper_xnrdk_47",
	option: "_option_xnrdk_54",
	optionMeta: "_optionMeta_xnrdk_61",
	advancedTrigger: "_advancedTrigger_xnrdk_67",
	advancedContent: "_advancedContent_xnrdk_85"
} }]]);
//#endregion
//#region src/features/agents/components/AgentToolConfigWorkflowContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigWorkflowContent.vue
var AgentToolConfigWorkflowContent_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigWorkflowContent",
	props: {
		initialRef: {},
		projectId: {},
		showApprovalSetting: { type: Boolean },
		approvalRequired: { type: Boolean },
		submitCount: {}
	},
	emits: [
		"update:valid",
		"update:node-name",
		"update:approvalRequired"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const contentRef = ref(null);
		function handleChangeName(value) {
			contentRef.value?.handleChangeName(value);
		}
		function getName() {
			return contentRef.value?.name ?? "";
		}
		function getDescription() {
			return contentRef.value?.description ?? "";
		}
		function getAllOutputs() {
			return contentRef.value?.allOutputs ?? false;
		}
		function getWorkflow() {
			return contentRef.value?.getWorkflow() ?? "";
		}
		function getWorkflowId() {
			return contentRef.value?.getWorkflowId();
		}
		function getInputs() {
			return contentRef.value?.getInputs();
		}
		__expose({
			getName,
			getDescription,
			getAllOutputs,
			getWorkflow,
			getWorkflowId,
			getInputs,
			handleChangeName
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkflowToolConfigContent_default, {
				ref_key: "contentRef",
				ref: contentRef,
				"initial-ref": props.initialRef,
				"project-id": props.projectId,
				"submit-count": props.submitCount,
				"onUpdate:valid": _cache[1] || (_cache[1] = ($event) => emit("update:valid", $event)),
				"onUpdate:nodeName": _cache[2] || (_cache[2] = ($event) => emit("update:node-name", $event))
			}, {
				commonSettings: withCtx(() => [props.showApprovalSetting ? (openBlock(), createBlock(AgentToolConfigApprovalSetting_default, {
					key: 0,
					"model-value": props.approvalRequired ?? false,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:approvalRequired", $event))
				}, null, 8, ["model-value"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"initial-ref",
				"project-id",
				"submit-count"
			]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentToolConfigForm.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var httpRequestUrlErrorKey = "agents.builder.validation.issue.httpRequestUrlFromAi";
var AgentToolConfigForm_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigForm",
	props: { data: {} },
	emits: [
		"update:title",
		"credential-deleted",
		"update:restricted"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const credentialsStore = useCredentialsStore();
		const nodeTypesStore = useNodeTypesStore();
		function isMcpServerModalData(data) {
			return data.kind === "mcpServer";
		}
		function containsFromAiCall(value) {
			if (typeof value !== "string") return false;
			try {
				return extractFromAICalls(value).length > 0;
			} catch {
				return false;
			}
		}
		const isMcpTool = computed(() => isMcpServerModalData(props.data));
		const mcpModalData = computed(() => isMcpServerModalData(props.data) ? props.data : null);
		const toolModalData = computed(() => isMcpServerModalData(props.data) ? null : props.data);
		const toolValidationIssues = computed(() => toValue(toolModalData.value?.validationIssues) ?? []);
		const isWorkflowTool = computed(() => toolModalData.value?.toolRef.type === "workflow");
		const isCustomTool = computed(() => toolModalData.value?.toolRef.type === "custom");
		const nodeContentRef = ref(null);
		const mcpContentRef = ref(null);
		const workflowContentRef = ref(null);
		const isValid = ref(false);
		const submitCount = ref(0);
		const approvalRequired = ref(false);
		const mcpPermissions = ref();
		const mcpApprovalValid = ref(true);
		const draftNode = ref(null);
		const initialNode = computed(() => isMcpTool.value ? mcpModalData.value?.initialNode ?? null : isWorkflowTool.value || isCustomTool.value ? null : toolModalData.value ? toolRefToNode(toolModalData.value.toolRef) : null);
		const { isRestricted, restriction } = useNodeTypeRestriction(() => initialNode.value?.type);
		const restrictedToolName = computed(() => initialNode.value ? nodeTypesStore.getNodeType(initialNode.value.type)?.displayName ?? initialNode.value.type : "");
		watch(isRestricted, (restricted) => emit("update:restricted", restricted), { immediate: true });
		const workflowInitialRef = computed(() => isWorkflowTool.value && toolModalData.value?.toolRef.type === "workflow" ? toolModalData.value.toolRef : null);
		const initialName = computed(() => {
			if (isMcpTool.value) return mcpModalData.value?.mcpServer.name ?? "";
			return (toolModalData.value?.toolRef.type === "node" ? toolModalData.value.toolRef.name : void 0) ?? initialNode.value?.name ?? "";
		});
		const nodeName = ref(initialName.value);
		const customToolCode = computed(() => !isMcpTool.value ? toolModalData.value?.customTool?.code ?? "" : "");
		const customToolTitle = computed(() => {
			const toolRef = toolModalData.value?.toolRef;
			const fallbackName = toolRef?.type === "custom" ? toolRef.id : toolRef?.type === "workflow" || toolRef?.type === "node" ? toolRef.name : void 0;
			return toolModalData.value?.customTool?.descriptor.name ?? fallbackName ?? i18n.baseText("agents.builder.tree.customBadge");
		});
		const title = computed(() => isCustomTool.value ? customToolTitle.value : nodeName.value);
		const supportsApproval = computed(() => props.data.supportsToolApproval !== false);
		const showApprovalSetting = computed(() => supportsApproval.value && !isMcpTool.value && toolModalData.value !== null);
		watch(() => toolModalData.value?.toolRef, (toolRef) => {
			approvalRequired.value = Boolean(toolRef?.requireApproval);
		}, { immediate: true });
		watch(() => mcpModalData.value?.mcpServer.toolPermissions, (toolPermissions) => {
			mcpPermissions.value = toolPermissions ?? { categories: {
				read: "always_allow",
				write: "always_allow"
			} };
		}, { immediate: true });
		watch(initialNode, (node) => {
			draftNode.value = node;
		}, { immediate: true });
		watch(title, (value) => emit("update:title", value), { immediate: true });
		const currentNode = computed(() => draftNode.value ?? initialNode.value);
		/**
		* The tool itself is allowed but the agent it embeds holds a denied node type. The form stays
		* editable on purpose: removing that embedded tool is the only fix, so locking it would strand
		* the agent.
		*/
		const embedsRestrictedTool = computed(() => toolValidationIssues.value.some(isRestrictedByInlineTool));
		const hasHttpRequestUrlIssue = computed(() => {
			if (toolModalData.value?.toolRef.type !== "node") return false;
			if (!toolValidationIssues.value.some((issue) => issue.code === "invalid_value" && issue.path.endsWith(".node.nodeParameters.url"))) return false;
			return containsFromAiCall(currentNode.value?.parameters.url);
		});
		const canSave = computed(() => {
			if (isCustomTool.value) return true;
			if (isMcpTool.value) return isValid.value && (!supportsApproval.value || mcpApprovalValid.value);
			return isValid.value && !hasHttpRequestUrlIssue.value;
		});
		const fromAiDisabledParameters = computed(() => {
			const toolRef = toolModalData.value?.toolRef;
			if (toolRef?.type === "node" && (toolRef.node.nodeType === "n8n-nodes-base.httpRequest" || toolRef.node.nodeType === "n8n-nodes-base.httpRequestTool")) return ["url"];
			return [];
		});
		const nodeParameterIssues = computed(() => {
			const issues = {};
			if (hasHttpRequestUrlIssue.value) issues.url = [i18n.baseText(httpRequestUrlErrorKey)];
			return issues;
		});
		function withApprovalRequirement(ref) {
			if (!supportsApproval.value) {
				const { requireApproval: _requireApproval, ...rest } = ref;
				return rest;
			}
			const updatedRef = { ...ref };
			if (approvalRequired.value) updatedRef.requireApproval = true;
			else delete updatedRef.requireApproval;
			return updatedRef;
		}
		function confirm() {
			submitCount.value += 1;
			if (!canSave.value) return false;
			if (isCustomTool.value) {
				const toolData = toolModalData.value;
				if (!toolData) return false;
				toolData.onConfirm(withApprovalRequirement(toolData.toolRef));
				return true;
			}
			if (isMcpTool.value) {
				const currentMcpNode = mcpContentRef.value?.getNode();
				const mcpData = mcpModalData.value;
				if (!currentMcpNode || !mcpData || !mcpPermissions.value) return false;
				const updatedServer = nodeToMcpServer(currentMcpNode, mcpData.mcpServer);
				mcpData.onConfirm({
					...updatedServer,
					toolPermissions: supportsApproval.value ? mcpPermissions.value : { categories: {
						read: "always_allow",
						write: "always_allow"
					} }
				});
				return true;
			}
			if (isWorkflowTool.value) {
				const content = workflowContentRef.value;
				const toolData = toolModalData.value;
				if (!toolData || !content) return false;
				const workflowId = content.getWorkflowId();
				const updatedRef = updateWorkflowToolRef(toolData.toolRef, {
					name: content.getName(),
					description: content.getDescription(),
					allOutputs: content.getAllOutputs(),
					workflow: content.getWorkflow(),
					...workflowId !== void 0 ? { workflowId } : {},
					inputs: content.getInputs()
				});
				toolData.onConfirm(withApprovalRequirement(updatedRef));
				return true;
			}
			const currentToolNode = nodeContentRef.value?.getNode();
			const toolData = toolModalData.value;
			if (!currentToolNode || !toolData) return false;
			const updatedRef = updateToolRefFromNode(toolData.toolRef, currentToolNode);
			toolData.onConfirm(withApprovalRequirement(updatedRef));
			return true;
		}
		function remove() {
			props.data.onRemove?.();
		}
		function changeTitle(name) {
			if (isCustomTool.value) return;
			if (isMcpTool.value) mcpContentRef.value?.handleChangeName(name);
			else if (isWorkflowTool.value) workflowContentRef.value?.handleChangeName(name);
			else nodeContentRef.value?.handleChangeName(name);
		}
		function handleNodeNameUpdate(name) {
			nodeName.value = name;
		}
		const credentialListeners = effectScope(true);
		credentialListeners.run(() => {
			listenForCredentialChanges({
				store: credentialsStore,
				onCredentialDeleted: (credentialId) => {
					const data = mcpModalData.value;
					if (!data || data.mcpServer.credential !== credentialId) return;
					data.onRemove?.();
					emit("credential-deleted");
				}
			});
		});
		onBeforeUnmount(() => credentialListeners.stop());
		__expose({
			canSave,
			confirm,
			remove,
			changeTitle
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.contentWrapper, isCustomTool.value && _ctx.$style.codeContentWrapper]) }, [
				unref(isRestricted) ? (openBlock(), createBlock(unref(RestrictedTypeCallout_default), {
					key: 0,
					surface: "tool",
					"type-name": restrictedToolName.value,
					restriction: unref(restriction)
				}, null, 8, ["type-name", "restriction"])) : embedsRestrictedTool.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 1,
					theme: "warning",
					"data-test-id": "inline-restricted-tool-callout"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.restrictedInlineTool")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				submitCount.value && !canSave.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					color: "danger",
					"data-testid": "agent-tool-config-validation-error"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.toolConfig.validation.fixFields")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				isCustomTool.value ? (openBlock(), createBlock(AgentToolConfigCustomContent_default, {
					key: 3,
					code: customToolCode.value,
					class: normalizeClass(_ctx.$style.customToolViewer)
				}, null, 8, ["code", "class"])) : createCommentVNode("", true),
				isCustomTool.value && showApprovalSetting.value ? (openBlock(), createBlock(AgentToolConfigApprovalSetting_default, {
					key: 4,
					modelValue: approvalRequired.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => approvalRequired.value = $event)
				}, null, 8, ["modelValue"])) : (openBlock(), createElementBlock("div", {
					key: 5,
					class: normalizeClass(_ctx.$style.configureTab)
				}, [
					workflowInitialRef.value ? (openBlock(), createBlock(AgentToolConfigWorkflowContent_default, {
						key: 0,
						ref_key: "workflowContentRef",
						ref: workflowContentRef,
						"initial-ref": workflowInitialRef.value,
						"submit-count": submitCount.value,
						"project-id": __props.data.projectId,
						"show-approval-setting": showApprovalSetting.value,
						"approval-required": approvalRequired.value,
						"onUpdate:valid": _cache[1] || (_cache[1] = ($event) => isValid.value = $event),
						"onUpdate:nodeName": handleNodeNameUpdate,
						"onUpdate:approvalRequired": _cache[2] || (_cache[2] = ($event) => approvalRequired.value = $event)
					}, null, 8, [
						"initial-ref",
						"submit-count",
						"project-id",
						"show-approval-setting",
						"approval-required"
					])) : isMcpTool.value && initialNode.value ? (openBlock(), createBlock(AgentToolConfigNodeContent_default, {
						key: 1,
						ref_key: "mcpContentRef",
						ref: mcpContentRef,
						"initial-node": initialNode.value,
						"existing-tool-names": __props.data.existingToolNames,
						"project-id": __props.data.projectId,
						"hidden-parameters": [
							"include",
							"includeTools",
							"excludeTools"
						],
						"read-only": unref(isRestricted),
						"content-test-id": "agent-tool-config-mcp-content",
						"onUpdate:valid": _cache[3] || (_cache[3] = ($event) => isValid.value = $event),
						"onUpdate:nodeName": handleNodeNameUpdate,
						"onUpdate:node": _cache[4] || (_cache[4] = ($event) => draftNode.value = $event)
					}, null, 8, [
						"initial-node",
						"existing-tool-names",
						"project-id",
						"read-only"
					])) : initialNode.value ? (openBlock(), createBlock(AgentToolConfigNodeContent_default, {
						key: 2,
						ref_key: "nodeContentRef",
						ref: nodeContentRef,
						"initial-node": initialNode.value,
						"existing-tool-names": __props.data.existingToolNames,
						"project-id": __props.data.projectId,
						"from-ai-disabled-parameters": fromAiDisabledParameters.value,
						"parameter-issues": nodeParameterIssues.value,
						"read-only": unref(isRestricted),
						"content-test-id": "node-tool-settings-content",
						"onUpdate:valid": _cache[5] || (_cache[5] = ($event) => isValid.value = $event),
						"onUpdate:nodeName": handleNodeNameUpdate,
						"onUpdate:node": _cache[6] || (_cache[6] = ($event) => draftNode.value = $event)
					}, null, 8, [
						"initial-node",
						"existing-tool-names",
						"project-id",
						"from-ai-disabled-parameters",
						"parameter-issues",
						"read-only"
					])) : createCommentVNode("", true),
					!isMcpTool.value && initialNode.value && showApprovalSetting.value ? (openBlock(), createBlock(AgentToolConfigApprovalSetting_default, {
						key: 3,
						modelValue: approvalRequired.value,
						"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => approvalRequired.value = $event),
						disabled: unref(isRestricted)
					}, null, 8, ["modelValue", "disabled"])) : createCommentVNode("", true),
					isMcpTool.value && mcpPermissions.value && supportsApproval.value && currentNode.value ? (openBlock(), createBlock(AgentToolConfigMcpApprovalSetting_default, {
						key: 4,
						modelValue: mcpPermissions.value,
						"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => mcpPermissions.value = $event),
						node: currentNode.value,
						disabled: unref(isRestricted),
						"project-id": __props.data.projectId,
						"onUpdate:valid": _cache[9] || (_cache[9] = ($event) => mcpApprovalValid.value = $event)
					}, null, 8, [
						"modelValue",
						"node",
						"disabled",
						"project-id"
					])) : createCommentVNode("", true)
				], 2))
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	contentWrapper: "_contentWrapper_35uik_1",
	codeContentWrapper: "_codeContentWrapper_35uik_11",
	configureTab: "_configureTab_35uik_16",
	customToolViewer: "_customToolViewer_35uik_23"
} }]]);
//#endregion
//#region src/features/agents/components/AgentToolConfigContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigContent.vue
var AgentToolConfigContent_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigContent",
	props: { data: {} },
	emits: [
		"credential-deleted",
		"request-credential-picker",
		"update:title",
		"update:restricted"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const genericForm = ref(null);
		const registryForm = ref(null);
		const isRegistryConfig = computed(() => props.data.kind === "registryMcpServer");
		const titleError = computed(() => registryForm.value?.titleError ?? "");
		const headerItem = computed(() => registryForm.value?.headerItem ?? null);
		const credentialAdapter = computed(() => registryForm.value?.credentialAdapter ?? null);
		const saveDisabled = computed(() => isRegistryConfig.value && (registryForm.value?.saveDisabled ?? true));
		function confirm() {
			return isRegistryConfig.value ? registryForm.value?.confirm() ?? false : genericForm.value?.confirm() ?? false;
		}
		async function remove() {
			if (isRegistryConfig.value) return await registryForm.value?.remove() ?? false;
			genericForm.value?.remove();
			return true;
		}
		function changeTitle(title) {
			if (isRegistryConfig.value) registryForm.value?.changeTitle(title);
			else genericForm.value?.changeTitle(title);
		}
		function selectCredential(authType, credentialId) {
			if (isRegistryConfig.value) registryForm.value?.selectCredential(authType, credentialId);
		}
		__expose({
			changeTitle,
			confirm,
			credentialAdapter,
			headerItem,
			remove,
			saveDisabled,
			selectCredential,
			titleError
		});
		return (_ctx, _cache) => {
			return __props.data.kind === "registryMcpServer" ? (openBlock(), createBlock(AgentRegistryMcpConfigForm_default, {
				key: 0,
				ref_key: "registryForm",
				ref: registryForm,
				data: __props.data,
				onCredentialDeleted: _cache[0] || (_cache[0] = ($event) => emit("credential-deleted")),
				onRequestCredentialPicker: _cache[1] || (_cache[1] = ($event) => emit("request-credential-picker")),
				"onUpdate:title": _cache[2] || (_cache[2] = ($event) => emit("update:title", $event))
			}, null, 8, ["data"])) : (openBlock(), createBlock(AgentToolConfigForm_default, {
				key: 1,
				ref_key: "genericForm",
				ref: genericForm,
				data: __props.data,
				onCredentialDeleted: _cache[3] || (_cache[3] = ($event) => emit("credential-deleted")),
				"onUpdate:title": _cache[4] || (_cache[4] = ($event) => emit("update:title", $event)),
				"onUpdate:restricted": _cache[5] || (_cache[5] = ($event) => emit("update:restricted", $event))
			}, null, 8, ["data"]));
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentToolConfigCredentialPicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentToolConfigCredentialPicker.vue
var AgentToolConfigCredentialPicker_default = /* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigCredentialPicker",
	props: {
		item: {},
		adapter: {},
		showConnectedIcon: { type: Boolean }
	},
	emits: ["select-credential"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const emit = __emit;
		const picker = ref(null);
		function open() {
			picker.value?.open();
		}
		__expose({ open });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ToolCredentialPicker_default, {
				ref_key: "picker",
				ref: picker,
				item: __props.item,
				credentials: __props.item.credentials ?? [],
				adapter: __props.adapter,
				"show-connected-icon": __props.showConnectedIcon,
				onSelectCredential: _cache[0] || (_cache[0] = (_item, authType, credentialId) => emit("select-credential", authType, credentialId))
			}, null, 8, [
				"item",
				"credentials",
				"adapter",
				"show-connected-icon"
			]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentToolConfigTitleIcon.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentToolConfigTitleIcon_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentToolConfigTitleIcon",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const nodeTypesStore = useNodeTypesStore();
		const nodeType = computed(() => {
			if (props.data.kind === "registryMcpServer") {
				const nodeTypeName = props.data.mcpServer.metadata?.nodeTypeName;
				return nodeTypeName ? nodeTypesStore.getNodeType(nodeTypeName) : null;
			}
			if (props.data.kind === "mcpServer") return nodeTypesStore.getNodeType(props.data.initialNode.type, props.data.initialNode.typeVersion);
			if (props.data.toolRef.type !== "node") return null;
			return nodeTypesStore.getNodeType(props.data.toolRef.node.nodeType, props.data.toolRef.node.nodeTypeVersion);
		});
		const fallbackIcon = computed(() => {
			if (props.data.kind === "registryMcpServer" || props.data.kind === "mcpServer") return "server";
			if (props.data.toolRef.type === "workflow") return "workflow";
			if (props.data.toolRef.type === "custom") return "code";
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				class: normalizeClass(_ctx.$style.icon),
				"data-testid": "agent-tool-config-title-icon",
				"aria-hidden": "true"
			}, [nodeType.value ? (openBlock(), createBlock(NodeIcon_default, {
				key: 0,
				"node-type": nodeType.value,
				size: 24,
				circle: true
			}, null, 8, ["node-type"])) : fallbackIcon.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 1,
				icon: fallbackIcon.value,
				size: 20
			}, null, 8, ["icon"])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": { icon: "_icon_1ygfj_1" } }]]);
//#endregion
export { toolCategoryForNodeType as a, isAiGatewayMcpEntry as c, useAgentMcpDiscovery as d, hasInputs as i, toMcpEntryAuth as l, AgentToolConfigCredentialPicker_default as n, useAgentToolCatalog as o, AgentToolConfigContent_default as r, DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS as s, AgentToolConfigTitleIcon_default as t, toMcpRegistryCredentialRefs as u };
