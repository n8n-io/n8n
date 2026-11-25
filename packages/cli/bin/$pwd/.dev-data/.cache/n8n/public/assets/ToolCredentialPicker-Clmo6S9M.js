import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ef as inject, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Nj as N8nPopover_default, SE as AI_GATEWAY_MANAGED_TAG, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bN as N8nSpinner_default, cN as Input_default, jN as useI18n, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/shared/toolsConnection/types.ts
/**
* Renderer for `{ type: 'avatar' }` icon sources. The consumer that passes
* avatar items injects the component at its mount site.
*/
var TOOL_ICON_AVATAR_RENDERER_KEY = Symbol("tool-icon-avatar-renderer");
/** Whether a connection exists or is currently being established. */
function hasToolConnection(status) {
	return status !== "none";
}
/** Used when an item carries no explicit `category`. */
var CATEGORY_BY_KIND = {
	node: "app-action",
	workflow: "workflows",
	"mcp-server": "mcp",
	service: "built-in",
	agent: "agents",
	"data-store": "data",
	skill: "project"
};
var TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY = Symbol("tool-connection-credential-adapter");
var TOOL_CONNECTION_CREDITS_LABEL_KEY = Symbol("tool-connection-credits-label");
//#endregion
//#region src/features/shared/toolsConnection/ToolCredentialPicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["title"];
var _hoisted_2 = ["data-test-id"];
var _hoisted_3 = ["title"];
var _hoisted_4 = [
	"data-credential-id",
	"data-auth-type",
	"onClick"
];
var _hoisted_5 = [
	"title",
	"aria-label",
	"onClick"
];
var ToolCredentialPicker_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolCredentialPicker",
	props: {
		item: {},
		credentials: {},
		connectVariant: { default: "solid" },
		teleported: {
			type: Boolean,
			default: true
		},
		adapter: {},
		showConnectedIcon: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"select-credential",
		"credential-dropdown-open",
		"first-credential-connect",
		"new-credential-connect"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const injectedAdapter = inject(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, null);
		const adapter = computed(() => props.adapter ?? injectedAdapter);
		const isOpen = ref(false);
		const searchQuery = ref("");
		const searchInputRef = ref(null);
		function open() {
			if (props.item.status !== "connecting") isOpen.value = true;
		}
		__expose({ open });
		const aiGatewayRef = computed(() => props.credentials.find((ref) => ref.aiGateway));
		const ownRefs = computed(() => props.credentials.filter((ref) => !ref.aiGateway));
		const isAiGatewayOnly = computed(() => aiGatewayRef.value !== void 0 && ownRefs.value.length === 0);
		const isAiGatewaySelected = computed(() => aiGatewayRef.value?.credentialId === AI_GATEWAY_MANAGED_TAG);
		const aiGatewayLabel = i18n.baseText("aiGateway.credentialMode.n8nConnect.title");
		const showAiGatewayRow = computed(() => aiGatewayRef.value !== void 0 && aiGatewayLabel.toLowerCase().includes(searchQuery.value.trim().toLowerCase()));
		function pickAiGateway() {
			if (!aiGatewayRef.value) return;
			emit("select-credential", props.item, aiGatewayRef.value.authType, AI_GATEWAY_MANAGED_TAG);
			isOpen.value = false;
		}
		const selectedCredentialIds = computed(() => ownRefs.value.map((c) => c.credentialId).filter((id) => Boolean(id)));
		const availableCredentials = computed(() => {
			const credentialAdapter = adapter.value;
			if (!credentialAdapter) return [];
			return ownRefs.value.flatMap((cred) => credentialAdapter.getCredentialsByType(cred.authType).map((c) => ({
				id: c.id,
				name: c.name,
				authType: cred.authType,
				authDisplayName: cred.displayName
			})));
		});
		const selectedCredentialName = computed(() => {
			for (const credentialRef of ownRefs.value) {
				if (!credentialRef.credentialId) continue;
				const credential = adapter.value?.getCredentialsByType(credentialRef.authType).find(({ id }) => id === credentialRef.credentialId);
				if (credential) return credential.name;
			}
		});
		const statusLabel = computed(() => {
			if (isAiGatewaySelected.value) return aiGatewayLabel;
			if (selectedCredentialName.value) return selectedCredentialName.value;
			if (props.item.status === "connected") return i18n.baseText("tools.connection.action.connected");
			if (props.item.status === "disconnected") return i18n.baseText("tools.connection.action.reconnect");
			return "";
		});
		const filteredCredentials = computed(() => {
			const query = searchQuery.value.trim().toLowerCase();
			if (!query) return availableCredentials.value;
			return availableCredentials.value.filter((cred) => cred.name.toLowerCase().includes(query));
		});
		watch(isOpen, (open) => {
			if (open) {
				emit("credential-dropdown-open", props.item);
				searchQuery.value = "";
				nextTick(() => {
					(searchInputRef.value?.$el)?.querySelector("input")?.focus({ preventScroll: true });
				});
			}
		});
		function pickCredential(authType, credentialId) {
			emit("select-credential", props.item, authType, credentialId);
			isOpen.value = false;
		}
		const creatableCredentials = computed(() => ownRefs.value.filter((credential, index, credentials) => credentials.findIndex(({ authType }) => authType === credential.authType) === index));
		function createCredential(authType, source) {
			if (!authType) return;
			if (source === "direct") emit("first-credential-connect", props.item);
			else emit("new-credential-connect", props.item);
			const credentialTypes = creatableCredentials.value.length > 1 ? creatableCredentials.value.map((credential) => credential.authType) : void 0;
			adapter.value?.openNewCredential(authType, props.item, credentialTypes);
			isOpen.value = false;
		}
		function editCredential(credentialId) {
			adapter.value?.openExistingCredential(credentialId);
			isOpen.value = false;
		}
		return (_ctx, _cache) => {
			return __props.item.status === "connecting" ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.statusMarker),
				"data-test-id": "tool-credential-picker-trigger-connecting"
			}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("tools.connection.action.connecting")), 1)], 2)) : isAiGatewayOnly.value && __props.item.status === "connected" ? (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass([_ctx.$style.statusPill, _ctx.$style.aiGatewayStatus]),
				"data-test-id": "tool-credential-picker-ai-gateway-connected"
			}, [__props.showConnectedIcon ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				icon: "check",
				size: 12,
				class: normalizeClass(_ctx.$style.statusIconConnected),
				"aria-hidden": "true"
			}, null, 8, ["class"])) : createCommentVNode("", true), createBaseVNode("span", { class: normalizeClass(_ctx.$style.statusLabel) }, toDisplayString(unref(aiGatewayLabel)), 3)], 2)) : isAiGatewayOnly.value && !unref(hasToolConnection)(__props.item.status) ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 2,
				variant: __props.connectVariant,
				size: "small",
				"data-test-id": "tool-credential-picker-ai-gateway",
				onClick: pickAiGateway
			}, {
				default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tools.connection.action.connect")), 1)]),
				_: 1
			}, 8, ["variant"])) : unref(hasToolConnection)(__props.item.status) || aiGatewayRef.value !== void 0 || availableCredentials.value.length > 0 || creatableCredentials.value.length > 1 ? (openBlock(), createBlock(unref(N8nPopover_default), {
				key: 3,
				open: isOpen.value,
				"onUpdate:open": _cache[2] || (_cache[2] = ($event) => isOpen.value = $event),
				side: "bottom",
				align: "end",
				"side-offset": 6,
				width: "260px",
				teleported: __props.teleported,
				"z-index": 2e3,
				"data-test-id": "tool-credential-picker"
			}, {
				trigger: withCtx(() => [__props.item.status === "disconnected" ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					size: "small",
					class: normalizeClass(_ctx.$style.disconnectedTrigger),
					"data-test-id": "tool-credential-picker-trigger-disconnected"
				}, {
					default: withCtx(() => [
						createVNode(unref(N8nIcon_default), {
							icon: "circle-x",
							size: 16,
							class: normalizeClass(_ctx.$style.statusIconDisconnected),
							"aria-hidden": "true"
						}, null, 8, ["class"]),
						createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.statusLabel),
							title: statusLabel.value
						}, toDisplayString(statusLabel.value), 11, _hoisted_1),
						createVNode(unref(N8nIcon_default), {
							icon: "chevron-down",
							size: 12
						})
					]),
					_: 1
				}, 8, ["class"])) : unref(hasToolConnection)(__props.item.status) ? (openBlock(), createElementBlock("button", {
					key: 1,
					type: "button",
					class: normalizeClass(_ctx.$style.statusPill),
					"data-test-id": `tool-credential-picker-trigger-${__props.item.status}`
				}, [
					__props.showConnectedIcon ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: "check",
						size: 12,
						class: normalizeClass(_ctx.$style.statusIconConnected),
						"aria-hidden": "true"
					}, null, 8, ["class"])) : createCommentVNode("", true),
					createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.statusLabel),
						title: statusLabel.value
					}, toDisplayString(statusLabel.value), 11, _hoisted_3),
					createVNode(unref(N8nIcon_default), {
						icon: "chevron-down",
						size: 12
					})
				], 10, _hoisted_2)) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					variant: __props.connectVariant,
					size: "small",
					"data-test-id": "tool-credential-picker-trigger-connect"
				}, {
					default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tools.connection.action.connect")), 1), createVNode(unref(N8nIcon_default), {
						icon: "chevron-down",
						size: 14,
						class: normalizeClass(_ctx.$style.triggerCaret)
					}, null, 8, ["class"])]),
					_: 1
				}, 8, ["variant"]))]),
				content: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.searchWrapper) }, [createVNode(unref(Input_default), {
						ref_key: "searchInputRef",
						ref: searchInputRef,
						modelValue: searchQuery.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => searchQuery.value = $event),
						size: "small",
						placeholder: unref(i18n).baseText("tools.connection.credentialPicker.search"),
						"data-test-id": "tool-credential-picker-search",
						class: normalizeClass(_ctx.$style.searchInput)
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "search",
							size: 14
						})]),
						_: 1
					}, 8, [
						"modelValue",
						"placeholder",
						"class"
					])], 2),
					createBaseVNode("ul", {
						class: normalizeClass(_ctx.$style.list),
						"data-test-id": "tool-credential-picker-list"
					}, [
						showAiGatewayRow.value ? (openBlock(), createElementBlock("li", {
							key: 0,
							class: normalizeClass(_ctx.$style.row),
							"data-test-id": "tool-credential-picker-ai-gateway-row",
							onClick: pickAiGateway
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.aiGatewayRowLabel) }, [createVNode(unref(N8nIcon_default), {
							icon: "wallet",
							size: 14,
							"aria-hidden": "true"
						}), createTextVNode(" " + toDisplayString(unref(aiGatewayLabel)), 1)], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowActions) }, [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.rowCheck),
							"aria-hidden": "true"
						}, [isAiGatewaySelected.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "check",
							size: 14
						})) : createCommentVNode("", true)], 2)], 2)], 2)) : createCommentVNode("", true),
						filteredCredentials.value.length === 0 && !showAiGatewayRow.value ? (openBlock(), createElementBlock("li", {
							key: 1,
							class: normalizeClass(_ctx.$style.emptyRow)
						}, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("tools.connection.credentialPicker.noResults")), 1)]),
							_: 1
						})], 2)) : createCommentVNode("", true),
						(openBlock(true), createElementBlock(Fragment, null, renderList(filteredCredentials.value, (cred) => {
							return openBlock(), createElementBlock("li", {
								key: `${cred.authType}:${cred.id}`,
								class: normalizeClass(_ctx.$style.row),
								"data-test-id": "tool-credential-picker-row",
								"data-credential-id": cred.id,
								"data-auth-type": cred.authType,
								onClick: ($event) => pickCredential(cred.authType, cred.id)
							}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowLabel) }, [createTextVNode(toDisplayString(cred.name) + " ", 1), creatableCredentials.value.length > 1 && cred.authDisplayName ? (openBlock(), createElementBlock("small", {
								key: 0,
								class: normalizeClass(_ctx.$style.authLabel)
							}, toDisplayString(cred.authDisplayName), 3)) : createCommentVNode("", true)], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowActions) }, [createBaseVNode("span", {
								class: normalizeClass(_ctx.$style.rowCheck),
								"aria-hidden": "true"
							}, [selectedCredentialIds.value.includes(cred.id) ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "check",
								size: 14
							})) : createCommentVNode("", true)], 2), createBaseVNode("button", {
								type: "button",
								class: normalizeClass(_ctx.$style.rowEdit),
								title: unref(i18n).baseText("generic.edit"),
								"aria-label": unref(i18n).baseText("generic.edit"),
								"data-test-id": "tool-credential-picker-edit",
								onClick: withModifiers(($event) => editCredential(cred.id), ["stop"])
							}, [createVNode(unref(N8nIcon_default), {
								icon: "square-pen",
								size: 14
							})], 10, _hoisted_5)], 2)], 10, _hoisted_4);
						}), 128))
					], 2),
					creatableCredentials.value[0] ? (openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: normalizeClass(_ctx.$style.createRow),
						"data-test-id": "tool-credential-picker-create",
						onClick: _cache[1] || (_cache[1] = ($event) => createCredential(creatableCredentials.value[0].authType, "dropdown"))
					}, [createVNode(unref(N8nIcon_default), {
						icon: "plus",
						size: 14
					}), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tools.connection.credentialPicker.create")), 1)], 2)) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["open", "teleported"])) : (openBlock(), createBlock(unref(N8nButton_default), {
				key: 4,
				variant: __props.connectVariant,
				size: "small",
				"data-test-id": "tool-credential-picker-trigger-connect",
				onClick: _cache[3] || (_cache[3] = ($event) => createCredential(creatableCredentials.value[0]?.authType ?? "", "direct"))
			}, {
				default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tools.connection.action.connect")), 1)]),
				_: 1
			}, 8, ["variant"]));
		};
	}
}), [["__cssModules", { "$style": {
	triggerCaret: "_triggerCaret_1h6vp_1",
	statusMarker: "_statusMarker_1h6vp_5",
	statusPill: "_statusPill_1h6vp_6",
	disconnectedTrigger: "_disconnectedTrigger_1h6vp_29",
	statusLabel: "_statusLabel_1h6vp_34",
	statusIconConnected: "_statusIconConnected_1h6vp_41",
	statusIconDisconnected: "_statusIconDisconnected_1h6vp_42",
	searchWrapper: "_searchWrapper_1h6vp_54",
	searchInput: "_searchInput_1h6vp_58",
	list: "_list_1h6vp_62",
	row: "_row_1h6vp_70",
	rowEdit: "_rowEdit_1h6vp_84",
	aiGatewayStatus: "_aiGatewayStatus_1h6vp_90",
	aiGatewayRowLabel: "_aiGatewayRowLabel_1h6vp_94",
	rowLabel: "_rowLabel_1h6vp_100",
	authLabel: "_authLabel_1h6vp_108",
	rowActions: "_rowActions_1h6vp_113",
	rowCheck: "_rowCheck_1h6vp_121",
	emptyRow: "_emptyRow_1h6vp_141",
	createRow: "_createRow_1h6vp_146"
} }]]);
//#endregion
export { TOOL_ICON_AVATAR_RENDERER_KEY as a, TOOL_CONNECTION_CREDITS_LABEL_KEY as i, CATEGORY_BY_KIND as n, hasToolConnection as o, TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY as r, ToolCredentialPicker_default as t };
