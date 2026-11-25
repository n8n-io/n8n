import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, jN as useI18n, mM as N8nOption_default, oc as useFoldersStore, pM as N8nSelect_default, tN as N8nLoading_default, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/features/core/folders/components/MoveToFolderDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["title", "data-resourceid"];
var maxPathLength = 4;
var separator$1 = "/";
var MoveToFolderDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MoveToFolderDropdown",
	props: {
		selectedLocation: { default: null },
		selectedProjectId: {},
		currentProjectId: { default: void 0 },
		currentFolderId: { default: void 0 },
		parentFolderId: { default: void 0 },
		resourceType: { default: "workflow" },
		teleported: {
			type: Boolean,
			default: true
		},
		inputId: { default: void 0 },
		autofocus: {
			type: Boolean,
			default: false
		}
	},
	emits: ["location:selected", "load:error"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const foldersStore = useFoldersStore();
		const moveFolderDropdown = useTemplateRef("moveFolderDropdown");
		watch(moveFolderDropdown, (select) => {
			if (props.autofocus) select?.focus();
		}, { flush: "post" });
		const availableLocations = ref([]);
		const selectedLocationId = computed({
			get: () => props.selectedLocation?.id ?? null,
			set: (id) => {
				const location = availableLocations.value.find((f) => f.id === id);
				if (!location) return;
				emit("location:selected", location);
			}
		});
		const loading = ref(false);
		const initialLoading = ref(true);
		const inPlacePopperOptions = { strategy: "fixed" };
		let generation = 0;
		const fetchAvailableLocations = async (query) => {
			const requestGeneration = ++generation;
			loading.value = true;
			try {
				const folders = await foldersStore.fetchFoldersAvailableForMove(props.selectedProjectId, props.currentFolderId, { name: query ?? void 0 }, props.resourceType);
				if (requestGeneration !== generation) return;
				if (!props.parentFolderId) availableLocations.value = folders;
				else availableLocations.value = folders.filter((folder) => folder.id !== props.parentFolderId);
				const rootFolderName = i18n.baseText("folders.move.project.root.name");
				const isQueryMatchesRoot = !query || rootFolderName.toLowerCase().includes(query?.toLowerCase());
				const projectRoot = {
					id: props.selectedProjectId,
					name: rootFolderName,
					resource: "project",
					createdAt: "",
					updatedAt: "",
					workflowCount: 0,
					subFolderCount: 0,
					path: []
				};
				if (isQueryMatchesRoot) availableLocations.value.unshift(projectRoot);
				if (!query && !props.selectedLocation) emit("location:selected", projectRoot);
			} catch (cause) {
				if (requestGeneration === generation) emit("load:error", cause);
			} finally {
				if (requestGeneration === generation) {
					loading.value = false;
					initialLoading.value = false;
				}
			}
		};
		watch(() => [
			props.selectedProjectId,
			props.currentFolderId,
			props.parentFolderId,
			props.resourceType
		], () => {
			availableLocations.value = [];
			initialLoading.value = true;
			fetchAvailableLocations();
		}, { immediate: true });
		const isTopLevelFolder = (location, index) => {
			return index === location.path.length - 1 || index >= 3;
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style["move-folder-dropdown"]),
				"data-test-id": "move-to-folder-dropdown"
			}, [initialLoading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				rows: 1,
				class: normalizeClass(_ctx.$style["loading-skeleton"])
			}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nSelect_default), {
				key: 1,
				ref_key: "moveFolderDropdown",
				ref: moveFolderDropdown,
				id: __props.inputId,
				modelValue: selectedLocationId.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedLocationId.value = $event),
				filterable: true,
				remote: true,
				"remote-method": fetchAvailableLocations,
				loading: loading.value,
				teleported: __props.teleported,
				"popper-options": __props.teleported ? void 0 : inPlacePopperOptions,
				placeholder: unref(i18n).baseText("folders.move.modal.folder.placeholder"),
				"no-data-text": unref(i18n).baseText("folders.move.modal.folder.noData.label"),
				"option-label": "name",
				"option-value": "id"
			}, {
				prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(availableLocations.value, (location) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: location.id,
						value: location.id,
						label: location.name,
						"data-test-id": "move-to-folder-option"
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["folder-select-item"]) }, [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.list) }, [location.resource === "project" ? (openBlock(), createElementBlock("li", {
							key: 0,
							class: normalizeClass(_ctx.$style.current)
						}, [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(location.name), 1)]),
							_: 2
						}, 1024)], 2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
							location.path.length > maxPathLength ? (openBlock(), createElementBlock("li", {
								key: 0,
								class: normalizeClass(_ctx.$style.item)
							}, [createVNode(unref(N8nText_default), null, {
								default: withCtx(() => [..._cache[1] || (_cache[1] = [createTextVNode("...", -1)])]),
								_: 1
							})], 2)) : createCommentVNode("", true),
							location.path.length > 0 ? (openBlock(), createElementBlock("li", {
								key: 1,
								class: normalizeClass(_ctx.$style.separator)
							}, [createVNode(unref(N8nText_default), null, {
								default: withCtx(() => [createTextVNode(toDisplayString(separator$1))]),
								_: 1
							})], 2)) : createCommentVNode("", true),
							(openBlock(true), createElementBlock(Fragment, null, renderList(location.path.slice(-4), (fragment, index) => {
								return openBlock(), createElementBlock(Fragment, { key: `${location.id}-${index}` }, [createBaseVNode("li", {
									class: normalizeClass({
										[_ctx.$style.item]: true,
										[_ctx.$style.current]: isTopLevelFolder(location, index)
									}),
									title: fragment,
									"data-resourceid": fragment,
									"data-test-id": "breadcrumbs-item",
									"data-target": "folder-breadcrumb-item"
								}, [createVNode(unref(N8nText_default), null, {
									default: withCtx(() => [createTextVNode(toDisplayString(fragment), 1)]),
									_: 2
								}, 1024)], 10, _hoisted_1), !isTopLevelFolder(location, index) ? (openBlock(), createElementBlock("li", {
									key: 0,
									class: normalizeClass(_ctx.$style.separator)
								}, [createVNode(unref(N8nText_default), null, {
									default: withCtx(() => [createTextVNode(toDisplayString(separator$1))]),
									_: 1
								})], 2)) : createCommentVNode("", true)], 64);
							}), 128))
						], 64))], 2)], 2)]),
						_: 2
					}, 1032, ["value", "label"]);
				}), 128))]),
				_: 1
			}, 8, [
				"id",
				"modelValue",
				"loading",
				"teleported",
				"popper-options",
				"placeholder",
				"no-data-text"
			]))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	"move-folder-dropdown": "_move-folder-dropdown_1uii7_1",
	"loading-skeleton": "_loading-skeleton_1uii7_6",
	"folder-select-item": "_folder-select-item_1uii7_15",
	list: "_list_1uii7_27",
	item: "_item_1uii7_33",
	current: "_current_1uii7_48",
	separator: "_separator_1uii7_52"
} }]]);
//#endregion
export { MoveToFolderDropdown_default as t };
