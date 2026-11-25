import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Rd as computed, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, Rp as useAnnotationTagsStore, l_ as ANNOTATION_TAGS_MANAGER_MODAL_KEY } from "./app-D5flEmb-.js";
import { t as TagsDropdown_default } from "./TagsDropdown-CTfHF4ee.js";
import { t as useAnnotationTagPermissions } from "./useTagPermissions-Dgd_j6Mj.js";
//#region src/features/shared/tags/components/AnnotationTagsDropdown.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/shared/tags/components/AnnotationTagsDropdown.ee.vue
var AnnotationTagsDropdown_ee_default = /* @__PURE__ */ defineComponent({
	__name: "AnnotationTagsDropdown.ee",
	props: {
		placeholder: { default: "" },
		modelValue: { default: () => [] },
		createEnabled: {
			type: Boolean,
			default: false
		},
		eventBus: { default: null }
	},
	emits: [
		"update:modelValue",
		"esc",
		"blur"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const tagsStore = useAnnotationTagsStore();
		const uiStore = useUIStore();
		const { canCreate: canCreateTag, canManage } = useAnnotationTagPermissions();
		const selectedTags = computed({
			get: () => props.modelValue,
			set: (value) => emit("update:modelValue", value)
		});
		const allTags = computed(() => tagsStore.allTags);
		const isLoading = computed(() => tagsStore.isLoading);
		const tagsById = computed(() => tagsStore.tagsById);
		const isCreateEnabled = computed(() => props.createEnabled && canCreateTag.value);
		const isManageEnabled = computed(() => canManage.value);
		async function createTag(name) {
			return await tagsStore.create(name);
		}
		function handleManageTags() {
			uiStore.openModal(ANNOTATION_TAGS_MANAGER_MODAL_KEY);
		}
		function handleEsc() {
			emit("esc");
		}
		function handleBlur() {
			emit("blur");
		}
		tagsStore.fetchAll();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(TagsDropdown_default, {
				modelValue: selectedTags.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedTags.value = $event),
				placeholder: __props.placeholder,
				"create-enabled": isCreateEnabled.value,
				"manage-enabled": isManageEnabled.value,
				"event-bus": __props.eventBus,
				"all-tags": allTags.value,
				"is-loading": isLoading.value,
				"tags-by-id": tagsById.value,
				"create-tag": createTag,
				onManageTags: handleManageTags,
				onEsc: handleEsc,
				onBlur: handleBlur
			}, null, 8, [
				"modelValue",
				"placeholder",
				"create-enabled",
				"manage-enabled",
				"event-bus",
				"all-tags",
				"is-loading",
				"tags-by-id"
			]);
		};
	}
});
//#endregion
export { AnnotationTagsDropdown_ee_default as t };
