import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Xf as unref, ff as openBlock } from "./vendor-Hx42-oQF.js";
import { Rp as useAnnotationTagsStore, dC as useToast, jN as useI18n, l_ as ANNOTATION_TAGS_MANAGER_MODAL_KEY } from "./app-D5flEmb-.js";
import { t as useAnnotationTagPermissions } from "./useTagPermissions-Dgd_j6Mj.js";
import { t as TagsManager_default } from "./TagsManager-Dmwv7IX4.js";
//#region src/features/shared/tags/components/TagsManager/AnnotationTagsManager.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/shared/tags/components/TagsManager/AnnotationTagsManager.ee.vue
var AnnotationTagsManager_ee_default = /* @__PURE__ */ defineComponent({
	__name: "AnnotationTagsManager.ee",
	setup(__props) {
		const i18n = useI18n();
		const { showError, showMessage } = useToast();
		const tagsStore = useAnnotationTagsStore();
		const { canCreate, canUpdate, canDelete } = useAnnotationTagPermissions();
		const tags = computed(() => tagsStore.allTags);
		const isLoading = computed(() => tagsStore.isLoading);
		async function fetchTags() {
			try {
				await tagsStore.fetchAll({
					force: true,
					withUsageCount: true
				});
			} catch (error) {
				showError(error, i18n.baseText("tagsManager.showError.onFetch.title"), { message: i18n.baseText("tagsManager.showError.onFetch.message") });
			}
		}
		async function createTag(name) {
			try {
				return await tagsStore.create(name);
			} catch (error) {
				const escapedName = escape(name);
				showError(error, i18n.baseText("tagsManager.showError.onCreate.title"), { message: i18n.baseText("tagsManager.showError.onCreate.message", { interpolate: { escapedName } }) + ":" });
				throw error;
			}
		}
		async function updateTag(id, name) {
			try {
				const updatedTag = await tagsStore.rename({
					id,
					name
				});
				showMessage({
					title: i18n.baseText("tagsManager.showMessage.onUpdate.title"),
					type: "success"
				});
				return updatedTag;
			} catch (error) {
				const escapedName = escape(name);
				showError(error, i18n.baseText("tagsManager.showError.onUpdate.title"), { message: i18n.baseText("tagsManager.showError.onUpdate.message", { interpolate: { escapedName } }) + ":" });
				throw error;
			}
		}
		async function deleteTag(id) {
			try {
				const deleted = await tagsStore.deleteTagById(id);
				if (!deleted) throw new Error(i18n.baseText("tagsManager.couldNotDeleteTag"));
				showMessage({
					title: i18n.baseText("tagsManager.showMessage.onDelete.title"),
					type: "success"
				});
				return deleted;
			} catch (error) {
				const tag = tagsStore.tagsById[id];
				const escapedName = escape(tag?.name || "");
				showError(error, i18n.baseText("tagsManager.showError.onDelete.title"), { message: i18n.baseText("tagsManager.showError.onDelete.message", { interpolate: { escapedName } }) + ":" });
				throw error;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(TagsManager_default, {
				"title-locale-key": "annotationTagsManager.manageTags",
				"usage-locale-key": "annotationTagsView.inUse",
				"usage-column-title-locale-key": "annotationTagsView.usage",
				"no-tags-title-locale-key": "noAnnotationTagsView.title",
				"no-tags-description-locale-key": "noAnnotationTagsView.description",
				"modal-key": unref(ANNOTATION_TAGS_MANAGER_MODAL_KEY),
				tags: tags.value,
				"is-loading": isLoading.value,
				"can-create": unref(canCreate),
				"can-update": unref(canUpdate),
				"can-delete": unref(canDelete),
				"on-fetch-tags": fetchTags,
				"on-create-tag": createTag,
				"on-update-tag": updateTag,
				"on-delete-tag": deleteTag
			}, null, 8, [
				"modal-key",
				"tags",
				"is-loading",
				"can-create",
				"can-update",
				"can-delete"
			]);
		};
	}
});
//#endregion
export { AnnotationTagsManager_ee_default as default };
