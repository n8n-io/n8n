import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, of as onBeforeUnmount, pf as provide, rf as mergeProps, vf as resolveDynamicComponent, vp as normalizeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { AN as i18n, Ai as useInstanceAiSettingsStore, Jg as useUIStore, Mp as useCredentialsStore, PA as useMessage, SN as _plugin_vue_export_helper_default, TE as DEFAULT_INSTANCE_AI_PERMISSIONS, UA as DialogFooter_default, WA as DialogBody_default, bC as useRootStore, hc as BROWSER_USE_CONNECTION_TYPE, jN as useI18n, ny as CREDENTIAL_EDIT_MODAL_KEY, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { r as TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY } from "./ToolCredentialPicker-Clmo6S9M.js";
import { n as DefaultDetailBody_default, t as ToolsConnectionModal_default } from "./ToolsConnectionModal-Cq-bWNJX.js";
import { n as McpDetailBody_default, r as McpConnectionStatusCallout_default, t as McpToolPermissionsEditor_default } from "./McpToolPermissionsEditor-nRVRNnRu.js";
import { t as iconForMcpRegistryServer } from "./mcpRegistryIcon-BDkbIdlc.js";
import { t as discoverMcpConnection } from "./mcpRegistry.api-Ck2JWrEp.js";
import { t as McpRegistrySuggestionFooter_default } from "./McpRegistrySuggestionFooter-CgPpYIFt.js";
import { t as useInstanceAiMcpStore } from "./instanceAiMcp.store-DclLlpUY.js";
import { n as useInstanceAiMcpTelemetry, t as useMcpServerConnect } from "./useMcpServerConnect-D4-BWFpf.js";
import { i as useInstanceAiBrowserUseTelemetry } from "./useExtensionDirectConnect-DyzoSYRV.js";
import { t as BrowserUseSetupContent_default } from "./BrowserUseSetupContent-CDRuyoQ7.js";
//#region src/features/shared/toolsConnection/McpToolSettingsContent.vue?vue&type=script&setup=true&lang.ts
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler(), init_reactivity_esm_bundler();
var FORM_ID = "mcp-tool-settings-form";
var McpToolSettingsContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpToolSettingsContent",
	props: {
		item: {},
		actor: { default: "assistant" },
		supportsApproval: {
			type: Boolean,
			default: true
		},
		showRemove: {
			type: Boolean,
			default: true
		},
		saveLabel: {}
	},
	emits: [
		"save",
		"disconnect",
		"cancel",
		"reconnect",
		"retry"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const isConnectionUnhealthy = computed(() => props.item.status === "disconnected");
		const arePermissionsDisabled = computed(() => props.item.status !== "connected");
		const initialSettings = () => props.item.settings ?? { categories: {
			read: DEFAULT_INSTANCE_AI_PERMISSIONS.mcpRead,
			write: DEFAULT_INSTANCE_AI_PERMISSIONS.mcpWrite
		} };
		const draftSettings = ref(initialSettings());
		const draftPermissions = computed({
			get: () => draftSettings.value,
			set: (permissions) => {
				draftSettings.value = {
					...permissions,
					...draftSettings.value.connectionTimeoutMs === void 0 ? {} : { connectionTimeoutMs: draftSettings.value.connectionTimeoutMs }
				};
			}
		});
		const hasSavedBefore = ref(false);
		watch(() => props.item.id, () => {
			hasSavedBefore.value = false;
			draftSettings.value = initialSettings();
		});
		const hasChanges = computed(() => {
			if (!hasSavedBefore.value) return true;
			return JSON.stringify(draftSettings.value) !== JSON.stringify(initialSettings());
		});
		function handleSave() {
			if (!hasChanges.value) return;
			hasSavedBefore.value = true;
			emit("save", draftSettings.value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.layout) }, [createVNode(unref(DialogBody_default), null, {
				default: withCtx(() => [createBaseVNode("form", {
					id: FORM_ID,
					onSubmit: withModifiers(handleSave, ["prevent"])
				}, [
					createVNode(McpDetailBody_default, { item: __props.item }, null, 8, ["item"]),
					isConnectionUnhealthy.value ? (openBlock(), createBlock(McpConnectionStatusCallout_default, {
						key: 0,
						class: normalizeClass(_ctx.$style.failureCallout),
						"failure-reason": __props.item.connectionFailureReason,
						onReconnect: _cache[0] || (_cache[0] = ($event) => emit("reconnect")),
						onRetry: _cache[1] || (_cache[1] = ($event) => emit("retry"))
					}, null, 8, ["class", "failure-reason"])) : createCommentVNode("", true),
					createVNode(McpToolPermissionsEditor_default, {
						modelValue: draftPermissions.value,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => draftPermissions.value = $event),
						class: normalizeClass(_ctx.$style.permissions),
						actor: __props.actor,
						"available-tools": __props.item.availableTools,
						"server-title": __props.item.title,
						status: __props.item.status,
						"exclude-permissions": __props.supportsApproval ? [] : ["require_approval"]
					}, null, 8, [
						"modelValue",
						"class",
						"actor",
						"available-tools",
						"server-title",
						"status",
						"exclude-permissions"
					])
				], 32)]),
				_: 1
			}), createVNode(unref(DialogFooter_default), null, {
				default: withCtx(() => [
					__props.showRemove ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.removeButton),
						variant: "destructive",
						size: "small",
						type: "button",
						"data-test-id": "tools-connection-settings-remove",
						onClick: _cache[3] || (_cache[3] = ($event) => emit("disconnect"))
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "trash-2",
							size: 14,
							class: normalizeClass(_ctx.$style.footerIcon)
						}, null, 8, ["class"]), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tools.connection.settings.remove")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						type: "button",
						label: unref(i18n).baseText("generic.cancel"),
						"data-test-id": "tools-connection-settings-cancel",
						onClick: _cache[4] || (_cache[4] = ($event) => emit("cancel"))
					}, null, 8, ["label"]),
					createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "small",
						type: "submit",
						form: FORM_ID,
						label: __props.saveLabel ?? unref(i18n).baseText("generic.save"),
						disabled: !hasChanges.value || arePermissionsDisabled.value,
						"data-test-id": "tools-connection-settings-save"
					}, null, 8, ["label", "disabled"])
				]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_19u0r_1",
	failureCallout: "_failureCallout_19u0r_9",
	permissions: "_permissions_19u0r_13",
	removeButton: "_removeButton_19u0r_17",
	footerIcon: "_footerIcon_19u0r_21"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/modals/InstanceAiToolsConnectionModalWrapper.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/modals/InstanceAiToolsConnectionModalWrapper.vue
