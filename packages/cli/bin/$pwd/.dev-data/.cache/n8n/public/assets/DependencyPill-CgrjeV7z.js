import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, SN as _plugin_vue_export_helper_default, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, nN as N8nBadge_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { t as useDependencies } from "./useDependencies-C0z0nXRY.js";
import { t as useDependencyMenu } from "./useDependencyMenu-CpPxGA6t.js";
//#region src/app/components/DependencyPill.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var MIN_ITEMS_FOR_SEARCH = 6;
var DependencyPill_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DependencyPill",
	props: {
		resourceType: {},
		resourceId: {},
		totalCount: {},
		source: {},
		dataTestId: {},
		inDialog: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const { getDependencies, fetchDependencies, getDependencyCount } = useDependencies();
		const { buildDependencyMenuItems, resolveDependencyMenuId, openDependency } = useDependencyMenu();
		const isLoadingDetails = ref(false);
		const depsResult = computed(() => getDependencies(props.resourceId, props.resourceType));
		const effectiveCount = computed(() => getDependencyCount(props.resourceId, props.resourceType));
		const hasHiddenDeps = computed(() => (depsResult.value?.inaccessibleCount ?? 0) > 0);
		const tooltipText = computed(() => i18n.baseText(`workflows.dependencies.tooltip.${props.resourceType}`));
		const showSearch = computed(() => (depsResult.value?.dependencies.length ?? 0) >= MIN_ITEMS_FOR_SEARCH);
		const searchTerm = ref("");
		const menuItems = computed(() => buildDependencyMenuItems(depsResult.value?.dependencies ?? [], searchTerm.value));
		function onSelect(value) {
			const dep = resolveDependencyMenuId(depsResult.value?.dependencies ?? [], value);
			if (!dep) return;
			telemetry.track("User clicked dependency pill item", {
				source: props.source,
				dependency_type: dep.type,
				dependency_count: effectiveCount.value
			});
			openDependency(dep);
		}
		function onSearch(term) {
			searchTerm.value = term;
		}
		async function loadDetails() {
			await fetchDependencies([props.resourceId], props.resourceType);
		}
		async function onDropdownToggle(open) {
			if (open) {
				telemetry.track("User opened dependency pill", {
					source: props.source,
					dependency_count: effectiveCount.value
				});
				if (!isLoadingDetails.value) {
					isLoadingDetails.value = true;
					await loadDetails();
					isLoadingDetails.value = false;
				}
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				items: menuItems.value,
				placement: "bottom-end",
				loading: isLoadingDetails.value,
				"loading-item-count": 1,
				searchable: showSearch.value,
				"extra-popper-class": __props.inDialog ? void 0 : "dependency-pill-dropdown",
				"search-placeholder": unref(i18n).baseText("workflows.dependencies.search.placeholder"),
				"max-height": 280,
				"data-test-id": __props.dataTestId,
				onSelect,
				onSearch,
				"onUpdate:modelValue": onDropdownToggle
			}, createSlots({
				trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					content: tooltipText.value,
					placement: "top",
					"as-child": ""
				}, {
					default: withCtx(() => [createVNode(unref(N8nBadge_default), {
						variant: "outline",
						clickable: ""
					}, {
						leading: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "graph-12",
							size: "small",
							class: normalizeClass(_ctx.$style.icon)
						}, null, 8, ["class"])]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(effectiveCount.value), 1)]),
						_: 1
					})]),
					_: 1
				}, 8, ["content"])]),
				_: 2
			}, [hasHiddenDeps.value ? {
				name: "footer",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.hiddenNotice) }, toDisplayString(unref(i18n).baseText("workflows.dependencies.hiddenNotice", {
					adjustToNumber: depsResult.value.inaccessibleCount,
					interpolate: { count: String(depsResult.value.inaccessibleCount) }
				})), 3)]),
				key: "0"
			} : void 0]), 1032, [
				"items",
				"loading",
				"searchable",
				"extra-popper-class",
				"search-placeholder",
				"data-test-id"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	icon: "_icon_5gs8z_2",
	hiddenNotice: "_hiddenNotice_5gs8z_7"
} }]]);
//#endregion
export { DependencyPill_default as t };
