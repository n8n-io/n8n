import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Eo as require_get, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Ju as useResizeObserver, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, bd as I18nT, du as ElCol, ef as inject, ff as openBlock, fu as ElRow, hf as renderSlot, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, of as onBeforeUnmount, uu as ElCollapseTransition, yp as normalizeStyle, yu as computedAsync, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, $d as injectWorkflowDocumentStore, $p as getNodeSettingsInitialValues, BC as ProjectTypes, Db as MCP_TRIGGER_NODE_TYPE, Dr as useQuickConnect, E_ as COMMUNITY_NODES_INSTALLATION_DOCS_URL, Ef as removePreviewToken, Fb as PRODUCTION_ONLY_TRIGGER_NODE_TYPES, Fp as useWorkflowHelpers, Fr as TitledList_default, GD as isAgentModelProvider, Gj as SectionHeader_default, HT as sanitizeAgentToolName, Hc as CredentialIcon_default, Hd as skillIdActivityKey, Hy as NPM_PACKAGE_DOCS_BASE_URL, Ik as deepCopy, Ip as useRouteWorkflowId, Jg as useUIStore, Kj as N8nNotice_default, Kp as injectNDVStore, LM as N8nCallout_default, Lk as isCommunityPackageName, Ll as useNodeCreatorStore, Lp as useWorkflowId, Mp as useCredentialsStore, Nh as AGENT_VIEW, Ny as CUSTOM_NODES_DOCS_URL, OA as MarkdownEditor_default, Od as useWorkflowsStore, Pb as OPEN_URL_PANEL_TRIGGER_NODE_TYPES, Qj as N8nMarkdown_default, Qu as usePolicyViolationLabels, SN as _plugin_vue_export_helper_default, Sb as FORM_TRIGGER_NODE_TYPE, Sn as ParameterInputList_default, Ud as skillNameActivityKey, Un as useAgentScopeProjectId, Uu as importCurlEventBus, VM as N8nBlockUi_default, Vc as generateNanoId, Vr as useClipboard, Vu as ndvEventBus, Wd as toolActivityKey, Wf as RestrictedSubWorkflowCallout_default, Wp as useWorkflowsListStore, XM as N8nActionDropdown_default, Xp as collectSettings, Xy as CUSTOM_API_CALL_KEY, Yp as collectParametersByTab, Zp as createCommonNodeSettings, _C as useUsersStore, _N as N8nText_default, _b as CHAT_TRIGGER_NODE_TYPE, bC as useRootStore, br as NodeCredentials_default, by as useDebounce, co as getAgent, dC as useToast, dd as useNodeHelpers, df as useActionsGenerator, dk as getNodeInputs, fC as VIEWS, fN as N8nTooltip_default, gO as nodeNameToToolName, hC as useTelemetry, hd as RenameNodeCommand, hu as NodeIcon_default, ir as useNodeExecution, jN as useI18n, jk as NodeConnectionTypes, jy as BUILTIN_NODES_DOCS_URL, k_ as COMMUNITY_PACKAGE_INSTALL_MODAL_KEY, kh as AGENT_BUILDER_VIEW, kj as N8nSegmentControl_default, ky as BASE_NODE_SURVEY_URL, nm as nameIsParameter, pd as useHistoryStore, pk as getNodeParameters, pp as useNodeTypeRestriction, qf as RestrictedNodePanel_default, ql as useNodeCredentialOptions, rr as NodeExecuteButton_default, tN as N8nLoading_default, tg as isAgentNodeV2, uf as useNodeTypesStore, vN as N8nIconButton_default, vb as DATA_TABLE_NODES, vd as useExternalHooks, xN as N8nIcon_default, xd as useEditorContext, xu as useDataTableStore, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default, yr as useNodeSettingsParameters } from "./app-D5flEmb-.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { t as OnClickOutside } from "./components-DckIqgpT.js";
import { n as CommunityNodeFooter_default, r as useInstalledCommunityPackage, t as CommunityNodeUpdateInfo_default } from "./CommunityNodeUpdateInfo-CMogL5vE.js";
import { c as AgentChipButton_default, f as parseModelString, i as AgentCapabilitiesSection_default, l as AgentInfoPanel_default, m as useModelCatalog, t as useAgentCapabilitiesActions } from "./useAgentCapabilitiesActions-Bo0Gma2X.js";
import { o as getProviderCredentialTypes } from "./menuItemId-Beubk_vA.js";
import { t as formatToolNameForDisplay } from "./toolDisplayName-C5txb6dB.js";
import { t as agentsEventBus } from "./agents.eventBus-DIO3iH52.js";
import { t as useAgentConfig } from "./useAgentConfig-BZ4ZXuth.js";
import { t as useAgentReturnContextStore } from "./agentReturnContext.store-CD3vSmxg.js";
import { t as FreeAiCreditsCallout_default } from "./FreeAiCreditsCallout-DX3YcSkq.js";
import { t as useActions } from "./useActions-kp1kjbFB.js";
import { t as useInstallNode } from "./useInstallNode-8BEUfP2t.js";
import { t as ContactAdministratorToInstall_default } from "./ContactAdministratorToInstall-DUdafexG.js";
import { n as useGatewayCreditsPromotion, r as QuickConnectBanner_default, t as GatewayCreditsPromotion_default } from "./GatewayCreditsPromotion-DZRlGjzW.js";
//#region src/features/ndv/panel/components/NDVSubConnections.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$5 = ["data-test-id"];
var _hoisted_2$4 = ["textContent"];
var _hoisted_3$2 = ["onClick"];
var _hoisted_4$2 = ["onClick"];
var _hoisted_5$1 = ["data-node-name"];
var _hoisted_6$1 = ["onClick"];
var NDVSubConnections_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NDVSubConnections",
	props: { rootNode: {} },
	emits: ["switchSelectedNode", "openConnectionNodeCreator"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const nodeTypesStore = useNodeTypesStore();
		const nodeHelpers = useNodeHelpers();
		const i18n = useI18n();
		const { debounce } = useDebounce();
		const emit = __emit;
		const possibleConnections = ref([]);
		const expandedGroups = ref([]);
		const shouldShowNodeInputIssues = ref(false);
		const nodeType = computed(() => nodeTypesStore.getNodeType(props.rootNode.type, props.rootNode.typeVersion));
		const nodeData = computed(() => workflowDocumentStore?.value?.getNodeByName(props.rootNode.name) ?? null);
		const ndvStore = injectNDVStore();
		const workflowObjectAccessors = computed(() => workflowDocumentStore?.value ? workflowDocumentStore.value.getWorkflowObjectAccessorSnapshot() : void 0);
		const nodeInputIssues = computed(() => {
			return (workflowObjectAccessors.value ? nodeHelpers.getNodeIssues(nodeType.value, props.rootNode, workflowObjectAccessors.value, [
				"typeUnknown",
				"parameters",
				"credentials"
			]) : void 0)?.input ?? {};
		});
		const connectedNodes = computed(() => {
			const typeIndexCounters = {};
			return possibleConnections.value.reduce((acc, connection) => {
				const typeIndex = typeIndexCounters[connection.type] ?? 0;
				typeIndexCounters[connection.type] = typeIndex + 1;
				const nodes = getINodesFromNames(((workflowDocumentStore?.value?.connectionsByDestinationNode[props.rootNode.name]?.[connection.type] ?? [])[typeIndex] ?? []).map((conn) => conn.node));
				const connectionKey = `${connection.type}-${typeIndex}`;
				return {
					...acc,
					[connectionKey]: nodes
				};
			}, {});
		});
		function getConnectionContext(connection, globalIndex) {
			let typeIndex = 0;
			for (let i = 0; i < globalIndex; i++) if (possibleConnections.value[i].type === connection.type) typeIndex++;
			return {
				connectionType: connection.type,
				typeIndex,
				key: `${connection.type}-${typeIndex}`
			};
		}
		function getConnectionKey(connection, globalIndex) {
			return getConnectionContext(connection, globalIndex).key;
		}
		function getConnectionConfig(connectionType, typeIndex) {
			return possibleConnections.value.filter((connection) => connection.type === connectionType).at(typeIndex);
		}
		function isMultiConnection(connectionContext) {
			return getConnectionConfig(connectionContext.connectionType, connectionContext.typeIndex)?.maxConnections !== 1;
		}
		function shouldShowConnectionTooltip(connectionContext) {
			return isMultiConnection(connectionContext) && !expandedGroups.value.includes(connectionContext.connectionType);
		}
		function expandConnectionGroup(connectionContext, isExpanded) {
			if (!isMultiConnection(connectionContext)) return;
			if (isExpanded) expandedGroups.value = [...expandedGroups.value, connectionContext.connectionType];
			else expandedGroups.value = expandedGroups.value.filter((g) => g !== connectionContext.connectionType);
		}
		function getINodesFromNames(names) {
			return names.map((name) => {
				const node = workflowDocumentStore?.value?.getNodeByName(name) ?? null;
				if (node) {
					const matchedNodeType = nodeTypesStore.getNodeType(node.type);
					if (matchedNodeType) {
						const issues = workflowObjectAccessors.value ? nodeHelpers.getNodeIssues(matchedNodeType, node, workflowObjectAccessors.value) : null;
						return {
							node,
							nodeType: matchedNodeType,
							issues: issues ? nodeHelpers.nodeIssuesToString(issues, node) : ""
						};
					}
				}
				return null;
			}).filter((n) => n !== null);
		}
		function hasInputIssues(connectionContext) {
			return shouldShowNodeInputIssues.value && (nodeInputIssues.value[connectionContext.connectionType] ?? []).length > 0;
		}
		function isNodeInputConfiguration(connectionConfig) {
			if (typeof connectionConfig === "string") return false;
			return "type" in connectionConfig;
		}
		function getPossibleSubInputConnections() {
			if (!nodeType.value || !props.rootNode || !workflowDocumentStore?.value) return [];
			return getNodeInputs({ expression: workflowDocumentStore.value.getExpressionHandler() }, props.rootNode, nodeType.value).filter((input) => {
				if (!isNodeInputConfiguration(input)) return false;
				return input.type !== "main";
			});
		}
		function onNodeClick(nodeName, connectionContext) {
			if (isMultiConnection(connectionContext) && !expandedGroups.value.includes(connectionContext.connectionType)) {
				expandConnectionGroup(connectionContext, true);
				return;
			}
			emit("switchSelectedNode", nodeName);
		}
		function onPlusClick(connectionContext) {
			const connectionNodes = connectedNodes.value[connectionContext.key];
			if (isMultiConnection(connectionContext) && !expandedGroups.value.includes(connectionContext.connectionType) && connectionNodes.length >= 1) {
				expandConnectionGroup(connectionContext, true);
				return;
			}
			emit("openConnectionNodeCreator", props.rootNode.name, connectionContext.connectionType, connectionContext.typeIndex);
		}
		function showNodeInputsIssues() {
			shouldShowNodeInputIssues.value = false;
			setTimeout(() => {
				shouldShowNodeInputIssues.value = true;
			}, 0);
		}
		watch([nodeData, () => ndvStore.value.activeNode], debounce(() => setTimeout(() => {
			expandedGroups.value = [];
			possibleConnections.value = getPossibleSubInputConnections();
		}, 0), { debounceTime: 1e3 }), { immediate: true });
		__expose({ showNodeInputsIssues });
		return (_ctx, _cache) => {
			return possibleConnections.value.length ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.container)
			}, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.connections),
				style: normalizeStyle(`--possible-connections: ${possibleConnections.value.length}`)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(possibleConnections.value, (connection, index) => {
				return openBlock(), createElementBlock("div", {
					key: getConnectionKey(connection, index),
					"data-test-id": `subnode-connection-group-${getConnectionKey(connection, index)}`
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.connectionType) }, [createBaseVNode("span", {
					class: normalizeClass({
						[_ctx.$style.connectionLabel]: true,
						[_ctx.$style.hasIssues]: hasInputIssues(getConnectionContext(connection, index))
					}),
					textContent: toDisplayString(`${connection.displayName}${connection.required ? " *" : ""}`)
				}, null, 10, _hoisted_2$4), createVNode(unref(OnClickOutside), { onTrigger: ($event) => expandConnectionGroup(getConnectionContext(connection, index), false) }, {
					default: withCtx(() => [createBaseVNode("div", {
						ref_for: true,
						ref: "connectedNodesWrapper",
						class: normalizeClass({
							[_ctx.$style.connectedNodesWrapper]: true,
							[_ctx.$style.connectedNodesWrapperExpanded]: expandedGroups.value.includes(connection.type)
						}),
						style: normalizeStyle(`--nodes-length: ${connectedNodes.value[getConnectionKey(connection, index)].length}`),
						onClick: ($event) => expandConnectionGroup(getConnectionContext(connection, index), true)
					}, [(connectedNodes.value[getConnectionKey(connection, index)].length >= 1 ? connection.maxConnections !== 1 : true) ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass({
							[_ctx.$style.plusButton]: true,
							[_ctx.$style.hasIssues]: hasInputIssues(getConnectionContext(connection, index))
						}),
						onClick: ($event) => onPlusClick(getConnectionContext(connection, index))
					}, [createVNode(unref(N8nTooltip_default), {
						placement: "top",
						teleported: true,
						offset: 10,
						"show-after": 300,
						disabled: shouldShowConnectionTooltip(getConnectionContext(connection, index)) && connectedNodes.value[getConnectionKey(connection, index)].length >= 1
					}, {
						content: withCtx(() => [createTextVNode(" Add " + toDisplayString(connection.displayName) + " ", 1), hasInputIssues(getConnectionContext(connection, index)) ? (openBlock(), createBlock(TitledList_default, {
							key: 0,
							title: `${unref(i18n).baseText("node.issues")}:`,
							items: nodeInputIssues.value[connection.type]
						}, null, 8, ["title", "items"])) : createCommentVNode("", true)]),
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "outline",
							size: "medium",
							icon: "plus",
							"data-test-id": `add-subnode-${getConnectionKey(connection, index)}`
						}, null, 8, ["data-test-id"])]),
						_: 2
					}, 1032, ["disabled"])], 10, _hoisted_4$2)) : createCommentVNode("", true), connectedNodes.value[getConnectionKey(connection, index)].length > 0 ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass({
							[_ctx.$style.connectedNodes]: true,
							[_ctx.$style.connectedNodesMultiple]: connectedNodes.value[getConnectionKey(connection, index)].length > 1
						})
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(connectedNodes.value[getConnectionKey(connection, index)], (node, nodeIndex) => {
						return openBlock(), createElementBlock("div", {
							key: node.node.name,
							class: normalizeClass({
								[_ctx.$style.nodeWrapper]: true,
								[_ctx.$style.hasIssues]: node.issues
							}),
							"data-test-id": "floating-subnode",
							"data-node-name": node.node.name,
							style: normalizeStyle(`--node-index: ${nodeIndex}`)
						}, [(openBlock(), createBlock(unref(N8nTooltip_default), {
							key: node.node.name,
							placement: "top",
							teleported: true,
							offset: 10,
							"show-after": 300,
							disabled: shouldShowConnectionTooltip(getConnectionContext(connection, index))
						}, {
							content: withCtx(() => [createTextVNode(toDisplayString(node.node.name) + " ", 1), node.issues ? (openBlock(), createBlock(TitledList_default, {
								key: 0,
								title: `${unref(i18n).baseText("node.issues")}:`,
								items: node.issues
							}, null, 8, ["title", "items"])) : createCommentVNode("", true)]),
							default: withCtx(() => [createBaseVNode("div", {
								class: normalizeClass(_ctx.$style.connectedNode),
								onClick: ($event) => onNodeClick(node.node.name, getConnectionContext(connection, index))
							}, [createVNode(NodeIcon_default, {
								"node-type": node.nodeType,
								"node-name": node.node.name,
								"tooltip-position": "top",
								size: 20,
								circle: ""
							}, null, 8, ["node-type", "node-name"])], 10, _hoisted_6$1)]),
							_: 2
						}, 1032, ["disabled"]))], 14, _hoisted_5$1);
					}), 128))], 2)) : createCommentVNode("", true)], 14, _hoisted_3$2)]),
					_: 2
				}, 1032, ["onTrigger"])], 2)], 8, _hoisted_1$5);
			}), 128))], 6)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_lc89p_18",
	connections: "_connections_lc89p_26",
	connectionType: "_connectionType_lc89p_39",
	connectionLabel: "_connectionLabel_lc89p_46",
	hasIssues: "_hasIssues_lc89p_52",
	connectedNodesWrapper: "_connectedNodesWrapper_lc89p_56",
	plusButton: "_plusButton_lc89p_64",
	"horizontal-shake": "_horizontal-shake_lc89p_1",
	connectedNodesWrapperExpanded: "_connectedNodesWrapperExpanded_lc89p_82",
	connectedNodesMultiple: "_connectedNodesMultiple_lc89p_88",
	connectedNode: "_connectedNode_lc89p_56",
	connectedNodes: "_connectedNodes_lc89p_56",
	nodeWrapper: "_nodeWrapper_lc89p_127"
} }]]);
//#endregion
//#region src/app/composables/useNodeDocsUrl.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var useNodeDocsUrl = ({ nodeType: nodeTypeRef }) => {
	const packageName = computed(() => toValue(nodeTypeRef)?.name.split(".")[0] ?? "");
	const isCommunityNode = computed(() => {
		const nodeType = toValue(nodeTypeRef);
		if (nodeType) return isCommunityPackageName(nodeType.name);
		return false;
	});
	return { docsUrl: computed(() => {
		const nodeType = toValue(nodeTypeRef);
		if (!nodeType) return "";
		if (nodeType.documentationUrl?.startsWith("http")) return nodeType.documentationUrl;
		const utmParams = new URLSearchParams({
			utm_source: "n8n_app",
			utm_medium: "node_settings_modal-credential_link",
			utm_campaign: nodeType.name
		});
		const primaryDocUrl = nodeType.codex?.resources?.primaryDocumentation?.[0]?.url;
		if (primaryDocUrl) return `${primaryDocUrl}?${utmParams.toString()}`;
		if (isCommunityNode.value) return `${NPM_PACKAGE_DOCS_BASE_URL}${packageName.value}`;
		return `${BUILTIN_NODES_DOCS_URL}?${utmParams.toString()}`;
	}) };
};
//#endregion
//#region src/features/ndv/settings/components/NodeSettingsTabs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ndv/settings/components/NodeSettingsTabs.vue
var NodeSettingsTabs_default = /* @__PURE__ */ defineComponent({
	__name: "NodeSettingsTabs",
	props: {
		modelValue: { default: "params" },
		nodeType: { default: void 0 },
		pushRef: { default: "" },
		hideDocs: { type: Boolean },
		includeAction: { type: Boolean },
		includeCredential: { type: Boolean },
		hasCredentialIssue: {
			type: Boolean,
			default: false
		},
		compact: { type: Boolean }
	},
	emits: ["update:model-value"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const externalHooks = useExternalHooks();
		const ndvStore = injectNDVStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { docsUrl } = useNodeDocsUrl({ nodeType: () => props.nodeType });
		const activeNode = computed(() => ndvStore.value.activeNode);
		const nodeTypeName = computed(() => props.nodeType?.name);
		const { isCommunityNode, canUpdatePackage, hasUpdateAvailable } = useInstalledCommunityPackage(nodeTypeName);
		const packageName = computed(() => props.nodeType?.name.split(".")[0] ?? "");
		const documentationUrl = computed(() => {
			if (props.hideDocs) return "";
			return docsUrl.value;
		});
		const options = computed(() => {
			const ret = [];
			if (props.includeAction) ret.push({
				label: i18n.baseText("nodeSettings.action"),
				value: "action"
			});
			if (props.includeCredential) ret.push({
				label: i18n.baseText("nodeSettings.credential"),
				value: "credential",
				...props.hasCredentialIssue && {
					icon: "triangle-alert",
					iconPosition: "right",
					variant: "danger"
				}
			});
			ret.push({
				label: i18n.baseText(props.compact ? "nodeSettings.parametersShort" : "nodeSettings.parameters"),
				value: "params"
			}, {
				value: "settings",
				notification: canUpdatePackage.value && hasUpdateAvailable.value ? true : void 0,
				...props.compact ? {
					icon: "settings",
					align: "right",
					tooltip: i18n.baseText("nodeSettings.settings")
				} : { label: i18n.baseText("nodeSettings.settings") }
			});
			if (isCommunityNode.value) ret.push({
				icon: "box",
				value: "communityNode",
				align: "right",
				tooltip: i18n.baseText("generic.communityNode.tooltip", { interpolate: {
					docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
					packageName: packageName.value
				} })
			});
			if (documentationUrl.value) ret.push({
				value: "docs",
				href: documentationUrl.value,
				align: "right",
				...props.compact ? {
					icon: "book-open",
					tooltip: i18n.baseText("nodeSettings.docs")
				} : { label: i18n.baseText("nodeSettings.docs") }
			});
			return ret;
		});
		function onTabSelect(tab) {
			if (tab === "docs" && props.nodeType) {
				externalHooks.run("dataDisplay.onDocumentationUrlClick", {
					nodeType: props.nodeType,
					documentationUrl: documentationUrl.value
				});
				telemetry.track("User clicked ndv link", {
					node_type: activeNode.value?.type,
					workflow_id: workflowDocumentStore.value.workflowId,
					push_ref: props.pushRef,
					pane: NodeConnectionTypes.Main,
					type: "docs"
				});
			}
			if (tab === "settings" && props.nodeType) telemetry.track("User viewed node settings", {
				node_type: props.nodeType.name,
				workflow_id: workflowDocumentStore.value.workflowId
			});
			if (tab === "settings" || tab === "params" || tab === "action" || tab === "credential") emit("update:model-value", tab);
		}
		function onTooltipClick(tab, event) {
			if (tab === "communityNode" && event.target.localName === "a") telemetry.track("user clicked cnr docs link", { source: "node details view" });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Tabs_default), {
				options: options.value,
				"model-value": __props.modelValue,
				variant: "modern",
				size: __props.compact ? "small" : "medium",
				"onUpdate:modelValue": onTabSelect,
				onTooltipClick
			}, null, 8, [
				"options",
				"model-value",
				"size"
			]);
		};
	}
});
//#endregion
//#region src/features/ndv/settings/components/NodeSettingsHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var NodeSettingsHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeSettingsHeader",
	props: {
		nodeName: {},
		hideExecute: { type: Boolean },
		hideDocs: { type: Boolean },
		hideTabs: { type: Boolean },
		disableExecute: { type: Boolean },
		executeButtonTooltip: {},
		selectedTab: {},
		nodeType: {},
		pushRef: {}
	},
	emits: [
		"execute",
		"stop-execution",
		"value-changed",
		"tab-changed"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const i18n = useI18n();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const node = computed(() => workflowDocumentStore.value.getNodeByName(props.nodeName) ?? null);
		const { isExecuting, stopExecution } = useNodeExecution(node);
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.header) }, [
				!__props.hideTabs ? (openBlock(), createBlock(NodeSettingsTabs_default, {
					key: 0,
					"hide-docs": __props.hideDocs,
					"model-value": __props.selectedTab,
					"node-type": __props.nodeType,
					"push-ref": __props.pushRef,
					class: normalizeClass(_ctx.$style.tabs),
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("tab-changed", $event))
				}, null, 8, [
					"hide-docs",
					"model-value",
					"node-type",
					"push-ref",
					"class"
				])) : createCommentVNode("", true),
				!__props.hideExecute && unref(isExecuting) ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 1,
					"data-test-id": "ndv-stop-execution-button",
					variant: "outline",
					icon: "square",
					size: "small",
					class: normalizeClass(_ctx.$style.stop),
					title: unref(i18n).baseText("nodeView.stopCurrentExecution"),
					onClick: unref(stopExecution)
				}, null, 8, [
					"class",
					"title",
					"onClick"
				])) : createCommentVNode("", true),
				!__props.hideExecute ? (openBlock(), createBlock(NodeExecuteButton_default, {
					key: 2,
					"data-test-id": "node-execute-button",
					"node-name": __props.nodeName,
					disabled: __props.disableExecute,
					tooltip: __props.executeButtonTooltip,
					class: normalizeClass(_ctx.$style.execute),
					size: "small",
					"telemetry-source": "parameters",
					onExecute: _cache[1] || (_cache[1] = ($event) => emit("execute")),
					onStopExecution: _cache[2] || (_cache[2] = ($event) => emit("stop-execution")),
					onValueChanged: _cache[3] || (_cache[3] = ($event) => emit("value-changed", $event))
				}, null, 8, [
					"node-name",
					"disabled",
					"tooltip",
					"class"
				])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_pf58l_1",
	tabs: "_tabs_pf58l_11",
	stop: "_stop_pf58l_19"
} }]]);
//#endregion
//#region src/features/ndv/settings/components/NodeWebhooks.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = {
	key: 0,
	class: "webhooks"
};
var _hoisted_2$3 = ["title"];
var _hoisted_3$1 = {
	key: 0,
	class: "node-webhooks"
};
var _hoisted_4$1 = {
	key: 0,
	class: "url-selection"
};
var _hoisted_5 = { class: "webhook-wrapper" };
var _hoisted_6 = {
	key: 0,
	class: "http-field"
};
var _hoisted_7 = { class: "http-method" };
var _hoisted_8 = { class: "url-field" };
var _hoisted_9 = ["onClick"];
//#endregion
//#region src/features/ndv/settings/components/NodeWebhooks.vue
var NodeWebhooks_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeWebhooks",
	props: {
		node: {},
		nodeTypeDescription: {}
	},
	setup(__props) {
		const props = __props;
		const clipboard = useClipboard();
		const workflowHelpers = useWorkflowHelpers();
		const toast = useToast();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const isMinimized = ref(props.nodeTypeDescription && !OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(props.nodeTypeDescription.name));
		const showUrlFor = ref("test");
		const isProductionOnly = computed(() => {
			return props.nodeTypeDescription && PRODUCTION_ONLY_TRIGGER_NODE_TYPES.includes(props.nodeTypeDescription.name);
		});
		const urlOptions = computed(() => [...isProductionOnly.value ? [] : [{
			label: baseText.value.testUrl,
			value: "test"
		}], {
			label: baseText.value.productionUrl,
			value: "production"
		}]);
		const webhooksNode = computed(() => {
			if (props.nodeTypeDescription?.webhooks === void 0) return [];
			return props.nodeTypeDescription.webhooks.filter((webhookData) => webhookData.restartWebhook !== true);
		});
		const visibleWebhookUrls = computedAsync(async () => {
			const urlFor = showUrlFor.value;
			const node = props.node;
			const result = [];
			for (const webhook of webhooksNode.value) {
				let isVisible = !webhook.ndvHideUrl;
				if (typeof webhook.ndvHideUrl === "string") isVisible = !await workflowHelpers.getWebhookExpressionValue(webhook, "ndvHideUrl");
				if (!isVisible) continue;
				let url = "";
				if (node) url = await workflowHelpers.getWebhookUrl(webhook, node, isProductionOnly.value ? "production" : urlFor);
				let isMethodVisible = !webhook.ndvHideMethod;
				try {
					const method = await workflowHelpers.getWebhookExpressionValue(webhook, "httpMethod", false);
					if (Array.isArray(method) && method.length !== 1) isMethodVisible = false;
					else if (typeof webhook.ndvHideMethod === "string") isMethodVisible = !await workflowHelpers.getWebhookExpressionValue(webhook, "ndvHideMethod");
				} catch {}
				let httpMethod = "";
				try {
					const method = await workflowHelpers.getWebhookExpressionValue(webhook, "httpMethod", false);
					httpMethod = Array.isArray(method) ? method[0] : method;
				} catch {}
				result.push({
					webhook,
					url,
					httpMethod,
					isMethodVisible
				});
			}
			return result;
		}, []);
		const baseText = computed(() => {
			switch (props.nodeTypeDescription?.name) {
				case CHAT_TRIGGER_NODE_TYPE: return {
					toggleTitle: i18n.baseText("nodeWebhooks.webhookUrls.chatTrigger"),
					clickToDisplay: i18n.baseText("nodeWebhooks.clickToDisplayWebhookUrls.formTrigger"),
					clickToHide: i18n.baseText("nodeWebhooks.clickToHideWebhookUrls.chatTrigger"),
					clickToCopy: i18n.baseText("nodeWebhooks.clickToCopyWebhookUrls.chatTrigger"),
					testUrl: i18n.baseText("nodeWebhooks.testUrl"),
					productionUrl: i18n.baseText("nodeWebhooks.productionUrl"),
					copyTitle: i18n.baseText("nodeWebhooks.showMessage.title.chatTrigger"),
					copyMessage: i18n.baseText("nodeWebhooks.showMessage.message.chatTrigger")
				};
				case FORM_TRIGGER_NODE_TYPE: return {
					toggleTitle: i18n.baseText("nodeWebhooks.webhookUrls.formTrigger"),
					clickToDisplay: i18n.baseText("nodeWebhooks.clickToDisplayWebhookUrls.formTrigger"),
					clickToHide: i18n.baseText("nodeWebhooks.clickToHideWebhookUrls.formTrigger"),
					clickToCopy: i18n.baseText("nodeWebhooks.clickToCopyWebhookUrls.formTrigger"),
					testUrl: i18n.baseText("nodeWebhooks.testUrl"),
					productionUrl: i18n.baseText("nodeWebhooks.productionUrl"),
					copyTitle: i18n.baseText("nodeWebhooks.showMessage.title.formTrigger"),
					copyMessage: i18n.baseText("nodeWebhooks.showMessage.message.formTrigger")
				};
				case MCP_TRIGGER_NODE_TYPE: return {
					toggleTitle: i18n.baseText("nodeWebhooks.webhookUrls.mcpTrigger"),
					clickToDisplay: i18n.baseText("nodeWebhooks.clickToDisplayWebhookUrls.mcpTrigger"),
					clickToHide: i18n.baseText("nodeWebhooks.clickToHideWebhookUrls.mcpTrigger"),
					clickToCopy: i18n.baseText("nodeWebhooks.clickToCopyWebhookUrls.mcpTrigger"),
					testUrl: i18n.baseText("nodeWebhooks.testUrl"),
					productionUrl: i18n.baseText("nodeWebhooks.productionUrl"),
					copyTitle: i18n.baseText("nodeWebhooks.showMessage.title.mcpTrigger"),
					copyMessage: void 0
				};
				default: return {
					toggleTitle: i18n.baseText("nodeWebhooks.webhookUrls"),
					clickToDisplay: i18n.baseText("nodeWebhooks.clickToDisplayWebhookUrls"),
					clickToHide: i18n.baseText("nodeWebhooks.clickToHideWebhookUrls"),
					clickToCopy: i18n.baseText("nodeWebhooks.clickToCopyWebhookUrls"),
					testUrl: i18n.baseText("nodeWebhooks.testUrl"),
					productionUrl: i18n.baseText("nodeWebhooks.productionUrl"),
					copyTitle: i18n.baseText("nodeWebhooks.showMessage.title"),
					copyMessage: void 0
				};
			}
		});
		function copyWebhookUrl(item) {
			clipboard.copy(item.url);
			toast.showMessage({
				title: baseText.value.copyTitle,
				message: baseText.value.copyMessage,
				type: "success"
			});
			telemetry.track("User copied webhook URL", {
				pane: "parameters",
				type: `${showUrlFor.value} url`
			});
		}
		watch(() => props.node, () => {
			isMinimized.value = props.nodeTypeDescription && !OPEN_URL_PANEL_TRIGGER_NODE_TYPES.includes(props.nodeTypeDescription.name);
		});
		return (_ctx, _cache) => {
			return webhooksNode.value.length && unref(visibleWebhookUrls).length > 0 ? (openBlock(), createElementBlock("div", _hoisted_1$4, [createBaseVNode("div", {
				class: normalizeClass(["clickable headline", { expanded: !isMinimized.value }]),
				title: isMinimized.value ? baseText.value.clickToDisplay : baseText.value.clickToHide,
				onClick: _cache[0] || (_cache[0] = ($event) => isMinimized.value = !isMinimized.value)
			}, [createVNode(unref(N8nIcon_default), {
				icon: "chevron-right",
				class: "minimize-button minimize-icon"
			}), createTextVNode(" " + toDisplayString(baseText.value.toggleTitle), 1)], 10, _hoisted_2$3), createVNode(unref(ElCollapseTransition), null, {
				default: withCtx(() => [!isMinimized.value ? (openBlock(), createElementBlock("div", _hoisted_3$1, [!isProductionOnly.value ? (openBlock(), createElementBlock("div", _hoisted_4$1, [createVNode(unref(ElRow), null, {
					default: withCtx(() => [createVNode(unref(ElCol), { span: 24 }, {
						default: withCtx(() => [createVNode(unref(N8nSegmentControl_default), {
							modelValue: showUrlFor.value,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => showUrlFor.value = $event),
							options: urlOptions.value
						}, null, 8, ["modelValue", "options"])]),
						_: 1
					})]),
					_: 1
				})])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(unref(visibleWebhookUrls), (item, index) => {
					return openBlock(), createBlock(unref(N8nTooltip_default), {
						key: index,
						class: "item",
						content: baseText.value.clickToCopy,
						placement: "left"
					}, {
						default: withCtx(() => [createBaseVNode("div", _hoisted_5, [item.isMethodVisible ? (openBlock(), createElementBlock("div", _hoisted_6, [createBaseVNode("div", _hoisted_7, toDisplayString(item.httpMethod), 1)])) : createCommentVNode("", true), createBaseVNode("div", _hoisted_8, [createBaseVNode("div", {
							class: "webhook-url left-ellipsis clickable",
							onClick: ($event) => copyWebhookUrl(item)
						}, toDisplayString(item.url), 9, _hoisted_9)])])]),
						_: 2
					}, 1032, ["content"]);
				}), 128))])) : createCommentVNode("", true)]),
				_: 1
			})])) : createCommentVNode("", true);
		};
	}
}), [["__scopeId", "data-v-bb0652a3"]]);
//#endregion
//#region src/features/agents/utils/capabilitySummaryTools.ts
/**
* Shape stored tool configs like a capability summary's `tools` so surfaces
* (canvas card chips, NDV summaries) reuse the saved-agent rendering. Stored
* shapes are unvalidated until execution (JsonColumn rows, imported/hand-edited
* node parameters), so malformed entries are skipped instead of crashing the
* render. Custom tools carry only an id — pass `resolveCustomToolName` where a
* source of names (the agent record) is available.
*/
function toCapabilitySummaryTools(tools, resolveCustomToolName) {
	return (tools ?? []).flatMap((tool) => {
		if (tool.type === "node") {
			if (!tool.node) return [];
			return [{
				type: "node",
				name: tool.name,
				nodeType: tool.node.nodeType,
				nodeTypeVersion: tool.node.nodeTypeVersion
			}];
		}
		if (tool.type === "workflow") return [{
			type: "workflow",
			name: tool.name ?? tool.workflow
		}];
		if (tool.type === "custom") return [{
			type: "custom",
			name: resolveCustomToolName?.(tool.id) ?? tool.id
		}];
		return [];
	});
}
var INLINE_AGENT_PARAMETER_NAME = "inlineAgent";
/** Missing/unknown values resolve to 'referenced' — pre-switch nodes have no stored agentSource. */
function readAgentSource(node) {
	return node?.parameters?.["agentSource"] === "inline" ? "inline" : "referenced";
}
function readInlineAgentParameter(node) {
	const raw = node?.parameters?.[INLINE_AGENT_PARAMETER_NAME];
	if (raw && typeof raw === "object" && typeof raw.config === "object") return raw;
	return null;
}
var DEFAULT_INLINE_AGENT_NAME = "AI Agent";
var DEFAULT_INLINE_AGENT_INSTRUCTIONS = "You are a helpful agent";
/** Seed for a node that switches to inline mode before any agent is defined. */
function createDefaultInlineAgent() {
	return { config: {
		name: DEFAULT_INLINE_AGENT_NAME,
		model: "",
		instructions: DEFAULT_INLINE_AGENT_INSTRUCTIONS
	} };
}
/**
* Mirror of the backend's `generateAgentResourceId('skill', …)` for inline
* agents, whose skill ids are minted client-side (there is no entity to POST
* to). Same `skill_<nanoid>` format, same collision retry.
*/
function generateInlineSkillId(existingIds = []) {
	const existing = new Set(existingIds);
	for (let attempt = 0; attempt < 10; attempt++) {
		const id = `skill_${generateNanoId()}`;
		if (!existing.has(id)) return id;
	}
	throw new Error("Could not generate unique skill id");
}
/**
* Shape an inline config like a saved agent's capability summary so surfaces
* (canvas card chips, model row) can reuse the saved-agent rendering.
*/
function inlineAgentToCapabilitySummary(nodeId, inlineAgent) {
	const { config } = inlineAgent;
	const parsedModel = config.model ? parseModelString(config.model) : null;
	const skillBodies = inlineAgent.skills ?? {};
	const skillRefs = (Array.isArray(config.skills) ? config.skills : []).filter((ref) => typeof ref?.id === "string" && ref.id !== "");
	return {
		id: `inline:${nodeId}`,
		name: config.name,
		model: parsedModel ? {
			provider: parsedModel.provider,
			model: parsedModel.name
		} : null,
		channels: [],
		tools: toCapabilitySummaryTools(config.tools),
		mcpServers: (config.mcpServers ?? []).map((server) => ({ name: server.name })),
		skills: skillRefs.map((ref) => ({
			id: ref.id,
			name: (Object.hasOwn(skillBodies, ref.id) ? skillBodies[ref.id]?.name : void 0) ?? ref.id
		})),
		tasks: []
	};
}
//#endregion
//#region src/features/ndv/agents/composables/useInlineAgentConfig.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The keys an inline agent may define — mirrors `InlineAgentJsonConfigSchema`
* (strict on the backend). The shared panels can emit out-of-scope keys (e.g.
* model changes normalize `config.webSearch`/`providerTools`); persisting them
* would make the node fail validation at execution time.
*/
var INLINE_CONFIG_KEYS = [
	"name",
	"model",
	"credential",
	"instructions",
	"tools",
	"mcpServers",
	"skills"
];
function pickInlineConfigKeys(source) {
	const picked = {};
	for (const key of INLINE_CONFIG_KEYS) if (key in source && source[key] !== void 0) picked[key] = source[key];
	return picked;
}
/**
* Keep only skill bodies whose id is still referenced by the config — the
* write-time mirror of the backend's `removeUnreferencedSkills`. Removing a
* skill ref therefore GCs its body in the same parameter write. The `skills`
* key is omitted entirely when empty so params without skills stay
* byte-identical to their pre-skills shape.
*/
function withPrunedSkillBodies(config, bodies) {
	const refIds = new Set((config.skills ?? []).map((ref) => ref.id));
	const kept = Object.fromEntries(Object.entries(bodies).filter(([id]) => refIds.has(id)));
	return {
		config,
		...Object.keys(kept).length > 0 ? { skills: kept } : {}
	};
}
/**
* Editing adapter for an *inline* agent — the definition embedded in the
* MessageAnAgent node's hidden `inlineAgent` parameter. Unlike the referenced
* orchestrator there is no fetching and no autosave: reads come straight from
* the node's parameters, and writes ride the standard parameter pipeline
* (`ndvEventBus` → `NodeSettings.valueChanged`), which gives workflow dirty
* state, save-with-workflow, versioning, and duplication/export fidelity.
*/
function useInlineAgentConfig(activeNode, options = {}) {
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));
	const projectId = useAgentScopeProjectId();
	/**
	* The effective inline definition: the stored parameter, or a display-only
	* default while the parameter is still empty. The default is NOT written
	* back on read — only the first real edit persists it — so merely opening
	* an inline-mode node never dirties the workflow.
	*/
	const inlineAgent = computed(() => {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return null;
		if (readAgentSource(node) !== "inline") return null;
		return readInlineAgentParameter(node) ?? createDefaultInlineAgent();
	});
	const localConfig = computed(() => inlineAgent.value?.config ?? null);
	/** Skill bodies from the node parameter — the inline stand-in for `agent.skills`. */
	const skillBodies = computed(() => inlineAgent.value?.skills ?? {});
	/**
	* Host identity for the capability modals' confirm guards: a late confirm
	* must not write onto a different node the user switched to meanwhile.
	*/
	const hostId = computed(() => {
		const node = toValue(activeNode);
		return node && isAgentNode.value ? `inline:${node.id}` : "";
	});
	function writeInlineAgent(node, value) {
		ndvEventBus.emit("updateParameterValue", {
			name: `parameters.${INLINE_AGENT_PARAMETER_NAME}`,
			value,
			node: node.name
		});
	}
	/** Write the merged definition to the node parameter (standard pipeline). */
	function scheduleConfigUpdate(updates) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;
		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		writeInlineAgent(node, withPrunedSkillBodies(pickInlineConfigKeys({
			...deepCopy(current.config),
			...deepCopy(pickInlineConfigKeys(updates))
		}), deepCopy(current.skills ?? {})));
	}
	/** Mint an id and land the body + its config ref in one parameter write. */
	function createInlineSkill(skill) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;
		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		const skillId = generateInlineSkillId(Object.keys(current.skills ?? {}));
		writeInlineAgent(node, withPrunedSkillBodies(pickInlineConfigKeys({
			...deepCopy(current.config),
			skills: [...current.config.skills ?? [], {
				type: "skill",
				id: skillId
			}]
		}), {
			...deepCopy(current.skills ?? {}),
			[skillId]: deepCopy(skill)
		}));
	}
	/** Body-only update; the ref is unchanged so the config carries over as-is. */
	function updateInlineSkill(skillId, skill) {
		const node = toValue(activeNode);
		if (!node || !isAgentNode.value) return;
		const current = readInlineAgentParameter(node) ?? createDefaultInlineAgent();
		if (!(current.config.skills ?? []).some((ref) => ref.id === skillId)) return;
		writeInlineAgent(node, withPrunedSkillBodies(pickInlineConfigKeys(deepCopy(current.config)), {
			...deepCopy(current.skills ?? {}),
			[skillId]: deepCopy(skill)
		}));
	}
	const agent = ref(null);
	const connectedTriggers = ref([]);
	return {
		isAgentNode,
		projectId,
		hostId,
		localConfig,
		scheduleConfigUpdate,
		actions: useAgentCapabilitiesActions({
			localConfig,
			agent,
			projectId,
			agentId: hostId,
			connectedTriggers,
			scheduleConfigUpdate,
			scheduleSkillSave: () => {},
			localSkills: {
				bodies: skillBodies,
				createSkill: createInlineSkill,
				updateSkill: updateInlineSkill
			},
			supportsToolApproval: false,
			telemetry: options.telemetry
		})
	};
}
//#endregion
//#region src/features/agents/composables/useAgentNavigation.ts
/**
* Navigates into the agent feature while remembering the workflow + node the
* user came from, so `AgentView` can render a "Back to workflow" banner.
*/
function useAgentNavigation() {
	const router = useRouter();
	const workflowId = useWorkflowId();
	const routeWorkflowId = useRouteWorkflowId();
	const workflowsStore = useWorkflowsStore();
	const returnContext = useAgentReturnContextStore();
	/**
	* Pass `originNodeId` ONLY when the trip starts from the node's NDV: a set
	* node id makes "Back to workflow" reopen that node's NDV. Canvas-initiated
	* trips omit it so the return lands on the canvas.
	*/
	function rememberOrigin(agentId, originNodeId) {
		const currentRoute = router.currentRoute.value;
		const wfId = workflowId.value || workflowsStore.workflowId;
		if (!wfId) return;
		const isEmbeddedWorkflow = wfId !== routeWorkflowId.value;
		if (!isEmbeddedWorkflow && workflowsStore.isNewWorkflow) return;
		returnContext.set({
			workflowId: wfId,
			nodeId: originNodeId ?? "",
			agentId,
			...isEmbeddedWorkflow ? { returnPath: currentRoute.fullPath } : {}
		});
	}
	async function navigateWithOrigin(name, projectId, agentId, originNodeId) {
		rememberOrigin(agentId, originNodeId);
		try {
			if (await router.push({
				name,
				params: {
					projectId,
					agentId
				}
			})) returnContext.clear();
		} catch (error) {
			returnContext.clear();
			throw error;
		}
	}
	async function openBuilder(projectId, agentId, originNodeId) {
		await navigateWithOrigin(AGENT_BUILDER_VIEW, projectId, agentId, originNodeId);
	}
	async function openAgent(projectId, agentId, originNodeId) {
		await navigateWithOrigin(AGENT_VIEW, projectId, agentId, originNodeId);
	}
	return {
		rememberOrigin,
		openBuilder,
		openAgent
	};
}
//#endregion
//#region src/features/ndv/agents/composables/useReferencedAgentSummary.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Read-only view of the *saved agent* referenced by the AI Agent node, for the
* NDV's summary section. Fetches the config + agent record and keeps them
* fresh across node switches and cross-surface writes (Agent Builder edits) —
* but never writes anything itself: the shared agent is edited only in the
* builder.
*/
function useReferencedAgentSummary(activeNode) {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const nav = useAgentNavigation();
	const agentsDisabled = computed(() => !settingsStore.isAgentsEnabled);
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));
	const projectId = useAgentScopeProjectId();
	const agentId = computed(() => {
		if (!isAgentNode.value) return "";
		const node = toValue(activeNode);
		if (readAgentSource(node) === "inline") return "";
		const param = node?.parameters?.agentId;
		if (param && typeof param === "object" && "value" in param) {
			const { value } = param;
			if (typeof value === "string") return value;
		}
		return "";
	});
	const { config, loading, repoint, fetchConfig } = useAgentConfig();
	const agent = ref(null);
	const loadError = ref(null);
	/** Terminal state: the referenced agent was deleted or access was lost. */
	const isUnavailable = ref(false);
	const isPublished = computed(() => Boolean(agent.value?.activeVersionId));
	/** Skill refs resolved against the agent record's skill bodies (for display). */
	const appliedSkills = computed(() => {
		const refs = config.value?.skills ?? [];
		const seen = /* @__PURE__ */ new Set();
		const out = [];
		for (const skillRef of refs) {
			if (!skillRef.id || seen.has(skillRef.id)) continue;
			seen.add(skillRef.id);
			out.push({
				id: skillRef.id,
				skill: agent.value?.skills?.[skillRef.id] ?? {
					name: skillRef.id,
					description: "",
					instructions: ""
				}
			});
		}
		return out;
	});
	function isPermanentError(error) {
		const status = error?.httpStatusCode ?? error?.response?.status;
		return status === 404 || status === 403;
	}
	async function fetchAgent(pId, aId) {
		const fresh = await getAgent(rootStore.restApiContext, pId, aId);
		if (agentId.value === aId && projectId.value === pId) agent.value = fresh;
	}
	async function load(pId, aId) {
		loadError.value = null;
		isUnavailable.value = false;
		try {
			await Promise.all([fetchConfig(pId, aId), fetchAgent(pId, aId)]);
		} catch (error) {
			if (agentId.value !== aId || projectId.value !== pId) return;
			if (isPermanentError(error)) isUnavailable.value = true;
			loadError.value = error;
		}
	}
	watch([agentId, projectId], async ([id, pId], previous) => {
		if (previous) {
			agent.value = null;
			repoint(pId, id);
		}
		if (id && pId && isAgentNode.value && !agentsDisabled.value) await load(pId, id);
	}, { immediate: true });
	function onAgentUpdated(event) {
		if (event?.agentId && event.agentId !== agentId.value) return;
		if (!agentId.value || agentsDisabled.value) return;
		load(projectId.value, agentId.value);
	}
	agentsEventBus.on("agentUpdated", onAgentUpdated);
	onBeforeUnmount(() => agentsEventBus.off("agentUpdated", onAgentUpdated));
	/**
	* Open the referenced agent in the Agent Builder, remembering this node as the
	* origin so the builder shows a "Back to workflow" banner (same round-trip the
	* canvas card's open affordance uses).
	*/
	async function openBuilder() {
		if (!agentId.value) return;
		await nav.openBuilder(projectId.value, agentId.value, toValue(activeNode)?.id);
	}
	return {
		isAgentNode,
		projectId,
		agentId,
		config,
		agent,
		appliedSkills,
		loading,
		loadError,
		isUnavailable,
		agentsDisabled,
		isPublished,
		openBuilder,
		reload: async () => {
			if (agentId.value && !agentsDisabled.value) await load(projectId.value, agentId.value);
		}
	};
}
//#endregion
//#region src/features/ndv/agents/composables/useNdvAgentConfig.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Mode-switched facade over the AI Agent node's two NDV data sources:
*
* - `referenced` — read-only summary of the saved agent the node points at
*   (`agentSource: 'referenced'`). Edited only in the Agent Builder.
* - `inline` — editing adapter for the agent definition embedded in the
*   node's own parameters (`agentSource: 'inline'`).
*
* Both are instantiated unconditionally (each idles in the other's mode), so
* toggling the node's mode switches surfaces without remounting the NDV.
*
* MUST be created in the stable NDV container (`NodeDetailsView`), NOT in
* `NodeSettings`, so it survives node switches. Provide the return via
* {@link NdvAgentConfigKey}; `NodeSettings` + the NDV agent surfaces inject it.
* No-ops for non-agent nodes, so it is safe to instantiate for every node.
*/
function useNdvAgentConfig(activeNode, options = {}) {
	const isAgentNode = computed(() => isAgentNodeV2(toValue(activeNode)));
	const mode = computed(() => readAgentSource(toValue(activeNode)));
	const referenced = useReferencedAgentSummary(activeNode);
	const inline = useInlineAgentConfig(activeNode, options);
	const agentId = computed(() => mode.value === "referenced" ? referenced.agentId.value : "");
	return {
		isAgentNode,
		mode,
		projectId: referenced.projectId,
		agentId,
		openBuilder: referenced.openBuilder,
		referenced,
		inline
	};
}
/** Provided by `NodeDetailsView`, injected by `NodeSettings` + the NDV agent wrappers. */
var NdvAgentConfigKey = Symbol("NdvAgentConfig");
//#endregion
//#region src/features/ndv/agents/components/AgentNdvInlineControls.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentNdvInlineControls_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentNdvInlineControls",
	props: { isReadOnly: {
		type: Boolean,
		default: false
	} },
	setup(__props) {
		/**
		* Editing controls for an *inline* agent — the definition embedded in the AI
		* Agent node's own parameters — rendered as the "Agent" section of the NDV
		* Parameters tab. Every edit is a plain node-parameter write (workflow dirty
		* state, save-with-workflow, export fidelity), so there is no save status.
		*
		* Scope mirrors the inline schema: model + credential, instructions,
		* tools (incl. MCP servers), and skills (bodies embedded in the node
		* parameter). Memory, channels, sub-agents and tasks are saved-agent
		* features — the builder banner above nudges users there.
		*/
		const props = __props;
		const i18n = useI18n();
		const ndv = inject(NdvAgentConfigKey);
		const inline = ndv?.inline;
		const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
		const isInlineMode = computed(() => ndv?.mode.value === "inline");
		const projectId = computed(() => inline?.projectId.value ?? "");
		const localConfig = computed(() => inline?.localConfig.value ?? null);
		const canUpdate = computed(() => !props.isReadOnly);
		const actions = computed(() => inline?.actions);
		const appliedSkills = computed(() => inline?.actions.appliedSkills.value ?? []);
		function onInstructionsUpdate(instructions) {
			inline?.scheduleConfigUpdate({ instructions });
		}
		return (_ctx, _cache) => {
			return isAgentNode.value && isInlineMode.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.inlineControls),
				"data-test-id": "agent-ndv-inline-controls"
			}, [
				createVNode(unref(SectionHeader_default), {
					title: unref(i18n).baseText("agentNode.ndv.section.agent"),
					bordered: ""
				}, null, 8, ["title"]),
				createVNode(AgentInfoPanel_default, {
					config: localConfig.value,
					"project-id": projectId.value,
					disabled: !canUpdate.value,
					embedded: "",
					"show-instructions": false,
					"onUpdate:config": unref(inline)?.scheduleConfigUpdate
				}, null, 8, [
					"config",
					"project-id",
					"disabled",
					"onUpdate:config"
				]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nText_default), {
					tag: "label",
					step: "sm",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agent.instructions.label")), 1)]),
					_: 1
				}), createVNode(unref(MarkdownEditor_default), {
					"model-value": localConfig.value?.instructions ?? "",
					disabled: !canUpdate.value,
					"show-toolbar": "always",
					"max-height": "480px",
					variant: "contained",
					class: normalizeClass(_ctx.$style.markdownEditor),
					"data-testid": "agent-ndv-inline-instructions",
					"onUpdate:modelValue": onInstructionsUpdate
				}, null, 8, [
					"model-value",
					"disabled",
					"class"
				])], 2),
				createVNode(AgentCapabilitiesSection_default, {
					config: localConfig.value,
					tools: localConfig.value?.tools ?? [],
					"custom-tools": {},
					skills: appliedSkills.value,
					"connected-triggers": [],
					disabled: !canUpdate.value,
					"project-id": projectId.value,
					"agent-id": "",
					"is-published": false,
					sections: ["tools", "skills"],
					onAddTool: actions.value?.onOpenAddToolModal,
					onOpenTool: actions.value?.onOpenToolFromList,
					onRemoveTool: actions.value?.onRemoveTool,
					onAddSkill: actions.value?.onOpenAddSkillModal,
					onOpenSkill: actions.value?.onOpenSkillFromList,
					onRemoveSkill: actions.value?.onRemoveSkill,
					"onUpdate:config": unref(inline)?.scheduleConfigUpdate
				}, null, 8, [
					"config",
					"tools",
					"skills",
					"disabled",
					"project-id",
					"onAddTool",
					"onOpenTool",
					"onRemoveTool",
					"onAddSkill",
					"onOpenSkill",
					"onRemoveSkill",
					"onUpdate:config"
				])
			], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	inlineControls: "_inlineControls_1wz1m_1",
	field: "_field_1wz1m_9",
	markdownEditor: "_markdownEditor_1wz1m_16"
} }]]);
//#endregion
//#region src/features/workflows/canvas/components/elements/nodes/render-types/parts/canvasNodeAgentChips.utils.ts
var TOOL_ICONS = {
	workflow: "workflow",
	custom: "code",
	node: "wrench"
};
function individualToolChip(tool, index) {
	const activityName = tool.type === "workflow" ? sanitizeAgentToolName(tool.name) : tool.type === "node" ? nodeNameToToolName(tool.name) : tool.name;
	return {
		key: `tool:${tool.type}:${tool.name}:${index}`,
		icon: TOOL_ICONS[tool.type],
		label: formatToolNameForDisplay(tool.name),
		activityKeys: [toolActivityKey(activityName)],
		nodeType: tool.nodeType,
		nodeTypeVersion: tool.nodeTypeVersion
	};
}
/**
* Builds the tool chips, mirroring the edit page's `buildToolRows`: node tools
* of the same (resolved) node type collapse into one "N {NodeType}" chip once
* there are {@link MIN_GROUPED_TOOLS_PER_TYPE} or more; everything else (workflow
* and custom tools, single node tools, and node tools whose type isn't loaded)
* stays an individual humanized chip. Original ordering is preserved.
*/
function buildToolChips(tools, resolveNodeTypeLabel) {
	const ungrouped = [];
	const nodeGroups = /* @__PURE__ */ new Map();
	const nodeTypeLabels = /* @__PURE__ */ new Map();
	tools.forEach((tool, index) => {
		const label = tool.type === "node" && tool.nodeType ? resolveNodeTypeLabel?.(tool.nodeType, tool.nodeTypeVersion) : void 0;
		if (tool.type !== "node" || !tool.nodeType || !label) {
			ungrouped.push({
				index,
				chip: individualToolChip(tool, index)
			});
			return;
		}
		nodeTypeLabels.set(tool.nodeType, label);
		const group = nodeGroups.get(tool.nodeType) ?? [];
		group.push({
			tool,
			index
		});
		nodeGroups.set(tool.nodeType, group);
	});
	const entries = [...ungrouped];
	for (const [nodeType, group] of nodeGroups) if (group.length >= 2) entries.push({
		index: group[0].index,
		chip: {
			key: `tool:node:${nodeType}`,
			icon: TOOL_ICONS.node,
			label: `${group.length} ${nodeTypeLabels.get(nodeType)}`,
			activityKeys: group.map(({ tool }) => toolActivityKey(nodeNameToToolName(tool.name))),
			nodeType,
			nodeTypeVersion: group[0].tool.nodeTypeVersion
		}
	});
	else for (const { tool, index } of group) entries.push({
		index,
		chip: individualToolChip(tool, index)
	});
	return entries.sort((left, right) => left.index - right.index).map((entry) => entry.chip);
}
/**
* Flattens an agent's capability summary into the ordered chip list shown on the
* canvas card: tools first, then MCP servers, then skills — the order the
* capabilities section lists them. Channels and tasks are intentionally
* omitted. Node tools resolve their friendly
* node-type names (and group) via {@link resolveNodeTypeLabel}.
*/
function buildAgentCardChips(summary, resolveNodeTypeLabel) {
	const chips = [];
	chips.push(...buildToolChips(summary.tools, resolveNodeTypeLabel));
	for (const server of summary.mcpServers ?? []) chips.push({
		key: `mcp:${server.name}`,
		icon: "mcp",
		label: formatToolNameForDisplay(server.name),
		activityKeys: []
	});
	for (const skill of summary.skills) chips.push({
		key: `skill:${skill.id}`,
		icon: "sparkles",
		label: skill.name,
		activityKeys: [skillIdActivityKey(skill.id), skillNameActivityKey(skill.name)]
	});
	return chips;
}
//#endregion
//#region src/features/workflows/canvas/components/elements/nodes/render-types/parts/CanvasNodeAgentChips.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var CanvasNodeAgentChips_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CanvasNodeAgentChips",
	props: {
		chips: {},
		maxInline: { default: 8 },
		isReadOnly: {
			type: Boolean,
			default: false
		},
		activeCapabilityKeys: { default: () => /* @__PURE__ */ new Set() }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const inlineChips = computed(() => props.chips.slice(0, props.maxInline).map((chip) => ({
			...chip,
			nodeTypeDescription: chip.nodeType ? nodeTypesStore.getNodeType(chip.nodeType, chip.nodeTypeVersion) : null
		})));
		const overflowChips = computed(() => props.chips.slice(props.maxInline));
		const isChipActive = (chip) => (chip.activityKeys ?? []).some((key) => props.activeCapabilityKeys.has(key));
		const isOverflowActive = computed(() => overflowChips.value.some(isChipActive));
		const overflowItems = computed(() => overflowChips.value.map((chip) => ({
			id: chip.key,
			label: chip.label,
			icon: chip.icon
		})));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.chips),
				"data-test-id": "canvas-node-agent-chips"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(inlineChips.value, (chip) => {
				return openBlock(), createBlock(unref(N8nTooltip_default), {
					key: chip.key,
					"as-child": "",
					"show-after": 500,
					placement: "top"
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(chip.label), 1)]),
					default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([_ctx.$style.chipWrapper, { [_ctx.$style.running]: isChipActive(chip) }]) }, [isChipActive(chip) ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.statusRing)
					}, null, 2)) : createCommentVNode("", true), createVNode(AgentChipButton_default, {
						class: normalizeClass(_ctx.$style.chipButton),
						icon: chip.nodeTypeDescription ? void 0 : chip.icon,
						clickable: false,
						"aria-busy": isChipActive(chip),
						"data-test-id": "canvas-node-agent-chip"
					}, createSlots({
						default: withCtx(() => [createTextVNode(" " + toDisplayString(chip.label), 1)]),
						_: 2
					}, [chip.nodeTypeDescription ? {
						name: "icon",
						fn: withCtx(() => [createVNode(NodeIcon_default, {
							"node-type": chip.nodeTypeDescription,
							size: 16,
							class: normalizeClass(_ctx.$style.nodeIcon)
						}, null, 8, ["node-type", "class"])]),
						key: "0"
					} : void 0]), 1032, [
						"class",
						"icon",
						"aria-busy"
					])], 2)]),
					_: 2
				}, 1024);
			}), 128)), overflowChips.value.length && __props.isReadOnly ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass([_ctx.$style.chipWrapper, { [_ctx.$style.running]: isOverflowActive.value }])
			}, [isOverflowActive.value ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.statusRing)
			}, null, 2)) : createCommentVNode("", true), createVNode(AgentChipButton_default, {
				clickable: false,
				"aria-busy": isOverflowActive.value,
				"data-test-id": "canvas-node-agent-chips-overflow"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentNode.card.moreChips", { interpolate: { count: overflowChips.value.length } })), 1)]),
				_: 1
			}, 8, ["aria-busy"])], 2)) : overflowChips.value.length ? (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass([_ctx.$style.chipWrapper, { [_ctx.$style.running]: isOverflowActive.value }])
			}, [isOverflowActive.value ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.statusRing)
			}, null, 2)) : createCommentVNode("", true), createVNode(unref(N8nActionDropdown_default), {
				items: overflowItems.value,
				placement: "bottom-start",
				class: normalizeClass([
					"nodrag",
					"nowheel",
					_ctx.$style.overflowDropdown
				]),
				"data-test-id": "canvas-node-agent-chips-overflow"
			}, {
				activator: withCtx(() => [createVNode(AgentChipButton_default, { "aria-busy": isOverflowActive.value }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentNode.card.moreChips", { interpolate: { count: overflowChips.value.length } })), 1)]),
					_: 1
				}, 8, ["aria-busy"])]),
				_: 1
			}, 8, ["items", "class"])], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	chips: "_chips_e4pw7_1",
	nodeIcon: "_nodeIcon_e4pw7_8",
	chipWrapper: "_chipWrapper_e4pw7_12",
	chipButton: "_chipButton_e4pw7_21",
	overflowDropdown: "_overflowDropdown_e4pw7_26",
	running: "_running_e4pw7_32",
	statusRing: "_statusRing_e4pw7_38",
	"border-rotate": "_border-rotate_e4pw7_1"
} }]]);
//#endregion
//#region src/features/ndv/agents/components/AgentNdvReferencedSummary.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentNdvReferencedSummary_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentNdvReferencedSummary",
	props: { isReadOnly: { type: Boolean } },
	setup(__props) {
		/**
		* Read-only summary of the *saved agent* referenced by the AI Agent node,
		* rendered as the "Agent" section of the NDV Parameters tab. The shared agent
		* is edited only in the Agent Builder — the section header links there.
		*
		* Deliberately not the disabled editing panels: a disabled form reads as "no
		* permission" and mounts modal/credential machinery a summary never needs.
		*/
		const props = __props;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const { catalog: modelCatalog, ensureLoaded: ensureModelsLoaded } = useModelCatalog();
		const ndv = inject(NdvAgentConfigKey);
		const referenced = ndv?.referenced;
		const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
		const agentId = computed(() => referenced?.agentId.value ?? "");
		const projectId = computed(() => referenced?.projectId.value ?? "");
		const config = computed(() => referenced?.config.value ?? null);
		const agentRecord = computed(() => referenced?.agent.value ?? null);
		const appliedSkills = computed(() => referenced?.appliedSkills.value ?? []);
		const loading = computed(() => referenced?.loading.value ?? false);
		const isUnavailable = computed(() => referenced?.isUnavailable.value ?? false);
		const agentsDisabled = computed(() => referenced?.agentsDisabled.value ?? false);
		const parsedModel = computed(() => {
			const model = config.value?.model;
			return model ? parseModelString(model) : null;
		});
		const modelCredentialType = computed(() => {
			const provider = parsedModel.value?.provider;
			return provider && isAgentModelProvider(provider) ? getProviderCredentialTypes(provider)[0] : null;
		});
		const modelName = computed(() => {
			const parsed = parsedModel.value;
			if (!parsed) return "";
			return modelCatalog.value[parsed.provider]?.models[parsed.name]?.name ?? parsed.name;
		});
		const instructions = computed(() => config.value?.instructions?.trim() ?? "");
		function resolveNodeTypeLabel(nodeType, version) {
			return nodeTypesStore.getNodeType(nodeType, version)?.displayName.replace(/ Tool$/, "");
		}
		const chips = computed(() => {
			const cfg = config.value;
			if (!cfg) return [];
			return buildAgentCardChips({
				id: agentId.value,
				name: cfg.name,
				model: null,
				channels: [],
				tools: toCapabilitySummaryTools(cfg.tools, (id) => agentRecord.value?.tools?.[id]?.descriptor.name),
				mcpServers: (cfg.mcpServers ?? []).map((server) => ({ name: server.name })),
				skills: appliedSkills.value.map(({ id, skill }) => ({
					id,
					name: skill.name
				})),
				tasks: []
			}, resolveNodeTypeLabel);
		});
		watch(projectId, (id) => {
			if (!id || agentsDisabled.value) return;
			ensureModelsLoaded(id).catch(() => {});
		}, { immediate: true });
		async function onEditInBuilder() {
			await referenced?.openBuilder();
		}
		return (_ctx, _cache) => {
			return isAgentNode.value && agentId.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.summary),
				"data-test-id": "agent-ndv-referenced-summary"
			}, [agentsDisabled.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.unavailable),
				color: "danger",
				size: "small",
				"data-test-id": "agent-ndv-agents-disabled"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentNode.agentsDisabled")), 1)]),
				_: 1
			}, 8, ["class"])) : isUnavailable.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 1,
				class: normalizeClass(_ctx.$style.unavailable),
				color: "danger",
				size: "small",
				"data-test-id": "agent-ndv-unavailable"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentNode.ndv.unavailable")), 1)]),
				_: 1
			}, 8, ["class"])) : loading.value && !config.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 2,
				rows: 4,
				"data-test-id": "agent-ndv-loading"
			})) : config.value ? (openBlock(), createElementBlock("div", {
				key: 3,
				class: normalizeClass(_ctx.$style.config)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.configContent) }, [
				!isUnavailable.value && !props.isReadOnly ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					size: "small",
					icon: "external-link",
					variant: "outline",
					class: normalizeClass(_ctx.$style.editButton),
					"data-test-id": "agent-ndv-edit-in-builder",
					onClick: onEditInBuilder
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentNode.ndv.referenced.editInBuilder")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(AgentPersonalisationIcon_default, {
					personalisation: config.value.personalisation,
					size: 48
				}, null, 8, ["personalisation"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.identityRow) }, [createVNode(unref(N8nText_default), {
					bold: "",
					step: "2xl",
					"data-test-id": "agent-ndv-summary-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(config.value.name), 1)]),
					_: 1
				}), createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.modelRow),
					"data-test-id": "agent-ndv-summary-model"
				}, [modelCredentialType.value ? (openBlock(), createBlock(CredentialIcon_default, {
					key: 0,
					"credential-type-name": modelCredentialType.value,
					size: 16
				}, null, 8, ["credential-type-name"])) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(modelName.value || unref(i18n).baseText("agentNode.card.noModel")), 1)]),
					_: 1
				})], 2)], 2)], 2),
				instructions.value ? (openBlock(), createBlock(unref(N8nMarkdown_default), {
					key: 1,
					content: instructions.value,
					class: normalizeClass(_ctx.$style.instructions),
					"data-test-id": "agent-ndv-summary-instructions"
				}, null, 8, ["content", "class"])) : createCommentVNode("", true),
				chips.value.length ? (openBlock(), createBlock(CanvasNodeAgentChips_default, {
					key: 2,
					chips: chips.value,
					"is-read-only": props.isReadOnly
				}, null, 8, ["chips", "is-read-only"])) : createCommentVNode("", true)
			], 2)], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1w6tq_122",
	summary: "_summary_1w6tq_128",
	editButton: "_editButton_1w6tq_136",
	config: "_config_1w6tq_142",
	configContent: "_configContent_1w6tq_151",
	unavailable: "_unavailable_1w6tq_184",
	identityRow: "_identityRow_1w6tq_188",
	modelRow: "_modelRow_1w6tq_194",
	instructions: "_instructions_1w6tq_200"
} }]]);
//#endregion
//#region src/features/workflows/canvas/experimental/components/ExperimentalEmbeddedNdvHeader.vue?vue&type=script&setup=true&lang.ts
var import_get = /* @__PURE__ */ __toESM(require_get(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ExperimentalEmbeddedNdvHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ExperimentalEmbeddedNdvHeader",
	props: {
		node: {},
		readOnly: { type: Boolean },
		nodeType: {},
		pushRef: {},
		subTitle: {},
		extraTabsClassName: {},
		selectedTab: {},
		includeAction: { type: Boolean },
		includeCredential: { type: Boolean },
		hasCredentialIssue: { type: Boolean },
		hideTabs: { type: Boolean }
	},
	emits: [
		"name-changed",
		"dblclick-title",
		"tab-changed"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.component, __props.node.disabled ? _ctx.$style.disabled : ""]) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.title),
				onDblclick: _cache[1] || (_cache[1] = ($event) => emit("dblclick-title", $event))
			}, [
				createVNode(NodeIcon_default, {
					"node-type": __props.nodeType,
					size: 16
				}, null, 8, ["node-type"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleText) }, [createVNode(unref(N8nInlineTextEdit_default), {
					"min-width": 0,
					"model-value": __props.node.name,
					"read-only": __props.readOnly,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("name-changed", $event))
				}, null, 8, ["model-value", "read-only"])], 2),
				createVNode(unref(N8nText_default), {
					bold: "",
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.subTitleText)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.subTitle), 1)]),
					_: 1
				}, 8, ["class"]),
				renderSlot(_ctx.$slots, "actions")
			], 34), !__props.hideTabs ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.tabsContainer)
			}, [createVNode(NodeSettingsTabs_default, {
				class: normalizeClass(__props.extraTabsClassName),
				"model-value": __props.selectedTab,
				"node-type": __props.nodeType,
				"push-ref": __props.pushRef,
				compact: "",
				"include-action": __props.includeAction,
				"include-credential": __props.includeCredential,
				"has-credential-issue": __props.hasCredentialIssue,
				"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => emit("tab-changed", $event))
			}, null, 8, [
				"class",
				"model-value",
				"node-type",
				"push-ref",
				"include-action",
				"include-credential",
				"has-credential-issue"
			])], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	component: "_component_mek4m_1",
	title: "_title_mek4m_5",
	disabled: "_disabled_mek4m_13",
	titleText: "_titleText_mek4m_17",
	subTitleText: "_subTitleText_mek4m_29",
	tabsContainer: "_tabsContainer_mek4m_38"
} }]]);
//#endregion
//#region src/app/components/NodeActionsList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$3 = ["onClick"];
var NodeActionsList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeActionsList",
	props: { node: {} },
	emits: ["actionSelected"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const nodeTypesStore = useNodeTypesStore();
		const { generateMergedNodesAndActions } = useActionsGenerator();
		const { parseCategoryActions, getActionData } = useActions();
		const i18n = useI18n();
		const selectedActionRef = ref();
		const nodeType = computed(() => nodeTypesStore.getNodeType(__props.node.type, __props.node.typeVersion));
		const options = computed(() => {
			const { actions } = generateMergedNodesAndActions(nodeType.value ? [nodeType.value] : [], []);
			return parseCategoryActions(Object.values(actions).flatMap((typeDescriptions) => typeDescriptions.filter(({ actionKey }) => actionKey !== CUSTOM_API_CALL_KEY).map((typeDescription) => ({
				type: "action",
				subcategory: typeDescription.actionKey,
				key: typeDescription.actionKey,
				properties: typeDescription
			}))), i18n.baseText("nodeCreator.actionsCategory.actions"), true).map((action) => {
				if (action.type !== "action") return {
					action,
					isSelected: false
				};
				const data = getActionData(action.properties).value;
				let isSelected = true;
				for (const [key, value] of Object.entries(data)) isSelected = isSelected && __props.node.parameters[key] === value;
				return {
					action,
					isSelected
				};
			});
		});
		function handleClickOption(option) {
			if (option.type !== "action") return;
			emit("actionSelected", getActionData(option.properties).value);
		}
		function handleSelectedItemRef(el) {
			if (el instanceof HTMLDivElement) selectedActionRef.value = el;
		}
		watch(selectedActionRef, (selected) => {
			selected?.scrollIntoView();
		}, { flush: "post" });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.component) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(options.value, (option) => {
				return openBlock(), createElementBlock(Fragment, { key: option.action.key }, [option.action.type === "label" ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					tag: "div",
					class: normalizeClass(_ctx.$style.label),
					size: "xsmall",
					color: "text-base",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(option.action.key), 1)]),
					_: 2
				}, 1032, ["class"])) : option.action.type === "action" ? (openBlock(), createElementBlock("div", {
					key: 1,
					ref_for: true,
					ref: option.isSelected ? handleSelectedItemRef : void 0,
					class: normalizeClass({
						[_ctx.$style.option]: true,
						[_ctx.$style.selected]: option.isSelected
					}),
					role: "button",
					onClick: ($event) => handleClickOption(option.action)
				}, [
					createVNode(NodeIcon_default, {
						size: 20,
						"node-type": nodeType.value
					}, null, 8, ["node-type"]),
					createVNode(unref(N8nText_default), {
						size: "small",
						bold: "",
						class: normalizeClass(_ctx.$style.optionText)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(option.action.properties.displayName), 1)]),
						_: 2
					}, 1032, ["class"]),
					option.isSelected ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: "check",
						color: "primary"
					})) : createCommentVNode("", true)
				], 10, _hoisted_1$3)) : createCommentVNode("", true)], 64);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	component: "_component_121y7_1",
	label: "_label_121y7_5",
	option: "_option_121y7_10",
	selected: "_selected_121y7_17",
	optionText: "_optionText_121y7_21"
} }]]);
//#endregion
//#region src/features/ndv/settings/components/NodeSettingsInvalidNodeWarning.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = { class: "mt-s mb-xs" };
var _hoisted_2$2 = ["href", "textContent"];
var NodeSettingsInvalidNodeWarning_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeSettingsInvalidNodeWarning",
	props: {
		node: {},
		previewMode: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const nodeTypesStore = useNodeTypesStore();
		const uiStore = useUIStore();
		const ndvStore = injectNDVStore();
		const nodeCreatorStore = useNodeCreatorStore();
		const usersStore = useUsersStore();
		const workflowId = useWorkflowId();
		const isCommunityNode = computed(() => isCommunityPackageName(__props.node.type));
		const isVerifiedCommunityNode = computed(() => isCommunityPackageName(__props.node.type) && nodeTypesStore.communityNodeType(__props.node.type)?.isOfficialNode);
		const npmPackage = computed(() => removePreviewToken(__props.node.type.split(".")[0]));
		const isAdminOrOwner = computed(() => usersStore.isAdminOrOwner);
		const { getQuickConnectOptionByPackageName } = useQuickConnect();
		const quickConnect = computed(() => getQuickConnectOptionByPackageName(npmPackage.value));
		const { installNode, loading } = useInstallNode();
		const isNodeDefined = computed(() => !!nodeTypesStore.nodeTypes[__props.node.type]);
		async function onViewDetailsClick() {
			telemetry.track("user clicked cnr docs link", {
				source: "missing node modal source",
				package_name: __props.node.type.split(".")[0],
				node_type: __props.node.type
			});
			if (isVerifiedCommunityNode.value) await nodeCreatorStore.openNodeCreatorWithNode(workflowId.value, __props.node.name);
			else if (npmPackage.value) window.open(`https://www.npmjs.com/package/${npmPackage.value}`, "_blank");
		}
		async function onInstallClick() {
			telemetry.track("user clicked cnr install button", {
				source: "missing node modal source",
				package_name: npmPackage.value,
				node_type: __props.node.type
			});
			if (isVerifiedCommunityNode.value) await installNode({
				type: "verified",
				packageName: npmPackage.value,
				nodeType: __props.node.type,
				telemetry: {
					source: "missing node modal source",
					hasQuickConnect: quickConnect.value !== void 0
				}
			});
			else uiStore.openModalWithData({
				name: COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
				data: {
					packageName: npmPackage.value,
					disableInput: true,
					hideSuggestion: true,
					nodeType: __props.node.type
				}
			});
		}
		watch(isNodeDefined, () => {
			if (isNodeDefined.value) ndvStore.value.unsetActiveNodeName();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.nodeIsNotValid) }, [
				createBaseVNode("p", { class: normalizeClass(_ctx.$style.warningIcon) }, [createVNode(unref(N8nIcon_default), { icon: "triangle-alert" })], 2),
				createBaseVNode("div", _hoisted_1$2, [createVNode(unref(N8nText_default), {
					size: "large",
					color: "text-dark",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.previewMode ? unref(i18n).baseText("nodeSettings.communityNodeUnknown.title.preview") : unref(i18n).baseText("nodeSettings.communityNodeUnknown.title")), 1)]),
					_: 1
				})]),
				isCommunityNode.value && !__props.previewMode ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.descriptionContainer)
				}, [createVNode(unref(I18nT), {
					keypath: "nodeSettings.communityNodeUnknown.description",
					tag: "span",
					scope: "global"
				}, {
					action: withCtx(() => [createVNode(unref(N8nText_default), {
						size: "medium",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(npmPackage.value), 1)]),
						_: 1
					})]),
					_: 1
				}), isAdminOrOwner.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.communityNodeActionsContainer)
				}, [isAdminOrOwner.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					icon: "hard-drive-download",
					"data-test-id": "install-community-node-button",
					loading: unref(loading),
					disabled: unref(loading),
					onClick: onInstallClick
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeSettings.communityNodeUnknown.installButton.label")), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])) : createCommentVNode("", true), createVNode(unref(N8nButton_default), {
					variant: "outline",
					icon: "external-link",
					onClick: onViewDetailsClick,
					"data-test-id": "view-details-button"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeSettings.communityNodeUnknown.viewDetailsButton.label")), 1)]),
					_: 1
				})], 2)) : (openBlock(), createBlock(ContactAdministratorToInstall_default, {
					key: 1,
					box: false
				}))], 2)) : !__props.previewMode ? (openBlock(), createBlock(unref(I18nT), {
					key: 1,
					keypath: "nodeSettings.nodeTypeUnknown.description",
					tag: "span",
					scope: "global"
				}, {
					action: withCtx(() => [createBaseVNode("a", {
						href: unref(CUSTOM_NODES_DOCS_URL),
						target: "_blank",
						textContent: toDisplayString(unref(i18n).baseText("nodeSettings.nodeTypeUnknown.description.customNode"))
					}, null, 8, _hoisted_2$2)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	communityNodeActionsContainer: "_communityNodeActionsContainer_1h5vy_1",
	nodeIsNotValid: "_nodeIsNotValid_1h5vy_6",
	warningIcon: "_warningIcon_1h5vy_17",
	descriptionContainer: "_descriptionContainer_1h5vy_22"
} }]]);
//#endregion
//#region src/features/core/dataTable/components/NodeStorageLimitCallout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { key: 0 };
var _hoisted_2$1 = { key: 1 };
//#endregion
//#region src/features/core/dataTable/components/NodeStorageLimitCallout.vue
var NodeStorageLimitCallout_default = /* @__PURE__ */ defineComponent({
	__name: "NodeStorageLimitCallout",
	setup(__props) {
		const i18n = useI18n();
		const nvdStore = injectNDVStore();
		const dataTableStore = useDataTableStore();
		const calloutType = computed(() => {
			if (!DATA_TABLE_NODES.includes(nvdStore.value.activeNode?.type ?? "")) return null;
			switch (dataTableStore.dataTableSizeLimitState) {
				case "error": return "danger";
				case "warn": return "warning";
				default: return null;
			}
		});
		return (_ctx, _cache) => {
			return calloutType.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: calloutType.value,
				class: "mt-xs"
			}, {
				default: withCtx(() => [calloutType.value === "danger" ? (openBlock(), createElementBlock("span", _hoisted_1$1, toDisplayString(unref(i18n).baseText("dataTable.banner.storageLimitError.message", { interpolate: { usage: `${unref(dataTableStore).dataTableSize} / ${unref(dataTableStore).maxSizeMB}MB` } })), 1)) : (openBlock(), createElementBlock("span", _hoisted_2$1, toDisplayString(unref(i18n).baseText("dataTable.banner.storageLimitWarning.message", { interpolate: { usage: `${unref(dataTableStore).dataTableSize} / ${unref(dataTableStore).maxSizeMB}MB` } })), 1))]),
				_: 1
			}, 8, ["theme"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/ndv/settings/components/NodeSettings.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-has-output-connection"];
var _hoisted_2 = {
	key: 3,
	class: "no-parameters"
};
var _hoisted_3 = {
	key: 4,
	class: "parameter-item parameter-notice",
	"data-test-id": "node-parameters-http-notice"
};
var _hoisted_4 = {
	class: "node-version",
	"data-test-id": "node-version"
};
var NodeSettings_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeSettings",
	props: {
		eventBus: {},
		dragging: { type: Boolean },
		pushRef: {},
		readOnly: { type: Boolean },
		foreignCredentials: {},
		blockUI: { type: Boolean },
		executable: { type: Boolean },
		inputSize: { default: 0 },
		activeNode: { default: void 0 },
		isEmbeddedInCanvas: {
			type: Boolean,
			default: false
		},
		subTitle: { default: void 0 },
		extraTabsClassName: {},
		extraParameterWrapperClassName: {},
		hideExecute: {
			type: Boolean,
			default: false
		},
		hideDocs: {
			type: Boolean,
			default: true
		},
		hideSubConnections: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"stopExecution",
		"valueChanged",
		"switchSelectedNode",
		"openConnectionNodeCreator",
		"activate",
		"execute",
		"replaceNode",
		"captureWheelBody",
		"dblclickHeader"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const nodeValues = ref(getNodeSettingsInitialValues());
		const nodeTypesStore = useNodeTypesStore();
		const ndvStore = injectNDVStore();
		const workflowsListStore = useWorkflowsListStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const credentialsStore = useCredentialsStore();
		const historyStore = useHistoryStore();
		const { aiAssistant, instanceAi } = useEditorContext();
		const hideCredentialHelp = computed(() => !aiAssistant.value && !instanceAi.value);
		const telemetry = useTelemetry();
		const nodeHelpers = useNodeHelpers();
		const externalHooks = useExternalHooks();
		const i18n = useI18n();
		const route = useRoute();
		const nodeSettingsParameters = useNodeSettingsParameters();
		const nodeParameterWrapper = useTemplateRef("nodeParameterWrapper");
		const shouldShowStaticScrollbar = ref(false);
		if (props.isEmbeddedInCanvas) useResizeObserver(nodeParameterWrapper, () => {
			shouldShowStaticScrollbar.value = (nodeParameterWrapper.value?.scrollHeight ?? 0) > (nodeParameterWrapper.value?.offsetHeight ?? 0);
		});
		const nodeValid = ref(true);
		const openPanel = ref("params");
		const nodeValuesInitialized = ref(false);
		const hiddenIssuesInputs = ref([]);
		const subConnections = ref(null);
		const isDemoRoute = computed(() => route?.name === VIEWS.DEMO);
		const settingsStore = useSettingsStore();
		const { isPreviewMode } = settingsStore;
		const isDemoPreview = computed(() => isDemoRoute.value && isPreviewMode);
		const currentWorkflow = computed(() => workflowsListStore.getWorkflowById(workflowDocumentStore.value.workflowId));
		const hasForeignCredential = computed(() => props.foreignCredentials.length > 0);
		const isHomeProjectTeam = computed(() => currentWorkflow.value?.homeProject?.type === ProjectTypes.Team);
		const isDeprecated = computed(() => Boolean(nodeType.value?.deprecated));
		const replacementNodeType = computed(() => nodeType.value?.replacedByNodeType ? nodeTypesStore.getNodeType(nodeType.value.replacedByNodeType) : null);
		const deprecatedNotice = computed(() => replacementNodeType.value ? i18n.baseText("node.deprecatedWithReplacement", { interpolate: { nodeTypeName: replacementNodeType.value.displayName } }) : i18n.baseText("node.deprecated"));
		const isReadOnly = computed(() => props.readOnly || isDeprecated.value || hasForeignCredential.value && !isHomeProjectTeam.value);
		const node = computed(() => props.activeNode ?? ndvStore.value.activeNode);
		const { labelOf } = usePolicyViolationLabels();
		const canCheckSubWorkflowPolicy = computed(() => !props.readOnly && workflowDocumentStore.value.scopes.includes("workflow:update"));
		const { isRestricted, restriction } = useNodeTypeRestriction(() => node.value?.type);
		const nodeType = computed(() => node.value ? nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion) : null);
		const { areAllCredentialsSet } = useNodeCredentialOptions(node, nodeType, "");
		const nodeTypeName = computed(() => node.value?.type);
		const { canUpdatePackage, hasUpdateAvailable } = useInstalledCommunityPackage(nodeTypeName);
		const isTriggerNode = computed(() => !!node.value && nodeTypesStore.isTriggerNode(node.value.type));
		const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));
		const isModelNode = computed(() => !!node.value && nodeTypesStore.isModelNode(node.value.type));
		const isExecutable = computed(() => nodeHelpers.isNodeExecutable(node.value, props.executable, props.foreignCredentials));
		const nodeTypeVersions = computed(() => {
			if (!node.value) return [];
			return nodeTypesStore.getNodeVersions(node.value.type);
		});
		const latestVersion = computed(() => Math.max(...nodeTypeVersions.value));
		const isLatestNodeVersion = computed(() => !node.value?.typeVersion || latestVersion.value === node.value.typeVersion);
		const executeButtonTooltip = computed(() => {
			if (node.value && isLatestNodeVersion.value && props.inputSize > 1 && !nodeHelpers.isSingleExecution(node.value.type, node.value.parameters)) return i18n.baseText("nodeSettings.executeButtonTooltip.times", { interpolate: { inputSize: props.inputSize } });
			return "";
		});
		const nodeVersionTag = computed(() => {
			if (!nodeType.value || nodeType.value.hidden || nodeType.value.deprecated) return i18n.baseText("nodeSettings.deprecated");
			if (isLatestNodeVersion.value) return i18n.baseText("nodeSettings.latest");
			return i18n.baseText("nodeSettings.latestVersion", { interpolate: { version: latestVersion.value.toString() } });
		});
		const parameters = computed(() => {
			if (nodeType.value === null) return [];
			return nodeType.value?.properties ?? [];
		});
		const parametersByTab = computed(() => collectParametersByTab(parameters.value, props.isEmbeddedInCanvas));
		const isDisplayingCredentials = computed(() => credentialsStore.getCredentialTypesNodeDescriptions("", nodeType.value).filter((credentialTypeDescription) => displayCredentials(credentialTypeDescription)).length > 0);
		const displayedCredentialTypes = computed(() => credentialsStore.getCredentialTypesNodeDescriptions("", nodeType.value).filter((credentialTypeDescription) => displayCredentials(credentialTypeDescription)).map((desc) => desc.name));
		const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();
		const quickConnect = computed(() => getQuickConnectOptionByCredentialTypes(displayedCredentialTypes.value));
		const showQuickConnectBanner = computed(() => quickConnect.value && !areAllCredentialsSet.value && !isReadOnly.value && !isDemoPreview.value && !props.isEmbeddedInCanvas);
		const { promotionText } = useGatewayCreditsPromotion({ nodeType: () => node.value?.type });
		const showGatewayCreditsPromotion = computed(() => !!promotionText.value && !isReadOnly.value && !isDemoPreview.value && !props.isEmbeddedInCanvas);
		const showNoParametersNotice = computed(() => !isDisplayingCredentials.value && (parametersByTab.value.params ?? []).filter((item) => item.type !== "notice").length === 0);
		const outputPanelEditMode = computed(() => ndvStore.value.outputPanelEditMode);
		const isCommunityNode = computed(() => !!node.value && isCommunityPackageName(node.value.type));
		const packageName = computed(() => node.value?.type.split(".")[0] ?? "");
		const usedCredentials = computed(() => Object.values(workflowDocumentStore?.value?.usedCredentials ?? {}).filter((credential) => Object.values(node.value?.credentials || []).find((nodeCredential) => nodeCredential.id === credential.id)));
		const credentialOwnerName = computed(() => {
			const credential = usedCredentials.value ? Object.values(usedCredentials.value).find((credential) => credential.id === props.foreignCredentials[0]) : void 0;
			return credentialsStore.getCredentialOwnerName(credential);
		});
		const featureRequestUrl = computed(() => {
			if (!nodeType.value || settingsStore.isCanvasOnly) return "";
			return `${BASE_NODE_SURVEY_URL}${nodeType.value.name}`;
		});
		const hasOutputConnection = computed(() => {
			if (!node.value) return false;
			const outgoingConnections = workflowDocumentStore?.value?.outgoingConnectionsByNodeName(node.value.name) ?? {};
			return (Object.values(outgoingConnections)?.[0]?.[0] ?? []).length > 0;
		});
		const valueChanged = (parameterData) => {
			if (isRestricted.value || isDeprecated.value) return;
			let newValue;
			if (parameterData.hasOwnProperty("value")) newValue = parameterData.value;
			else newValue = (0, import_get.default)(nodeValues.value, parameterData.name);
			const nodeNameBefore = parameterData.node || node.value?.name;
			if (!nodeNameBefore) return;
			const _node = workflowDocumentStore?.value?.getNodeByName(nodeNameBefore) ?? null;
			if (_node === null) return;
			if (parameterData.name === "name") {
				const sendData = {
					value: newValue,
					oldValue: nodeNameBefore,
					name: parameterData.name
				};
				emit("valueChanged", sendData);
			} else if (parameterData.name === "parameters") {
				const _nodeType = nodeTypesStore.getNodeType(_node.type, _node.typeVersion);
				if (!_nodeType) return;
				let nodeParameters = getNodeParameters(_nodeType.properties, _node.parameters, false, false, _node, _nodeType);
				const oldNodeParameters = Object.assign({}, nodeParameters);
				nodeParameters = deepCopy(nodeParameters);
				if (parameterData.value && typeof parameterData.value === "object") for (const [parameterName, parameterValue] of Object.entries(parameterData.value)) {
					newValue = parameterValue;
					const parameterPath = nodeSettingsParameters.updateParameterByPath(parameterName, newValue, nodeParameters, _nodeType, _node.typeVersion);
					externalHooks.run("nodeSettings.valueChanged", {
						parameterPath,
						newValue,
						parameters: parameters.value,
						oldNodeParameters
					});
				}
				nodeParameters = getNodeParameters(_nodeType.properties, nodeParameters, true, false, _node, _nodeType);
				for (const key of Object.keys(nodeParameters)) if (nodeParameters?.[key] !== null && nodeParameters?.[key] !== void 0) nodeSettingsParameters.setValue(nodeValues, `parameters.${key}`, nodeParameters[key]);
				if (nodeParameters) {
					const updateInformation = {
						name: _node.name,
						value: nodeParameters
					};
					workflowDocumentStore?.value?.setNodeParameters(updateInformation);
					nodeHelpers.updateNodeParameterIssuesByName(_node.name);
					nodeHelpers.updateNodeCredentialIssuesByName(_node.name);
					nodeHelpers.updateNodeInputIssuesByName(_node.name);
				}
			} else if (nameIsParameter(parameterData)) nodeSettingsParameters.updateNodeParameter(nodeValues, parameterData, newValue, _node, isToolNode.value);
			else if (parameterData.name.includes(".") || parameterData.name.includes("[")) {
				const topLevelKey = parameterData.name.split(/[.[]/)[0];
				const valueForSetter = newValue === void 0 ? null : newValue;
				nodeSettingsParameters.setValue(nodeValues, parameterData.name, valueForSetter);
				workflowDocumentStore?.value?.setNodeValue({
					name: _node.name,
					key: topLevelKey,
					value: deepCopy(nodeValues.value[topLevelKey])
				});
			} else {
				nodeValues.value = {
					...nodeValues.value,
					[parameterData.name]: newValue
				};
				const updateInformation = {
					name: _node.name,
					key: parameterData.name,
					value: newValue
				};
				workflowDocumentStore?.value?.setNodeValue(updateInformation);
			}
		};
		const setHttpNodeParameters = (parameters) => {
			try {
				valueChanged({
					node: node.value?.name,
					name: "parameters",
					value: parameters
				});
			} catch (error) {
				console.error("Failed to apply cURL parameters to node:", error);
			}
		};
		const onSwitchSelectedNode = (node) => {
			emit("switchSelectedNode", node);
		};
		const onOpenConnectionNodeCreator = (nodeName, connectionType, connectionIndex = 0) => {
			emit("openConnectionNodeCreator", nodeName, connectionType, connectionIndex);
		};
		const populateHiddenIssuesSet = () => {
			if (!node.value || !workflowDocumentStore?.value?.isNodePristine(node.value.name)) return;
			hiddenIssuesInputs.value.push("credentials");
			parametersByTab.value.params.forEach((parameter) => {
				hiddenIssuesInputs.value.push(parameter.name);
			});
			workflowDocumentStore?.value?.setNodePristine(node.value.name, false);
		};
		const nodeSettings = computed(() => createCommonNodeSettings(isToolNode.value || isModelNode.value, i18n.baseText.bind(i18n), settingsStore.isOtelCustomSpanAttributesEnabled));
		const ndvAgentConfig = inject(NdvAgentConfigKey, null);
		const isAgentNode = computed(() => isAgentNodeV2(node.value));
		const showAgentNdvControls = computed(() => isAgentNode.value && ndvAgentConfig !== null);
		const agentNdvMode = computed(() => ndvAgentConfig?.mode?.value ?? "referenced");
		const skipNodeCredentialsFetch = computed(() => showAgentNdvControls.value && agentNdvMode.value === "inline");
		const onParameterBlur = (parameterName) => {
			hiddenIssuesInputs.value = hiddenIssuesInputs.value.filter((name) => name !== parameterName);
		};
		const onWorkflowActivate = () => {
			hiddenIssuesInputs.value = [];
			emit("activate");
		};
		const onNodeExecute = () => {
			hiddenIssuesInputs.value = [];
			subConnections.value?.showNodeInputsIssues();
			emit("execute");
		};
		const credentialSelected = (updateInformation) => {
			workflowDocumentStore?.value?.updateNodeProperties(updateInformation);
			const node = workflowDocumentStore?.value?.getNodeByName(updateInformation.name) ?? null;
			if (node) nodeHelpers.updateNodeCredentialIssues(node);
			externalHooks.run("nodeSettings.credentialSelected", { updateInformation });
		};
		const nameChanged = (name) => {
			if (node.value) historyStore.pushCommandToUndo(new RenameNodeCommand(node.value.name, name, Date.now()));
			valueChanged({
				value: name,
				name: "name"
			});
		};
		const setNodeValues = () => {
			if (!node.value) {
				nodeValuesInitialized.value = true;
				return;
			}
			if (nodeType.value !== null) {
				nodeValid.value = true;
				nodeValues.value = collectSettings(node.value, nodeSettings.value);
			} else nodeValid.value = false;
			nodeValuesInitialized.value = true;
		};
		const onStopExecution = () => {
			emit("stopExecution");
		};
		const openSettings = () => {
			openPanel.value = "settings";
		};
		const onTabSelect = (tab) => {
			openPanel.value = tab;
		};
		const onFeatureRequestClick = () => {
			window.open(featureRequestUrl.value, "_blank");
			if (node.value) telemetry.track("User clicked ndv link", {
				node_type: node.value.type,
				workflow_id: workflowDocumentStore.value.workflowId,
				push_ref: props.pushRef,
				pane: NodeConnectionTypes.Main,
				type: "i-wish-this-node-would"
			});
		};
		watch(node, () => {
			setNodeValues();
		});
		onMounted(async () => {
			populateHiddenIssuesSet();
			setNodeValues();
			props.eventBus?.on("openSettings", openSettings);
			if (node.value !== null) nodeHelpers.updateNodeParameterIssues(node.value, nodeType.value);
			importCurlEventBus.on("setHttpNodeParameters", setHttpNodeParameters);
			ndvEventBus.on("updateParameterValue", valueChanged);
		});
		onBeforeUnmount(() => {
			props.eventBus?.off("openSettings", openSettings);
			importCurlEventBus.off("setHttpNodeParameters", setHttpNodeParameters);
			ndvEventBus.off("updateParameterValue", valueChanged);
		});
		function displayCredentials(credentialTypeDescription) {
			if (credentialTypeDescription.displayOptions === void 0) return true;
			return !!node.value && nodeHelpers.displayParameter(node.value.parameters, credentialTypeDescription, "", node.value);
		}
		function handleSelectAction(params) {
			for (const [key, value] of Object.entries(params)) valueChanged({
				name: `parameters.${key}`,
				value
			});
			if (isDisplayingCredentials.value && !areAllCredentialsSet.value) {
				onTabSelect("credential");
				return;
			}
			if (parametersByTab.value.params.length > 0) onTabSelect("params");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass({
					"node-settings": true,
					dragging: __props.dragging,
					embedded: props.isEmbeddedInCanvas
				}),
				"data-has-output-connection": hasOutputConnection.value
			}, [
				__props.isEmbeddedInCanvas && node.value ? (openBlock(), createBlock(ExperimentalEmbeddedNdvHeader_default, {
					key: 0,
					node: node.value,
					"selected-tab": openPanel.value,
					"read-only": isReadOnly.value || unref(isRestricted),
					"hide-tabs": unref(isRestricted),
					"node-type": nodeType.value,
					"push-ref": __props.pushRef,
					"sub-title": __props.subTitle,
					"extra-tabs-class-name": __props.extraTabsClassName,
					"include-action": parametersByTab.value.action.length > 0,
					"include-credential": isDisplayingCredentials.value,
					"has-credential-issue": !unref(areAllCredentialsSet),
					onNameChanged: nameChanged,
					onTabChanged: onTabSelect,
					onDblclickTitle: _cache[0] || (_cache[0] = ($event) => emit("dblclickHeader", $event))
				}, {
					actions: withCtx(() => [renderSlot(_ctx.$slots, "actions", {}, void 0, true)]),
					_: 3
				}, 8, [
					"node",
					"selected-tab",
					"read-only",
					"hide-tabs",
					"node-type",
					"push-ref",
					"sub-title",
					"extra-tabs-class-name",
					"include-action",
					"include-credential",
					"has-credential-issue"
				])) : node.value && nodeValid.value && !unref(isRestricted) ? (openBlock(), createBlock(NodeSettingsHeader_default, {
					key: 1,
					"selected-tab": openPanel.value,
					"node-name": node.value.name,
					"node-type": nodeType.value,
					"execute-button-tooltip": executeButtonTooltip.value,
					"hide-execute": props.hideExecute || !isExecutable.value || __props.blockUI || !node.value || !nodeValid.value || isDeprecated.value,
					"disable-execute": outputPanelEditMode.value.enabled && !isTriggerNode.value,
					"hide-tabs": !nodeValid.value,
					"hide-docs": props.hideDocs,
					"push-ref": __props.pushRef,
					onExecute: onNodeExecute,
					onStopExecution,
					onValueChanged: valueChanged,
					onTabChanged: onTabSelect
				}, null, 8, [
					"selected-tab",
					"node-name",
					"node-type",
					"execute-button-tooltip",
					"hide-execute",
					"disable-execute",
					"hide-tabs",
					"hide-docs",
					"push-ref"
				])) : createCommentVNode("", true),
				node.value && !nodeValid.value ? (openBlock(), createBlock(NodeSettingsInvalidNodeWarning_default, {
					key: 2,
					node: node.value,
					"preview-mode": isDemoPreview.value
				}, null, 8, ["node", "preview-mode"])) : createCommentVNode("", true),
				node.value && nodeValid.value && unref(isRestricted) ? (openBlock(), createBlock(unref(RestrictedNodePanel_default), {
					key: 3,
					"node-type-name": nodeType.value?.displayName ?? node.value.type,
					restriction: unref(restriction),
					"show-replace": !__props.isEmbeddedInCanvas && !__props.readOnly,
					onReplaceNode: _cache[1] || (_cache[1] = ($event) => emit("replaceNode", node.value.id))
				}, null, 8, [
					"node-type-name",
					"restriction",
					"show-replace"
				])) : node.value && nodeValid.value ? (openBlock(), createElementBlock("div", {
					key: 4,
					ref_key: "nodeParameterWrapper",
					ref: nodeParameterWrapper,
					class: normalizeClass([
						"node-parameters-wrapper",
						"ph-no-capture",
						shouldShowStaticScrollbar.value ? "with-static-scrollbar" : "",
						__props.extraParameterWrapperClassName ?? ""
					]),
					"data-test-id": "node-parameters",
					onWheelCapture: _cache[2] || (_cache[2] = ($event) => emit("captureWheelBody", $event))
				}, [
					isDeprecated.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "danger",
						class: "mt-xs",
						"data-test-id": "node-deprecated-notice"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(deprecatedNotice.value), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					hasForeignCredential.value && !isHomeProjectTeam.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 1,
						content: unref(i18n).baseText("nodeSettings.hasForeignCredential", { interpolate: { owner: credentialOwnerName.value } })
					}, null, 8, ["content"])) : createCommentVNode("", true),
					createVNode(FreeAiCreditsCallout_default),
					createVNode(NodeStorageLimitCallout_default),
					node.value ? (openBlock(), createBlock(unref(RestrictedSubWorkflowCallout_default), {
						key: 2,
						"parent-workflow-id": unref(workflowDocumentStore).workflowId,
						node: node.value,
						enabled: canCheckSubWorkflowPolicy.value,
						"label-of": unref(labelOf)
					}, null, 8, [
						"parent-workflow-id",
						"node",
						"enabled",
						"label-of"
					])) : createCommentVNode("", true),
					openPanel.value === "action" ? (openBlock(), createBlock(NodeActionsList_default, {
						key: 3,
						class: "action-tab",
						node: node.value,
						onActionSelected: handleSelectAction
					}, null, 8, ["node"])) : createCommentVNode("", true),
					openPanel.value === "credential" ? (openBlock(), createBlock(NodeCredentials_default, {
						key: 4,
						node: node.value,
						readonly: __props.readOnly || isDeprecated.value,
						"show-all": true,
						"hide-issues": hiddenIssuesInputs.value.includes("credentials"),
						"hide-ask-assistant": hideCredentialHelp.value,
						onCredentialSelected: credentialSelected,
						onValueChanged: valueChanged,
						onBlur: onParameterBlur
					}, null, 8, [
						"node",
						"readonly",
						"hide-issues",
						"hide-ask-assistant"
					])) : createCommentVNode("", true),
					withDirectives(createBaseVNode("div", null, [
						createVNode(NodeWebhooks_default, {
							node: node.value,
							"node-type-description": nodeType.value
						}, null, 8, ["node", "node-type-description"]),
						nodeValuesInitialized.value ? (openBlock(), createBlock(ParameterInputList_default, {
							key: 0,
							parameters: parametersByTab.value.params,
							"hide-delete": true,
							"node-values": nodeValues.value,
							"is-read-only": isReadOnly.value,
							"hidden-issues-inputs": hiddenIssuesInputs.value,
							path: "parameters",
							node: props.activeNode,
							onValueChanged: valueChanged,
							onActivate: onWorkflowActivate,
							onParameterBlur
						}, {
							default: withCtx(() => [
								showQuickConnectBanner.value ? (openBlock(), createBlock(QuickConnectBanner_default, {
									key: 0,
									text: quickConnect.value?.text ?? "",
									disclaimer: quickConnect.value?.disclaimer,
									class: normalizeClass(_ctx.$style.quickConnectBanner)
								}, null, 8, [
									"text",
									"disclaimer",
									"class"
								])) : createCommentVNode("", true),
								showGatewayCreditsPromotion.value ? (openBlock(), createBlock(GatewayCreditsPromotion_default, {
									key: 1,
									text: unref(promotionText) ?? "",
									class: normalizeClass(_ctx.$style.gatewayCreditsPromotion)
								}, null, 8, ["text", "class"])) : createCommentVNode("", true),
								!__props.isEmbeddedInCanvas && !isDemoPreview.value ? (openBlock(), createBlock(NodeCredentials_default, {
									key: 2,
									node: node.value,
									readonly: __props.readOnly || isDeprecated.value,
									"show-all": true,
									"skip-credentials-fetch": skipNodeCredentialsFetch.value,
									"hide-issues": hiddenIssuesInputs.value.includes("credentials"),
									"hide-ask-assistant": hideCredentialHelp.value,
									onCredentialSelected: credentialSelected,
									onValueChanged: valueChanged,
									onBlur: onParameterBlur
								}, null, 8, [
									"node",
									"readonly",
									"skip-credentials-fetch",
									"hide-issues",
									"hide-ask-assistant"
								])) : createCommentVNode("", true)
							]),
							_: 1
						}, 8, [
							"parameters",
							"node-values",
							"is-read-only",
							"hidden-issues-inputs",
							"node"
						])) : createCommentVNode("", true),
						showAgentNdvControls.value && agentNdvMode.value === "referenced" ? (openBlock(), createBlock(AgentNdvReferencedSummary_default, {
							key: 1,
							"is-read-only": isReadOnly.value
						}, null, 8, ["is-read-only"])) : createCommentVNode("", true),
						showAgentNdvControls.value && agentNdvMode.value === "inline" ? (openBlock(), createBlock(AgentNdvInlineControls_default, {
							key: 2,
							"is-read-only": isReadOnly.value
						}, null, 8, ["is-read-only"])) : createCommentVNode("", true),
						showNoParametersNotice.value ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeSettings.thisNodeDoesNotHaveAnyParameters")), 1)]),
							_: 1
						})])) : createCommentVNode("", true),
						unref(nodeHelpers).isCustomApiCallSelected(nodeValues.value) ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(unref(N8nNotice_default), { content: unref(i18n).baseText("nodeSettings.useTheHttpRequestNode", { interpolate: { nodeTypeDisplayName: nodeType.value?.displayName ?? "" } }) }, null, 8, ["content"])])) : createCommentVNode("", true)
					], 512), [[vShow, openPanel.value === "params"]]),
					withDirectives(createBaseVNode("div", null, [
						unref(canUpdatePackage) && unref(hasUpdateAvailable) ? (openBlock(), createBlock(CommunityNodeUpdateInfo_default, {
							key: 0,
							"data-test-id": "update-available",
							"package-name": packageName.value,
							style: { "margin-top": "var(--spacing--sm)" },
							source: "node settings"
						}, null, 8, ["package-name"])) : createCommentVNode("", true),
						createVNode(ParameterInputList_default, {
							parameters: parametersByTab.value.settings,
							"node-values": nodeValues.value,
							"is-read-only": isReadOnly.value,
							"hide-delete": true,
							"hidden-issues-inputs": hiddenIssuesInputs.value,
							path: "parameters",
							onValueChanged: valueChanged,
							onParameterBlur
						}, null, 8, [
							"parameters",
							"node-values",
							"is-read-only",
							"hidden-issues-inputs"
						]),
						createVNode(ParameterInputList_default, {
							parameters: nodeSettings.value,
							"hide-delete": true,
							"node-values": nodeValues.value,
							"is-read-only": isReadOnly.value,
							"hidden-issues-inputs": hiddenIssuesInputs.value,
							path: "",
							onValueChanged: valueChanged,
							onParameterBlur
						}, null, 8, [
							"parameters",
							"node-values",
							"is-read-only",
							"hidden-issues-inputs"
						]),
						createBaseVNode("div", _hoisted_4, [createTextVNode(toDisplayString(unref(i18n).baseText("nodeSettings.nodeVersion", { interpolate: {
							node: nodeType.value?.displayName,
							version: (node.value.typeVersion ?? latestVersion.value).toString()
						} })) + " ", 1), createBaseVNode("span", null, "(" + toDisplayString(nodeVersionTag.value) + ")", 1)])
					], 512), [[vShow, openPanel.value === "settings"]]),
					featureRequestUrl.value && !__props.isEmbeddedInCanvas ? (openBlock(), createElementBlock("div", {
						key: 5,
						"data-test-id": "node-feature-request",
						class: normalizeClass(_ctx.$style.featureRequest)
					}, [createBaseVNode("a", {
						target: "_blank",
						onClick: onFeatureRequestClick
					}, [createVNode(unref(N8nIcon_default), { icon: "lightbulb" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("ndv.featureRequest")), 1)])], 2)) : createCommentVNode("", true)
				], 34)) : createCommentVNode("", true),
				node.value && !__props.hideSubConnections ? (openBlock(), createBlock(NDVSubConnections_default, {
					key: 5,
					ref_key: "subConnections",
					ref: subConnections,
					"root-node": node.value,
					onSwitchSelectedNode,
					onOpenConnectionNodeCreator
				}, null, 8, ["root-node"])) : createCommentVNode("", true),
				createVNode(unref(N8nBlockUi_default), {
					show: __props.blockUI,
					class: normalizeClass(_ctx.$style.uiBlocker)
				}, null, 8, ["show", "class"]),
				openPanel.value === "settings" && isCommunityNode.value ? (openBlock(), createBlock(CommunityNodeFooter_default, {
					key: 6,
					"package-name": packageName.value,
					"node-type-name": nodeTypeName.value,
					"show-manage": unref(useUsersStore)().isAdminOrOwner
				}, null, 8, [
					"package-name",
					"node-type-name",
					"show-manage"
				])) : createCommentVNode("", true)
			], 10, _hoisted_1);
		};
	}
}), [["__cssModules", { "$style": {
	featureRequest: "_featureRequest_1q2fm_1",
	quickConnectBanner: "_quickConnectBanner_1q2fm_15",
	gatewayCreditsPromotion: "_gatewayCreditsPromotion_1q2fm_19",
	uiBlocker: "_uiBlocker_1q2fm_23"
} }], ["__scopeId", "data-v-f6d97e3a"]]);
//#endregion
export { useNdvAgentConfig as a, readAgentSource as c, NdvAgentConfigKey as i, readInlineAgentParameter as l, CanvasNodeAgentChips_default as n, useAgentNavigation as o, buildAgentCardChips as r, inlineAgentToCapabilitySummary as s, NodeSettings_default as t, useNodeDocsUrl as u };
