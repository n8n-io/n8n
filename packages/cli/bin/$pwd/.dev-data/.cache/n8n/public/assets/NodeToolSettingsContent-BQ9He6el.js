import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, of as onBeforeUnmount, pf as provide, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Gp as disposeNDVStore, Ik as deepCopy, Jp as useNDVStore, Mp as useCredentialsStore, Qd as disposeWorkflowDocumentStore, SN as _plugin_vue_export_helper_default, Sk as makeNodeName, Sn as ParameterInputList_default, Xd as createWorkflowDocumentId, Yp as collectParametersByTab, Zp as createCommonNodeSettings, _N as N8nText_default, am as resetValuesOfChangedShape, br as NodeCredentials_default, cS as ExpressionLocalResolveContextSymbol, cm as useEnvironmentsStore, dd as useNodeHelpers, gk as isDefaultNodeName, hS as WorkflowDocumentStoreKey, iS as ChatHubToolContextKey, im as removeMismatchedOptionValues, jN as useI18n, kk as isINodePropertyOptions, mS as ToolConfigCredentialSelectedKey, mk as getNodeParametersIssues, nf as useWorkflowDocumentStore, om as setParameterValue, pk as getNodeParameters, uf as useNodeTypesStore, vm as useProjectsStore, yC as useSettingsStore, yj as Tabs_default } from "./app-D5flEmb-.js";
//#region src/features/shared/toolConfig/toolConfig.utils.ts
/**
* Returns a copy of the description with the given option values removed from
* every `resource` or `operation` property. Defaults pointing at a removed
* option are remapped to the first remaining option.
*/
function omitOperationOptions(description, optionValues) {
	const copy = deepCopy(description);
	for (const property of copy.properties) {
		if (property.name !== "resource" && property.name !== "operation" || !Array.isArray(property.options)) continue;
		property.options = property.options.filter((option) => !isINodePropertyOptions(option) || typeof option.value !== "string" || !optionValues.includes(option.value));
		if (typeof property.default !== "string" || !optionValues.includes(property.default)) continue;
		const firstRemainingOption = property.options.find(isINodePropertyOptions);
		if (firstRemainingOption) property.default = firstRemainingOption.value;
	}
	return copy;
}
//#endregion
//#region src/features/shared/toolConfig/NodeToolSettingsContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var NodeToolSettingsContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NodeToolSettingsContent",
	props: {
		initialNode: {},
		existingToolNames: {},
		hideAskAssistant: { type: Boolean },
		projectId: {},
		forAgent: { type: Boolean },
		hiddenOperations: {},
		hiddenParameters: {},
		parameterIssues: {},
		fromAiDisabledParameters: {},
		syncNodeToNdv: { type: Boolean },
		readOnly: { type: Boolean }
	},
	emits: [
		"update:valid",
		"update:node-name",
		"update:node"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		/**
		* Shared "configure a node-as-tool" form.
		*
		* Renders a two-sub-tab view (Parameters + node Settings) over an `INode`,
		* wired to `ParameterInputList` + `NodeCredentials`. Emits validity and name
		* changes so any container (Chat Hub modal, Agents modal, etc.) can drive a
		* Save/Cancel footer.
		*
		* Context marker: we provide `ChatHubToolContextKey` here so the parameter
		* form suppresses features that don't apply when a node is being configured
		* as an LLM tool outside a workflow canvas (see `ParameterOptions`,
		* `ParameterInputFull`). The key name is historical — treat it as the
		* "node-as-tool config" marker; it applies equally to Chat Hub and Agents.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const credentialsStore = useCredentialsStore();
		const projectsStore = useProjectsStore();
		const nodeHelpers = useNodeHelpers();
		const environmentsStore = useEnvironmentsStore();
		const settingsStore = useSettingsStore();
		const node = shallowRef(props.initialNode);
		const userEditedName = ref(false);
		const existingToolNames = computed(() => props.existingToolNames ?? []);
		const credentialProjectId = computed(() => props.projectId || projectsStore.personalProject?.id);
		const nodeTypeDescription = computed(() => {
			if (!props.initialNode) return null;
			const description = nodeTypesStore.getNodeType(props.initialNode.type);
			if (!description) return null;
			const withFilteredOperations = props.hiddenOperations?.length ? omitOperationOptions(description, props.hiddenOperations) : description;
			if (!props.hiddenParameters?.length) return withFilteredOperations;
			const hiddenParameters = new Set(props.hiddenParameters);
			return {
				...withFilteredOperations,
				properties: withFilteredOperations.properties.filter((parameter) => !hiddenParameters.has(parameter.name))
			};
		});
		const activeTab = ref("params");
		const parametersByTab = computed(() => collectParametersByTab(nodeTypeDescription.value?.properties ?? [], false));
		const hasSettings = computed(() => nodeSettings.value.length > 0 || parametersByTab.value.settings.length > 0);
		const tabOptions = computed(() => {
			const tabs = [{
				label: i18n.baseText("nodeSettings.parameters"),
				value: "params"
			}];
			if (hasSettings.value) tabs.push({
				label: i18n.baseText("nodeSettings.settings"),
				value: "settings"
			});
			return tabs;
		});
		const nodeSettings = computed(() => createCommonNodeSettings(true, i18n.baseText.bind(i18n), settingsStore.isOtelCustomSpanAttributesEnabled).filter((s) => s.name !== "notes" && s.name !== "notesInFlow"));
		const settingsNodeValues = computed(() => {
			if (!node.value) return { parameters: {} };
			return {
				parameters: deepCopy(node.value.parameters),
				customTelemetryTags: deepCopy(node.value.customTelemetryTags ?? {})
			};
		});
		const showNoParametersNotice = computed(() => parametersByTab.value.params.filter((item) => item.type !== "notice").length === 0);
		const hasParameterIssues = computed(() => {
			if (!nodeTypeDescription.value || !node.value) return false;
			const parameterIssues = getNodeParametersIssues(nodeTypeDescription.value.properties, node.value, nodeTypeDescription.value);
			return parameterIssues !== null && Object.keys(parameterIssues.parameters ?? {}).length > 0;
		});
		const hasCredentialIssues = computed(() => {
			if (!nodeTypeDescription.value || !node.value) return false;
			const credentialIssues = nodeHelpers.getNodeIssues(nodeTypeDescription.value, node.value, { getNode: () => node.value }, [
				"parameters",
				"typeUnknown",
				"input"
			]);
			return Object.keys(credentialIssues?.credentials ?? {}).length > 0;
		});
		const toolWorkflowDocumentId = createWorkflowDocumentId("node-tool-workflow");
		const toolWorkflowStore = useWorkflowDocumentStore(toolWorkflowDocumentId);
		const toolNdvStore = useNDVStore(toolWorkflowDocumentId);
		const workflowDocumentStore = computed(() => toolWorkflowStore);
		watch(node, (currentNode) => {
			if (currentNode) {
				toolWorkflowStore.setNodes([currentNode]);
				if (props.syncNodeToNdv) toolNdvStore.setActiveNodeName(currentNode.name, "other");
			}
		}, { immediate: true });
		const expressionResolveCtx = computed(() => {
			if (!node.value) return void 0;
			return {
				localResolve: true,
				envVars: environmentsStore.variablesAsObject,
				nodeName: node.value.name,
				additionalKeys: {},
				inputNode: void 0
			};
		});
		const agentCredentialsLoaded = ref(false);
		const hasUnavailableAgentCredential = computed(() => {
			if (!props.forAgent || !agentCredentialsLoaded.value) return false;
			return Object.values(node.value?.credentials ?? {}).some((credential) => credential.id && !credentialsStore.getUsableCredentialById(credential.id));
		});
		const isValid = computed(() => {
			return node.value?.name && !hasParameterIssues.value && !hasCredentialIssues.value && !hasUnavailableAgentCredential.value;
		});
		provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
		provide(WorkflowDocumentStoreKey, workflowDocumentStore);
		provide(ChatHubToolContextKey, true);
		function makeUniqueName(baseName, existingNames) {
			if (!existingNames.includes(baseName)) return baseName;
			let counter = 1;
			while (existingNames.includes(`${baseName} (${counter})`)) counter++;
			return `${baseName} (${counter})`;
		}
		function handleChangeParameter(updateData) {
			if (!node.value) return;
			const nodeType = nodeTypeDescription.value;
			if (!nodeType) {
				const newParameters = deepCopy(node.value.parameters);
				setParameterValue(newParameters, updateData.name, updateData.value);
				node.value = {
					...node.value,
					parameters: newParameters
				};
				return;
			}
			let parameters = getNodeParameters(nodeType.properties, node.value.parameters, false, false, node.value, nodeType) ?? {};
			parameters = deepCopy(parameters);
			setParameterValue(parameters, updateData.name, updateData.value);
			if (updateData.value !== void 0) removeMismatchedOptionValues(nodeType, node.value.typeVersion, parameters, {
				name: updateData.name,
				value: null
			});
			parameters = resetValuesOfChangedShape(nodeType, node.value, parameters, [updateData.name]);
			const newParameters = getNodeParameters(nodeType.properties, parameters, true, false, node.value, nodeType) ?? parameters;
			node.value = {
				...node.value,
				parameters: newParameters
			};
		}
		function handleChangeSettingsValue(updateData) {
			if (!node.value) return;
			if (updateData.name.startsWith("parameters.")) {
				const paramName = updateData.name.slice(11);
				const newParameters = deepCopy(node.value.parameters);
				setParameterValue(newParameters, paramName, updateData.value);
				node.value = {
					...node.value,
					parameters: newParameters
				};
			} else if (updateData.name.includes(".") || updateData.name.includes("[")) {
				const newNode = deepCopy(node.value);
				setParameterValue(newNode, updateData.name, updateData.value);
				if (newNode.customTelemetryTags?.tag?.length === 0) newNode.customTelemetryTags = {};
				node.value = newNode;
			} else node.value = {
				...node.value,
				[updateData.name]: updateData.value
			};
		}
		function handleChangeCredential(updateData) {
			if (node.value) node.value = {
				...node.value,
				...updateData.properties
			};
		}
		provide(ToolConfigCredentialSelectedKey, handleChangeCredential);
		function handleChangeName(name) {
			if (node.value) {
				userEditedName.value = true;
				node.value = {
					...node.value,
					name
				};
			}
		}
		watch(() => props.initialNode, (initialNode) => {
			if (initialNode) {
				const uniqueName = makeUniqueName(initialNode.name, existingToolNames.value);
				let nodeData = uniqueName !== initialNode.name ? {
					...initialNode,
					name: uniqueName
				} : initialNode;
				if (nodeTypeDescription.value) {
					const defaultParameters = getNodeParameters(nodeTypeDescription.value.properties ?? [], nodeData.parameters ?? {}, true, false, nodeData, nodeTypeDescription.value);
					nodeData = {
						...nodeData,
						parameters: defaultParameters ?? {}
					};
					const nameForCheck = nodeData.name.replace(/ \(\d+\)$/, "");
					userEditedName.value = !(isDefaultNodeName(nameForCheck, nodeTypeDescription.value, nodeData.parameters) || nameForCheck === nodeTypeDescription.value.displayName);
					if (!userEditedName.value) {
						const newName = makeNodeName(nodeData.parameters ?? {}, nodeTypeDescription.value);
						if (newName && newName !== nameForCheck) nodeData = {
							...nodeData,
							name: makeUniqueName(newName, existingToolNames.value)
						};
					}
				}
				node.value = nodeData;
			} else {
				node.value = initialNode;
				userEditedName.value = false;
			}
		}, { immediate: true });
		watch(() => [node.value?.parameters?.resource, node.value?.parameters?.operation], () => {
			if (userEditedName.value || !node.value || !nodeTypeDescription.value) return;
			const newName = makeNodeName(node.value.parameters, nodeTypeDescription.value);
			if (newName) {
				const uniqueName = makeUniqueName(newName, existingToolNames.value);
				if (uniqueName !== node.value.name) node.value = {
					...node.value,
					name: uniqueName
				};
			}
		});
		watch(isValid, (val) => {
			emit("update:valid", !!val);
		});
		watch(node, (updatedNode) => {
			if (updatedNode) emit("update:node", updatedNode);
		}, { immediate: true });
		watch(() => node.value?.name, (name) => {
			if (name) emit("update:node-name", name);
		});
		onMounted(async () => {
			emit("update:valid", !!isValid.value);
			if (node.value?.name) emit("update:node-name", node.value.name);
			if (props.projectId) await projectsStore.fetchAndSetProject(props.projectId);
			else {
				if (!projectsStore.personalProject) await projectsStore.getPersonalProject();
				if (projectsStore.personalProject) projectsStore.setCurrentProject(projectsStore.personalProject);
			}
			const projectId = credentialProjectId.value;
			if (projectId) {
				await Promise.all([credentialsStore.fetchCredentialTypes(false), credentialsStore.fetchUsableCredentials({
					projectId,
					...props.forAgent ? { forAgent: true } : {}
				})]);
				agentCredentialsLoaded.value = true;
			}
		});
		onBeforeUnmount(() => {
			projectsStore.setCurrentProject(null);
			const documentStore = workflowDocumentStore.value;
			disposeNDVStore(toolNdvStore);
			disposeWorkflowDocumentStore(documentStore);
		});
		__expose({
			node,
			isValid,
			nodeTypeDescription,
			handleChangeName
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [tabOptions.value.length > 1 ? (openBlock(), createBlock(unref(Tabs_default), {
				key: 0,
				"model-value": activeTab.value,
				options: tabOptions.value,
				class: normalizeClass(_ctx.$style.tabs),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event)
			}, null, 8, [
				"model-value",
				"options",
				"class"
			])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabContent) }, [withDirectives(createBaseVNode("div", null, [node.value ? (openBlock(), createBlock(ParameterInputList_default, {
				key: 0,
				parameters: parametersByTab.value.params,
				"hide-delete": true,
				"node-values": node.value.parameters,
				"is-read-only": props.readOnly,
				node: node.value,
				"parameter-issues": props.parameterIssues,
				"from-ai-disabled-parameters": props.fromAiDisabledParameters,
				onValueChanged: handleChangeParameter
			}, {
				default: withCtx(() => [createVNode(NodeCredentials_default, {
					node: node.value,
					readonly: props.readOnly,
					"show-all": true,
					"project-id": credentialProjectId.value,
					"for-agent": props.forAgent,
					"hide-issues": false,
					"hide-ask-assistant": props.hideAskAssistant,
					"skip-credentials-fetch": true,
					onCredentialSelected: handleChangeCredential,
					onValueChanged: handleChangeParameter
				}, null, 8, [
					"node",
					"readonly",
					"project-id",
					"for-agent",
					"hide-ask-assistant"
				]), _ctx.$slots.commonSettings ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.commonSettings)
				}, [renderSlot(_ctx.$slots, "commonSettings")], 2)) : createCommentVNode("", true)]),
				_: 3
			}, 8, [
				"parameters",
				"node-values",
				"is-read-only",
				"node",
				"parameter-issues",
				"from-ai-disabled-parameters"
			])) : createCommentVNode("", true), showNoParametersNotice.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.noParameters)
			}, [createVNode(unref(N8nText_default), null, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeSettings.thisNodeDoesNotHaveAnyParameters")), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true)], 512), [[vShow, activeTab.value === "params"]]), withDirectives(createBaseVNode("div", null, [node.value && parametersByTab.value.settings.length > 0 ? (openBlock(), createBlock(ParameterInputList_default, {
				key: 0,
				parameters: parametersByTab.value.settings,
				"node-values": settingsNodeValues.value,
				"is-read-only": props.readOnly,
				"hide-delete": true,
				path: "parameters",
				node: node.value,
				onValueChanged: handleChangeSettingsValue
			}, null, 8, [
				"parameters",
				"node-values",
				"is-read-only",
				"node"
			])) : createCommentVNode("", true), node.value ? (openBlock(), createBlock(ParameterInputList_default, {
				key: 1,
				parameters: nodeSettings.value,
				"hide-delete": true,
				"node-values": settingsNodeValues.value,
				"is-read-only": props.readOnly,
				path: "",
				node: node.value,
				onValueChanged: handleChangeSettingsValue
			}, null, 8, [
				"parameters",
				"node-values",
				"is-read-only",
				"node"
			])) : createCommentVNode("", true)], 512), [[vShow, activeTab.value === "settings"]])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1qjwu_1",
	tabs: "_tabs_1qjwu_9",
	tabContent: "_tabContent_1qjwu_15",
	noParameters: "_noParameters_1qjwu_22",
	commonSettings: "_commonSettings_1qjwu_26"
} }]]);
//#endregion
export { NodeToolSettingsContent_default as t };
