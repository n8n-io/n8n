import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Rd as computed, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, u_ as TAGS_MANAGER_MODAL_KEY, zp as useTagsStore } from "./app-D5flEmb-.js";
import { t as TagsDropdown_default } from "./TagsDropdown-CTfHF4ee.js";
import { n as useTagPermissions } from "./useTagPermissions-Dgd_j6Mj.js";
//#region src/features/shared/tags/components/WorkflowTagsDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/shared/tags/components/WorkflowTagsDropdown.vue
var WorkflowTagsDropdown_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowTagsDropdown",
	props: {
		placeholder: { default: "" },
		modelValue: { default: () => [] },
		createEnabled: {
			type: Boolean,
			default: true
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
		const tagsStore = useTagsStore();
		const uiStore = useUIStore();
		const { canCreate, canManage } = useTagPermissions();
		const selectedTags = computed({
			get: () => props.modelValue,
			set: (value) => emit("update:modelValue", value)
		});
		const allTags = computed(() => tagsStore.allTags);
		const isLoading = computed(() => tagsStore.isLoading);
		const tagsById = computed(() => tagsStore.tagsById);
		const isCreateEnabled = computed(() => props.createEnabled && canCreate.value);
		const isManageEnabled = computed(() => canManage.value);
		const isCreateBlocked = computed(() => props.createEnabled && !canCreate.value);
		const createBlockedI18nKey = computed(() => isCreateBlocked.value ? "tagsDropdown.noPermissionToCreate" : void 0);
		async function createTag(name) {
			return await tagsStore.create(name);
		}
		function handleManageTags() {
			uiStore.openModal(TAGS_MANAGER_MODAL_KEY);
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
				"create-blocked-i18n-key": createBlockedI18nKey.value,
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
				"create-blocked-i18n-key",
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
export { WorkflowTagsDropdown_default as t };
