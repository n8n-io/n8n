import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Eo as require_get, Gd as createTextVNode, Hd as createElementBlock, Id as Suspense, If as isRef, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Oa as v4, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _ as draggableComponent, _p as normalizeClass, af as onBeforeMount, cd as refDebounced, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $d as injectWorkflowDocumentStore, En as useCollectionOverhaul, Gj as SectionHeader_default, Ik as deepCopy, Kp as injectNDVStore, MM as N8nCollapsiblePanel_default, Ok as isINodePropertyCollectionList, SN as _plugin_vue_export_helper_default, Sn as ParameterInputList_default, XM as N8nActionDropdown_default, _N as N8nText_default, _r as useResolvedExpression, dd as useNodeHelpers, fN as N8nTooltip_default, gM as N8nInputLabel_default, jN as useI18n, mM as N8nOption_default, oM as N8nHeaderAction_default, p as telemetry, pM as N8nSelect_default, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/ndv/parameters/components/FixedCollection/FixedCollectionParameterLegacy.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_get = /* @__PURE__ */ __toESM(require_get(), 1);
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var _hoisted_1$2 = ["data-test-id"];
var _hoisted_2 = { key: 1 };
var _hoisted_3 = { class: "optional-value-item" };
var _hoisted_4 = { class: "optional-value-item" };
var FixedCollectionParameterLegacy_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "FixedCollectionParameterLegacy",
	props: {
		nodeValues: {},
		parameter: {},
		path: {},
		values: { default: () => ({}) },
		isReadOnly: {
			type: Boolean,
			default: false
		},
		isNested: { type: Boolean },
		hiddenIssuesInputs: { default: () => [] }
	},
	emits: ["valueChanged"],
	setup(__props, { emit: __emit }) {
		const locale = useI18n();
		const nodeHelpers = useNodeHelpers();
		const props = __props;
		const emit = __emit;
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const ndvStore = injectNDVStore();
		const activeNode = computed(() => ndvStore.value.activeNode);
		const mutableValues = ref({});
		const selectedOption = ref(null);
		const getOptionProperties = (optionName) => {
			if (!isINodePropertyCollectionList(props.parameter.options)) return void 0;
			return props.parameter.options.find((option) => option.name === optionName);
		};
		const getPropertyPath = (name, index) => {
			return `${props.path}.${name}${index !== void 0 ? `[${index}]` : ""}`;
		};
		const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);
		const hideEmptyMessage = computed(() => !props.parameter.typeOptions?.hideEmptyMessage);
		const sortable = computed(() => !!props.parameter.typeOptions?.sortable);
		const layout = computed(() => props.parameter.typeOptions?.fixedCollection?.layout);
		const getPlaceholderText = computed(() => {
			return locale.nodeText(activeNode.value?.type).placeholder(props.parameter, props.path) || locale.baseText("fixedCollectionParameter.choose");
		});
		const propertyNames = computed(() => new Set(Object.keys(mutableValues.value || {})));
		const getProperties = computed(() => {
			const properties = [];
			for (const name of propertyNames.value) {
				const prop = getOptionProperties(name);
				if (prop) properties.push(prop);
			}
			return properties;
		});
		const addedOptionalValues = ref(/* @__PURE__ */ new Map());
		const parameterOptions = computed(() => {
			if (!isINodePropertyCollectionList(props.parameter.options)) return [];
			if (multipleValues.value) return props.parameter.options;
			return props.parameter.options.filter((option) => !propertyNames.value.has(option.name));
		});
		const hideOptionalFields = computed(() => {
			return !!props.parameter.typeOptions?.hideOptionalFields;
		});
		const addOptionalFieldButtonText = computed(() => {
			if (!props.parameter.typeOptions?.addOptionalFieldButtonText) return locale.baseText("fixedCollectionParameter.addField");
			return locale.nodeText(activeNode.value?.type).addOptionalFieldButtonText(props.parameter);
		});
		const getOptionalValuesKey = (propertyName, index) => {
			return index !== void 0 ? `${propertyName}-${index}` : propertyName;
		};
		const hasNonDefaultValue = (propertyDef, itemValues) => {
			if (!itemValues) return false;
			const value = itemValues[propertyDef.name];
			if (value === void 0 || value === null) return false;
			if (typeof value === "string" && value === "") return false;
			if (typeof value === "object") return !(0, import_isEqual.default)(value, propertyDef.default);
			return value !== propertyDef.default;
		};
		const initializeAddedOptionalValues = () => {
			if (!hideOptionalFields.value) return;
			if (!isINodePropertyCollectionList(props.parameter.options)) return;
			addedOptionalValues.value.clear();
			for (const property of props.parameter.options) {
				const propertyPath = `${props.path}.${property.name}`;
				const propertyValues = (0, import_get.default)(props.nodeValues, propertyPath);
				if (!propertyValues) continue;
				const optionalValueDefs = property.values.filter((v) => v.required !== true && v.type !== "notice");
				if (multipleValues.value && Array.isArray(propertyValues)) propertyValues.forEach((itemValues, index) => {
					const key = getOptionalValuesKey(property.name, index);
					const addedValues = /* @__PURE__ */ new Set();
					for (const valueDef of optionalValueDefs) if (hasNonDefaultValue(valueDef, itemValues)) addedValues.add(valueDef.name);
					if (addedValues.size > 0) addedOptionalValues.value.set(key, addedValues);
				});
				else if (typeof propertyValues === "object" && !Array.isArray(propertyValues)) {
					const key = getOptionalValuesKey(property.name);
					const addedValues = /* @__PURE__ */ new Set();
					for (const valueDef of optionalValueDefs) if (hasNonDefaultValue(valueDef, propertyValues)) addedValues.add(valueDef.name);
					if (addedValues.size > 0) addedOptionalValues.value.set(key, addedValues);
				}
			}
		};
		const isOptionalValueAdded = (propertyName, valueName, index) => {
			const key = getOptionalValuesKey(propertyName, index);
			return addedOptionalValues.value.get(key)?.has(valueName) ?? false;
		};
		const getVisiblePropertyValues = (property, index) => {
			if (!hideOptionalFields.value) return property.values;
			const key = getOptionalValuesKey(property.name, index);
			const addedValues = addedOptionalValues.value.get(key);
			return property.values.filter((value) => {
				if (value.required === true) return true;
				if (value.type === "notice") return true;
				if (addedValues?.has(value.name)) return true;
				if (value.typeOptions?.showEvenWhenOptional) return true;
				return false;
			});
		};
		const getPickerPropertyValues = (property, index) => {
			if (!hideOptionalFields.value) return [];
			const itemPath = getPropertyPath(property.name, index);
			return property.values.filter((value) => {
				if (value.required === true) return false;
				if (value.type === "notice") return false;
				if (value.typeOptions?.showEvenWhenOptional) return false;
				return nodeHelpers.displayParameter(props.nodeValues, value, itemPath, activeNode.value);
			});
		};
		const toggleOptionalValue = (property, valueName, index) => {
			const key = getOptionalValuesKey(property.name, index);
			let valueSet = addedOptionalValues.value.get(key);
			if (!valueSet) {
				valueSet = /* @__PURE__ */ new Set();
				addedOptionalValues.value.set(key, valueSet);
			}
			const valueDef = property.values.find((v) => v.name === valueName);
			if (!valueDef) return;
			const isCurrentlyAdded = valueSet.has(valueName);
			if (isCurrentlyAdded) valueSet.delete(valueName);
			else valueSet.add(valueName);
			addedOptionalValues.value.set(key, valueSet);
			const path = getPropertyPath(property.name, index) + `.${valueName}`;
			emit("valueChanged", {
				name: path,
				value: isCurrentlyAdded ? void 0 : deepCopy(valueDef.default)
			});
		};
		watch(() => props.values, (newValues) => {
			mutableValues.value = deepCopy(newValues);
		}, { deep: true });
		onBeforeMount(() => {
			mutableValues.value = deepCopy(props.values);
			initializeAddedOptionalValues();
		});
		const deleteOption = (optionName, index) => {
			const currentOptionsOfSameType = mutableValues.value[optionName];
			if (!currentOptionsOfSameType || Array.isArray(currentOptionsOfSameType) && currentOptionsOfSameType.length > 1) emit("valueChanged", {
				name: getPropertyPath(optionName, index),
				value: void 0
			});
			else if (!multipleValues.value && props.isNested) {
				const pathParts = props.path.split(".");
				const parentPath = pathParts.slice(0, -1).join(".");
				const parentPropertyName = pathParts[pathParts.length - 1];
				emit("valueChanged", {
					name: parentPath ? `${parentPath}.${parentPropertyName}` : parentPropertyName,
					value: void 0
				});
			} else emit("valueChanged", {
				name: getPropertyPath(optionName),
				value: void 0
			});
		};
		const initializeParameterValue = (optionParameter) => {
			if (!(optionParameter.typeOptions?.multipleValues === true)) return deepCopy(optionParameter.default);
			if (optionParameter.type === "fixedCollection") return {};
			const existingArray = (0, import_get.default)(props.nodeValues, [props.path, optionParameter.name], []);
			const defaultValue = optionParameter.default;
			const newItems = Array.isArray(defaultValue) ? deepCopy(defaultValue) : defaultValue !== "" && typeof defaultValue !== "object" ? [deepCopy(defaultValue)] : [];
			return existingArray.concat(newItems);
		};
		const optionSelected = async (optionName) => {
			const option = getOptionProperties(optionName);
			if (!option) return;
			const name = `${props.path}.${option.name}`;
			const newParameterValue = option.values.reduce((acc, optionParameter) => {
				acc[optionParameter.name] = initializeParameterValue(optionParameter);
				return acc;
			}, {});
			const existingValues = (0, import_get.default)(props.nodeValues, name, []);
			const newValue = multipleValues.value ? [...existingValues, newParameterValue] : newParameterValue;
			emit("valueChanged", {
				name,
				value: newValue
			});
			selectedOption.value = void 0;
		};
		const onAddButtonClick = async (optionName) => {
			await optionSelected(optionName);
			if (props.parameter.name === "workflowInputs") trackWorkflowInputFieldAdded();
		};
		const valueChanged = (parameterData) => {
			emit("valueChanged", parameterData);
			if (props.parameter.name === "workflowInputs") trackWorkflowInputFieldTypeChange(parameterData);
		};
		const onDragChange = (optionName) => {
			const parameterData = {
				name: getPropertyPath(optionName),
				value: mutableValues.value[optionName],
				type: "optionsOrderChanged"
			};
			emit("valueChanged", parameterData);
		};
		const trackWorkflowInputFieldTypeChange = (parameterData) => {
			telemetry.track("User changed workflow input field type", {
				type: parameterData.value,
				workflow_id: workflowDocumentStore.value.workflowId,
				node_id: ndvStore.value.activeNode?.id
			});
		};
		const trackWorkflowInputFieldAdded = () => {
			telemetry.track("User added workflow input field", {
				workflow_id: workflowDocumentStore.value.workflowId,
				node_id: ndvStore.value.activeNode?.id
			});
		};
		function getItemKey(_item, index) {
			return index;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.fixedCollectionParameter),
				"data-test-id": `fixed-collection-${props.parameter?.name}`,
				onKeydown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
			}, [
				getProperties.value.length === 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.noItemsExist)
				}, [hideEmptyMessage.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("fixedCollectionParameter.currentlyNoItemsExist")), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
				(openBlock(true), createElementBlock(Fragment, null, renderList(getProperties.value, (property) => {
					return openBlock(), createElementBlock("div", {
						key: property.name,
						class: normalizeClass(_ctx.$style.fixedCollectionParameterProperty)
					}, [property.displayName !== "" && __props.parameter.options && __props.parameter.options.length !== 1 ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
						key: 0,
						label: unref(locale).nodeText(activeNode.value?.type).inputLabelDisplayName(property, __props.path),
						underline: true,
						size: "small",
						color: "text-dark"
					}, null, 8, ["label"])) : createCommentVNode("", true), multipleValues.value ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(draggableComponent), {
						modelValue: mutableValues.value[property.name],
						"onUpdate:modelValue": ($event) => mutableValues.value[property.name] = $event,
						handle: ".drag-handle",
						"item-key": getItemKey,
						"drag-class": _ctx.$style.dragging,
						"ghost-class": _ctx.$style.ghost,
						"chosen-class": _ctx.$style.chosen,
						onChange: ($event) => onDragChange(property.name)
					}, {
						item: withCtx(({ index }) => [layout.value === "inline" ? (openBlock(), createElementBlock("div", {
							key: "inline-" + property.name + "-" + index,
							class: normalizeClass(_ctx.$style.inlineItem)
						}, [createVNode(ParameterInputList_default, {
							parameters: getVisiblePropertyValues(property, index),
							"node-values": __props.nodeValues,
							path: getPropertyPath(property.name, index),
							"is-read-only": __props.isReadOnly,
							"is-nested": __props.isNested,
							"hide-delete": true,
							layout: "inline",
							"hidden-issues-inputs": __props.hiddenIssuesInputs,
							onValueChanged: valueChanged
						}, null, 8, [
							"parameters",
							"node-values",
							"path",
							"is-read-only",
							"is-nested",
							"hidden-issues-inputs"
						]), !__props.isReadOnly ? (openBlock(), createBlock(unref(N8nIconButton_default), {
							key: 0,
							icon: "x",
							variant: "ghost",
							size: "small",
							"data-test-id": "fixed-collection-delete-inline",
							onClick: ($event) => deleteOption(property.name, index)
						}, null, 8, ["onClick"])) : createCommentVNode("", true)], 2)) : (openBlock(), createElementBlock("div", {
							key: property.name + "-" + index,
							class: normalizeClass(_ctx.$style.parameterItem)
						}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.parameterItemWrapper, { [_ctx.$style.borderTopDashed]: index }]) }, [
							!__props.isReadOnly ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass([_ctx.$style.iconButton, _ctx.$style.defaultTopPadding])
							}, [sortable.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
								key: 0,
								variant: "ghost",
								size: "small",
								icon: "grip-vertical",
								title: unref(locale).baseText("fixedCollectionParameter.dragItem"),
								class: "drag-handle"
							}, null, 8, ["title"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
							!__props.isReadOnly ? (openBlock(), createElementBlock("div", {
								key: 1,
								class: normalizeClass([_ctx.$style.iconButton, _ctx.$style.extraTopPadding])
							}, [createVNode(unref(N8nIconButton_default), {
								variant: "ghost",
								size: "small",
								icon: "trash-2",
								"data-test-id": "fixed-collection-delete",
								title: unref(locale).baseText("fixedCollectionParameter.deleteItem"),
								onClick: ($event) => deleteOption(property.name, index)
							}, null, 8, ["title", "onClick"])], 2)) : createCommentVNode("", true),
							(openBlock(), createBlock(Suspense, null, {
								default: withCtx(() => [createVNode(ParameterInputList_default, {
									parameters: getVisiblePropertyValues(property, index),
									"node-values": __props.nodeValues,
									path: getPropertyPath(property.name, index),
									"is-read-only": __props.isReadOnly,
									"is-nested": __props.isNested,
									"hide-delete": true,
									"hidden-issues-inputs": __props.hiddenIssuesInputs,
									onValueChanged: valueChanged
								}, null, 8, [
									"parameters",
									"node-values",
									"path",
									"is-read-only",
									"is-nested",
									"hidden-issues-inputs"
								])]),
								_: 2
							}, 1024)),
							getPickerPropertyValues(property, index).length > 0 && !__props.isReadOnly ? (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass(_ctx.$style.addOption),
								"data-test-id": "fixed-collection-add-property"
							}, [createVNode(unref(N8nSelect_default), {
								placeholder: addOptionalFieldButtonText.value,
								size: "small",
								filterable: "",
								"model-value": null,
								"onUpdate:modelValue": (valueName) => toggleOptionalValue(property, valueName, index)
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(getPickerPropertyValues(property, index), (value) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: value.name,
										label: value.displayName || value.name,
										value: value.name
									}, {
										default: withCtx(() => [createBaseVNode("div", _hoisted_3, [createBaseVNode("span", null, toDisplayString(value.displayName || value.name), 1), isOptionalValueAdded(property.name, value.name, index) ? (openBlock(), createBlock(unref(N8nIcon_default), {
											key: 0,
											icon: "check",
											size: "medium"
										})) : createCommentVNode("", true)])]),
										_: 2
									}, 1032, ["label", "value"]);
								}), 128))]),
								_: 2
							}, 1032, ["placeholder", "onUpdate:modelValue"])], 2)) : createCommentVNode("", true)
						], 2)], 2))]),
						_: 2
					}, 1032, [
						"modelValue",
						"onUpdate:modelValue",
						"drag-class",
						"ghost-class",
						"chosen-class",
						"onChange"
					])])) : layout.value === "inline" ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.inlineItem)
					}, [createVNode(ParameterInputList_default, {
						parameters: getVisiblePropertyValues(property),
						"node-values": __props.nodeValues,
						path: getPropertyPath(property.name),
						"is-read-only": __props.isReadOnly,
						"is-nested": __props.isNested,
						"hide-delete": true,
						layout: "inline",
						"hidden-issues-inputs": __props.hiddenIssuesInputs,
						onValueChanged: valueChanged
					}, null, 8, [
						"parameters",
						"node-values",
						"path",
						"is-read-only",
						"is-nested",
						"hidden-issues-inputs"
					])], 2)) : (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.parameterItem)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.parameterItemWrapper) }, [
						!__props.isReadOnly ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.iconButton)
						}, [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							size: "small",
							icon: "trash-2",
							"data-test-id": "fixed-collection-delete",
							title: unref(locale).baseText("fixedCollectionParameter.deleteItem"),
							onClick: ($event) => deleteOption(property.name)
						}, null, 8, ["title", "onClick"])], 2)) : createCommentVNode("", true),
						createVNode(ParameterInputList_default, {
							parameters: getVisiblePropertyValues(property),
							"node-values": __props.nodeValues,
							path: getPropertyPath(property.name),
							"is-read-only": __props.isReadOnly,
							"is-nested": __props.isNested,
							"hide-delete": true,
							class: normalizeClass(_ctx.$style.parameterItem),
							"hidden-issues-inputs": __props.hiddenIssuesInputs,
							onValueChanged: valueChanged
						}, null, 8, [
							"parameters",
							"node-values",
							"path",
							"is-read-only",
							"is-nested",
							"class",
							"hidden-issues-inputs"
						]),
						getPickerPropertyValues(property).length > 0 && !__props.isReadOnly ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.addOption),
							"data-test-id": "fixed-collection-add-property"
						}, [createVNode(unref(N8nSelect_default), {
							placeholder: addOptionalFieldButtonText.value,
							size: "small",
							filterable: "",
							"model-value": null,
							"onUpdate:modelValue": (valueName) => toggleOptionalValue(property, valueName)
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(getPickerPropertyValues(property), (value) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: value.name,
									label: value.displayName || value.name,
									value: value.name
								}, {
									default: withCtx(() => [createBaseVNode("div", _hoisted_4, [createBaseVNode("span", null, toDisplayString(value.displayName || value.name), 1), isOptionalValueAdded(property.name, value.name) ? (openBlock(), createBlock(unref(N8nIcon_default), {
										key: 0,
										icon: "check",
										size: "medium"
									})) : createCommentVNode("", true)])]),
									_: 2
								}, 1032, ["label", "value"]);
							}), 128))]),
							_: 2
						}, 1032, ["placeholder", "onUpdate:modelValue"])], 2)) : createCommentVNode("", true)
					], 2)], 2))], 2);
				}), 128)),
				parameterOptions.value.length > 0 && !__props.isReadOnly ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.controls)
				}, [__props.parameter.options && __props.parameter.options.length === 1 ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					style: { "width": "100%" },
					variant: "outline",
					size: "small",
					"data-test-id": "fixed-collection-add",
					label: getPlaceholderText.value,
					onClick: _cache[0] || (_cache[0] = ($event) => onAddButtonClick(__props.parameter.options[0].name))
				}, null, 8, ["label"])) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.addOption)
				}, [createVNode(unref(N8nSelect_default), {
					modelValue: selectedOption.value,
					"onUpdate:modelValue": [_cache[1] || (_cache[1] = ($event) => selectedOption.value = $event), optionSelected],
					placeholder: getPlaceholderText.value,
					size: "small",
					filterable: ""
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(parameterOptions.value, (item) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: item.name,
							label: unref(locale).nodeText(activeNode.value?.type).collectionOptionDisplayName(__props.parameter, item, __props.path),
							value: item.name
						}, null, 8, ["label", "value"]);
					}), 128))]),
					_: 1
				}, 8, ["modelValue", "placeholder"])], 2))], 2)) : createCommentVNode("", true)
			], 42, _hoisted_1$2);
		};
	}
}), [["__cssModules", { "$style": {
	inlineItem: "_inlineItem_17fqx_1",
	fixedCollectionParameter: "_fixedCollectionParameter_17fqx_18",
	ghost: "_ghost_17fqx_21",
	dragging: "_dragging_17fqx_22",
	parameterItemWrapper: "_parameterItemWrapper_17fqx_34",
	controls: "_controls_17fqx_37",
	active: "_active_17fqx_52",
	fixedCollectionParameterProperty: "_fixedCollectionParameterProperty_17fqx_56",
	iconButton: "_iconButton_17fqx_61",
	parameterItem: "_parameterItem_17fqx_34",
	defaultTopPadding: "_defaultTopPadding_17fqx_78",
	extraTopPadding: "_extraTopPadding_17fqx_81",
	borderTopDashed: "_borderTopDashed_17fqx_91",
	noItemsExist: "_noItemsExist_17fqx_95",
	addOption: "_addOption_17fqx_99"
} }]]);
//#endregion
//#region src/app/composables/useFixedCollectionItemState.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Composable to manage state for fixed collection items
* Tracks item IDs, stable indexes, and expanded states
* Uses stable indexes for persistence to survive component remounts
* @param key - Storage key for scoping state (should be nodeId + parameterPath)
*/
function useFixedCollectionItemState(key, { defaultWrapperExpanded = false } = {}) {
	const storageKey = toValue(key);
	const expandedStorageKey = `n8n-fixed-collection-expanded-${storageKey}`;
	const wrapperStorageKey = `n8n-fixed-collection-wrapper-${storageKey}`;
	const stableIndexesStorageKey = `n8n-fixed-collection-stable-indexes-${storageKey}`;
	const itemMetadata = ref({});
	const loadStableIndexes = () => {
		const stored = sessionStorage.getItem(stableIndexesStorageKey);
		if (!stored) return {};
		try {
			return JSON.parse(stored);
		} catch {
			return {};
		}
	};
	const saveStableIndexes = (indexes) => {
		sessionStorage.setItem(stableIndexesStorageKey, JSON.stringify(indexes));
	};
	const loadExpandedStableIndexes = () => {
		const stored = sessionStorage.getItem(expandedStorageKey);
		if (!stored) return /* @__PURE__ */ new Set();
		return new Set(stored.split(",").filter(Boolean));
	};
	const saveExpandedStableIndexes = (expandedKeys) => {
		sessionStorage.setItem(expandedStorageKey, Array.from(expandedKeys).join(","));
	};
	const expandedStableIndexes = ref(loadExpandedStableIndexes());
	const loadWrapperExpanded = () => {
		const stored = sessionStorage.getItem(wrapperStorageKey);
		return stored !== null ? stored === "true" : defaultWrapperExpanded;
	};
	const saveWrapperExpanded = (value) => {
		sessionStorage.setItem(wrapperStorageKey, String(value));
	};
	const wrapperExpanded = ref(loadWrapperExpanded());
	const getItemId = (propertyName, index) => {
		if (!itemMetadata.value[propertyName]) itemMetadata.value[propertyName] = [];
		if (!itemMetadata.value[propertyName][index]) {
			const propertyStableIndexes = loadStableIndexes()[propertyName] || [];
			let stableIndex;
			let isNewItem = false;
			if (propertyStableIndexes[index] !== void 0) stableIndex = propertyStableIndexes[index];
			else {
				const existingIndexes = itemMetadata.value[propertyName].map((item) => item?.stableIndex).filter((idx) => idx !== void 0);
				stableIndex = (existingIndexes.length > 0 ? Math.max(...existingIndexes) : -1) + 1;
				isNewItem = true;
			}
			itemMetadata.value[propertyName][index] = {
				id: v4(),
				stableIndex
			};
			if (isNewItem) {
				const allStableIndexes = loadStableIndexes();
				allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
				saveStableIndexes(allStableIndexes);
			}
		}
		return itemMetadata.value[propertyName][index].id;
	};
	const getItemStableIndex = (propertyName, index) => {
		if (!itemMetadata.value[propertyName]?.[index]) getItemId(propertyName, index);
		return itemMetadata.value[propertyName][index].stableIndex;
	};
	const getExpandedState = (propertyName, index) => {
		const expandedKey = `${propertyName}:${getItemStableIndex(propertyName, index)}`;
		return expandedStableIndexes.value.has(expandedKey);
	};
	const setExpandedState = (propertyName, index, value) => {
		const expandedKey = `${propertyName}:${getItemStableIndex(propertyName, index)}`;
		if (value) expandedStableIndexes.value.add(expandedKey);
		else expandedStableIndexes.value.delete(expandedKey);
		saveExpandedStableIndexes(expandedStableIndexes.value);
	};
	const initExpandedState = (propertyName, items, multipleValues) => {
		if (!itemMetadata.value[propertyName]) itemMetadata.value[propertyName] = [];
		if (multipleValues) items.forEach((_, index) => {
			getItemId(propertyName, index);
		});
	};
	const cleanupItem = (propertyName, index) => {
		if (itemMetadata.value[propertyName]) {
			const metadata = itemMetadata.value[propertyName][index];
			itemMetadata.value[propertyName].splice(index, 1);
			if (metadata?.stableIndex !== void 0) {
				const expandedKey = `${propertyName}:${metadata.stableIndex}`;
				expandedStableIndexes.value.delete(expandedKey);
				saveExpandedStableIndexes(expandedStableIndexes.value);
			}
			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};
	const cleanupProperty = (propertyName) => {
		if (itemMetadata.value[propertyName]) {
			itemMetadata.value[propertyName].map((item) => item.stableIndex).forEach((stableIndex) => {
				const expandedKey = `${propertyName}:${stableIndex}`;
				expandedStableIndexes.value.delete(expandedKey);
			});
			delete itemMetadata.value[propertyName];
		}
		const allStableIndexes = loadStableIndexes();
		delete allStableIndexes[propertyName];
		saveStableIndexes(allStableIndexes);
		saveExpandedStableIndexes(expandedStableIndexes.value);
	};
	const trimArrays = (propertyName, targetLength) => {
		if (itemMetadata.value[propertyName] && itemMetadata.value[propertyName].length > targetLength) {
			itemMetadata.value[propertyName] = itemMetadata.value[propertyName].slice(0, targetLength);
			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = itemMetadata.value[propertyName].map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};
	const reorderItems = (propertyName, oldIndex, newIndex) => {
		if (itemMetadata.value[propertyName]) {
			const metadata = [...itemMetadata.value[propertyName]];
			const [movedMetadata] = metadata.splice(oldIndex, 1);
			metadata.splice(newIndex, 0, movedMetadata);
			itemMetadata.value[propertyName] = metadata;
			const allStableIndexes = loadStableIndexes();
			allStableIndexes[propertyName] = metadata.map((m) => m.stableIndex);
			saveStableIndexes(allStableIndexes);
		}
	};
	watch(wrapperExpanded, (newValue) => {
		saveWrapperExpanded(newValue);
	});
	return {
		getItemId,
		getItemStableIndex,
		getExpandedState,
		setExpandedState,
		initExpandedState,
		cleanupItem,
		cleanupProperty,
		trimArrays,
		reorderItems,
		wrapperExpanded
	};
}
//#endregion
//#region src/features/ndv/parameters/components/FixedCollection/FixedCollectionItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["data-item-key"];
var FixedCollectionItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "FixedCollectionItem",
	props: {
		itemId: {},
		property: {},
		itemData: {},
		itemIndex: {},
		stableIndex: {},
		nodeValues: {},
		propertyPath: {},
		isReadOnly: { type: Boolean },
		isExpanded: { type: Boolean },
		sortable: { type: Boolean },
		disableAnimation: { type: Boolean },
		isDragging: { type: Boolean },
		titleTemplate: {},
		visiblePropertyValues: {},
		pickerPropertyValues: {},
		isOptionalValueAdded: { type: Function },
		addOptionalFieldButtonText: {},
		layout: {}
	},
	emits: [
		"update:isExpanded",
		"valueChanged",
		"delete",
		"toggleOptionalValue"
	],
	setup(__props, { emit: __emit }) {
		const locale = useI18n();
		const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();
		const props = __props;
		const emit = __emit;
		const hasOptionalFieldsToAdd = computed(() => props.pickerPropertyValues.length > 0 && !props.isReadOnly);
		const pickerDropdownItems = computed(() => props.pickerPropertyValues.map((value) => ({
			id: value.name,
			label: value.displayName || value.name,
			checked: props.isOptionalValueAdded(value.name)
		})));
		const defaultTitle = computed(() => `${props.property.displayName} ${props.stableIndex + 1}`);
		const { resolvedExpression } = useResolvedExpression({
			expression: () => props.titleTemplate ?? "",
			additionalData: () => ({ $collection: { item: {
				value: props.itemData,
				index: props.stableIndex,
				properties: props.property.values
			} } })
		});
		const isValidResolvedTitle = (resolved) => !!resolved && resolved !== "undefined" && resolved !== "null" && typeof resolved === "string";
		const itemTitle = computed(() => {
			if (!props.titleTemplate) return defaultTitle.value;
			const resolved = resolvedExpression.value;
			return isValidResolvedTitle(resolved) ? resolved : defaultTitle.value;
		});
		const handleValueChanged = (parameterData) => emit("valueChanged", parameterData);
		return (_ctx, _cache) => {
			return __props.layout === "inline" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.inlineItem),
				"data-item-key": __props.itemId
			}, [createVNode(ParameterInputList_default, {
				"hide-delete": "",
				"is-nested": "",
				layout: "inline",
				parameters: __props.visiblePropertyValues,
				"node-values": __props.nodeValues,
				path: __props.propertyPath,
				"is-read-only": __props.isReadOnly,
				"remove-first-parameter-margin": true,
				"remove-last-parameter-margin": true,
				onValueChanged: handleValueChanged
			}, null, 8, [
				"parameters",
				"node-values",
				"path",
				"is-read-only"
			]), !__props.isReadOnly ? (openBlock(), createBlock(unref(N8nIconButton_default), {
				key: 0,
				icon: "x",
				variant: "ghost",
				size: "small",
				"data-test-id": "fixed-collection-item-delete-inline",
				onClick: _cache[0] || (_cache[0] = ($event) => emit("delete"))
			})) : createCommentVNode("", true)], 10, _hoisted_1$1)) : (openBlock(), createBlock(unref(N8nCollapsiblePanel_default), {
				key: __props.itemId,
				"model-value": __props.isExpanded,
				title: itemTitle.value,
				"data-item-key": __props.itemId,
				"disable-animation": __props.disableAnimation,
				"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => emit("update:isExpanded", $event))
			}, createSlots({
				default: withCtx(() => [createVNode(ParameterInputList_default, {
					"hide-delete": "",
					"is-nested": "",
					parameters: __props.visiblePropertyValues,
					"node-values": __props.nodeValues,
					path: __props.propertyPath,
					"is-read-only": __props.isReadOnly,
					"remove-first-parameter-margin": unref(isCollectionOverhaulEnabled),
					"remove-last-parameter-margin": unref(isCollectionOverhaulEnabled),
					onValueChanged: handleValueChanged
				}, null, 8, [
					"parameters",
					"node-values",
					"path",
					"is-read-only",
					"remove-first-parameter-margin",
					"remove-last-parameter-margin"
				]), hasOptionalFieldsToAdd.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.addOption),
					"data-test-id": "fixed-collection-add-property"
				}, [createVNode(unref(N8nActionDropdown_default), {
					items: pickerDropdownItems.value,
					onSelect: _cache[2] || (_cache[2] = ($event) => emit("toggleOptionalValue", $event))
				}, {
					activator: withCtx(() => [createVNode(unref(N8nButton_default), {
						class: "n8n-button--highlightFill",
						variant: "outline",
						icon: "plus",
						size: "small",
						label: __props.addOptionalFieldButtonText
					}, null, 8, ["label"])]),
					_: 1
				}, 8, ["items"])], 2)) : createCommentVNode("", true)]),
				_: 2
			}, [!__props.isReadOnly ? {
				name: "actions",
				fn: withCtx(() => [createVNode(unref(N8nHeaderAction_default), {
					icon: "trash-2",
					label: unref(locale).baseText("fixedCollectionParameter.deleteItem"),
					tooltip: unref(locale).baseText("fixedCollectionParameter.deleteParameter", { interpolate: { parameter: itemTitle.value } }),
					danger: "",
					"test-id": "fixed-collection-item-delete",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("delete"))
				}, null, 8, ["label", "tooltip"]), __props.sortable ? (openBlock(), createBlock(unref(N8nHeaderAction_default), {
					key: 0,
					icon: "grip-vertical",
					label: unref(locale).baseText("fixedCollectionParameter.dragItem"),
					class: normalizeClass([
						"drag-handle",
						_ctx.$style.dragHandle,
						{ [_ctx.$style.dragging]: __props.isDragging }
					]),
					"test-id": "fixed-collection-item-drag"
				}, null, 8, ["label", "class"])) : createCommentVNode("", true)]),
				key: "0"
			} : void 0]), 1032, [
				"model-value",
				"title",
				"data-item-key",
				"disable-animation"
			]));
		};
	}
}), [["__cssModules", { "$style": {
	inlineItem: "_inlineItem_sj6y1_1",
	dragHandle: "_dragHandle_sj6y1_15",
	dragging: "_dragging_sj6y1_19",
	addOption: "_addOption_sj6y1_23"
} }]]);
//#endregion
//#region src/features/ndv/parameters/components/FixedCollection/FixedCollectionItemList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var DRAG_DEBOUNCE_MS = 400;
var FixedCollectionItemList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "FixedCollectionItemList",
	props: {
		property: {},
		values: {},
		nodeValues: {},
		getPropertyPath: { type: Function },
		itemState: {},
		isReadOnly: { type: Boolean },
		sortable: { type: Boolean },
		titleTemplate: {},
		getVisiblePropertyValues: { type: Function },
		getPickerPropertyValues: { type: Function },
		isOptionalValueAdded: { type: Function },
		addOptionalFieldButtonText: {},
		layout: {}
	},
	emits: [
		"valueChanged",
		"delete",
		"dragChange",
		"toggleOptionalValue"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const isDragging = ref(false);
		const disableAnimation = refDebounced(isDragging, computed(() => isDragging.value ? 0 : DRAG_DEBOUNCE_MS));
		const getItemKey = (item) => props.itemState.getItemId(props.property.name, props.values.findIndex((v) => v === item));
		const setDragging = (value) => {
			isDragging.value = value;
		};
		const onDragChange = (event) => emit("dragChange", props.property.name, event);
		const onValueChanged = (parameterData) => emit("valueChanged", parameterData);
		const onDelete = (index) => emit("delete", props.property.name, index);
		const onToggleOptionalValue = (index, valueName) => emit("toggleOptionalValue", props.property.name, valueName, index);
		const getIsOptionalValueAdded = (index) => (valueName) => props.isOptionalValueAdded(props.property.name, valueName, index);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(draggableComponent), {
				"model-value": __props.values,
				"item-key": getItemKey,
				handle: ".drag-handle",
				"drag-class": _ctx.$style.dragging,
				"ghost-class": _ctx.$style.ghost,
				onStart: _cache[0] || (_cache[0] = ($event) => setDragging(true)),
				onEnd: _cache[1] || (_cache[1] = ($event) => setDragging(false)),
				onChange: onDragChange
			}, {
				item: withCtx(({ index }) => [(openBlock(), createBlock(FixedCollectionItem_default, {
					key: __props.itemState.getItemId(__props.property.name, index),
					"item-id": __props.itemState.getItemId(__props.property.name, index),
					property: __props.property,
					"item-data": __props.values[index],
					"item-index": index,
					"stable-index": __props.itemState.getItemStableIndex(__props.property.name, index),
					"node-values": __props.nodeValues,
					"property-path": __props.getPropertyPath(__props.property.name, index),
					"is-read-only": __props.isReadOnly,
					"is-expanded": __props.itemState.getExpandedState(__props.property.name, index),
					"is-dragging": isDragging.value,
					sortable: __props.sortable,
					"disable-animation": unref(disableAnimation),
					"title-template": __props.titleTemplate,
					"visible-property-values": __props.getVisiblePropertyValues(__props.property, index),
					"picker-property-values": __props.getPickerPropertyValues(__props.property, index),
					"add-optional-field-button-text": __props.addOptionalFieldButtonText,
					"is-optional-value-added": getIsOptionalValueAdded(index),
					layout: __props.layout,
					"onUpdate:isExpanded": ($event) => __props.itemState.setExpandedState(__props.property.name, index, $event),
					onValueChanged,
					onDelete: ($event) => onDelete(index),
					onToggleOptionalValue: ($event) => onToggleOptionalValue(index, $event)
				}, null, 8, [
					"item-id",
					"property",
					"item-data",
					"item-index",
					"stable-index",
					"node-values",
					"property-path",
					"is-read-only",
					"is-expanded",
					"is-dragging",
					"sortable",
					"disable-animation",
					"title-template",
					"visible-property-values",
					"picker-property-values",
					"add-optional-field-button-text",
					"is-optional-value-added",
					"layout",
					"onUpdate:isExpanded",
					"onDelete",
					"onToggleOptionalValue"
				]))]),
				_: 1
			}, 8, [
				"model-value",
				"drag-class",
				"ghost-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	ghost: "_ghost_1p7pf_1",
	dragging: "_dragging_1p7pf_2"
} }]]);
//#endregion
//#region src/features/ndv/parameters/components/FixedCollection/FixedCollectionParameterNew.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var FixedCollectionParameterNew_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "FixedCollectionParameterNew",
	props: {
		nodeValues: {},
		parameter: {},
		path: {},
		values: { default: () => ({}) },
		isReadOnly: {
			type: Boolean,
			default: false
		},
		isNested: { type: Boolean },
		isNewlyAdded: {
			type: Boolean,
			default: false
		},
		canDelete: {
			type: Boolean,
			default: false
		},
		hiddenIssuesInputs: { default: () => [] }
	},
	emits: ["valueChanged", "delete"],
	setup(__props, { emit: __emit }) {
		const locale = useI18n();
		const ndvStore = injectNDVStore();
		const nodeHelpers = useNodeHelpers();
		const activeNode = computed(() => ndvStore.value.activeNode);
		const props = __props;
		const emit = __emit;
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const mutableValues = ref({});
		const rootEl = useTemplateRef("rootEl");
		const isDropdownOpen = ref(false);
		const addedOptionalValues = ref(/* @__PURE__ */ new Map());
		const storageKey = computed(() => `${activeNode.value?.id ?? "unknown"}-${props.path}`);
		const hasSingleItem = computed(() => {
			const entries = Object.entries(props.values);
			if (entries.length !== 1) return false;
			const [, items] = entries[0];
			if (Array.isArray(items)) return items.length === 1;
			return Object.keys(items).length > 0;
		});
		const itemState = useFixedCollectionItemState(storageKey, { defaultWrapperExpanded: props.isNewlyAdded || hasSingleItem.value });
		const isWrapperExpanded = itemState.wrapperExpanded;
		const getOptionProperties = (optionName) => {
			if (!isINodePropertyCollectionList(props.parameter.options)) return void 0;
			return props.parameter.options.find((option) => option.name === optionName);
		};
		const getPropertyPath = (name, index) => {
			return `${props.path}.${name}${index !== void 0 ? `[${index}]` : ""}`;
		};
		const isArrayValue = (propertyName) => {
			return Array.isArray(mutableValues.value[propertyName]);
		};
		const getArrayValues = (propertyName) => {
			const value = mutableValues.value[propertyName];
			return Array.isArray(value) ? value : [];
		};
		const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);
		const sortable = computed(() => !!props.parameter.typeOptions?.sortable);
		const layout = computed(() => props.parameter.typeOptions?.fixedCollection?.layout);
		const propertyNames = computed(() => new Set(Object.keys(mutableValues.value ?? {})));
		const properties = computed(() => Array.from(propertyNames.value).map(getOptionProperties).filter((prop) => prop !== void 0));
		const parameterOptions = computed(() => {
			if (!isINodePropertyCollectionList(props.parameter.options)) return [];
			if (multipleValues.value) return props.parameter.options;
			return props.parameter.options.filter((option) => !propertyNames.value.has(option.name));
		});
		const hideOptionalFields = computed(() => {
			return !!props.parameter.typeOptions?.hideOptionalFields;
		});
		const addOptionalFieldButtonText = computed(() => {
			if (!props.parameter.typeOptions?.addOptionalFieldButtonText) return locale.baseText("fixedCollectionParameter.addField");
			return locale.nodeText(activeNode.value?.type).addOptionalFieldButtonText(props.parameter);
		});
		const getOptionalValuesKey = (propertyName, index) => {
			if (index !== void 0) return `${propertyName}-${itemState.getItemStableIndex(propertyName, index)}`;
			return propertyName;
		};
		const hasNonDefaultValue = (propertyDef, itemValues) => {
			if (!itemValues) return false;
			const value = itemValues[propertyDef.name];
			if (value === void 0 || value === null) return false;
			if (typeof value === "string" && value === "") return false;
			if (typeof value === "object") return !(0, import_isEqual.default)(value, propertyDef.default);
			return value !== propertyDef.default;
		};
		const initializeAddedOptionalValues = () => {
			if (!hideOptionalFields.value) return;
			if (!isINodePropertyCollectionList(props.parameter.options)) return;
			addedOptionalValues.value.clear();
			for (const property of props.parameter.options) {
				const propertyPath = `${props.path}.${property.name}`;
				const propertyValues = (0, import_get.default)(props.nodeValues, propertyPath);
				if (!propertyValues) continue;
				const optionalValueDefs = property.values.filter((v) => v.required !== true && v.type !== "notice");
				if (multipleValues.value && Array.isArray(propertyValues)) propertyValues.forEach((itemValues, index) => {
					const key = getOptionalValuesKey(property.name, index);
					const addedValues = /* @__PURE__ */ new Set();
					for (const valueDef of optionalValueDefs) if (hasNonDefaultValue(valueDef, itemValues)) addedValues.add(valueDef.name);
					if (addedValues.size > 0) addedOptionalValues.value.set(key, addedValues);
				});
				else if (typeof propertyValues === "object" && !Array.isArray(propertyValues)) {
					const key = getOptionalValuesKey(property.name);
					const addedValues = /* @__PURE__ */ new Set();
					for (const valueDef of optionalValueDefs) if (hasNonDefaultValue(valueDef, propertyValues)) addedValues.add(valueDef.name);
					if (addedValues.size > 0) addedOptionalValues.value.set(key, addedValues);
				}
			}
		};
		const isOptionalValueAdded = (propertyName, valueName, index) => {
			const key = getOptionalValuesKey(propertyName, index);
			return addedOptionalValues.value.get(key)?.has(valueName) ?? false;
		};
		const getVisiblePropertyValues = (property, index) => {
			if (!hideOptionalFields.value) return property.values;
			const key = getOptionalValuesKey(property.name, index);
			const addedValues = addedOptionalValues.value.get(key);
			return property.values.filter((value) => {
				if (value.required === true) return true;
				if (value.type === "notice") return true;
				if (addedValues?.has(value.name)) return true;
				if (value.typeOptions?.showEvenWhenOptional) return true;
				return false;
			});
		};
		const getPickerPropertyValues = (property, index) => {
			if (!hideOptionalFields.value) return [];
			const itemPath = getPropertyPath(property.name, index);
			return property.values.filter((value) => {
				if (value.required === true) return false;
				if (value.type === "notice") return false;
				if (value.typeOptions?.showEvenWhenOptional) return false;
				return nodeHelpers.displayParameter(props.nodeValues, value, itemPath, activeNode.value);
			});
		};
		const toggleOptionalValue = (property, valueName, index) => {
			const key = getOptionalValuesKey(property.name, index);
			let valueSet = addedOptionalValues.value.get(key);
			if (!valueSet) {
				valueSet = /* @__PURE__ */ new Set();
				addedOptionalValues.value.set(key, valueSet);
			}
			const valueDef = property.values.find((v) => v.name === valueName);
			if (!valueDef) return;
			const isCurrentlyAdded = valueSet.has(valueName);
			if (isCurrentlyAdded) valueSet.delete(valueName);
			else valueSet.add(valueName);
			addedOptionalValues.value.set(key, valueSet);
			const path = getPropertyPath(property.name, index) + `.${valueName}`;
			emit("valueChanged", {
				name: path,
				value: isCurrentlyAdded ? void 0 : deepCopy(valueDef.default)
			});
		};
		const onToggleOptionalValue = (propertyName, valueName, index) => {
			const property = getOptionProperties(propertyName);
			if (property) toggleOptionalValue(property, valueName, index);
		};
		const displayName = computed(() => locale.nodeText(activeNode.value?.type).inputLabelDisplayName(props.parameter, props.path));
		const isAddDisabled = computed(() => parameterOptions.value.length === 0);
		const placeholder = computed(() => locale.nodeText(activeNode.value?.type).placeholder(props.parameter, props.path) || locale.baseText("fixedCollectionParameter.addItem"));
		const addTooltipText = computed(() => isAddDisabled.value ? locale.baseText("fixedCollectionParameter.allOptionsAdded") : locale.baseText("fixedCollectionParameter.addParameter", { interpolate: { parameter: displayName.value } }));
		const dropdownOptions = computed(() => parameterOptions.value.map((option) => ({
			id: option.name,
			label: locale.nodeText(activeNode.value?.type).collectionOptionDisplayName(props.parameter, option, props.path)
		})));
		const shouldShowSectionHeader = computed(() => !props.isNested && props.parameter.displayName !== "");
		const shouldWrapInCollapsible = computed(() => props.isNested);
		const shouldShowAddControl = computed(() => parameterOptions.value.length > 0 && !props.isReadOnly);
		const shouldShowAddInHeader = computed(() => shouldShowSectionHeader.value && !props.isReadOnly);
		const shouldShowAddAtBottom = computed(() => shouldShowAddControl.value && (shouldShowSectionHeader.value || shouldWrapInCollapsible.value && multipleValues.value));
		const shouldShowAddInCollapsibleActions = computed(() => shouldWrapInCollapsible.value && shouldShowAddControl.value);
		const isEmpty = computed(() => Object.values(mutableValues.value).every((value) => {
			if (Array.isArray(value)) return value.length === 0;
			return Object.keys(value).length === 0;
		}));
		const hasSingleOption = computed(() => dropdownOptions.value.length === 1);
		const hasMultipleOptions = computed(() => dropdownOptions.value.length > 1);
		const shouldDeleteEntireCollection = (optionName, index) => {
			if (index !== void 0) return false;
			const items = mutableValues.value[optionName];
			return !items || !Array.isArray(items) || items.length <= 1;
		};
		const getParentPath = () => {
			const pathParts = props.path.split(".");
			const parentPropertyName = pathParts.at(-1) ?? "";
			const parentPath = pathParts.slice(0, -1).join(".");
			return parentPath ? `${parentPath}.${parentPropertyName}` : parentPropertyName;
		};
		const getDeletionPath = (optionName, index) => {
			if (index !== void 0) return getPropertyPath(optionName, index);
			if (!multipleValues.value && props.isNested) return getParentPath();
			return getPropertyPath(optionName);
		};
		const handleDelete = (optionName, index) => {
			if (index !== void 0) itemState.cleanupItem(optionName, index);
			else if (shouldDeleteEntireCollection(optionName, index)) itemState.cleanupProperty(optionName);
			emit("valueChanged", {
				name: getDeletionPath(optionName, index),
				value: void 0
			});
		};
		const trackFieldAdded = () => {
			telemetry.track("User added workflow input field", {
				workflow_id: workflowDocumentStore.value.workflowId,
				node_id: ndvStore.value.activeNode?.id
			});
		};
		const trackFieldTypeChange = (parameterData) => {
			telemetry.track("User changed workflow input field type", {
				type: parameterData.value,
				workflow_id: workflowDocumentStore.value.workflowId,
				node_id: ndvStore.value.activeNode?.id
			});
		};
		const normalizeToArray = (items) => Array.isArray(items) ? items : [items];
		const initExpandedState = () => {
			Object.entries(mutableValues.value).forEach(([propertyName, items]) => itemState.initExpandedState(propertyName, normalizeToArray(items), multipleValues.value));
		};
		watch(() => props.values, (newValues) => {
			mutableValues.value = deepCopy(newValues);
			Object.entries(mutableValues.value).forEach(([propertyName, items]) => itemState.trimArrays(propertyName, normalizeToArray(items).length));
			initExpandedState();
		}, { deep: true });
		onBeforeMount(() => {
			mutableValues.value = deepCopy(props.values);
			initExpandedState();
			initializeAddedOptionalValues();
			if (hasSingleItem.value) {
				const firstProperty = properties.value[0];
				if (firstProperty && multipleValues.value) {
					const items = mutableValues.value[firstProperty.name];
					if (Array.isArray(items) && items.length > 0) itemState.setExpandedState(firstProperty.name, 0, true);
				}
			}
		});
		const initializeParameterValue = (optionParameter) => {
			if (!(optionParameter.typeOptions?.multipleValues === true)) return deepCopy(optionParameter.default);
			if (optionParameter.type === "fixedCollection") return {};
			const existingArray = (0, import_get.default)(props.nodeValues, [props.path, optionParameter.name], []);
			const defaultValue = optionParameter.default;
			const normalizeDefault = (value) => {
				if (Array.isArray(value)) return deepCopy(value);
				if (value !== "" && typeof value !== "object") return [deepCopy(value)];
				return [];
			};
			return [...existingArray, ...normalizeDefault(defaultValue)];
		};
		const scrollToNewItem = async (optionName, itemIndex) => {
			await nextTick();
			const itemId = itemState.getItemId(optionName, itemIndex);
			(rootEl.value?.querySelector(`[data-item-key="${itemId}"]`))?.scrollIntoView({
				behavior: "smooth",
				block: "nearest"
			});
		};
		const optionSelected = (optionName) => {
			const option = getOptionProperties(optionName);
			if (!option) return;
			const name = `${props.path}.${option.name}`;
			const newParameterValue = Object.fromEntries(option.values.map((optionParameter) => [optionParameter.name, initializeParameterValue(optionParameter)]));
			const existingValues = (0, import_get.default)(props.nodeValues, name, []);
			const newValue = multipleValues.value ? [...existingValues, newParameterValue] : newParameterValue;
			emit("valueChanged", {
				name,
				value: newValue
			});
			const newItemIndex = existingValues.length;
			itemState.setExpandedState(option.name, newItemIndex, true);
			if (multipleValues.value) scrollToNewItem(option.name, newItemIndex);
			if (props.parameter.name === "workflowInputs") trackFieldAdded();
		};
		const valueChanged = (parameterData) => {
			emit("valueChanged", parameterData);
			if (props.parameter.name === "workflowInputs") trackFieldTypeChange(parameterData);
		};
		const onDragChange = (optionName, event) => {
			if (event.moved) {
				itemState.reorderItems(optionName, event.moved.oldIndex, event.moved.newIndex);
				const items = mutableValues.value[optionName];
				if (Array.isArray(items)) {
					const reorderedItems = [...items];
					const [movedItem] = reorderedItems.splice(event.moved.oldIndex, 1);
					reorderedItems.splice(event.moved.newIndex, 0, movedItem);
					mutableValues.value[optionName] = reorderedItems;
				}
				const parameterData = {
					name: getPropertyPath(optionName),
					value: mutableValues.value[optionName],
					type: "optionsOrderChanged"
				};
				emit("valueChanged", parameterData);
			}
		};
		const onHeaderAddClick = async () => {
			if (!isWrapperExpanded.value) {
				isWrapperExpanded.value = true;
				await nextTick();
			}
			if (hasSingleOption.value && dropdownOptions.value[0]) optionSelected(dropdownOptions.value[0].id);
		};
		const onAddButtonClick = () => {
			if (hasSingleOption.value && dropdownOptions.value[0]) optionSelected(dropdownOptions.value[0].id);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "rootEl",
				ref: rootEl,
				class: normalizeClass([_ctx.$style.fixedCollectionParameter, { [_ctx.$style.empty]: properties.value.length === 0 }]),
				"data-test-id": `fixed-collection-${props.parameter?.name}`,
				onKeydown: _cache[4] || (_cache[4] = withModifiers(() => {}, ["stop"]))
			}, [shouldShowSectionHeader.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
				createVNode(unref(SectionHeader_default), {
					title: displayName.value,
					bordered: isEmpty.value,
					class: normalizeClass(_ctx.$style.sectionHeader)
				}, createSlots({ _: 2 }, [shouldShowAddInHeader.value ? {
					name: "actions",
					fn: withCtx(() => [createVNode(unref(N8nTooltip_default), {
						disabled: !isAddDisabled.value,
						"show-after": unref(500)
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(addTooltipText.value), 1)]),
						default: withCtx(() => [hasMultipleOptions.value ? (openBlock(), createBlock(unref(DropdownMenu_default), {
							key: 0,
							items: dropdownOptions.value,
							disabled: isAddDisabled.value,
							"data-test-id": "fixed-collection-add-header",
							onSelect: optionSelected
						}, {
							trigger: withCtx(() => [createVNode(unref(N8nHeaderAction_default), {
								icon: "plus",
								label: placeholder.value,
								disabled: isAddDisabled.value
							}, null, 8, ["label", "disabled"])]),
							_: 1
						}, 8, ["items", "disabled"])) : (openBlock(), createBlock(unref(N8nHeaderAction_default), {
							key: 1,
							icon: "plus",
							label: placeholder.value,
							disabled: isAddDisabled.value,
							"data-test-id": "fixed-collection-add-header",
							onClick: onHeaderAddClick
						}, null, 8, ["label", "disabled"]))]),
						_: 1
					}, 8, ["disabled", "show-after"])]),
					key: "0"
				} : void 0]), 1032, [
					"title",
					"bordered",
					"class"
				]),
				(openBlock(true), createElementBlock(Fragment, null, renderList(properties.value, (property) => {
					return openBlock(), createElementBlock("div", {
						key: property.name,
						class: normalizeClass(_ctx.$style.propertySection)
					}, [multipleValues.value && isArrayValue(property.name) ? (openBlock(), createBlock(FixedCollectionItemList_default, {
						key: 0,
						property,
						values: getArrayValues(property.name),
						"node-values": __props.nodeValues,
						"get-property-path": getPropertyPath,
						"item-state": unref(itemState),
						"is-read-only": !!__props.isReadOnly,
						sortable: sortable.value,
						"title-template": __props.parameter.typeOptions?.fixedCollection?.itemTitle,
						"get-visible-property-values": getVisiblePropertyValues,
						"get-picker-property-values": getPickerPropertyValues,
						"is-optional-value-added": isOptionalValueAdded,
						"add-optional-field-button-text": addOptionalFieldButtonText.value,
						layout: layout.value,
						onValueChanged: valueChanged,
						onDelete: handleDelete,
						onDragChange,
						onToggleOptionalValue
					}, null, 8, [
						"property",
						"values",
						"node-values",
						"item-state",
						"is-read-only",
						"sortable",
						"title-template",
						"add-optional-field-button-text",
						"layout"
					])) : (openBlock(), createBlock(unref(N8nCollapsiblePanel_default), {
						key: 1,
						"model-value": unref(itemState).getExpandedState(property.name, 0),
						title: property.displayName,
						"data-item-key": property.name,
						"onUpdate:modelValue": ($event) => unref(itemState).setExpandedState(property.name, 0, $event)
					}, createSlots({
						default: withCtx(() => [createVNode(ParameterInputList_default, {
							"hide-delete": "",
							parameters: getVisiblePropertyValues(property),
							"node-values": __props.nodeValues,
							path: getPropertyPath(property.name),
							"is-read-only": !!__props.isReadOnly,
							"is-nested": false,
							"remove-first-parameter-margin": true,
							"remove-last-parameter-margin": true,
							"hidden-issues-inputs": __props.hiddenIssuesInputs,
							onValueChanged: valueChanged
						}, null, 8, [
							"parameters",
							"node-values",
							"path",
							"is-read-only",
							"hidden-issues-inputs"
						])]),
						_: 2
					}, [!__props.isReadOnly ? {
						name: "actions",
						fn: withCtx(() => [createVNode(unref(N8nHeaderAction_default), {
							icon: "trash-2",
							label: unref(locale).baseText("fixedCollectionParameter.deleteItem"),
							danger: "",
							onClick: ($event) => handleDelete(property.name)
						}, null, 8, ["label", "onClick"])]),
						key: "0"
					} : void 0]), 1032, [
						"model-value",
						"title",
						"data-item-key",
						"onUpdate:modelValue"
					]))], 2);
				}), 128)),
				shouldShowAddAtBottom.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.controls)
				}, [hasSingleOption.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					class: "n8n-button--highlightFill",
					variant: "outline",
					icon: "plus",
					size: "small",
					"data-test-id": `fixed-collection-add-top-level-button`,
					label: placeholder.value,
					disabled: isAddDisabled.value,
					onClick: onAddButtonClick
				}, null, 8, ["label", "disabled"])) : hasMultipleOptions.value ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: 1,
					items: dropdownOptions.value,
					class: normalizeClass(_ctx.$style.dropdown),
					"data-test-id": `fixed-collection-add-top-level-dropdown`,
					disabled: isAddDisabled.value,
					onSelect: optionSelected
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						class: "n8n-button--highlightFill",
						variant: "outline",
						icon: "plus",
						size: "small",
						label: placeholder.value,
						disabled: isAddDisabled.value
					}, null, 8, ["label", "disabled"])]),
					_: 1
				}, 8, [
					"items",
					"class",
					"disabled"
				])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
			], 64)) : shouldWrapInCollapsible.value ? (openBlock(), createBlock(unref(N8nCollapsiblePanel_default), {
				key: 1,
				modelValue: unref(isWrapperExpanded),
				"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(isWrapperExpanded) ? isWrapperExpanded.value = $event : null),
				title: displayName.value,
				"show-actions-on-hover": !isDropdownOpen.value
			}, {
				actions: withCtx(() => [shouldShowAddInCollapsibleActions.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					"show-after": unref(500)
				}, {
					content: withCtx(() => [createTextVNode(toDisplayString(addTooltipText.value), 1)]),
					default: withCtx(() => [hasMultipleOptions.value ? (openBlock(), createBlock(unref(DropdownMenu_default), {
						key: 0,
						items: dropdownOptions.value,
						disabled: isAddDisabled.value,
						"data-test-id": "fixed-collection-add-header",
						onSelect: optionSelected,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isDropdownOpen.value = $event)
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nHeaderAction_default), {
							icon: "plus",
							label: placeholder.value,
							disabled: isAddDisabled.value
						}, null, 8, ["label", "disabled"])]),
						_: 1
					}, 8, ["items", "disabled"])) : (openBlock(), createBlock(unref(N8nHeaderAction_default), {
						key: 1,
						icon: "plus",
						label: placeholder.value,
						disabled: isAddDisabled.value,
						"data-test-id": "fixed-collection-add-header-nested",
						onClick: onHeaderAddClick
					}, null, 8, ["label", "disabled"]))]),
					_: 1
				}, 8, ["show-after"])) : createCommentVNode("", true), __props.canDelete && !__props.isReadOnly ? (openBlock(), createBlock(unref(N8nHeaderAction_default), {
					key: 1,
					icon: "trash-2",
					label: unref(locale).baseText("fixedCollectionParameter.deleteItem"),
					danger: "",
					"data-test-id": "fixed-collection-delete-nested",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("delete"))
				}, null, 8, ["label"])) : createCommentVNode("", true)]),
				default: withCtx(() => [createBaseVNode("div", null, [multipleValues.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [(openBlock(true), createElementBlock(Fragment, null, renderList(properties.value, (property) => {
					return openBlock(), createElementBlock("div", {
						key: property.name,
						class: normalizeClass(_ctx.$style.propertySection)
					}, [mutableValues.value[property.name] ? (openBlock(), createBlock(FixedCollectionItemList_default, {
						key: 0,
						property,
						values: mutableValues.value[property.name],
						"node-values": __props.nodeValues,
						"get-property-path": getPropertyPath,
						"item-state": unref(itemState),
						"is-read-only": !!__props.isReadOnly,
						sortable: sortable.value,
						"title-template": __props.parameter.typeOptions?.fixedCollection?.itemTitle,
						"get-visible-property-values": getVisiblePropertyValues,
						"get-picker-property-values": getPickerPropertyValues,
						"is-optional-value-added": isOptionalValueAdded,
						"add-optional-field-button-text": addOptionalFieldButtonText.value,
						layout: layout.value,
						onValueChanged: valueChanged,
						onDelete: handleDelete,
						onDragChange,
						onToggleOptionalValue: _cache[2] || (_cache[2] = (propertyName, valueName, index) => toggleOptionalValue(getOptionProperties(propertyName), valueName, index))
					}, null, 8, [
						"property",
						"values",
						"node-values",
						"item-state",
						"is-read-only",
						"sortable",
						"title-template",
						"add-optional-field-button-text",
						"layout"
					])) : createCommentVNode("", true)], 2);
				}), 128)), shouldShowAddAtBottom.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.controls)
				}, [hasSingleOption.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					class: "n8n-button--highlightFill",
					variant: "outline",
					icon: "plus",
					size: "small",
					"data-test-id": `fixed-collection-add-nested-button`,
					label: placeholder.value,
					onClick: onAddButtonClick
				}, null, 8, ["label"])) : hasMultipleOptions.value ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: 1,
					items: dropdownOptions.value,
					class: normalizeClass(_ctx.$style.dropdown),
					"data-test-id": `fixed-collection-add-nested-dropdown`,
					onSelect: optionSelected
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						class: "n8n-button--highlightFill",
						variant: "outline",
						icon: "plus",
						size: "small",
						label: placeholder.value
					}, null, 8, ["label"])]),
					_: 1
				}, 8, ["items", "class"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 64)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(properties.value, (property) => {
					return openBlock(), createElementBlock("div", {
						key: property.name,
						class: normalizeClass(_ctx.$style.propertySection)
					}, [createVNode(ParameterInputList_default, {
						"hide-delete": "",
						parameters: getVisiblePropertyValues(property),
						"node-values": __props.nodeValues,
						path: getPropertyPath(property.name),
						"is-read-only": !!__props.isReadOnly,
						"is-nested": true,
						"remove-first-parameter-margin": true,
						"remove-last-parameter-margin": true,
						"hidden-issues-inputs": __props.hiddenIssuesInputs,
						onValueChanged: valueChanged
					}, null, 8, [
						"parameters",
						"node-values",
						"path",
						"is-read-only",
						"hidden-issues-inputs"
					])], 2);
				}), 128))])]),
				_: 1
			}, 8, [
				"modelValue",
				"title",
				"show-actions-on-hover"
			])) : (openBlock(true), createElementBlock(Fragment, { key: 2 }, renderList(properties.value, (property) => {
				return openBlock(), createElementBlock("div", {
					key: property.name,
					class: normalizeClass(_ctx.$style.propertySection)
				}, [multipleValues.value && isArrayValue(property.name) ? (openBlock(), createBlock(FixedCollectionItemList_default, {
					key: 0,
					property,
					values: getArrayValues(property.name),
					"node-values": __props.nodeValues,
					"get-property-path": getPropertyPath,
					"item-state": unref(itemState),
					"is-read-only": !!__props.isReadOnly,
					sortable: sortable.value,
					"title-template": __props.parameter.typeOptions?.fixedCollection?.itemTitle,
					"get-visible-property-values": getVisiblePropertyValues,
					"get-picker-property-values": getPickerPropertyValues,
					"is-optional-value-added": isOptionalValueAdded,
					"add-optional-field-button-text": addOptionalFieldButtonText.value,
					layout: layout.value,
					onValueChanged: valueChanged,
					onDelete: handleDelete,
					onDragChange,
					onToggleOptionalValue
				}, null, 8, [
					"property",
					"values",
					"node-values",
					"item-state",
					"is-read-only",
					"sortable",
					"title-template",
					"add-optional-field-button-text",
					"layout"
				])) : (openBlock(), createBlock(unref(N8nCollapsiblePanel_default), {
					key: 1,
					"model-value": unref(itemState).getExpandedState(property.name, 0),
					title: property.displayName,
					"data-item-key": property.name,
					"onUpdate:modelValue": ($event) => unref(itemState).setExpandedState(property.name, 0, $event)
				}, createSlots({
					default: withCtx(() => [createVNode(ParameterInputList_default, {
						"hide-delete": "",
						parameters: getVisiblePropertyValues(property),
						"node-values": __props.nodeValues,
						path: getPropertyPath(property.name),
						"is-read-only": !!__props.isReadOnly,
						"is-nested": false,
						"remove-first-parameter-margin": true,
						"remove-last-parameter-margin": true,
						"hidden-issues-inputs": __props.hiddenIssuesInputs,
						onValueChanged: valueChanged
					}, null, 8, [
						"parameters",
						"node-values",
						"path",
						"is-read-only",
						"hidden-issues-inputs"
					])]),
					_: 2
				}, [!__props.isReadOnly ? {
					name: "actions",
					fn: withCtx(() => [createVNode(unref(N8nHeaderAction_default), {
						icon: "trash-2",
						label: unref(locale).baseText("fixedCollectionParameter.deleteItem"),
						danger: "",
						onClick: ($event) => handleDelete(property.name)
					}, null, 8, ["label", "onClick"])]),
					key: "0"
				} : void 0]), 1032, [
					"model-value",
					"title",
					"data-item-key",
					"onUpdate:modelValue"
				]))], 2);
			}), 128))], 42, _hoisted_1);
		};
	}
}), [["__cssModules", { "$style": {
	fixedCollectionParameter: "_fixedCollectionParameter_rfznv_1",
	propertySection: "_propertySection_rfznv_5",
	sectionHeader: "_sectionHeader_rfznv_16",
	controls: "_controls_rfznv_20",
	dropdown: "_dropdown_rfznv_24"
} }]]);
//#endregion
//#region src/features/ndv/parameters/components/FixedCollection/FixedCollectionParameter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ndv/parameters/components/FixedCollection/FixedCollectionParameter.vue
var FixedCollectionParameter_default = /* @__PURE__ */ defineComponent({
	__name: "FixedCollectionParameter",
	props: {
		nodeValues: {},
		parameter: {},
		path: {},
		values: { default: void 0 },
		isReadOnly: { type: Boolean },
		isNested: { type: Boolean },
		isNewlyAdded: { type: Boolean },
		canDelete: { type: Boolean },
		hiddenIssuesInputs: { default: () => [] }
	},
	emits: ["valueChanged", "delete"],
	setup(__props, { emit: __emit }) {
		const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();
		const emit = __emit;
		return (_ctx, _cache) => {
			return !unref(isCollectionOverhaulEnabled) ? (openBlock(), createBlock(FixedCollectionParameterLegacy_default, mergeProps({ key: 0 }, _ctx.$props, { onValueChanged: _cache[0] || (_cache[0] = ($event) => emit("valueChanged", $event)) }), null, 16)) : (openBlock(), createBlock(FixedCollectionParameterNew_default, mergeProps({ key: 1 }, _ctx.$props, {
				onValueChanged: _cache[1] || (_cache[1] = ($event) => emit("valueChanged", $event)),
				onDelete: _cache[2] || (_cache[2] = ($event) => emit("delete"))
			}), null, 16));
		};
	}
});
//#endregion
export { FixedCollectionParameter_default as default };
