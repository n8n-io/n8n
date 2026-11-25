import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Si as require_cloneDeep, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, af as onBeforeMount, bd as I18nT, cu as ElDatePicker, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { AN as i18n, Fw as makeRestApiRequest, GS as EnterpriseEditionFeature, Id as hasCancellableExecutions, Jg as useUIStore, Mn as convertToDisplayDate, Nj as N8nPopover_default, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, _M as Checkbox_default, _N as N8nText_default, bC as useRootStore, by as useDebounce, cN as Input_default, fN as N8nTooltip_default, fy as isEmpty, hC as useTelemetry, hM as N8nLink_default, hx as STOP_MANY_EXECUTIONS_MODAL_KEY, jN as useI18n, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, uA as WORKFLOW_ENGINE_TYPES, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AnnotationTagsDropdown_ee_default } from "./AnnotationTagsDropdown.ee-WLGs3CYQ.js";
//#region src/features/execution/executions/components/ConcurrentExecutionsHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ConcurrentExecutionsHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ConcurrentExecutionsHeader",
	props: {
		runningExecutionsCount: {},
		concurrencyCap: {},
		isCloudDeployment: { type: Boolean },
		executions: {},
		isInitialLoad: { type: Boolean }
	},
	emits: ["goToUpgrade"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const tooltipText = computed(() => {
			let text = i18n.baseText("executionsList.activeExecutions.tooltip", { interpolate: {
				running: props.runningExecutionsCount,
				cap: props.concurrencyCap
			} });
			text += "\n" + i18n.baseText("executionsList.activeExecutions.evaluationNote");
			return text;
		});
		const shouldShowHeader = computed(() => {
			if (props.isInitialLoad) return false;
			return props.runningExecutionsCount > 0 || !hasCancellableExecutions(props.executions);
		});
		const headerText = computed(() => {
			if (props.runningExecutionsCount === 0) return i18n.baseText("executionsList.activeExecutions.none");
			return i18n.baseText("executionsList.activeExecutions.header", { interpolate: {
				running: props.runningExecutionsCount,
				cap: props.concurrencyCap
			} });
		});
		return (_ctx, _cache) => {
			return shouldShowHeader.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				"data-test-id": "concurrent-executions-header",
				class: normalizeClass(_ctx.$style.concurrentExecutionHeader)
			}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(headerText.value), 1)]),
				_: 1
			}), createVNode(unref(N8nTooltip_default), { "as-child": "" }, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tooltip) }, [createTextVNode(toDisplayString(tooltipText.value) + " ", 1), props.isCloudDeployment ? (openBlock(), createBlock(unref(N8nLink_default), {
					key: 0,
					bold: "",
					size: "small",
					class: normalizeClass(_ctx.$style.link),
					onClick: _cache[0] || (_cache[0] = ($event) => emit("goToUpgrade"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgradeNow")), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nLink_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.link),
					href: unref(i18n).baseText("executions.concurrency.docsLink"),
					target: "_blank"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.viewDocs")), 1)]),
					_: 1
				}, 8, ["class", "href"]))], 2)]),
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "info",
					size: "medium",
					class: "ml-2xs"
				})]),
				_: 1
			})], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	tooltip: "_tooltip_17wvf_1",
	link: "_link_17wvf_6",
	concurrentExecutionHeader: "_concurrentExecutionHeader_17wvf_10"
} }]]);
//#endregion
//#region src/features/execution/executions/components/ExecutionsFilter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_cloneDeep = /* @__PURE__ */ __toESM(require_cloneDeep(), 1);
var _hoisted_1 = { "data-test-id": "execution-filter-form" };
var _hoisted_2 = { for: "execution-filter-workflows" };
var _hoisted_3 = { for: "execution-filter-status" };
var _hoisted_4 = { for: "execution-filter-engine" };
var _hoisted_5 = { for: "execution-filter-start-date" };
var _hoisted_6 = { for: "execution-filter-annotation-tags" };
var _hoisted_7 = { for: "execution-filter-annotation-vote" };
var _hoisted_8 = { for: "execution-filter-saved-data-key" };
var _hoisted_9 = { for: "execution-filter-saved-data-value" };
var DATE_TIME_MASK = "YYYY-MM-DD HH:mm";
var ExecutionsFilter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ExecutionsFilter",
	props: {
		initialFilters: {},
		workflows: { default: () => [] },
		workflowId: {},
		popoverSide: { default: "bottom" },
		popoverAlign: { default: "center" },
		teleported: {
			type: Boolean,
			default: true
		}
	},
	emits: ["filterChanged"],
	setup(__props, { emit: __emit }) {
		const settingsStore = useSettingsStore();
		const rootStore = useRootStore();
		const { debounce } = useDebounce();
		const telemetry = useTelemetry();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const props = __props;
		const emit = __emit;
		const debouncedEmit = debounce(emit, { debounceTime: 500 });
		const isCustomDataFilterTracked = ref(false);
		const isAdvancedExecutionFilterEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters]);
		const isAnnotationFiltersEnabled = computed(() => isAdvancedExecutionFilterEnabled.value);
		const getDefaultFilter = () => ({
			status: "all",
			workflowId: "all",
			annotationTags: [],
			startDate: "",
			endDate: "",
			metadata: [{
				key: "",
				value: "",
				exactMatch: false
			}],
			vote: "all",
			workflowVersionId: "all",
			engine: "all"
		});
		const filter = reactive({
			...getDefaultFilter(),
			...(0, import_cloneDeep.default)(props.initialFilters)
		});
		const workflowVersions = ref([]);
		const isLoadingVersions = ref(false);
		const hasFetchedVersions = ref(false);
		const versionFilterOptions = computed(() => {
			const options = [{
				id: "all",
				name: i18n.baseText("executionsFilter.version.all")
			}];
			for (const version of workflowVersions.value) {
				const name = version.name ?? i18n.baseText("executionDetails.versionAutosave");
				const { date, time } = convertToDisplayDate(version.createdAt);
				options.push({
					id: version.versionId,
					name: i18n.baseText("executionsFilter.version.label", { interpolate: {
						name,
						date: `${date} ${time}`
					} })
				});
			}
			return options;
		});
		function fetchVersions() {
			const workflowId = props.workflowId;
			if (!workflowId || hasFetchedVersions.value || isLoadingVersions.value) return;
			isLoadingVersions.value = true;
			makeRestApiRequest(rootStore.restApiContext, "GET", `/executions/versions/${workflowId}`).then((versions) => {
				workflowVersions.value = versions;
				hasFetchedVersions.value = true;
			}).catch(() => {}).finally(() => {
				isLoadingVersions.value = false;
			});
		}
		watch(filter, (newFilter) => {
			if (newFilter.startDate || newFilter.endDate) debouncedEmit("filterChanged", newFilter);
			else emit("filterChanged", newFilter);
		}, {
			deep: true,
			immediate: false
		});
		const statuses = computed(() => [
			{
				id: "all",
				name: i18n.baseText("executionsList.anyStatus")
			},
			{
				id: "error",
				name: i18n.baseText("executionsList.error")
			},
			{
				id: "canceled",
				name: i18n.baseText("executionsList.canceled")
			},
			{
				id: "new",
				name: i18n.baseText("executionsList.new")
			},
			{
				id: "running",
				name: i18n.baseText("executionsList.running")
			},
			{
				id: "success",
				name: i18n.baseText("executionsList.success")
			},
			{
				id: "waiting",
				name: i18n.baseText("executionsList.waiting")
			}
		]);
		const engineFilterOptions = computed(() => [{
			id: "all",
			name: i18n.baseText("executionsFilter.engine.all")
		}, ...WORKFLOW_ENGINE_TYPES.map((engine) => ({
			id: engine,
			name: i18n.baseText("generic.engine", { interpolate: { engine } })
		}))]);
		const voteFilterOptions = computed(() => [
			{
				id: "all",
				name: i18n.baseText("executionsFilter.annotation.rating.all")
			},
			{
				id: "up",
				name: i18n.baseText("executionsFilter.annotation.rating.good")
			},
			{
				id: "down",
				name: i18n.baseText("executionsFilter.annotation.rating.bad")
			}
		]);
		const countSelectedFilterProps = computed(() => {
			return [
				filter.status !== "all",
				filter.workflowId !== "all" && props.workflows.length,
				!isEmpty(filter.annotationTags),
				filter.vote !== "all",
				filter.workflowVersionId !== "all",
				filter.engine !== "all",
				!isEmpty(filter.metadata),
				!!filter.startDate,
				!!filter.endDate
			].filter(Boolean).length;
		});
		const onFilterMetaChange = (index, prop, value) => {
			if (!filter.metadata[index]) filter.metadata[index] = {
				key: "",
				value: "",
				exactMatch: false
			};
			filter.metadata[index][prop] = value;
			if (!isCustomDataFilterTracked.value) {
				telemetry.track("User filtered executions with custom data");
				isCustomDataFilterTracked.value = true;
			}
			debouncedEmit("filterChanged", filter);
		};
		const onAnnotationTagsChange = () => {
			emit("filterChanged", filter);
		};
		const onFilterReset = () => {
			Object.assign(filter, getDefaultFilter());
		};
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("custom-data-filter", "upgrade-custom-data-filter");
		};
		const onExactMatchChange = (e) => {
			if (typeof e === "boolean") onFilterMetaChange(0, "exactMatch", e);
		};
		onBeforeMount(() => {
			isCustomDataFilterTracked.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				side: props.popoverSide,
				align: props.popoverAlign,
				"position-strategy": "absolute",
				width: "440px",
				"content-class": _ctx.$style["popover-content"],
				"show-arrow": "",
				"onUpdate:open": _cache[10] || (_cache[10] = ($event) => $event && fetchVersions())
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					iconOnly: "",
					icon: "funnel",
					size: "medium",
					"aria-label": unref(i18n).baseText("forms.resourceFiltersDropdown.filters"),
					active: !!countSelectedFilterProps.value,
					"data-test-id": "executions-filter-button",
					class: normalizeClass(_ctx.$style.filterButton)
				}, createSlots({ _: 2 }, [!!countSelectedFilterProps.value ? {
					name: "default",
					fn: withCtx(() => [createVNode(unref(N8nBadge_default), {
						variant: "primary",
						class: normalizeClass(["mr-4xs", _ctx.$style.filterBadge]),
						"data-test-id": "execution-filter-badge"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(countSelectedFilterProps.value), 1)]),
						_: 1
					}, 8, ["class"])]),
					key: "0"
				} : void 0]), 1032, [
					"aria-label",
					"active",
					"class"
				])]),
				content: withCtx(() => [createBaseVNode("div", _hoisted_1, [
					__props.workflows && __props.workflows.length > 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.group)
					}, [createBaseVNode("label", _hoisted_2, toDisplayString(unref(i18n).baseText("workflows.heading")), 1), createVNode(unref(N8nSelect_default), {
						id: "execution-filter-workflows",
						modelValue: filter.workflowId,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => filter.workflowId = $event),
						placeholder: unref(i18n).baseText("executionsFilter.selectWorkflow"),
						filterable: "",
						"data-test-id": "executions-filter-workflows-select",
						teleported: __props.teleported
					}, {
						default: withCtx(() => [createBaseVNode("div", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.workflows, (item, idx) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: idx,
								label: item.name,
								value: item.id
							}, null, 8, ["label", "value"]);
						}), 128))])]),
						_: 1
					}, 8, [
						"modelValue",
						"placeholder",
						"teleported"
					])], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createBaseVNode("label", _hoisted_3, toDisplayString(unref(i18n).baseText("executionsList.status")), 1), createVNode(unref(N8nSelect_default), {
						id: "execution-filter-status",
						modelValue: filter.status,
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => filter.status = $event),
						placeholder: unref(i18n).baseText("executionsFilter.selectStatus"),
						filterable: "",
						"data-test-id": "executions-filter-status-select",
						teleported: __props.teleported
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(statuses.value, (item, idx) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: idx,
								label: item.name,
								value: item.id
							}, null, 8, ["label", "value"]);
						}), 128))]),
						_: 1
					}, 8, [
						"modelValue",
						"placeholder",
						"teleported"
					])], 2),
					unref(settingsStore).isEngineV2Enabled ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.group)
					}, [createBaseVNode("label", _hoisted_4, toDisplayString(unref(i18n).baseText("executionsFilter.engine")), 1), createVNode(unref(N8nSelect_default), {
						id: "execution-filter-engine",
						modelValue: filter.engine,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => filter.engine = $event),
						"data-test-id": "executions-filter-engine-select",
						teleported: __props.teleported
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(engineFilterOptions.value, (item) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: item.id,
								label: item.name,
								value: item.id
							}, null, 8, ["label", "value"]);
						}), 128))]),
						_: 1
					}, 8, ["modelValue", "teleported"])], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createBaseVNode("label", _hoisted_5, toDisplayString(unref(i18n).baseText("executionsFilter.start")), 1), createBaseVNode("div", { class: normalizeClass(_ctx.$style.dates) }, [
						createVNode(unref(ElDatePicker), {
							id: "execution-filter-start-date",
							modelValue: filter.startDate,
							"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => filter.startDate = $event),
							type: "datetime",
							teleported: __props.teleported,
							format: DATE_TIME_MASK,
							placeholder: unref(i18n).baseText("executionsFilter.startDate"),
							"data-test-id": "executions-filter-start-date-picker"
						}, null, 8, [
							"modelValue",
							"teleported",
							"placeholder"
						]),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.divider) }, "to", 2),
						createVNode(unref(ElDatePicker), {
							id: "execution-filter-end-date",
							modelValue: filter.endDate,
							"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => filter.endDate = $event),
							type: "datetime",
							teleported: __props.teleported,
							format: DATE_TIME_MASK,
							placeholder: unref(i18n).baseText("executionsFilter.endDate"),
							"data-test-id": "executions-filter-end-date-picker"
						}, null, 8, [
							"modelValue",
							"teleported",
							"placeholder"
						])
					], 2)], 2),
					isAnnotationFiltersEnabled.value ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.group)
					}, [createBaseVNode("label", _hoisted_6, toDisplayString(unref(i18n).baseText("executionsFilter.annotation.tags")), 1), createVNode(AnnotationTagsDropdown_ee_default, {
						id: "execution-filter-annotation-tags",
						modelValue: filter.annotationTags,
						"onUpdate:modelValue": [_cache[5] || (_cache[5] = ($event) => filter.annotationTags = $event), onAnnotationTagsChange],
						placeholder: unref(i18n).baseText("workflowOpen.filterWorkflows"),
						"create-enabled": false,
						"data-test-id": "executions-filter-annotation-tags-select"
					}, null, 8, ["modelValue", "placeholder"])], 2)) : createCommentVNode("", true),
					props.workflowId ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.group)
					}, [createVNode(unref(N8nTooltip_default), { placement: "right" }, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsFilter.version.hint")), 1)]),
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([_ctx.$style.label, _ctx.$style.savedDataLabel]) }, [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("executionsFilter.version")), 1), createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.tooltipIcon),
							icon: "circle-help",
							size: "medium"
						}, null, 8, ["class"])], 2)]),
						_: 1
					}), createVNode(unref(N8nTooltip_default), {
						disabled: isLoadingVersions.value || versionFilterOptions.value.length > 1,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsFilter.version.noVersions")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nSelect_default), {
							id: "execution-filter-version",
							modelValue: filter.workflowVersionId,
							"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => filter.workflowVersionId = $event),
							placeholder: unref(i18n).baseText("executionsFilter.version.select"),
							filterable: "",
							disabled: isLoadingVersions.value || versionFilterOptions.value.length <= 1,
							"data-test-id": "executions-filter-version-select",
							teleported: __props.teleported
						}, createSlots({
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(versionFilterOptions.value, (item, idx) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: idx,
									label: item.name,
									value: item.id
								}, null, 8, ["label", "value"]);
							}), 128))]),
							_: 2
						}, [isLoadingVersions.value ? {
							name: "prefix",
							fn: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "spinner",
								spin: ""
							})]),
							key: "0"
						} : void 0]), 1032, [
							"modelValue",
							"placeholder",
							"disabled",
							"teleported"
						])]),
						_: 1
					}, 8, ["disabled"])], 2)) : createCommentVNode("", true),
					isAnnotationFiltersEnabled.value ? (openBlock(), createElementBlock("div", {
						key: 4,
						class: normalizeClass(_ctx.$style.group)
					}, [createBaseVNode("label", _hoisted_7, toDisplayString(unref(i18n).baseText("executionsFilter.annotation.rating")), 1), createVNode(unref(N8nSelect_default), {
						id: "execution-filter-annotation-vote",
						modelValue: filter.vote,
						"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => filter.vote = $event),
						placeholder: unref(i18n).baseText("executionsFilter.annotation.selectVoteFilter"),
						filterable: "",
						"data-test-id": "executions-filter-annotation-vote-select",
						teleported: __props.teleported
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(voteFilterOptions.value, (item, idx) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: idx,
								label: item.name,
								value: item.id
							}, null, 8, ["label", "value"]);
						}), 128))]),
						_: 1
					}, 8, [
						"modelValue",
						"placeholder",
						"teleported"
					])], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createVNode(unref(N8nTooltip_default), { placement: "right" }, {
						content: withCtx(() => [createVNode(unref(I18nT), {
							tag: "span",
							keypath: "executionsFilter.customData.docsTooltip",
							scope: "global"
						})]),
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([_ctx.$style.label, _ctx.$style.savedDataLabel]) }, [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("executionsFilter.savedData")), 1), createVNode(unref(N8nIcon_default), {
							class: normalizeClass(_ctx.$style.tooltipIcon),
							icon: "circle-help",
							size: "medium"
						}, null, 8, ["class"])], 2)]),
						_: 1
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.subGroup) }, [
						createBaseVNode("label", _hoisted_8, toDisplayString(unref(i18n).baseText("executionsFilter.savedDataKey")), 1),
						createVNode(unref(N8nTooltip_default), {
							disabled: isAdvancedExecutionFilterEnabled.value,
							placement: "top"
						}, {
							content: withCtx(() => [createVNode(unref(I18nT), {
								tag: "span",
								keypath: "executionsFilter.customData.inputTooltip",
								scope: "global"
							}, {
								link: withCtx(() => [createBaseVNode("a", {
									href: "#",
									"data-test-id": "executions-filter-view-plans-link",
									onClick: withModifiers(goToUpgrade, ["prevent"])
								}, toDisplayString(unref(i18n).baseText("executionsFilter.customData.inputTooltip.link")), 1)]),
								_: 1
							})]),
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "execution-filter-saved-data-key",
								name: "execution-filter-saved-data-key",
								type: "text",
								disabled: !isAdvancedExecutionFilterEnabled.value,
								placeholder: unref(i18n).baseText("executionsFilter.savedDataKeyPlaceholder"),
								"model-value": filter.metadata[0]?.key,
								"data-test-id": "execution-filter-saved-data-key-input",
								"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => onFilterMetaChange(0, "key", $event))
							}, null, 8, [
								"disabled",
								"placeholder",
								"model-value"
							])]),
							_: 1
						}, 8, ["disabled"]),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.checkboxWrapper) }, [createVNode(unref(N8nTooltip_default), {
							disabled: isAdvancedExecutionFilterEnabled.value,
							placement: "top"
						}, {
							content: withCtx(() => [createVNode(unref(I18nT), {
								tag: "span",
								keypath: "executionsFilter.customData.inputTooltip",
								scope: "global"
							}, {
								link: withCtx(() => [createBaseVNode("a", {
									href: "#",
									onClick: withModifiers(goToUpgrade, ["prevent"])
								}, toDisplayString(unref(i18n).baseText("executionsFilter.customData.inputTooltip.link")), 1)]),
								_: 1
							})]),
							default: withCtx(() => [createVNode(unref(Checkbox_default), {
								label: unref(i18n).baseText("executionsFilter.savedDataExactMatch"),
								"model-value": filter.metadata[0]?.exactMatch,
								disabled: !isAdvancedExecutionFilterEnabled.value,
								"data-test-id": "execution-filter-saved-data-exact-match-checkbox",
								"onUpdate:modelValue": onExactMatchChange
							}, null, 8, [
								"label",
								"model-value",
								"disabled"
							])]),
							_: 1
						}, 8, ["disabled"])], 2),
						createBaseVNode("label", _hoisted_9, toDisplayString(unref(i18n).baseText("executionsFilter.savedDataValue")), 1),
						createVNode(unref(N8nTooltip_default), {
							disabled: isAdvancedExecutionFilterEnabled.value,
							placement: "top"
						}, {
							content: withCtx(() => [createVNode(unref(I18nT), {
								tag: "span",
								keypath: "executionsFilter.customData.inputTooltip",
								scope: "global"
							}, {
								link: withCtx(() => [createBaseVNode("a", {
									href: "#",
									onClick: withModifiers(goToUpgrade, ["prevent"])
								}, toDisplayString(unref(i18n).baseText("executionsFilter.customData.inputTooltip.link")), 1)]),
								_: 1
							})]),
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "execution-filter-saved-data-value",
								name: "execution-filter-saved-data-value",
								type: "text",
								disabled: !isAdvancedExecutionFilterEnabled.value,
								placeholder: unref(i18n).baseText("executionsFilter.savedDataValuePlaceholder"),
								"model-value": filter.metadata[0]?.value,
								"data-test-id": "execution-filter-saved-data-value-input",
								"onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => onFilterMetaChange(0, "value", $event))
							}, null, 8, [
								"disabled",
								"placeholder",
								"model-value"
							])]),
							_: 1
						}, 8, ["disabled"])
					], 2)], 2),
					!!countSelectedFilterProps.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 5,
						variant: "ghost",
						class: normalizeClass(_ctx.$style.resetBtn),
						size: "large",
						"data-test-id": "executions-filter-reset-button",
						onClick: onFilterReset
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsFilter.reset")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				])]),
				_: 1
			}, 8, [
				"side",
				"align",
				"content-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	group: "_group_n0e4e_1",
	label: "_label_n0e4e_2",
	savedDataLabel: "_savedDataLabel_n0e4e_9",
	subGroup: "_subGroup_n0e4e_17",
	checkboxWrapper: "_checkboxWrapper_n0e4e_25",
	dates: "_dates_n0e4e_33",
	divider: "_divider_n0e4e_41",
	resetBtn: "_resetBtn_n0e4e_46",
	tooltipIcon: "_tooltipIcon_n0e4e_51",
	filterButton: "_filterButton_n0e4e_55",
	filterBadge: "_filterBadge_n0e4e_58",
	"popover-content": "_popover-content_n0e4e_65"
} }], ["__scopeId", "data-v-3ea5c956"]]);
//#endregion
//#region src/features/execution/executions/components/ExecutionStopAllText.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ExecutionStopAllText_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ExecutionStopAllText",
	props: { executions: {} },
	setup(__props) {
		const props = __props;
		const uiStore = useUIStore();
		const i18n = useI18n();
		const hasCancellableExecution = computed(() => hasCancellableExecutions(props.executions));
		const telemetry = useTelemetry();
		function onStopManyExecutions() {
			telemetry.track("User initiated stop many executions");
			uiStore.openModal(STOP_MANY_EXECUTIONS_MODAL_KEY);
		}
		return (_ctx, _cache) => {
			return hasCancellableExecution.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.stopAll),
				size: "small",
				color: "text-base",
				onClick: onStopManyExecutions
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.stopAll")), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { stopAll: "_stopAll_1l1dn_1" } }]]);
//#endregion
//#region src/features/execution/executions/components/ExecutionsTime.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/execution/executions/components/ExecutionsTime.vue
var ExecutionsTime_default = /* @__PURE__ */ defineComponent({
	__name: "ExecutionsTime",
	props: { startTime: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const nowTime = ref(-1);
		const intervalTimer = ref(null);
		const time = computed(() => {
			if (!props.startTime) return "...";
			const msPassed = nowTime.value - new Date(props.startTime).getTime();
			return i18n.displayTimer(msPassed);
		});
		onMounted(() => {
			setNow();
			intervalTimer.value = setInterval(() => {
				setNow();
			}, 1e3);
		});
		onBeforeUnmount(() => {
			if (intervalTimer.value !== null) clearInterval(intervalTimer.value);
		});
		function setNow() {
			nowTime.value = (/* @__PURE__ */ new Date()).getTime();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", null, toDisplayString(time.value), 1);
		};
	}
});
//#endregion
export { ConcurrentExecutionsHeader_default as i, ExecutionStopAllText_default as n, ExecutionsFilter_default as r, ExecutionsTime_default as t };
