import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GS as EnterpriseEditionFeature, Nj as N8nPopover_default, SN as _plugin_vue_export_helper_default, fN as N8nTooltip_default, gM as N8nInputLabel_default, gm as useAvailableProjectSearch, hM as N8nLink_default, jN as useI18n, nN as N8nBadge_default, vm as useProjectsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as EnterpriseEdition_ee_default } from "./EnterpriseEdition.ee-Bv-_EZth.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
//#region src/app/components/forms/ResourceFiltersDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ResourceFiltersDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ResourceFiltersDropdown",
	props: {
		modelValue: { default: () => ({}) },
		keys: { default: () => [] },
		shareable: {
			type: Boolean,
			default: true
		},
		reset: {
			type: Function,
			default: () => {}
		},
		justIcon: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue", "update:filtersLength"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const projectsStore = useProjectsStore();
		const i18n = useI18n();
		const searchFn = useAvailableProjectSearch();
		const pickedProject = ref(null);
		const selectedProject = computed({
			get: () => {
				const homeProjectId = props.modelValue.homeProject;
				if (!homeProjectId) return null;
				if (pickedProject.value?.id === homeProjectId) return pickedProject.value;
				return projectsStore.availableProjects.find((project) => project.id === homeProjectId) ?? null;
			},
			set: (value) => {
				pickedProject.value = value;
				setKeyValue("homeProject", value?.id ?? "");
			}
		});
		const filtersLength = computed(() => {
			let length = 0;
			props.keys.forEach((key) => {
				if (key === "search") return;
				const value = props.modelValue[key];
				if (value === true) length += 1;
				if (Array.isArray(value) && value.length) length += 1;
				if (typeof value === "string" && value !== "") length += 1;
			});
			return length;
		});
		const hasFilters = computed(() => filtersLength.value > 0);
		const setKeyValue = (key, value) => {
			const filters = {
				...props.modelValue,
				[key]: value
			};
			emit("update:modelValue", filters);
		};
		const resetFilters = () => {
			if (props.reset) props.reset();
			else {
				const filters = { ...props.modelValue };
				props.keys.forEach((key) => {
					filters[key] = Array.isArray(props.modelValue[key]) ? [] : "";
				});
				emit("update:modelValue", filters);
			}
			selectedProject.value = null;
		};
		const shouldBeIconButton = computed(() => {
			return props.justIcon && !hasFilters.value;
		});
		watch(filtersLength, (value) => {
			emit("update:filtersLength", value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				width: "304px",
				"content-class": _ctx.$style["popover-content"],
				align: "end"
			}, {
				trigger: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style["trigger-wrapper"]) }, [createVNode(unref(N8nTooltip_default), null, {
					content: withCtx(() => [..._cache[1] || (_cache[1] = [createTextVNode(" Filters ", -1)])]),
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						icon: "funnel",
						size: "medium",
						iconOnly: shouldBeIconButton.value,
						active: hasFilters.value,
						"aria-label": unref(i18n).baseText("forms.resourceFiltersDropdown.filters"),
						class: normalizeClass({
							[_ctx.$style["filter-button"]]: true,
							[_ctx.$style["no-label"]]: __props.justIcon && filtersLength.value === 0
						}),
						"data-test-id": "resources-list-filters-trigger"
					}, {
						default: withCtx(() => [filtersLength.value > 0 ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							class: normalizeClass(_ctx.$style["filter-button-count"]),
							"data-test-id": "resources-list-filters-count",
							variant: "primary"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(filtersLength.value), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true), !__props.justIcon ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass(_ctx.$style["filter-button-text"])
						}, toDisplayString(unref(i18n).baseText("forms.resourceFiltersDropdown.filters")), 3)) : createCommentVNode("", true)]),
						_: 1
					}, 8, [
						"iconOnly",
						"active",
						"aria-label",
						"class"
					])]),
					_: 1
				})], 2)]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["filters-dropdown"]),
					"data-test-id": "resources-list-filters-dropdown"
				}, [
					renderSlot(_ctx.$slots, "default", {
						filters: __props.modelValue,
						setKeyValue
					}),
					__props.shareable && unref(projectsStore).isProjectHome ? (openBlock(), createBlock(EnterpriseEdition_ee_default, {
						key: 0,
						features: [unref(EnterpriseEditionFeature).Sharing]
					}, {
						default: withCtx(() => [createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("forms.resourceFiltersDropdown.owner"),
							bold: false,
							size: "small",
							color: "text-base",
							class: "mb-3xs"
						}, null, 8, ["label"]), createVNode(ProjectSharing_default, {
							modelValue: selectedProject.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedProject.value = $event),
							"search-fn": unref(searchFn),
							"show-suffix": "",
							placeholder: unref(i18n).baseText("forms.resourceFiltersDropdown.owner.placeholder"),
							"empty-options-text": unref(i18n).baseText("projects.sharing.noMatchingProjects")
						}, null, 8, [
							"modelValue",
							"search-fn",
							"placeholder",
							"empty-options-text"
						])]),
						_: 1
					}, 8, ["features"])) : createCommentVNode("", true),
					hasFilters.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass([_ctx.$style["filters-dropdown-footer"], "mt-s"])
					}, [createVNode(unref(N8nLink_default), { onClick: resetFilters }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("forms.resourceFiltersDropdown.reset")), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 3
			}, 8, ["content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	"filter-button": "_filter-button_1nsdc_1",
	"filter-button-count": "_filter-button-count_1nsdc_1",
	"filter-button-text": "_filter-button-text_1nsdc_6",
	"filters-dropdown-footer": "_filters-dropdown-footer_1nsdc_14",
	"popover-content": "_popover-content_1nsdc_20",
	"trigger-wrapper": "_trigger-wrapper_1nsdc_24"
} }]]);
//#endregion
export { ResourceFiltersDropdown_default as t };
