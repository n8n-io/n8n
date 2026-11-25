import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Tf as watch, Vf as ref, Xf as unref, _p as normalizeClass, af as onBeforeMount, ff as openBlock, ip as init_shared_esm_bundler, nf as mergeModels, xf as useModel } from "./vendor-Hx42-oQF.js";
import { gm as useAvailableProjectSearch, jN as useI18n, vm as useProjectsStore } from "./app-D5flEmb-.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
//#region src/features/collaboration/projects/components/ProjectFilter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/collaboration/projects/components/ProjectFilter.vue
var ProjectFilter_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ProjectFilter",
	props: /*@__PURE__*/ mergeModels({
		placeholder: {},
		size: {}
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		/**
		* The slot contract is these props and the model — nothing else.
		*
		* Without this, an unknown attribute from a consumer falls through onto
		* `ProjectSharing` and can imitate the prop it misspelled: a `placeholder` typo
		* still reached the input as a bare attribute, so a broken contract rendered
		* correctly. `class` is forwarded explicitly because consumers style the picker
		* for their own layout.
		*/
		const model = useModel(__props, "modelValue");
		const i18n = useI18n();
		const projectsStore = useProjectsStore();
		const searchFn = useAvailableProjectSearch();
		const emailPattern = /^<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>$/;
		const filterFn = (project) => !!project.name && !emailPattern.test(project.name.trim());
		const selected = ref(null);
		/** The project the model's id refers to, if this caller can already see it. */
		const findProject = (id) => [...projectsStore.availableProjects, ...projectsStore.myProjects].find((project) => project.id === id) ?? null;
		watch(model, (value) => {
			if (!value) {
				selected.value = null;
				return;
			}
			if (selected.value?.id === value.id) return;
			selected.value = findProject(value.id);
		}, { immediate: true });
		watch(selected, (value) => {
			const next = value ? { id: value.id } : null;
			if (next?.id === model.value?.id) return;
			model.value = next;
		});
		onBeforeMount(async () => {
			if (!projectsStore.globalProjectPermissions.list) await projectsStore.getAvailableProjects();
			if (model.value && !selected.value) selected.value = findProject(model.value.id);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ProjectSharing_default, {
				modelValue: selected.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selected.value = $event),
				class: normalizeClass(_ctx.$attrs.class),
				"search-fn": unref(searchFn),
				"filter-fn": filterFn,
				placeholder: __props.placeholder,
				"empty-options-text": unref(i18n).baseText("projects.sharing.noMatchingProjects"),
				size: __props.size,
				clearable: "",
				onClear: _cache[1] || (_cache[1] = ($event) => selected.value = null)
			}, null, 8, [
				"modelValue",
				"class",
				"search-fn",
				"placeholder",
				"empty-options-text",
				"size"
			]);
		};
	}
});
//#endregion
export { ProjectFilter_default as default };