var InstanceAiToolsConnectionModalWrapper_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "InstanceAiToolsConnectionModalWrapper",
	props: { modalName: {} },
	setup(__props) {
		const props = __props;
		const uiStore = useUIStore();
		const rootStore = useRootStore();
		const credentialsStore = useCredentialsStore();
		const mcpStore = useInstanceAiMcpStore();
		const mcpTelemetry = useInstanceAiMcpTelemetry();
		const browserUseTelemetry = useInstanceAiBrowserUseTelemetry();
		const settingsStore = useInstanceAiSettingsStore();
		const message = useMessage();
		const draftConnection = ref(null);
		const { invalidate: invalidateDiscovery, next: nextDiscovery } = useLatestFetch();
		const isBrowserUseEnabled = computed(() => settingsStore.isBrowserUseAvailable);
		function readConnectionIdPayload(data) {
			if (data === null || typeof data !== "object") return null;
			const value = data.connectionId;
			return typeof value === "string" ? value : null;
		}
		const modalState = computed(() => uiStore.modalsById[props.modalName] ?? null);
		const isCredentialModalOpen = computed(() => uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]?.open === true);
		const isOpen = computed({
			get: () => !isCredentialModalOpen.value,
			set: (value) => {
				if (!value) uiStore.closeModal(props.modalName);
			}
		});
		const activeItemId = ref(readConnectionIdPayload(modalState.value?.data));
		const isDirectConnectionOpen = computed(() => !!readConnectionIdPayload(modalState.value?.data));
		const detailItem = computed(() => {
			if (!activeItemId.value) return null;
			const item = items.value.find((candidate) => candidate.id === activeItemId.value) ?? null;
			return item?.kind === "mcp-server" && item.status === "none" ? null : item;
		});
		const detailMode = computed(() => detailItem.value?.kind === "mcp-server" ? "settings" : "detail");
		const { connectServer, createCredentialAdapter, ignorePendingConnectResult, isConnectLocked, saveConnection } = useMcpServerConnect();
		/** Reveals the settings view of the server the user just connected */
		function showConnectedServer(connectionId) {
			if (connectionId) activeItemId.value = connectionId;
		}
		async function discoverDraft(serverSlug, credentialId, credentialType) {
			const connection = mcpStore.connections.find((item) => item.serverSlug === serverSlug);
			const isCurrent = nextDiscovery();
			draftConnection.value = {
				...connection ? { connectionId: connection.id } : {},
				serverSlug,
				credentialId,
				credentialType,
				status: "connecting",
				tools: []
			};
			const itemId = connection?.id ?? serverSlug;
			activeItemId.value = itemId;
			const result = await discoverMcpConnection(rootStore.restApiContext, {
				slug: serverSlug,
				credentialId
			}).catch(() => ({
				status: "disconnected",
				failureReason: "unknown",
				tools: []
			}));
			const currentDraft = draftConnection.value;
			if (!isCurrent() || !currentDraft) return null;
			draftConnection.value = {
				...currentDraft,
				status: result.status,
				tools: result.tools,
				...result.status === "disconnected" ? { failureReason: result.failureReason } : {}
			};
			return itemId;
		}
		const isLoadingCredentials = ref(false);
		/**
		* App startup does not wait for credentials, so the store can still be empty.
		* Block until the first fetch lands, and refresh in the background otherwise.
		*/
		async function loadCredentials() {
			isLoadingCredentials.value = credentialsStore.allCredentials.length === 0;
			try {
				await credentialsStore.fetchAllCredentials();
			} catch (error) {
				console.error("Failed to fetch credentials", error);
			} finally {
				isLoadingCredentials.value = false;
			}
		}
		if (settingsStore.isMcpAvailable) {
			mcpStore.fetchCatalogLazy();
			mcpStore.fetchConnectionsLazy();
			loadCredentials();
			credentialsStore.fetchCredentialTypes(false);
		}
		onBeforeUnmount(() => {
			invalidateDiscovery();
			const state = uiStore.modalsById[props.modalName];
			if (state?.data && Object.keys(state.data).length > 0) uiStore.setModalData({
				name: props.modalName,
				data: {}
			});
		});
		function toMcpServerTool(tool) {
			const out = {
				id: tool.name,
				name: tool.name,
				category: tool.category
			};
			if (tool.description) out.description = tool.description;
			return out;
		}
		function settingsForConnection(connection) {
			return connection.toolPermissions;
		}
		function draftForConnection(serverSlug, connection) {
			const draft = draftConnection.value;
			return draft?.serverSlug === serverSlug && draft.connectionId === connection?.id ? draft : null;
		}
		function availableToolsForConnection(serverSlug, connection) {
			const draft = draftForConnection(serverSlug, connection);
			if (draft) return draft.tools.map(toMcpServerTool);
			return (connection ? mcpStore.connectionToolsById.get(connection.id) : void 0)?.map(toMcpServerTool) ?? [];
		}
		function buildItem(server, connection) {
			const draft = draftForConnection(server.slug, connection);
			return {
				id: connection?.id ?? server.slug,
				kind: "mcp-server",
				category: "mcp",
				title: server.title,
				description: server.tagline,
				longDescription: server.description,
				status: isConnectLocked(server.slug) ? "connecting" : draft?.status ?? connection?.status ?? "none",
				connectionFailureReason: draft?.failureReason ?? connection?.failureReason,
				iconSource: iconForMcpRegistryServer(server.icons, uiStore.appliedTheme),
				credentials: server.credentials.map(({ credentialType, name }) => ({
					authType: credentialType,
					displayName: name,
					credentialId: draft?.credentialType === credentialType ? draft.credentialId : connection?.credentialType === credentialType ? connection.credentialId : void 0,
					required: true
				})),
				availableTools: availableToolsForConnection(server.slug, connection),
				isOfficial: server.isOfficial,
				...connection ? { settings: settingsForConnection(connection) } : {},
				publisher: server.isOfficial || server.websiteUrl ? {
					name: server.title,
					url: server.websiteUrl
				} : void 0,
				version: server.version,
				docsUrl: server.websiteUrl
			};
		}
		const builtInServiceDefinitions = computed(() => {
			return [{
				id: BROWSER_USE_CONNECTION_TYPE,
				titleKey: "instanceAi.connections.add.browserUse",
				descriptionKey: "instanceAi.connections.types.browserUse.description",
				iconSource: {
					type: "icon",
					name: "globe"
				},
				detailComponent: BrowserUseSetupContent_default,
				detailProps: { embedded: true },
				isAvailable: isBrowserUseEnabled.value,
				isConnected: settingsStore.browserConnected
			}];
		});
		const serviceItems = computed(() => {
			return builtInServiceDefinitions.value.filter((service) => service.isAvailable).map((service) => ({
				id: service.id,
				kind: "service",
				category: "built-in",
				serviceId: service.id,
				title: i18n.baseText(service.titleKey),
				description: i18n.baseText(service.descriptionKey),
				status: service.isConnected ? "connected" : "none",
				iconSource: service.iconSource
			}));
		});
		const activeServiceDefinition = computed(() => {
			const item = detailItem.value;
			if (item?.kind !== "service") return null;
			return builtInServiceDefinitions.value.find((service) => service.id === item.serviceId) ?? null;
		});
		const items = computed(() => {
			const out = [...serviceItems.value];
			if (settingsStore.isMcpAvailable) {
				const catalog = mcpStore.catalog ?? [];
				for (const server of catalog) {
					const connections = mcpStore.connectionsByServerSlug.get(server.slug) ?? [];
					if (connections.length === 0) {
						out.push(buildItem(server, void 0));
						continue;
					}
					for (const connection of connections) out.push(buildItem(server, connection));
				}
			}
			return out;
		});
		watch(() => detailItem.value?.id ?? null, (id) => {
			const item = detailItem.value;
			if (!id || !item || item.kind !== "mcp-server") return;
			if (draftConnection.value?.serverSlug === serverSlugForItem(item)) return;
			mcpStore.fetchConnectionToolsLazy(id);
		}, { immediate: true });
		provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, createCredentialAdapter((authType, item, credentialTypes) => {
			(async () => {
				const server = item.kind === "mcp-server" ? findServerForItem(item) : void 0;
				if (!server) {
					uiStore.openNewCredential(authType);
					return;
				}
				showConnectedServer(await connectServer({
					slug: server.slug,
					credentialType: authType,
					credentialTypes
				}, discoverDraft));
			})();
		}));
		function serverSlugForItem(item) {
			return mcpStore.connections.find((c) => c.id === item.id)?.serverSlug ?? item.id;
		}
		function findServerForItem(item) {
			const serverSlug = serverSlugForItem(item);
			return mcpStore.catalog?.find((server) => server.slug === serverSlug);
		}
		function trackMcpCredentialInteraction(item, track) {
			if (item.kind !== "mcp-server") return;
			const server = findServerForItem(item);
			if (!server) return;
			track(server.slug);
		}
		function handleFirstCredentialConnect(item) {
			trackMcpCredentialInteraction(item, (serverSlug) => {
				mcpTelemetry.trackFirstCredentialConnectionStart(serverSlug);
			});
		}
		function handleCredentialDropdownOpen(item) {
			trackMcpCredentialInteraction(item, (serverSlug) => {
				mcpTelemetry.trackCredentialDropdownOpened(serverSlug);
			});
		}
		function handleNewCredentialConnect(item) {
			trackMcpCredentialInteraction(item, (serverSlug) => {
				mcpTelemetry.trackNewCredentialConnectionStart(serverSlug);
			});
		}
		async function handleSelectCredential(item, authType, credentialId) {
			if (item.kind !== "mcp-server") return;
			const server = findServerForItem(item);
			if (!server) return;
			ignorePendingConnectResult(server.slug);
			mcpTelemetry.trackExistingCredentialSelected(server.slug);
			showConnectedServer(await discoverDraft(server.slug, credentialId, authType));
		}
		async function handleSave(item, settings) {
			if (!settings || item.kind !== "mcp-server") return;
			const draft = draftConnection.value?.serverSlug === serverSlugForItem(item) ? draftConnection.value : null;
			if (draft && draft.status !== "connected") return;
			const saved = mcpStore.connections.find((connection) => connection.id === item.id);
			const serverSlug = draft?.serverSlug ?? saved?.serverSlug;
			const credentialId = draft?.credentialId ?? saved?.credentialId;
			if (!serverSlug || !credentialId) return;
			const updated = await saveConnection({
				serverSlug,
				credentialId,
				toolPermissions: settings
			});
			if (!updated) return;
			if (saved && !(0, import_isEqual.default)(item.settings, settings)) mcpTelemetry.trackToolPermissionsUpdated(updated.serverSlug, settings);
			draftConnection.value = null;
			uiStore.closeModal(props.modalName);
		}
		async function handleDisconnect(item) {
			const disconnectedSlug = item.kind === "mcp-server" ? serverSlugForItem(item) : void 0;
			if (item.kind === "mcp-server") {
				if (await message.confirm(i18n.baseText("tools.connection.settings.removeConfirm.description", { interpolate: {
					item: "connector",
					service: item.title
				} }), {
					title: i18n.baseText("tools.connection.settings.removeConfirm.title", { interpolate: { name: item.title } }),
					confirmButtonText: i18n.baseText("tools.connection.settings.removeConfirm.confirmButton", { interpolate: { item: "connector" } }),
					cancelButtonText: i18n.baseText("generic.cancel")
				}) !== "confirm") return;
				ignorePendingConnectResult(serverSlugForItem(item));
			}
			if (!await mcpStore.disconnect(item.id)) return;
			if (disconnectedSlug && draftConnection.value?.serverSlug === disconnectedSlug) {
				invalidateDiscovery();
				draftConnection.value = null;
			}
			activeItemId.value = null;
		}
		function handleDetailItemUpdate(item) {
			if (item?.kind === "mcp-server" && item.status === "none") return;
			if (!item) {
				invalidateDiscovery();
				draftConnection.value = null;
			}
			activeItemId.value = item?.id ?? null;
			if (item?.kind !== "service") return;
			if (item.serviceId === "browser-use") browserUseTelemetry.trackModalOpened("tools_modal");
		}
		async function handleConnect(item) {
			if (item.kind !== "mcp-server") return;
			const server = findServerForItem(item);
			const credentialType = item.credentials?.[0]?.authType;
			if (server && credentialType) showConnectedServer(await connectServer({
				slug: server.slug,
				credentialType
			}, discoverDraft));
		}
		function isNewDraft(item) {
			return draftConnection.value?.serverSlug === serverSlugForItem(item) && draftConnection.value.connectionId === void 0;
		}
		function retryConnection(item) {
			const draft = draftConnection.value;
			if (draft?.serverSlug === serverSlugForItem(item)) {
				discoverDraft(draft.serverSlug, draft.credentialId, draft.credentialType);
				return;
			}
			mcpStore.fetchConnectionTools(item.id);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ToolsConnectionModal_default, {
				open: isOpen.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isOpen.value = $event),
				items: items.value,
				categories: ["all"],
				title: unref(i18n).baseText("instanceAi.connections.modal.title"),
				"search-placeholder": unref(i18n).baseText("instanceAi.connections.modal.searchPlaceholder"),
				"detail-item": detailItem.value,
				"detail-mode": detailMode.value,
				"hide-back-button": isDirectConnectionOpen.value,
				"show-suggestion-footer": true,
				loading: isLoadingCredentials.value,
				"onUpdate:detailItem": handleDetailItemUpdate,
				onSelectCredential: handleSelectCredential,
				onCredentialDropdownOpen: handleCredentialDropdownOpen,
				onFirstCredentialConnect: handleFirstCredentialConnect,
				onNewCredentialConnect: handleNewCredentialConnect,
				onConnect: handleConnect,
				onSave: handleSave,
				onDisconnect: handleDisconnect
			}, {
				"suggestion-footer": withCtx(() => [createVNode(McpRegistrySuggestionFooter_default, {
					prompt: unref(i18n).baseText("instanceAi.connections.modal.suggestion.prompt"),
					action: unref(i18n).baseText("instanceAi.connections.modal.suggestion.action")
				}, null, 8, ["prompt", "action"])]),
				"detail-body": withCtx(({ item }) => [item.kind === "service" && activeServiceDefinition.value ? (openBlock(), createBlock(resolveDynamicComponent(activeServiceDefinition.value.detailComponent), normalizeProps(mergeProps({ key: 0 }, activeServiceDefinition.value.detailProps ?? {})), null, 16)) : (openBlock(), createBlock(DefaultDetailBody_default, {
					key: 1,
					item
				}, null, 8, ["item"]))]),
				"settings-body": withCtx(({ item, onSave, onDisconnect, onClose, onReconnect }) => [item.kind === "mcp-server" ? (openBlock(), createBlock(McpToolSettingsContent_default, {
					key: 0,
					item,
					"show-remove": !isNewDraft(item),
					"save-label": isNewDraft(item) ? unref(i18n).baseText("instanceAi.inputMenu.tools.add") : void 0,
					onSave: (settings) => onSave(settings),
					onDisconnect,
					onCancel: onClose,
					onReconnect,
					onRetry: ($event) => retryConnection(item)
				}, null, 8, [
					"item",
					"show-remove",
					"save-label",
					"onSave",
					"onDisconnect",
					"onCancel",
					"onReconnect",
					"onRetry"
				])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"open",
				"items",
				"title",
				"search-placeholder",
				"detail-item",
				"detail-mode",
				"hide-back-button",
				"loading"
			]);
		};
	}
});
//#endregion
export { InstanceAiToolsConnectionModalWrapper_default as default };
