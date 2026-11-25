import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Oa as v4, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, pd as useDebounceFn, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, Cf as isNodeItemRestricted, Ef as removePreviewToken, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, Kf as RestrictedTypeCallout_default, Op as stripToolSuffix, PA as useMessage, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, WA as DialogBody_default, Yf as RestrictedNodePopover_default, _C as useUsersStore, _N as N8nText_default, _f as filterAndSearchNodes, al as useRestrictedNodeWarning, ap as describeTypeRestriction, bf as getNodeItemRestriction, cN as Input_default, dC as useToast, dM as N8nSwitch_default, eC as DEBOUNCE_TIME, fN as N8nTooltip_default, hu as NodeIcon_default, jN as useI18n, jk as NodeConnectionTypes, qA as DialogTitle_default, ua as useChatStore, uf as useNodeTypesStore, vN as N8nIconButton_default, wf as isNodePreviewKey, wm as hasRole, xN as N8nIcon_default, xT as isChatHubToolTypeAllowed, yN as N8nButton_default, yy as getDebounceTime, zl as _virtual_node_popularity_data_default } from "./app-D5flEmb-.js";
import { n as useChatToolRestriction } from "./useChatToolRestriction-C4mNTPsX.js";
import { t as useInstallNode } from "./useInstallNode-8BEUfP2t.js";
import { t as partitionLast } from "./partition-last-BsUCZ1RN.js";
import { t as NodeToolSettingsContent_default } from "./NodeToolSettingsContent-BQ9He6el.js";
//#region src/features/ai/chatHub/components/ToolListItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["aria-label"];
var ToolListItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolListItem",
	props: {
		nodeType: {},
		configuredNode: {},
		enabled: { type: Boolean },
		mode: {},
		communityPreview: { type: Boolean },
		installing: { type: Boolean },
		installDisabled: { type: Boolean },
		roleBlocked: { type: Boolean }
	},
	emits: [
		"toggle",
		"configure",
		"remove",
		"add"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const description = computed(() => {
			if (props.configuredNode && props.configuredNode.name !== props.nodeType.displayName) return props.nodeType.displayName;
			return props.nodeType.description;
		});
		const displayName = computed(() => {
			if (props.configuredNode) return props.configuredNode.name;
			return props.nodeType.displayName;
		});
		const actionLabel = computed(() => props.communityPreview ? i18n.baseText("communityNodeDetails.install") : i18n.baseText("chatHub.toolsManager.add"));
		const actionDisabled = computed(() => props.communityPreview && (props.installing || props.installDisabled));
		const rowRef = ref(null);
		const restriction = computed(() => getNodeItemRestriction(props.nodeType.name));
		const toggleTooltip = computed(() => {
			if (restriction.value) return describeTypeRestriction("chatTool", props.nodeType.displayName, restriction.value);
			return props.enabled ? i18n.baseText("chatHub.toolsManager.disableTool") : i18n.baseText("chatHub.toolsManager.enableTool");
		});
		const toggleLabel = computed(() => i18n.baseText("chatHub.toolsManager.toggleLabel", { interpolate: {
			toolName: displayName.value,
			status: toggleTooltip.value
		} }));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "rowRef",
				ref: rowRef,
				class: normalizeClass([_ctx.$style.item, {
					[_ctx.$style.configured]: __props.mode === "configured",
					[_ctx.$style.restricted]: !!restriction.value || __props.roleBlocked
				}])
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.iconWrapper) }, [createVNode(NodeIcon_default, {
					"node-type": __props.nodeType,
					size: 32
				}, null, 8, ["node-type"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.nameRow) }, [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.name),
					size: "small",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(displayName.value), 1)]),
					_: 1
				}, 8, ["class"]), __props.communityPreview ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: unref(i18n).baseText("communityNodeInfo.approved"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "shield-half",
						size: 12,
						class: normalizeClass(_ctx.$style.verifiedIcon),
						"aria-label": unref(i18n).baseText("communityNodeInfo.approved"),
						"data-test-id": "chat-tool-verified-badge"
					}, null, 8, ["class", "aria-label"])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.description),
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
					_: 1
				}, 8, ["class"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [
					restriction.value ? (openBlock(), createBlock(unref(RestrictedNodePopover_default), {
						key: 0,
						"node-type-name": __props.nodeType.displayName,
						restriction: restriction.value,
						anchor: rowRef.value
					}, null, 8, [
						"node-type-name",
						"restriction",
						"anchor"
					])) : createCommentVNode("", true),
					__props.roleBlocked ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						content: unref(i18n).baseText("chatHub.toolsManager.roleBlocked"),
						placement: "top"
					}, {
						default: withCtx(() => [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.marker),
							tabindex: "0",
							role: "img",
							"aria-label": unref(i18n).baseText("chatHub.toolsManager.roleBlocked")
						}, [createVNode(unref(N8nIcon_default), {
							icon: "lock",
							size: "small",
							"data-test-id": "chat-tool-role-blocked-icon"
						})], 10, _hoisted_1)]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true),
					__props.mode === "configured" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
						!__props.roleBlocked ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							content: unref(i18n).baseText("chatHub.toolsManager.configure")
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "settings",
								variant: "ghost",
								text: "",
								class: normalizeClass(_ctx.$style.actionButton),
								onClick: _cache[0] || (_cache[0] = ($event) => emit("configure"))
							}, null, 8, ["class"])]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true),
						createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("chatHub.toolsManager.remove") }, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "trash-2",
								variant: "ghost",
								text: "",
								class: normalizeClass(_ctx.$style.actionButton),
								onClick: _cache[1] || (_cache[1] = ($event) => emit("remove"))
							}, null, 8, ["class"])]),
							_: 1
						}, 8, ["content"]),
						!__props.roleBlocked ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 1,
							content: toggleTooltip.value
						}, {
							default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
								"model-value": __props.enabled,
								size: "large",
								disabled: !!restriction.value && !__props.enabled,
								"aria-label": toggleLabel.value,
								class: normalizeClass(_ctx.$style.toggle),
								"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => emit("toggle", Boolean($event)))
							}, null, 8, [
								"model-value",
								"disabled",
								"aria-label",
								"class"
							])]),
							_: 1
						}, 8, ["content"])) : createCommentVNode("", true)
					], 64)) : !restriction.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [__props.communityPreview && __props.installDisabled && !__props.installing ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("communityNodeInfo.contact.admin"),
						placement: "top"
					}, {
						default: withCtx(() => [createBaseVNode("span", null, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							icon: "plus",
							loading: __props.installing,
							disabled: true,
							"data-test-id": "chat-tool-install-button"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(actionLabel.value), 1)]),
							_: 1
						}, 8, ["loading"])])]),
						_: 1
					}, 8, ["content"])) : (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						variant: "outline",
						size: "small",
						icon: "plus",
						loading: __props.installing,
						disabled: actionDisabled.value,
						"data-test-id": __props.communityPreview ? "chat-tool-install-button" : "chat-tool-add-button",
						onClick: _cache[3] || (_cache[3] = ($event) => emit("add"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(actionLabel.value), 1)]),
						_: 1
					}, 8, [
						"loading",
						"disabled",
						"data-test-id"
					]))], 64)) : createCommentVNode("", true)
				], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	item: "_item_1bo1c_1",
	configured: "_configured_1bo1c_8",
	actionButton: "_actionButton_1bo1c_8",
	restricted: "_restricted_1bo1c_15",
	iconWrapper: "_iconWrapper_1bo1c_18",
	content: "_content_1bo1c_19",
	marker: "_marker_1bo1c_23",
	nameRow: "_nameRow_1bo1c_51",
	verifiedIcon: "_verifiedIcon_1bo1c_58",
	name: "_name_1bo1c_51",
	description: "_description_1bo1c_71",
	actions: "_actions_1bo1c_78",
	toggle: "_toggle_1bo1c_85"
} }]]);
//#endregion
//#region src/features/ai/chatHub/components/ToolsManagerModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var ToolsManagerModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ToolsManagerModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const agentId = computed(() => props.data.customAgentId);
		const agentToolIds = computed(() => {
			if (!agentId.value) return null;
			return chatStore.customAgents[agentId.value]?.toolIds ?? [];
		});
		const modalTitle = computed(() => {
			const baseTitle = i18n.baseText("chatHub.toolsManager.title");
			if (!agentId.value) return baseTitle;
			const agentName = chatStore.customAgents[agentId.value]?.name;
			return agentName ? `${baseTitle} (${agentName})` : baseTitle;
		});
		function hasInputs(nodeType) {
			const { inputs } = nodeType;
			if (Array.isArray(inputs)) return inputs.length > 0;
			return true;
		}
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const chatStore = useChatStore();
		const toast = useToast();
		const message = useMessage();
		const usersStore = useUsersStore();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const { installNode: installCommunityNode } = useInstallNode();
		const { warnIfRestricted } = useRestrictedNodeWarning();
		const isAdminOrOwner = computed(() => usersStore.isAdminOrOwner);
		const nodePopularityMap = new Map(_virtual_node_popularity_data_default.map((node) => [node.id, node.popularity]));
		const searchQuery = ref("");
		const debouncedSearchQuery = ref("");
		const installingToolName = ref(null);
		const setDebouncedSearchQuery = useDebounceFn((value) => {
			debouncedSearchQuery.value = value;
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		watch(searchQuery, (newValue) => {
			setDebouncedSearchQuery(newValue);
		});
		const currentView = ref("list");
		const settingsNode = ref(null);
		const settingsExistingToolNames = ref([]);
		const settingsOnConfirm = ref(null);
		const settingsContentRef = ref(null);
		const settingsNodeName = ref("");
		const settingsIsValid = ref(false);
		const { isRestricted: settingsIsRestricted, restriction: settingsRestriction, typeName: settingsTypeName } = useChatToolRestriction(() => settingsNode.value?.type);
		const tools = computed(() => chatStore.configuredTools);
		const isChatUser = computed(() => hasRole(["global:chatUser"]));
		function isToolTypeExcluded(type) {
			return !isChatHubToolTypeAllowed(type, { isChatUser: isChatUser.value });
		}
		function resolveToolNodeType(name) {
			return nodeTypesStore.getNodeType(name) ?? nodeTypesStore.communityNodeType(name)?.nodeDescription ?? null;
		}
		function isCommunityPreviewTool(nodeType) {
			if (!isNodePreviewKey(nodeType.name)) return false;
			const baseName = stripToolSuffix(nodeType.name);
			return !!nodeTypesStore.communityNodeType(baseName);
		}
		function communityPackageNameFor(nodeType) {
			const baseName = stripToolSuffix(nodeType.name);
			return nodeTypesStore.communityNodeType(baseName)?.packageName ?? removePreviewToken(nodeType.name.split(".")[0] ?? nodeType.name);
		}
		const availableToolTypes = computed(() => {
			return (nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ?? []).map((name) => resolveToolNodeType(name)).filter((nodeType) => nodeType !== null && !isToolTypeExcluded(nodeType.name) && !hasInputs(nodeType)).sort((a, b) => {
				const popA = nodePopularityMap.get(a.name) ?? 0;
				return (nodePopularityMap.get(b.name) ?? 0) - popA;
			});
		});
		onMounted(() => {
			nodeTypesStore.fetchCommunityNodePreviews();
		});
		const filteredConfiguredTools = computed(() => {
			if (!debouncedSearchQuery.value) return tools.value;
			const query = debouncedSearchQuery.value.toLowerCase();
			return tools.value.filter((tool) => {
				const def = tool.definition;
				const nodeType = nodeTypesStore.getNodeType(def.type, def.typeVersion);
				const nameMatch = def.name.toLowerCase().includes(query);
				const typeMatch = nodeType?.displayName.toLowerCase().includes(query);
				return nameMatch || typeMatch;
			});
		});
		const matchingAvailableTools = computed(() => {
			const base = !debouncedSearchQuery.value ? availableToolTypes.value : availableToolTypes.value.filter((nodeType) => {
				const query = debouncedSearchQuery.value.toLowerCase();
				const nameMatch = nodeType.displayName.toLowerCase().includes(query);
				const descMatch = nodeType.description?.toLowerCase().includes(query);
				return nameMatch || descMatch;
			});
			if (!debouncedSearchQuery.value) return base;
			const communitySearchHits = filterAndSearchNodes(nodeTypesStore.communityNodesAndActions.mergedNodes, debouncedSearchQuery.value, {
				isAiSubcategory: true,
				aiConnectionType: NodeConnectionTypes.AiTool
			});
			const seen = new Set(base.map((nt) => nt.name));
			const previews = [];
			for (const hit of communitySearchHits) {
				if (hit.type !== "node") continue;
				const resolved = resolveToolNodeType(hit.key) ?? resolveToolNodeType(hit.properties.name);
				if (!resolved || seen.has(resolved.name) || isToolTypeExcluded(resolved.name) || hasInputs(resolved)) continue;
				seen.add(resolved.name);
				previews.push(resolved);
			}
			return [...base, ...previews];
		});
		const filteredAvailableTools = computed(() => partitionLast(matchingAvailableTools.value, (nodeType) => isNodeItemRestricted(nodeType.name)));
		function getNodeType(tool) {
			return nodeTypesStore.getNodeType(tool.definition.type, tool.definition.typeVersion);
		}
		function openSettings(node, existingNames, onConfirm) {
			settingsNode.value = node;
			settingsExistingToolNames.value = existingNames;
			settingsOnConfirm.value = onConfirm;
			settingsNodeName.value = node.name;
			settingsIsValid.value = false;
			currentView.value = "settings";
		}
		function handleConfigureTool(tool) {
			const otherToolNames = tools.value.filter((t) => t.definition.id !== tool.definition.id).map((t) => t.definition.name);
			openSettings({ ...tool.definition }, otherToolNames, async (configuredNode) => {
				try {
					await chatStore.updateConfiguredTool(tool.definition.id, configuredNode);
				} catch (error) {
					toast.showError(error, i18n.baseText("chatHub.error.updateToolsFailed"));
				}
			});
		}
		async function handleRemoveTool(toolId) {
			if (await message.confirm(i18n.baseText("chatHub.toolsManager.confirmRemove.message"), i18n.baseText("chatHub.toolsManager.confirmRemove.title"), {
				confirmButtonText: i18n.baseText("chatHub.toolsManager.remove"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm") return;
			try {
				await chatStore.removeConfiguredTool(toolId);
			} catch (error) {
				toast.showError(error, i18n.baseText("chatHub.error.updateToolsFailed"));
			}
		}
		async function handleToggleTool(tool, enabled) {
			try {
				if (agentId.value) await chatStore.toggleCustomAgentTool(agentId.value, tool.definition.id);
				else await chatStore.toggleToolEnabled(tool.definition.id, enabled);
			} catch (error) {
				toast.showError(error, i18n.baseText("chatHub.error.updateToolsFailed"));
			}
		}
		function openSettingsFor(nodeType) {
			const typeVersion = typeof nodeType.version === "number" ? nodeType.version : nodeType.version.toSorted((a, b) => b - a)?.[0];
			if (!typeVersion) return;
			const newToolId = v4();
			const existingNames = tools.value.map((t) => t.definition.name);
			openSettings({
				type: nodeType.name,
				typeVersion,
				parameters: {},
				id: newToolId,
				name: nodeType.displayName,
				position: [0, 0]
			}, existingNames, async (configuredNode) => {
				if (warnIfRestricted(configuredNode.type)) return;
				try {
					await chatStore.addConfiguredTool(configuredNode);
				} catch (error) {
					toast.showError(error, i18n.baseText("chatHub.error.updateToolsFailed"));
				}
			});
		}
		async function handleAddTool(nodeType) {
			if (isNodeItemRestricted(nodeType.name)) return;
			if (isCommunityPreviewTool(nodeType)) {
				const packageName = communityPackageNameFor(nodeType);
				const baseName = stripToolSuffix(nodeType.name);
				installingToolName.value = nodeType.name;
				try {
					const result = await installCommunityNode({
						type: "verified",
						packageName,
						nodeType: baseName,
						selectedNodeType: nodeType.name,
						telemetry: {
							source: "chat hub tools manager",
							hasQuickConnect: false
						}
					});
					if (!result.success) return;
					const installedName = removePreviewToken(nodeType.name);
					const installed = nodeTypesStore.getNodeType(installedName) ?? nodeType;
					if (result.restricted) return;
					openSettingsFor(installed);
				} finally {
					installingToolName.value = null;
				}
				return;
			}
			openSettingsFor(nodeType);
		}
		function handleBack() {
			currentView.value = "list";
			settingsNode.value = null;
			settingsExistingToolNames.value = [];
			settingsOnConfirm.value = null;
			settingsNodeName.value = "";
			settingsIsValid.value = false;
		}
		function handleSave() {
			const currentNode = settingsContentRef.value?.node;
			if (!currentNode || !settingsOnConfirm.value) return;
			settingsOnConfirm.value(currentNode);
			handleBack();
		}
		function handleSettingsChangeName(name) {
			settingsContentRef.value?.handleChangeName(name);
		}
		async function closeDialog() {
			uiStore.closeModal(props.modalName);
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "2xlarge",
				stacked: __props.data.stacked === true,
				"show-close-button": currentView.value === "list",
				"container-class": _ctx.$style.modal,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), { class: normalizeClass(currentView.value === "list" ? _ctx.$style.listHeader : void 0) }, {
					default: withCtx(() => [currentView.value === "list" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(DialogTitle_default), { class: normalizeClass(_ctx.$style.listTitle) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(modalTitle.value), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(Input_default), {
						modelValue: searchQuery.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => searchQuery.value = $event),
						placeholder: unref(i18n).baseText("chatHub.toolsManager.searchPlaceholder"),
						clearable: ""
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						_: 1
					}, 8, ["modelValue", "placeholder"])], 64)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.settingsHeader)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsHeaderLeft) }, [createVNode(unref(N8nIconButton_default), {
						icon: "arrow-left",
						text: "",
						size: "large",
						variant: "ghost",
						"data-test-id": "chat-tools-manager-back",
						onClick: handleBack
					}), createVNode(unref(DialogTitle_default), null, {
						default: withCtx(() => [createVNode(unref(N8nInlineTextEdit_default), {
							"model-value": settingsNodeName.value,
							"read-only": unref(settingsIsRestricted),
							"max-width": 350,
							"onUpdate:modelValue": handleSettingsChangeName
						}, null, 8, ["model-value", "read-only"])]),
						_: 1
					})], 2), createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "small",
						disabled: !settingsIsValid.value || unref(settingsIsRestricted),
						"data-test-id": "chat-tool-settings-save",
						onClick: handleSave
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.toolSettings.confirm")), 1)]),
						_: 1
					}, 8, ["disabled"])], 2))]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [withDirectives(createBaseVNode("div", {
						"data-tools-manager-modal": "",
						class: normalizeClass(_ctx.$style.listWrapper)
					}, [
						filteredConfiguredTools.value.length > 0 ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.section)
						}, [createVNode(unref(N8nHeading_default), {
							size: "small",
							color: "text-light",
							tag: "h3"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.toolsManager.configuredTools", { interpolate: { count: tools.value.length } })), 1)]),
							_: 1
						}), createBaseVNode("div", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredConfiguredTools.value, (tool) => {
							return openBlock(), createBlock(ToolListItem_default, {
								key: tool.definition.id,
								"node-type": getNodeType(tool),
								"configured-node": tool.definition,
								enabled: agentToolIds.value ? agentToolIds.value.includes(tool.definition.id) : tool.enabled,
								"role-blocked": isToolTypeExcluded(tool.definition.type),
								mode: "configured",
								onConfigure: ($event) => handleConfigureTool(tool),
								onRemove: ($event) => handleRemoveTool(tool.definition.id),
								onToggle: ($event) => handleToggleTool(tool, $event)
							}, null, 8, [
								"node-type",
								"configured-node",
								"enabled",
								"role-blocked",
								"onConfigure",
								"onRemove",
								"onToggle"
							]);
						}), 128))])], 2)) : createCommentVNode("", true),
						filteredAvailableTools.value.length > 0 ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.section)
						}, [createVNode(unref(N8nHeading_default), {
							size: "small",
							color: "text-light",
							tag: "h3"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.toolsManager.availableTools", { interpolate: { count: availableToolTypes.value.length } })), 1)]),
							_: 1
						}), createBaseVNode("div", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredAvailableTools.value, (nodeType) => {
							return openBlock(), createBlock(ToolListItem_default, {
								key: nodeType.name,
								"node-type": nodeType,
								"community-preview": isCommunityPreviewTool(nodeType),
								installing: installingToolName.value === nodeType.name,
								"install-disabled": !isAdminOrOwner.value,
								mode: "available",
								onAdd: ($event) => handleAddTool(nodeType)
							}, null, 8, [
								"node-type",
								"community-preview",
								"installing",
								"install-disabled",
								"onAdd"
							]);
						}), 128))])], 2)) : createCommentVNode("", true),
						filteredConfiguredTools.value.length === 0 && filteredAvailableTools.value.length === 0 ? (openBlock(), createElementBlock("div", {
							key: 2,
							class: normalizeClass(_ctx.$style.emptyState)
						}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("chatHub.toolsManager.noResults")), 1)]),
							_: 1
						})], 2)) : createCommentVNode("", true)
					], 2), [[vShow, currentView.value === "list"]]), currentView.value === "settings" && settingsNode.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.settingsWrapper)
					}, [unref(settingsIsRestricted) ? (openBlock(), createBlock(unref(RestrictedTypeCallout_default), {
						key: 0,
						surface: "chatTool",
						"type-name": unref(settingsTypeName),
						restriction: unref(settingsRestriction),
						class: normalizeClass(_ctx.$style.settingsCallout)
					}, null, 8, [
						"type-name",
						"restriction",
						"class"
					])) : createCommentVNode("", true), createVNode(NodeToolSettingsContent_default, {
						ref_key: "settingsContentRef",
						ref: settingsContentRef,
						"initial-node": settingsNode.value,
						"existing-tool-names": settingsExistingToolNames.value,
						"read-only": unref(settingsIsRestricted),
						"onUpdate:valid": _cache[1] || (_cache[1] = ($event) => settingsIsValid.value = $event),
						"onUpdate:nodeName": _cache[2] || (_cache[2] = ($event) => settingsNodeName.value = $event)
					}, null, 8, [
						"initial-node",
						"existing-tool-names",
						"read-only"
					])], 2)) : createCommentVNode("", true)]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"open",
				"stacked",
				"show-close-button",
				"container-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	modal: "_modal_1tpma_1",
	listHeader: "_listHeader_1tpma_5",
	listTitle: "_listTitle_1tpma_12",
	settingsHeader: "_settingsHeader_1tpma_16",
	settingsHeaderLeft: "_settingsHeaderLeft_1tpma_21",
	listWrapper: "_listWrapper_1tpma_29",
	settingsWrapper: "_settingsWrapper_1tpma_36",
	settingsCallout: "_settingsCallout_1tpma_45",
	section: "_section_1tpma_51",
	emptyState: "_emptyState_1tpma_57"
} }]]);
//#endregion
export { ToolsManagerModal_default as default };
