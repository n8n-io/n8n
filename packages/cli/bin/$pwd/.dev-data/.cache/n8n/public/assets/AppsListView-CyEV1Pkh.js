import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Ho as RouterLink, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, vf as resolveDynamicComponent, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $s as useCreateApp, Ks as listApps, NM as N8nCard_default, SN as _plugin_vue_export_helper_default, Zg as projectPermissions, _N as N8nText_default, bC as useRootStore, by as useDebounce, dC as useToast, eC as DEBOUNCE_TIME, ec as APPS_SORT_MAP, gj as N8nTimeAgo_default, jN as useI18n, nN as N8nBadge_default, o_ as use, rc as getAppPermissions, s_ as get, tc as APP_DETAIL_VIEW, xM as N8nEmptyState_default, xN as N8nIcon_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { t as AppActions_default } from "./AppActions-yjUFQV4k.js";
//#region ../../modules/apps/frontend/src/components/AppCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var AppCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AppCard",
	props: { app: {} },
	emits: ["deleted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const isPublished = computed(() => props.app.publishedVersionId !== null);
		const appRoute = computed(() => ({
			name: APP_DETAIL_VIEW,
			params: {
				projectId: props.app.projectId,
				appId: props.app.id
			}
		}));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RouterLink), {
				to: appRoute.value,
				class: normalizeClass(_ctx.$style.link),
				"data-test-id": "app-card-link"
			}, {
				default: withCtx(() => [createVNode(unref(N8nCard_default), {
					class: normalizeClass(_ctx.$style.card),
					"data-test-id": "app-card"
				}, {
					prepend: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "layout-template",
						size: "large"
					})]),
					header: withCtx(() => [createVNode(unref(N8nText_default), {
						tag: "h2",
						bold: "",
						class: normalizeClass(_ctx.$style.heading),
						"data-test-id": "app-card-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.app.name), 1)]),
						_: 1
					}, 8, ["class"])]),
					append: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.actions),
						onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop", "prevent"]))
					}, [createVNode(unref(N8nBadge_default), {
						variant: isPublished.value ? "success" : "outline",
						"data-test-id": "app-card-publication"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isPublished.value ? "apps.card.published" : "apps.card.draft")), 1)]),
						_: 1
					}, 8, ["variant"]), createVNode(AppActions_default, {
						app: __props.app,
						onDeleted: _cache[0] || (_cache[0] = ($event) => emit("deleted", $event))
					}, null, 8, ["app"])], 2)]),
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.description) }, [
						createBaseVNode("span", null, toDisplayString(__props.app.namespace), 1),
						_cache[2] || (_cache[2] = createBaseVNode("span", null, "|", -1)),
						createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(`apps.card.visibility.${__props.app.visibility}`)), 1),
						_cache[3] || (_cache[3] = createBaseVNode("span", null, "|", -1)),
						createBaseVNode("span", null, [createTextVNode(toDisplayString(unref(i18n).baseText("apps.card.updated")) + " ", 1), createVNode(unref(N8nTimeAgo_default), {
							date: __props.app.updatedAt,
							locale: unref(rootStore).defaultLocale
						}, null, 8, ["date", "locale"])])
					], 2)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["to", "class"]);
		};
	}
}), [["__cssModules", { "$style": {
	link: "_link_g4r6b_1",
	card: "_card_g4r6b_7",
	heading: "_heading_g4r6b_13",
	description: "_description_g4r6b_19",
	actions: "_actions_g4r6b_29"
} }]]);
//#endregion
//#region ../../modules/apps/frontend/src/views/AppsListView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/apps/frontend/src/views/AppsListView.vue
var AppsListView_default = /* @__PURE__ */ defineComponent({
	__name: "AppsListView",
	setup(__props) {
		const i18n = useI18n();
		const route = useRoute();
		const rootStore = useRootStore();
		const toast = useToast();
		const { debounce } = useDebounce();
		const latestFetch = useLatestFetch();
		const { createApp } = useCreateApp();
		const projectPermissions$1 = use(projectPermissions);
		const ResourcesListLayout = computed(() => get("resources-list-layout"));
		const ProjectHeader = computed(() => get("project-header"));
		const InsightsSummary = computed(() => get("insights-summary"));
		const layout = useTemplateRef("layout");
		const projectId = computed(() => typeof route.params.projectId === "string" ? route.params.projectId : void 0);
		const createProjectId = computed(() => projectId.value ?? projectPermissions$1.defaultProjectId?.());
		const canCreateApp = computed(() => {
			const id = createProjectId.value;
			return id !== void 0 && getAppPermissions(id).canCreate;
		});
		function onCreateApp() {
			if (createProjectId.value) createApp(createProjectId.value);
		}
		const apps = ref([]);
		const totalApps = ref(0);
		const loading = ref(true);
		const hasApps = ref(false);
		const filters = ref({
			search: "",
			homeProject: ""
		});
		const currentPage = ref(1);
		const pageSize = ref(50);
		const currentSort = ref("updatedAt:desc");
		function isSortKey(key) {
			return Object.hasOwn(APPS_SORT_MAP, key);
		}
		async function fetchApps() {
			const isLatest = latestFetch.next();
			const search = filters.value.search;
			let loadingTimer;
			if (apps.value.length > 0) loadingTimer = setTimeout(() => {
				if (isLatest()) loading.value = true;
			}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
			else loading.value = true;
			try {
				const { data, count } = await listApps(rootStore.restApiContext, projectId.value, {
					skip: (currentPage.value - 1) * pageSize.value,
					take: pageSize.value,
					sortBy: currentSort.value,
					name: search || void 0
				});
				if (!isLatest()) return;
				apps.value = data;
				totalApps.value = count;
				if (!search || count > 0) hasApps.value = count > 0;
			} catch (error) {
				if (!isLatest()) return;
				toast.showError(error, i18n.baseText("apps.list.error"));
			} finally {
				clearTimeout(loadingTimer);
			}
			loading.value = false;
		}
		const fetchAppsDebounced = debounce(fetchApps, {
			debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
			trailing: true
		});
		async function scheduleFetch() {
			latestFetch.invalidate();
			await fetchAppsDebounced();
		}
		async function initialize() {
			fetchAppsDebounced.cancel();
			await fetchApps();
		}
		async function onSearchUpdated(value) {
			filters.value = {
				...filters.value,
				search: value
			};
			currentPage.value = 1;
			await scheduleFetch();
		}
		async function onPaginationAndSortUpdated(payload) {
			if (payload.page) currentPage.value = payload.page;
			if (payload.pageSize) pageSize.value = payload.pageSize;
			if (payload.sort && isSortKey(payload.sort)) currentSort.value = APPS_SORT_MAP[payload.sort];
			await scheduleFetch();
		}
		function removeApp(appId) {
			if (!apps.value.some((app) => app.id === appId)) return;
			apps.value = apps.value.filter((app) => app.id !== appId);
			totalApps.value = Math.max(0, totalApps.value - 1);
		}
		async function onAppDeleted(appId) {
			if (apps.value.length === 1 && apps.value[0].id === appId && currentPage.value > 1 && layout.value) {
				await layout.value.setCurrentPage(currentPage.value - 1);
				await initialize();
				removeApp(appId);
				return;
			}
			removeApp(appId);
			await fetchApps();
		}
		return (_ctx, _cache) => {
			return ResourcesListLayout.value ? (openBlock(), createBlock(resolveDynamicComponent(ResourcesListLayout.value), {
				key: 0,
				ref_key: "layout",
				ref: layout,
				filters: filters.value,
				"onUpdate:filters": _cache[0] || (_cache[0] = ($event) => filters.value = $event),
				"resource-key": "apps",
				type: "list-paginated",
				"tab-key": "apps",
				resources: apps.value,
				initialize,
				loading: false,
				"resources-refreshing": loading.value,
				disabled: false,
				"sort-options": Object.keys(unref(APPS_SORT_MAP)),
				"type-props": { itemSize: 80 },
				"custom-page-size": unref(50),
				"total-items": totalApps.value,
				"dont-perform-sorting-and-filtering": true,
				"has-empty-state": !hasApps.value,
				shareable: false,
				"ui-config": {
					searchEnabled: true,
					showFiltersDropdown: false,
					sortEnabled: true
				},
				"onUpdate:search": onSearchUpdated,
				"onUpdate:paginationAndSort": onPaginationAndSortUpdated
			}, {
				header: withCtx(() => [ProjectHeader.value ? (openBlock(), createBlock(resolveDynamicComponent(ProjectHeader.value), {
					key: 0,
					"main-button": "app"
				}, {
					default: withCtx(() => [InsightsSummary.value && !projectId.value ? (openBlock(), createBlock(resolveDynamicComponent(InsightsSummary.value), { key: 0 })) : createCommentVNode("", true)]),
					_: 1
				})) : createCommentVNode("", true)]),
				empty: withCtx(() => [createVNode(unref(N8nEmptyState_default), {
					icon: {
						type: "icon",
						value: "layout-template"
					},
					heading: unref(i18n).baseText("apps.empty.heading"),
					description: unref(i18n).baseText("apps.empty.description"),
					"button-text": unref(i18n).baseText("apps.create"),
					"button-disabled": !canCreateApp.value,
					"data-test-id": "apps-empty-state",
					"onClick:button": onCreateApp
				}, null, 8, [
					"heading",
					"description",
					"button-text",
					"button-disabled"
				])]),
				item: withCtx(({ item }) => [createVNode(AppCard_default, {
					class: "mb-2xs",
					app: item,
					onDeleted: onAppDeleted
				}, null, 8, ["app"])]),
				_: 1
			}, 40, [
				"filters",
				"resources",
				"resources-refreshing",
				"sort-options",
				"custom-page-size",
				"total-items",
				"has-empty-state"
			])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { AppsListView_default as default };
