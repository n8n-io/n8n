import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sf as useSlots, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xd as guardReactiveProps, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, mf as renderList, of as onBeforeUnmount, vp as normalizeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { CM as N8nDatatable_default, Oj as N8nRecycleScroller_default, SN as _plugin_vue_export_helper_default, Sg as isBaseTextKey, TM as N8nPagination_default, Yx as LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY, _N as N8nText_default, by as useDebounce, cN as Input_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, jg as isSharedResource, kg as isResourceSortableByDate, mM as N8nOption_default, pM as N8nSelect_default, tM as N8nInfoTip_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as PageViewLayout_default } from "./PageViewLayout-BBSbPiAB.js";
import { t as ResourcesListSkeleton_default } from "./ResourcesListSkeleton-76OYbWaI.js";
import { t as ResourceFiltersDropdown_default } from "./ResourceFiltersDropdown-BQigtASg.js";
import { n as isEmptyStateResourceKey, t as ResourcesListEmptyState_default } from "./ResourcesListEmptyState-CgwRE9Zu.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
//#region src/app/components/layouts/PageViewLayoutList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var PageViewLayoutList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PageViewLayoutList",
	props: { overflow: { type: Boolean } },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass({
				[_ctx.$style.wrapper]: true,
				[_ctx.$style.overflow]: __props.overflow
			}) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.list) }, [_ctx.$slots.header ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.header)
			}, [renderSlot(_ctx.$slots, "header")], 2)) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [renderSlot(_ctx.$slots, "default")], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_183my_1",
	overflow: "_overflow_183my_6",
	list: "_list_183my_6",
	body: "_body_183my_6"
} }]]);
//#endregion
//#region src/app/composables/useN8nLocalStorage.ts
/**
* Simple n8n wrapper around vueuse's useLocalStorage.
* Provides util functions to read and write n8n values to local storage.
* Currently only used for workflow list user preferences.
*/
function useN8nLocalStorage() {
	const projectPages = useProjectPages();
	const getProjectKey = (projectId) => {
		return projectPages.isOverviewSubPage ? "home" : projectId;
	};
	const saveProjectPreferencesToLocalStorage = (projectId, tabKey, preferences) => {
		const projectKey = getProjectKey(projectId);
		if (!projectKey) return;
		const localStorage = useLocalStorage(LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY, {});
		if (!localStorage.value[projectKey]) localStorage.value[projectKey] = {};
		localStorage.value[projectKey][tabKey] = {
			...localStorage.value[projectKey][tabKey],
			...preferences
		};
	};
	const loadProjectPreferencesFromLocalStorage = (projectId, tabKey) => {
		const projectKey = getProjectKey(projectId);
		if (!projectKey) return {};
		return useLocalStorage("N8N_WORKFLOWS_LIST_PREFERENCES", {}).value[projectKey]?.[tabKey] || {};
	};
	return {
		saveProjectPreferencesToLocalStorage,
		loadProjectPreferencesFromLocalStorage,
		getProjectKey
	};
}
//#endregion
//#region src/app/composables/useResourcesListI18n.ts
/**
* Composable for handling i18n in ResourcesListLayout with dynamic resource keys
* It provides fallback functionality for translation keys
*/
function useResourcesListI18n(resourceKey) {
	const i18n = useI18n();
	/**
	* Get a translated text with fallback support for dynamic resource keys
	* First tries the specific resource key, then falls back to generic keys
	*/
	const getResourceText = (keySuffix, fallbackKeySuffix, interpolate) => {
		const specificKey = `${resourceKey}.${keySuffix}`;
		const genericKey = `resources.${keySuffix}`;
		const fallbackKey = fallbackKeySuffix ? `resources.${fallbackKeySuffix}` : void 0;
		if (isBaseTextKey(specificKey)) return i18n.baseText(specificKey, { interpolate });
		if (isBaseTextKey(genericKey)) return i18n.baseText(genericKey, { interpolate });
		if (fallbackKey && isBaseTextKey(fallbackKey)) return i18n.baseText(fallbackKey, { interpolate });
		return keySuffix.split(".").pop()?.replace(/([A-Z])/g, " $1").trim() || keySuffix;
	};
	return { getResourceText };
}
//#endregion
//#region src/app/components/layouts/ResourcesListLayout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = {
	key: 0,
	class: "mt-xs",
	"data-test-id": "resources-list-filters-applied-info"
};
var ResourcesListLayout_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResourcesListLayout",
	props: {
		resourceKey: {},
		displayName: {
			type: Function,
			default: (resource) => resource.name || ""
		},
		resources: {},
		disabled: { type: Boolean },
		initialize: {
			type: Function,
			default: async () => {}
		},
		filters: { default: () => ({
			search: "",
			homeProject: ""
		}) },
		additionalFiltersHandler: {
			type: Function,
			default: void 0
		},
		shareable: {
			type: Boolean,
			default: true
		},
		sortFns: { default: () => ({}) },
		sortOptions: { default: () => [
			"lastUpdated",
			"lastCreated",
			"nameAsc",
			"nameDesc"
		] },
		type: { default: "list-full" },
		typeProps: { default: () => ({ itemSize: 80 }) },
		loading: {
			type: Boolean,
			default: true
		},
		customPageSize: { default: 25 },
		availablePageSizeOptions: { default: () => [
			10,
			25,
			50,
			100
		] },
		totalItems: { default: 0 },
		resourcesRefreshing: {
			type: Boolean,
			default: false
		},
		dontPerformSortingAndFiltering: {
			type: Boolean,
			default: false
		},
		hasEmptyState: {
			type: Boolean,
			default: true
		},
		uiConfig: { default: () => ({
			searchEnabled: true,
			showFiltersDropdown: true,
			sortEnabled: true
		}) },
		tabKey: { default: "workflows" },
		persistKeyExclusions: { default: () => [] }
	},
	emits: [
		"update:filters",
		"click:add",
		"update:pagination-and-sort",
		"update:search"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const route = useRoute();
		const router = useRouter();
		const { callDebounced } = useDebounce();
		const telemetry = useTelemetry();
		const n8nLocalStorage = useN8nLocalStorage();
		const props = __props;
		const { getResourceText } = useResourcesListI18n(props.resourceKey);
		const sortBy = ref(props.sortOptions[0]);
		const hasFilters = ref(false);
		const currentPage = ref(1);
		const rowsPerPage = ref(props.customPageSize);
		const resettingFilters = ref(false);
		const search = ref(null);
		const listWrapperRef = ref(null);
		const listItemsRef = ref(null);
		const preferredPageSize = ref(props.customPageSize);
		const preferredSort = ref(props.sortOptions[0]);
		const emit = __emit;
		const slots = useSlots();
		const filtersModel = computed({
			get: () => props.filters,
			set: (newValue) => emit("update:filters", newValue)
		});
		const showEmptyState = computed(() => {
			return props.hasEmptyState && props.resources.length === 0 && !hasFilters.value && !filtersModel.value.search && !props.resourcesRefreshing;
		});
		const showLoadingState = computed(() => {
			return props.loading || props.hasEmptyState && props.resourcesRefreshing && props.resources.length === 0 && !hasFilters.value && !filtersModel.value.search;
		});
		const filterKeys = computed(() => {
			return Object.keys(filtersModel.value);
		});
		const filteredAndSortedResources = computed(() => {
			if (props.dontPerformSortingAndFiltering) return props.resources;
			return props.resources.filter((resource) => {
				let matches = true;
				if (filtersModel.value.homeProject && isSharedResource(resource)) matches = matches && !!("homeProject" in resource && resource.homeProject && resource.homeProject.id === filtersModel.value.homeProject);
				if (filtersModel.value.search) {
					const searchString = filtersModel.value.search.toLowerCase();
					matches = matches && props.displayName(resource).toLowerCase().includes(searchString);
				}
				if (props.additionalFiltersHandler) matches = props.additionalFiltersHandler(resource, filtersModel.value, matches);
				return matches;
			}).sort((a, b) => {
				const sortableByDate = isResourceSortableByDate(a) && isResourceSortableByDate(b);
				switch (sortBy.value) {
					case "lastUpdated":
						if (!sortableByDate) return 0;
						if ("updatedAt" in a && "updatedAt" in b) return props.sortFns.lastUpdated ? props.sortFns.lastUpdated(a, b) : new Date(b.updatedAt ?? "").valueOf() - new Date(a.updatedAt ?? "").valueOf();
						return 0;
					case "lastCreated":
						if (!sortableByDate) return 0;
						if ("createdAt" in a && "createdAt" in b) return props.sortFns.lastCreated ? props.sortFns.lastCreated(a, b) : new Date(b.createdAt ?? "").valueOf() - new Date(a.createdAt ?? "").valueOf();
						return 0;
					case "nameAsc": return props.sortFns.nameAsc ? props.sortFns.nameAsc(a, b) : props.displayName(a).trim().localeCompare(props.displayName(b).trim());
					case "nameDesc": return props.sortFns.nameDesc ? props.sortFns.nameDesc(a, b) : props.displayName(b).trim().localeCompare(props.displayName(a).trim());
					default: return props.sortFns[sortBy.value] ? props.sortFns[sortBy.value](a, b) : 0;
				}
			});
		});
		watch(() => props.filters, (value) => {
			filtersModel.value = value;
			if (hasAppliedFilters()) hasFilters.value = true;
		});
		watch(() => filtersModel.value.homeProject, () => {
			sendFiltersTelemetry("homeProject");
		});
		watch(() => filtersModel.value.tags, () => {
			sendFiltersTelemetry("tags");
		});
		watch(() => filtersModel.value.type, () => {
			sendFiltersTelemetry("type");
		});
		watch(() => filtersModel.value.search, () => callDebounced(sendFiltersTelemetry, {
			debounceTime: 1e3,
			trailing: true
		}, "search"));
		watch(() => filtersModel.value.setupNeeded, () => {
			sendFiltersTelemetry("setupNeeded");
		});
		watch(() => filtersModel.value.incomplete, () => {
			sendFiltersTelemetry("incomplete");
		});
		watch([() => route.params?.projectId, () => route.name], async () => {
			await resetFilters();
			await loadPaginationPreferences();
			await props.initialize();
		});
		onMounted(async () => {
			await loadPaginationPreferences();
			await props.initialize();
			await nextTick();
			if (hasAppliedFilters()) hasFilters.value = true;
			window.addEventListener("keydown", captureSearchHotKey);
		});
		onBeforeUnmount(() => {
			window.removeEventListener("keydown", captureSearchHotKey);
		});
		const captureSearchHotKey = (e) => {
			if (!props.uiConfig.searchEnabled) return;
			if ((e.ctrlKey || e.metaKey) && e.key === "f") {
				e.preventDefault();
				focusSearchInput();
			}
		};
		const focusSearchInput = () => {
			if (search.value) search.value.focus();
		};
		const isFilterApplied = (key) => {
			if (key === "search") return false;
			if (typeof props.filters[key] === "boolean") return props.filters[key];
			if (Array.isArray(props.filters[key])) return props.filters[key].length > 0;
			return props.filters[key] !== "";
		};
		const hasOnlyFiltersThatShowMoreResults = computed(() => {
			const activeFilters = filterKeys.value.filter(isFilterApplied);
			const filtersThatShowMoreResults = ["showArchived"];
			return activeFilters.every((filter) => {
				return filtersThatShowMoreResults.includes(filter);
			});
		});
		const hasAppliedFilters = () => {
			return !!filterKeys.value.find(isFilterApplied);
		};
		const setRowsPerPage = async (numberOfRowsPerPage) => {
			rowsPerPage.value = numberOfRowsPerPage;
			await savePaginationPreferences();
			emit("update:pagination-and-sort", { pageSize: numberOfRowsPerPage });
		};
		const setSorting = async (sort, persistUpdate = true) => {
			sortBy.value = sort;
			if (persistUpdate) {
				await savePaginationPreferences();
				sendSortingTelemetry();
			}
			emit("update:pagination-and-sort", { sort });
		};
		const setCurrentPage = async (page, persistUpdate = true) => {
			currentPage.value = page;
			if (persistUpdate) await savePaginationPreferences();
			emit("update:pagination-and-sort", { page });
		};
		const sendFiltersTelemetry = (source) => {
			if (resettingFilters.value) {
				if (source !== "reset") return;
				setTimeout(() => resettingFilters.value = false, 1500);
			}
			const filters = filtersModel.value;
			const filtersSet = [];
			const filterValues = [];
			Object.keys(filters).forEach((key) => {
				if (filters[key]) {
					filtersSet.push(key);
					filterValues.push(key === "search" ? null : filters[key]);
				}
			});
			telemetry.track(`User set filters in ${props.resourceKey} list`, {
				filters_set: filtersSet,
				filter_values: filterValues,
				[`${props.resourceKey}_total_in_view`]: props.resources.length,
				[`${props.resourceKey}_after_filtering`]: filteredAndSortedResources.value.length
			});
		};
		const onAddButtonClick = (e) => {
			emit("click:add", e);
		};
		const onUpdateFilters = (e) => {
			emit("update:filters", e);
		};
		const resetFilters = async () => {
			Object.keys(filtersModel.value).forEach((key) => {
				filtersModel.value[key] = Array.isArray(filtersModel.value[key]) ? [] : "";
			});
			await setCurrentPage(1, false);
			resettingFilters.value = true;
			hasFilters.value = false;
			sendFiltersTelemetry("reset");
			emit("update:filters", filtersModel.value);
		};
		const itemSize = () => {
			if ("itemSize" in props.typeProps) return props.typeProps.itemSize;
			return 0;
		};
		const getColumns = () => {
			if ("columns" in props.typeProps) return props.typeProps.columns;
			return [];
		};
		const sendSortingTelemetry = () => {
			telemetry.track(`User changed sorting in ${props.resourceKey} list`, { sorting: sortBy.value });
		};
		const onUpdateFiltersLength = (length) => {
			hasFilters.value = length > 0;
		};
		const onSearch = (s) => {
			filtersModel.value.search = s;
			emit("update:search", s);
		};
		const findNearestPageSize = (size) => {
			return props.availablePageSizeOptions.reduce((prev, curr) => Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev);
		};
		/**
		* Saves the current pagination preferences to local storage and updates the URL query parameters.
		*/
		const savePaginationPreferences = async () => {
			if (props.type !== "list-paginated") return;
			const currentQuery = { ...route.query };
			if (currentPage.value !== 1) currentQuery.page = currentPage.value.toString();
			else delete currentQuery.page;
			if (rowsPerPage.value !== preferredPageSize.value) {
				currentQuery.pageSize = rowsPerPage.value.toString();
				preferredPageSize.value = rowsPerPage.value;
			} else delete currentQuery.pageSize;
			if (sortBy.value !== preferredSort.value && !props.persistKeyExclusions.includes(sortBy.value)) {
				currentQuery.sort = sortBy.value;
				preferredSort.value = sortBy.value;
			} else delete currentQuery.sort;
			n8nLocalStorage.saveProjectPreferencesToLocalStorage(route.params.projectId ?? "", props.tabKey, {
				sort: props.persistKeyExclusions.includes(sortBy.value) ? preferredSort.value : sortBy.value,
				pageSize: rowsPerPage.value
			});
			await router.replace({ query: Object.keys(currentQuery).length ? currentQuery : void 0 });
		};
		/**
		* Loads the pagination preferences from local storage or URL query parameter
		* Current page is only saved in the URL query parameters
		* Page size and sort are saved both in local storage and URL query parameters, with query parameters taking precedence
		*/
		const loadPaginationPreferences = async () => {
			if (props.type !== "list-paginated") return;
			const query = route.query;
			const localStorageValues = n8nLocalStorage.loadProjectPreferencesFromLocalStorage(route.params.projectId ?? "", props.tabKey);
			const emitPayload = {};
			if (query.page) {
				const newPage = parseInt(query.page, 10);
				if (newPage > 1) {
					currentPage.value = newPage;
					emitPayload.page = newPage;
				}
			}
			if (query.pageSize ?? localStorageValues.pageSize) {
				const parsedSize = parseInt(query.pageSize || String(localStorageValues.pageSize), 10);
				const newPageSize = findNearestPageSize(parsedSize);
				rowsPerPage.value = newPageSize;
				emitPayload.pageSize = newPageSize;
				preferredPageSize.value = newPageSize;
			} else {
				rowsPerPage.value = props.customPageSize;
				emitPayload.pageSize = props.customPageSize;
			}
			if (query.sort) sortBy.value = emitPayload.sort = preferredSort.value = query.sort;
			else if (localStorageValues.sort) {
				await setSorting(localStorageValues.sort, false);
				emitPayload.sort = localStorageValues.sort;
				preferredSort.value = localStorageValues.sort;
			} else sortBy.value = props.sortOptions[0];
			emit("update:pagination-and-sort", emitPayload);
		};
		const getScrollContainer = () => {
			if (props.type === "list-paginated") return listItemsRef.value ?? null;
			return listWrapperRef.value ?? null;
		};
		__expose({
			currentPage,
			setCurrentPage,
			getScrollContainer
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(PageViewLayout_default, null, {
				header: withCtx(() => [renderSlot(_ctx.$slots, "header")]),
				default: withCtx(() => [showLoadingState.value ? (openBlock(), createBlock(ResourcesListSkeleton_default, { key: 0 })) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [showEmptyState.value ? (openBlock(), createElementBlock("div", _hoisted_1, [renderSlot(_ctx.$slots, "empty", {}, () => [unref(isEmptyStateResourceKey)(props.resourceKey) ? (openBlock(), createBlock(ResourcesListEmptyState_default, {
					key: 0,
					"resource-key": props.resourceKey,
					"button-disabled": __props.disabled,
					"onClick:button": onAddButtonClick
				}, null, 8, ["resource-key", "button-disabled"])) : createCommentVNode("", true)])])) : (openBlock(), createBlock(PageViewLayoutList_default, { key: 1 }, {
					header: withCtx(() => [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style["filters-row"]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.filters) }, [
							renderSlot(_ctx.$slots, "breadcrumbs"),
							props.uiConfig.searchEnabled ? (openBlock(), createBlock(unref(Input_default), {
								key: 0,
								ref_key: "search",
								ref: search,
								"model-value": filtersModel.value.search,
								class: normalizeClass(_ctx.$style.search),
								placeholder: unref(getResourceText)("search.placeholder", "search.placeholder"),
								size: "medium",
								clearable: "",
								"data-test-id": "resources-list-search",
								"onUpdate:modelValue": onSearch
							}, {
								prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
								_: 1
							}, 8, [
								"model-value",
								"class",
								"placeholder"
							])) : createCommentVNode("", true),
							props.uiConfig.sortEnabled ? (openBlock(), createElementBlock("div", {
								key: 1,
								class: normalizeClass(_ctx.$style["sort-and-filter"])
							}, [createVNode(unref(N8nSelect_default), {
								modelValue: sortBy.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => sortBy.value = $event),
								size: "small",
								class: normalizeClass(_ctx.$style.resourceList),
								"data-test-id": "resources-list-sort",
								onChange: _cache[1] || (_cache[1] = ($event) => setSorting(sortBy.value))
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.sortOptions, (sortOption) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: sortOption,
										"data-test-id": "resources-list-sort-item",
										value: sortOption,
										label: unref(getResourceText)(`sort.${sortOption}`, `sort.${sortOption}`)
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue", "class"])], 2)) : createCommentVNode("", true),
							props.uiConfig.showFiltersDropdown ? (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass(_ctx.$style["sort-and-filter"])
							}, [createVNode(ResourceFiltersDropdown_default, {
								keys: filterKeys.value,
								reset: resetFilters,
								"model-value": filtersModel.value,
								shareable: __props.shareable,
								"just-icon": true,
								"onUpdate:modelValue": onUpdateFilters,
								"onUpdate:filtersLength": onUpdateFiltersLength
							}, {
								default: withCtx((resourceFiltersSlotProps) => [renderSlot(_ctx.$slots, "filters", normalizeProps(guardReactiveProps(resourceFiltersSlotProps)))]),
								_: 3
							}, 8, [
								"keys",
								"model-value",
								"shareable"
							]), renderSlot(_ctx.$slots, "add-button")], 2)) : createCommentVNode("", true)
						], 2)], 2),
						renderSlot(_ctx.$slots, "callout"),
						props.uiConfig.showFiltersDropdown ? withDirectives((openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nInfoTip_default), { bold: false }, {
							default: withCtx(() => [createTextVNode(toDisplayString(hasOnlyFiltersThatShowMoreResults.value ? unref(getResourceText)("filters.active.shortText", "filters.active.shortText") : unref(getResourceText)("filters.active", "filters.active")) + " ", 1), createVNode(unref(N8nLink_default), {
								"data-test-id": "workflows-filter-reset",
								size: "small",
								onClick: resetFilters
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(getResourceText)("filters.active.reset", "filters.active.reset")), 1)]),
								_: 1
							})]),
							_: 1
						})], 512)), [[vShow, hasFilters.value]]) : createCommentVNode("", true),
						_cache[2] || (_cache[2] = createBaseVNode("div", { class: "pb-xs" }, null, -1))
					]),
					default: withCtx(() => [
						renderSlot(_ctx.$slots, "preamble"),
						__props.resourcesRefreshing ? (openBlock(), createBlock(ResourcesListSkeleton_default, {
							key: 0,
							rows: rowsPerPage.value,
							immediate: ""
						}, null, 8, ["rows"])) : filteredAndSortedResources.value.length > 0 || slots["list-prepend"] ? (openBlock(), createElementBlock("div", {
							key: 1,
							ref_key: "listWrapperRef",
							ref: listWrapperRef,
							"data-test-id": "resources-list-wrapper",
							class: normalizeClass(_ctx.$style.listWrapper)
						}, [__props.type === "list-full" ? (openBlock(), createBlock(unref(N8nRecycleScroller_default), {
							key: 0,
							"data-test-id": "resources-list",
							items: filteredAndSortedResources.value,
							"item-size": itemSize(),
							"item-key": "id"
						}, {
							default: withCtx(({ item, updateItemSize }) => [renderSlot(_ctx.$slots, "default", {
								data: item,
								updateItemSize
							})]),
							_: 3
						}, 8, ["items", "item-size"])) : __props.type === "list-paginated" ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.paginatedListWrapper),
							"data-test-id": "paginated-list"
						}, [createBaseVNode("div", {
							ref_key: "listItemsRef",
							ref: listItemsRef,
							class: normalizeClass(_ctx.$style.listItems)
						}, [renderSlot(_ctx.$slots, "list-prepend"), (openBlock(true), createElementBlock(Fragment, null, renderList(__props.resources, (item, index) => {
							return openBlock(), createElementBlock("div", {
								key: index,
								class: normalizeClass(_ctx.$style.listItem)
							}, [renderSlot(_ctx.$slots, "item", {
								item,
								index
							}, () => [createTextVNode(toDisplayString(item), 1)])], 2);
						}), 128))], 2), !slots["list-prepend"] || __props.totalItems > 0 ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.listPagination)
						}, [createVNode(unref(N8nPagination_default), {
							page: currentPage.value,
							"items-per-page": rowsPerPage.value,
							total: __props.totalItems,
							"page-sizes": __props.availablePageSizeOptions,
							"data-test-id": "resources-list-pagination",
							"onUpdate:page": setCurrentPage,
							"onUpdate:itemsPerPage": setRowsPerPage
						}, null, 8, [
							"page",
							"items-per-page",
							"total",
							"page-sizes"
						])], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true), __props.type === "datatable" ? (openBlock(), createBlock(unref(N8nDatatable_default), {
							key: 2,
							"data-test-id": "resources-table",
							class: normalizeClass(_ctx.$style.datatable),
							columns: getColumns(),
							rows: filteredAndSortedResources.value,
							"current-page": currentPage.value,
							"rows-per-page": rowsPerPage.value,
							"onUpdate:currentPage": setCurrentPage,
							"onUpdate:rowsPerPage": setRowsPerPage
						}, {
							row: withCtx(({ columns, row }) => [renderSlot(_ctx.$slots, "default", {
								data: row,
								columns
							})]),
							postdata: withCtx(() => [renderSlot(_ctx.$slots, "postdata")]),
							_: 3
						}, 8, [
							"class",
							"columns",
							"rows",
							"current-page",
							"rows-per-page"
						])) : createCommentVNode("", true)], 2)) : hasAppliedFilters() || filtersModel.value.search !== "" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 2,
							color: "text-base",
							size: "medium",
							"data-test-id": "resources-list-empty"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(getResourceText)("noResults", "noResults")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						renderSlot(_ctx.$slots, "postamble")
					]),
					_: 3
				}))], 64))]),
				_: 3
			});
		};
	}
}), [["__cssModules", { "$style": {
	"filters-row": "_filters-row_1bzm6_122",
	filters: "_filters_1bzm6_122",
	"sort-and-filter": "_sort-and-filter_1bzm6_140",
	search: "_search_1bzm6_161",
	listWrapper: "_listWrapper_1bzm6_171",
	paginatedListWrapper: "_paginatedListWrapper_1bzm6_177",
	listItems: "_listItems_1bzm6_185",
	listPagination: "_listPagination_1bzm6_213",
	datatable: "_datatable_1bzm6_228"
} }]]);
//#endregion
export { ResourcesListLayout_default as t };
