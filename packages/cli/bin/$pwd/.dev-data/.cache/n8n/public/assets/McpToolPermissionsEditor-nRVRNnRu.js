import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, LM as N8nCallout_default, PA as useMessage, SN as _plugin_vue_export_helper_default, Vj as SettingsRowButton_default, _N as N8nText_default, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/shared/toolsConnection/McpConnectionStatusCallout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/shared/toolsConnection/McpConnectionStatusCallout.vue
var McpConnectionStatusCallout_default = /* @__PURE__ */ defineComponent({
	__name: "McpConnectionStatusCallout",
	props: { failureReason: {} },
	emits: ["reconnect", "retry"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const failureMessageKey = computed(() => {
			switch (props.failureReason) {
				case "authentication": return "tools.connection.failure.authentication";
				case "server_unavailable": return "tools.connection.failure.serverUnavailable";
				default: return "tools.connection.failure.unknown";
			}
		});
		const recoveryActionKey = computed(() => props.failureReason === "authentication" ? "tools.connection.action.reconnect" : "generic.retry");
		function recover() {
			if (props.failureReason === "authentication") emit("reconnect");
			else emit("retry");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCallout_default), {
				theme: "danger",
				"data-test-id": "tools-connection-failure"
			}, {
				actions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					"data-test-id": "tools-connection-recovery",
					onClick: recover
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(recoveryActionKey.value)), 1)]),
					_: 1
				})]),
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(failureMessageKey.value)) + " ", 1)]),
				_: 1
			});
		};
	}
});
//#endregion
//#region src/features/shared/toolsConnection/McpDetailBody.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["href"];
var _hoisted_2$1 = { key: 1 };
var _hoisted_3$1 = {
	key: 2,
	"aria-hidden": "true"
};
var McpDetailBody_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpDetailBody",
	props: { item: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const usesAiGateway = computed(() => {
			const credentials = props.item.credentials ?? [];
			return credentials.some(({ aiGateway, credentialId }) => aiGateway && credentialId === "__AI_GATEWAY_MANAGED__") || credentials.length > 0 && credentials.every(({ aiGateway }) => aiGateway);
		});
		const hasPublisher = computed(() => usesAiGateway.value || Boolean(props.item.publisher));
		const hasMetadata = computed(() => hasPublisher.value || Boolean(props.item.version));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.identity) }, [createVNode(unref(N8nText_default), {
				class: normalizeClass(_ctx.$style.serverName),
				tag: "h3"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(usesAiGateway.value ? "tools.connection.detail.aiGatewayServer" : __props.item.isOfficial ? "tools.connection.detail.officialServer" : "tools.connection.detail.server", { interpolate: { service: __props.item.title } })), 1)]),
				_: 1
			}, 8, ["class"]), hasMetadata.value ? (openBlock(), createElementBlock("p", {
				key: 0,
				class: normalizeClass(_ctx.$style.metadata),
				"data-test-id": "tools-connection-detail-metadata"
			}, [
				usesAiGateway.value ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.publisher)
				}, toDisplayString(unref(i18n).baseText("tools.connection.detail.maintainedByN8n")), 3)) : __props.item.publisher ? (openBlock(), createElementBlock("span", {
					key: 1,
					class: normalizeClass(_ctx.$style.publisher)
				}, [createTextVNode(toDisplayString(unref(i18n).baseText("tools.connection.detail.publishedBy")) + " ", 1), __props.item.publisher.url ? (openBlock(), createElementBlock("a", {
					key: 0,
					href: __props.item.publisher.url,
					target: "_blank",
					rel: "noopener noreferrer",
					class: normalizeClass(_ctx.$style.metadataLink)
				}, toDisplayString(__props.item.publisher.name), 11, _hoisted_1$1)) : (openBlock(), createElementBlock("span", _hoisted_2$1, toDisplayString(__props.item.publisher.name), 1))], 2)) : createCommentVNode("", true),
				hasPublisher.value && __props.item.version ? (openBlock(), createElementBlock("span", _hoisted_3$1, "\xA0·\xA0")) : createCommentVNode("", true),
				__props.item.version ? (openBlock(), createElementBlock("span", {
					key: 3,
					class: normalizeClass(_ctx.$style.version)
				}, toDisplayString(unref(i18n).baseText("tools.connection.detail.versionValue", { interpolate: { version: __props.item.version } })), 3)) : createCommentVNode("", true)
			], 2)) : createCommentVNode("", true)], 2), __props.item.longDescription ? (openBlock(), createElementBlock("p", {
				key: 0,
				class: normalizeClass(_ctx.$style.description),
				"data-test-id": "tools-connection-detail-description"
			}, toDisplayString(__props.item.longDescription), 3)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_eqtqb_1",
	identity: "_identity_eqtqb_7",
	serverName: "_serverName_eqtqb_14",
	metadata: "_metadata_eqtqb_22",
	publisher: "_publisher_eqtqb_33",
	version: "_version_eqtqb_39",
	metadataLink: "_metadataLink_eqtqb_43",
	description: "_description_eqtqb_52"
} }]]);
//#endregion
//#region src/features/shared/toolsConnection/PermissionDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/shared/toolsConnection/PermissionDropdown.vue
var PermissionDropdown_default = /* @__PURE__ */ defineComponent({
	__name: "PermissionDropdown",
	props: {
		modelValue: {},
		custom: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		excludePermissions: { default: () => [] },
		dataTestId: { default: void 0 }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const open = ref(false);
		const permissions = [
			"always_allow",
			"require_approval",
			"blocked"
		];
		const labels = computed(() => ({
			always_allow: i18n.baseText("tools.connection.permissions.alwaysAllow"),
			require_approval: i18n.baseText("tools.connection.permissions.requireApproval"),
			blocked: i18n.baseText("tools.connection.permissions.blocked")
		}));
		const selectedLabel = computed(() => props.custom ? i18n.baseText("tools.connection.permissions.custom") : labels.value[props.modelValue]);
		const items = computed(() => permissions.filter((permission) => !props.excludePermissions.includes(permission)).map((id) => ({
			id,
			label: labels.value[id],
			checked: !props.custom && id === props.modelValue
		})));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				modelValue: open.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => open.value = $event),
				items: items.value,
				disabled: __props.disabled,
				"data-test-id": __props.dataTestId,
				placement: "bottom-end",
				onSelect: _cache[1] || (_cache[1] = ($event) => emit("update:modelValue", $event))
			}, {
				trigger: withCtx(() => [createVNode(unref(SettingsRowButton_default), {
					disabled: __props.disabled,
					expanded: open.value
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(selectedLabel.value), 1)]),
						_: 1
					})]),
					_: 1
				}, 8, ["disabled", "expanded"])]),
				_: 1
			}, 8, [
				"modelValue",
				"items",
				"disabled",
				"data-test-id"
			]);
		};
	}
});
//#endregion
//#region src/features/shared/toolsConnection/McpToolPermissionsEditor.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-disabled"];
var _hoisted_2 = ["data-disabled"];
var _hoisted_3 = ["data-test-id"];
var McpToolPermissionsEditor_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "McpToolPermissionsEditor",
	props: {
		actor: { default: "assistant" },
		availableTools: {},
		modelValue: {},
		serverTitle: {},
		status: {},
		excludePermissions: { default: () => [] }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const message = useMessage();
		const categories = ref({ ...props.modelValue.categories });
		const toolPermissions = ref({ ...props.modelValue.tools });
		const expandedCategory = ref(null);
		watch(() => props.modelValue, (settings) => {
			categories.value = { ...settings.categories };
			toolPermissions.value = { ...settings.tools };
		}, { deep: true });
		watch(() => props.status, (status) => {
			if (status !== "connected") expandedCategory.value = null;
		});
		const arePermissionsDisabled = computed(() => props.status !== "connected");
		const writeConfirmationDescriptionKey = computed(() => props.actor === "agent" ? "tools.connection.permissions.write.confirm.description.agent" : "tools.connection.permissions.write.confirm.description.assistant");
		const permissionOptions = computed(() => [
			{
				value: "always_allow",
				label: i18n.baseText("tools.connection.permissions.alwaysAllow")
			},
			{
				value: "require_approval",
				label: i18n.baseText("tools.connection.permissions.requireApproval")
			},
			{
				value: "blocked",
				label: i18n.baseText("tools.connection.permissions.blocked")
			}
		].filter((option) => !props.excludePermissions.includes(option.value)));
		const categoryContent = {
			read: {
				title: "tools.connection.permissions.read.title",
				description: "tools.connection.permissions.read.description"
			},
			write: {
				title: "tools.connection.permissions.write.title",
				description: "tools.connection.permissions.write.description"
			}
		};
		const groups = computed(() => ["read", "write"].map((category) => ({
			category,
			title: i18n.baseText(categoryContent[category].title),
			description: i18n.baseText(categoryContent[category].description),
			tools: props.availableTools.filter((tool) => (tool.category ?? "write") === category)
		})));
		function emitSettings() {
			emit("update:modelValue", {
				categories: { ...categories.value },
				...Object.keys(toolPermissions.value).length > 0 ? { tools: { ...toolPermissions.value } } : {}
			});
		}
		async function updateCategory(category, permission) {
			if (category === "write" && permission === "always_allow" && categories.value.write !== "always_allow") {
				const writeToolCount = props.availableTools.filter((tool) => (tool.category ?? "write") === "write").length;
				if (await message.confirm(i18n.baseText(writeConfirmationDescriptionKey.value, { interpolate: {
					server: props.serverTitle,
					count: writeToolCount
				} }), {
					title: i18n.baseText("tools.connection.permissions.write.confirm.title"),
					confirmButtonText: i18n.baseText("tools.connection.permissions.write.confirm.keepAsk"),
					cancelButtonText: i18n.baseText("tools.connection.permissions.write.confirm.allow")
				}) !== "cancel") return;
			}
			categories.value[category] = permission;
			const next = { ...toolPermissions.value };
			for (const tool of props.availableTools) if ((tool.category ?? "write") === category) delete next[tool.id];
			toolPermissions.value = next;
			emitSettings();
		}
		function updateTool(toolId, category, permission) {
			const next = { ...toolPermissions.value };
			if (permission === categories.value[category]) delete next[toolId];
			else next[toolId] = permission;
			toolPermissions.value = next;
			emitSettings();
		}
		function isPermission(value) {
			return value === "always_allow" || value === "require_approval" || value === "blocked";
		}
		function onToolChange(toolId, category, value) {
			if (isPermission(value)) updateTool(toolId, category, value);
		}
		function hasCategoryOverrides(category) {
			return props.availableTools.some((tool) => (tool.category ?? "write") === category && toolPermissions.value[tool.id] !== void 0);
		}
		function isCategoryDisabled(tools) {
			return arePermissionsDisabled.value || tools.length === 0;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nText_default), {
				class: normalizeClass(_ctx.$style.fieldLabel),
				tag: "h3",
				size: "medium",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("tools.connection.permissions.title")), 1)]),
				_: 1
			}, 8, ["class"])], 2), createBaseVNode("div", {
				class: normalizeClass([_ctx.$style.permissionGroups, { [_ctx.$style.permissionGroupsDisabled]: arePermissionsDisabled.value }]),
				"data-disabled": arePermissionsDisabled.value || void 0
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(groups.value, (group) => {
				return openBlock(), createElementBlock("div", {
					key: group.category,
					class: normalizeClass([_ctx.$style.permissionGroup, { [_ctx.$style.permissionGroupDisabled]: !arePermissionsDisabled.value && group.tools.length === 0 }]),
					"data-disabled": group.tools.length === 0 || void 0
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupHeader) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupSummary) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupTitle) }, [createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.groupTitleText) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(group.title), 1)]),
						_: 2
					}, 1032, ["class"]), createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.countBadge),
						"data-test-id": `tools-connection-count-${group.category}`
					}, [createVNode(unref(N8nText_default), {
						size: "xsmall",
						bold: "",
						compact: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(arePermissionsDisabled.value ? "—" : group.tools.length), 1)]),
						_: 2
					}, 1024)], 10, _hoisted_3)], 2), createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(group.description), 1)]),
						_: 2
					}, 1024)], 2),
					createVNode(PermissionDropdown_default, {
						class: normalizeClass(_ctx.$style.permissionSelect),
						"model-value": categories.value[group.category],
						custom: hasCategoryOverrides(group.category),
						disabled: isCategoryDisabled(group.tools),
						"exclude-permissions": __props.excludePermissions,
						"data-test-id": `tools-connection-permission-${group.category}`,
						"onUpdate:modelValue": ($event) => updateCategory(group.category, $event)
					}, null, 8, [
						"class",
						"model-value",
						"custom",
						"disabled",
						"exclude-permissions",
						"data-test-id",
						"onUpdate:modelValue"
					]),
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						"icon-only": "",
						disabled: isCategoryDisabled(group.tools),
						"aria-label": group.title,
						"aria-expanded": expandedCategory.value === group.category,
						onClick: ($event) => expandedCategory.value = expandedCategory.value === group.category ? null : group.category
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: expandedCategory.value === group.category ? "chevron-up" : "chevron-down",
							size: 16
						}, null, 8, ["icon"])]),
						_: 2
					}, 1032, [
						"disabled",
						"aria-label",
						"aria-expanded",
						"onClick"
					])
				], 2), expandedCategory.value === group.category ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.toolList)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(group.tools, (tool) => {
					return openBlock(), createElementBlock("div", {
						key: tool.id,
						class: normalizeClass(_ctx.$style.toolRow)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolSummary) }, [createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(tool.name), 1)]),
						_: 2
					}, 1024), tool.description ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.toolDescription),
						title: tool.description,
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(tool.description), 1)]),
						_: 2
					}, 1032, ["class", "title"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nSelect_default), {
						class: normalizeClass(_ctx.$style.permissionSelect),
						"model-value": toolPermissions.value[tool.id] ?? categories.value[group.category],
						size: "small",
						disabled: arePermissionsDisabled.value,
						"onUpdate:modelValue": ($event) => onToolChange(tool.id, group.category, $event)
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(permissionOptions.value, (option) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: option.value,
								value: option.value,
								label: option.label
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, [
						"class",
						"model-value",
						"disabled",
						"onUpdate:modelValue"
					])], 2);
				}), 128))], 2)) : createCommentVNode("", true)], 10, _hoisted_2);
			}), 128))], 10, _hoisted_1)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1qrx8_1",
	field: "_field_1qrx8_2",
	permissionGroups: "_permissionGroups_1qrx8_3",
	permissionGroup: "_permissionGroup_1qrx8_3",
	groupSummary: "_groupSummary_1qrx8_5",
	toolSummary: "_toolSummary_1qrx8_6",
	fieldLabel: "_fieldLabel_1qrx8_19",
	permissionGroupsDisabled: "_permissionGroupsDisabled_1qrx8_27",
	permissionGroupDisabled: "_permissionGroupDisabled_1qrx8_31",
	groupHeader: "_groupHeader_1qrx8_41",
	groupTitle: "_groupTitle_1qrx8_60",
	groupTitleText: "_groupTitleText_1qrx8_66",
	countBadge: "_countBadge_1qrx8_70",
	toolList: "_toolList_1qrx8_83",
	toolRow: "_toolRow_1qrx8_91",
	toolDescription: "_toolDescription_1qrx8_98",
	permissionSelect: "_permissionSelect_1qrx8_106"
} }]]);
//#endregion
export { McpDetailBody_default as n, McpConnectionStatusCallout_default as r, McpToolPermissionsEditor_default as t };
