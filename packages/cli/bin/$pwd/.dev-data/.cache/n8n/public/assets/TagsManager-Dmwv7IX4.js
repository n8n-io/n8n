import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, $l as ElTable, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _f as resolveDirective, _p as normalizeClass, du as ElCol, eu as ElTableColumn, ff as openBlock, fu as ElRow, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, cN as Input_default, jM as createEventBus, jN as useI18n, vN as N8nIconButton_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/shared/tags/components/TagsManager/TagsView/TagsTableHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/shared/tags/components/TagsManager/TagsView/TagsTableHeader.vue
var TagsTableHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TagsTableHeader",
	props: {
		disabled: {
			type: Boolean,
			default: false
		},
		search: { default: "" },
		canCreate: {
			type: Boolean,
			default: true
		}
	},
	emits: ["searchChange", "createEnable"],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const emit = __emit;
		const maxLength = ref(24);
		const onAddNew = () => {
			emit("createEnable");
		};
		const onSearchChange = (search) => {
			emit("searchChange", search);
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElRow), { class: "tags-header" }, {
				default: withCtx(() => [createVNode(unref(ElCol), { span: 10 }, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						placeholder: unref(i18n).baseText("tagsTableHeader.searchTags"),
						"model-value": __props.search,
						disabled: __props.disabled,
						maxlength: maxLength.value,
						clearable: "",
						"onUpdate:modelValue": onSearchChange
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						_: 1
					}, 8, [
						"placeholder",
						"model-value",
						"disabled",
						"maxlength"
					])]),
					_: 1
				}), createVNode(unref(ElCol), { span: 14 }, {
					default: withCtx(() => [__props.canCreate ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						disabled: __props.disabled,
						icon: "plus",
						label: unref(i18n).baseText("tagsTableHeader.addNew"),
						size: "large",
						float: "right",
						onClick: onAddNew
					}, null, 8, ["disabled", "label"])) : createCommentVNode("", true)]),
					_: 1
				})]),
				_: 1
			});
		};
	}
}), [["__scopeId", "data-v-46463ec2"]]);
//#endregion
//#region src/features/shared/tags/components/TagsManager/TagsView/TagsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { key: 1 };
var INPUT_TRANSITION_TIMEOUT = 350;
var DELETE_TRANSITION_TIMEOUT = 100;
var TagsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TagsTable",
	props: {
		rows: {},
		isLoading: { type: Boolean },
		newName: {},
		isSaving: { type: Boolean },
		usageColumnTitleLocaleKey: { default: "tagsTable.usage" }
	},
	emits: [
		"updateEnable",
		"newNameChange",
		"deleteEnable",
		"cancelOperation",
		"applyOperation"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const table = ref(null);
		const nameInput = ref(null);
		const maxLength = ref(24);
		const getRowClasses = ({ row }) => {
			return row.disable ? "disabled" : "";
		};
		const getSpan = ({ row, columnIndex }) => {
			if (columnIndex === 0 && row.tag && row.delete) return {
				rowspan: 1,
				colspan: 2
			};
			if (columnIndex === 1 && row.tag && row.delete) return {
				rowspan: 0,
				colspan: 0
			};
			return {
				rowspan: 1,
				colspan: 1
			};
		};
		const enableUpdate = (row) => {
			if (row.tag) {
				emit("updateEnable", row.tag.id);
				emit("newNameChange", row.tag.name);
				focusOnInput();
			}
		};
		const enableDelete = (row) => {
			if (row.tag) {
				emit("deleteEnable", row.tag.id);
				focusOnDelete();
			}
		};
		const cancel = () => {
			emit("cancelOperation");
		};
		const apply = () => {
			emit("applyOperation");
		};
		const onNewNameChange = (name) => {
			emit("newNameChange", name);
		};
		const focusOnInput = () => {
			setTimeout(() => {
				if (nameInput.value?.focus) nameInput.value.focus();
			}, INPUT_TRANSITION_TIMEOUT);
		};
		const focusOnDelete = () => {
			setTimeout(() => {
				const inputRef = nameInput.value;
				if (inputRef?.focus) inputRef.focus();
			}, DELETE_TRANSITION_TIMEOUT);
		};
		const focusOnCreate = () => {
			const bodyWrapperRef = table.value?.$refs.bodyWrapper;
			if (bodyWrapperRef) bodyWrapperRef.scrollTop = 0;
			focusOnInput();
		};
		watch(() => props.rows, (newValue) => {
			if (newValue?.[0]?.create) focusOnCreate();
		});
		onMounted(() => {
			if (props.rows.length === 1 && props.rows[0].create) focusOnInput();
		});
		return (_ctx, _cache) => {
			const _directive_loading = resolveDirective("loading");
			return withDirectives((openBlock(), createBlock(unref(ElTable), {
				ref_key: "table",
				ref: table,
				class: normalizeClass(_ctx.$style["tags-table"]),
				stripe: "",
				"max-height": "450",
				"empty-text": unref(i18n).baseText("tagsTable.noMatchingTagsExist"),
				data: __props.rows,
				"span-method": getSpan,
				"row-class-name": getRowClasses
			}, {
				default: withCtx(() => [
					createVNode(unref(ElTableColumn), { label: unref(i18n).baseText("tagsTable.name") }, {
						default: withCtx((scope) => [(openBlock(), createElementBlock("div", {
							key: scope.row.id,
							class: normalizeClass(_ctx.$style.name),
							onKeydown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
						}, [createVNode(Transition, {
							name: "fade",
							mode: "out-in"
						}, {
							default: withCtx(() => [scope.row.create || scope.row.update ? (openBlock(), createBlock(unref(Input_default), {
								key: 0,
								ref_key: "nameInput",
								ref: nameInput,
								"model-value": __props.newName,
								maxlength: maxLength.value,
								"onUpdate:modelValue": onNewNameChange
							}, null, 8, ["model-value", "maxlength"])) : scope.row.delete ? (openBlock(), createElementBlock("span", _hoisted_1$1, [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("tagsTable.areYouSureYouWantToDeleteThisTag")), 1), createBaseVNode("input", {
								ref: "deleteHiddenInput",
								class: normalizeClass(_ctx.$style.hidden)
							}, null, 2)])) : (openBlock(), createElementBlock("span", {
								key: 2,
								class: normalizeClass({ [_ctx.$style.disabled]: scope.row.disable })
							}, toDisplayString(scope.row.tag.name), 3))]),
							_: 2
						}, 1024)], 34))]),
						_: 1
					}, 8, ["label"]),
					createVNode(unref(ElTableColumn), {
						label: unref(i18n).baseText(__props.usageColumnTitleLocaleKey),
						width: "170"
					}, {
						default: withCtx((scope) => [createVNode(Transition, {
							name: "fade",
							mode: "out-in"
						}, {
							default: withCtx(() => [!scope.row.create && !scope.row.delete ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass({ [_ctx.$style.disabled]: scope.row.disable })
							}, toDisplayString(scope.row.usage), 3)) : createCommentVNode("", true)]),
							_: 2
						}, 1024)]),
						_: 1
					}, 8, ["label"]),
					createVNode(unref(ElTableColumn), null, {
						default: withCtx((scope) => [createVNode(Transition, {
							name: "fade",
							mode: "out-in"
						}, {
							default: withCtx(() => [scope.row.create ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.ops)
							}, [createVNode(unref(N8nButton_default), {
								variant: "outline",
								label: unref(i18n).baseText("tagsTable.cancel"),
								disabled: __props.isSaving,
								onClick: withModifiers(cancel, ["stop"])
							}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
								label: unref(i18n).baseText("tagsTable.createTag"),
								loading: __props.isSaving,
								onClick: withModifiers(apply, ["stop"])
							}, null, 8, ["label", "loading"])], 2)) : scope.row.update ? (openBlock(), createElementBlock("div", {
								key: 1,
								class: normalizeClass(_ctx.$style.ops)
							}, [createVNode(unref(N8nButton_default), {
								variant: "outline",
								label: unref(i18n).baseText("tagsTable.cancel"),
								disabled: __props.isSaving,
								onClick: withModifiers(cancel, ["stop"])
							}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
								label: unref(i18n).baseText("tagsTable.saveChanges"),
								loading: __props.isSaving,
								onClick: withModifiers(apply, ["stop"])
							}, null, 8, ["label", "loading"])], 2)) : scope.row.delete ? (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass(_ctx.$style.ops)
							}, [createVNode(unref(N8nButton_default), {
								variant: "outline",
								label: unref(i18n).baseText("tagsTable.cancel"),
								disabled: __props.isSaving,
								onClick: withModifiers(cancel, ["stop"])
							}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
								label: unref(i18n).baseText("tagsTable.deleteTag"),
								loading: __props.isSaving,
								onClick: withModifiers(apply, ["stop"])
							}, null, 8, ["label", "loading"])], 2)) : !scope.row.disable ? (openBlock(), createElementBlock("div", {
								key: 3,
								class: normalizeClass([_ctx.$style.ops, _ctx.$style.main])
							}, [scope.row.canUpdate ? (openBlock(), createBlock(unref(N8nIconButton_default), {
								key: 0,
								title: unref(i18n).baseText("tagsTable.editTag"),
								icon: "pen",
								"data-test-id": "edit-tag-button",
								onClick: withModifiers(($event) => enableUpdate(scope.row), ["stop"])
							}, null, 8, ["title", "onClick"])) : createCommentVNode("", true), scope.row.canDelete ? (openBlock(), createBlock(unref(N8nIconButton_default), {
								key: 1,
								title: unref(i18n).baseText("tagsTable.deleteTag"),
								icon: "trash-2",
								"data-test-id": "delete-tag-button",
								onClick: withModifiers(($event) => enableDelete(scope.row), ["stop"])
							}, null, 8, ["title", "onClick"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
							_: 2
						}, 1024)]),
						_: 1
					})
				]),
				_: 1
			}, 8, [
				"class",
				"empty-text",
				"data"
			])), [[_directive_loading, __props.isLoading]]);
		};
	}
}), [["__cssModules", { "$style": {
	"tags-table": "_tags-table_bizul_1",
	disabled: "_disabled_bizul_1",
	name: "_name_bizul_5",
	ops: "_ops_bizul_11",
	main: "_main_bizul_22",
	hidden: "_hidden_bizul_31"
} }], ["__scopeId", "data-v-50462fc5"]]);
//#endregion
//#region src/features/shared/tags/components/TagsManager/TagsView/TagsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_runtime_dom_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/shared/tags/components/TagsManager/TagsView/TagsView.vue
var TagsView_default = /* @__PURE__ */ defineComponent({
	name: "TagsView",
	__name: "TagsView",
	props: {
		usageColumnTitleLocaleKey: { default: "tagsTable.usage" },
		usageLocaleKey: { default: "tagsView.inUse" },
		tags: {},
		isLoading: { type: Boolean },
		canCreate: { type: Boolean },
		canUpdate: { type: Boolean },
		canDelete: { type: Boolean }
	},
	emits: [
		"update",
		"delete",
		"create",
		"disableCreate"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const matches = (name, filter) => name.toLowerCase().trim().includes(filter.toLowerCase().trim());
		const i18n = useI18n();
		const createEnabled = ref(false);
		const deleteId = ref("");
		const updateId = ref("");
		const search = ref("");
		const newName = ref("");
		const stickyIds = ref(/* @__PURE__ */ new Set());
		const isSaving = ref(false);
		const isCreateEnabled = computed(() => props.canCreate && (props.tags.length === 0 || createEnabled.value));
		const rows = computed(() => {
			const getUsage = (count) => count && count > 0 ? i18n.baseText(props.usageLocaleKey, { adjustToNumber: count }) : i18n.baseText("tagsView.notBeingUsed");
			const disabled = isCreateEnabled.value || !!updateId.value || !!deleteId.value;
			const tagRows = props.tags.filter((tag) => stickyIds.value.has(tag.id) || matches(tag.name, search.value)).map((tag) => ({
				tag,
				usage: getUsage(tag.usageCount),
				disable: disabled && tag.id !== deleteId.value && tag.id !== updateId.value,
				update: disabled && tag.id === updateId.value,
				delete: disabled && tag.id === deleteId.value,
				canDelete: props.canDelete,
				canUpdate: props.canUpdate
			}));
			return isCreateEnabled.value ? [{ create: true }, ...tagRows] : tagRows;
		});
		const onNewNameChange = (name) => {
			newName.value = name;
		};
		const onSearchChange = (searchValue) => {
			stickyIds.value.clear();
			search.value = searchValue;
		};
		const isHeaderDisabled = () => {
			return props.isLoading || !!(isCreateEnabled.value || updateId.value || deleteId.value);
		};
		const onUpdateEnable = (updateIdValue) => {
			updateId.value = updateIdValue;
		};
		const disableUpdate = () => {
			updateId.value = "";
			newName.value = "";
		};
		const updateTag = () => {
			isSaving.value = true;
			const name = newName.value.trim();
			const onUpdate = (updated) => {
				isSaving.value = false;
				if (updated) {
					stickyIds.value.add(updateId.value);
					disableUpdate();
				}
			};
			emit("update", updateId.value, name, onUpdate);
		};
		const onDeleteEnable = (deleteIdValue) => {
			deleteId.value = deleteIdValue;
		};
		const disableDelete = () => {
			deleteId.value = "";
		};
		const deleteTag = () => {
			isSaving.value = true;
			const onDelete = (deleted) => {
				if (deleted) disableDelete();
				isSaving.value = false;
			};
			emit("delete", deleteId.value, onDelete);
		};
		const onCreateEnable = () => {
			createEnabled.value = true;
			newName.value = "";
		};
		const disableCreate = () => {
			createEnabled.value = false;
			emit("disableCreate");
		};
		const createTag = () => {
			isSaving.value = true;
			const name = newName.value.trim();
			const onCreate = (created) => {
				if (created) {
					stickyIds.value.add(created.id);
					disableCreate();
				}
				isSaving.value = false;
			};
			emit("create", name, onCreate);
		};
		const applyOperation = () => {
			if (isSaving.value) return;
			else if (isCreateEnabled.value) createTag();
			else if (updateId.value) updateTag();
			else if (deleteId.value) deleteTag();
		};
		const cancelOperation = () => {
			if (isSaving.value) return;
			else if (isCreateEnabled.value) disableCreate();
			else if (updateId.value) disableUpdate();
			else if (deleteId.value) disableDelete();
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { onKeyup: [withKeys(applyOperation, ["enter"]), withKeys(cancelOperation, ["esc"])] }, [createVNode(TagsTableHeader_default, {
				search: search.value,
				disabled: isHeaderDisabled(),
				"can-create": __props.canCreate,
				onSearchChange,
				onCreateEnable
			}, null, 8, [
				"search",
				"disabled",
				"can-create"
			]), createVNode(TagsTable_default, {
				ref: "tagsTable",
				rows: rows.value,
				"is-loading": __props.isLoading,
				"is-saving": isSaving.value,
				"new-name": newName.value,
				"usage-column-title-locale-key": __props.usageColumnTitleLocaleKey,
				"data-test-id": "tags-table",
				onNewNameChange,
				onUpdateEnable,
				onDeleteEnable,
				onCancelOperation: cancelOperation,
				onApplyOperation: applyOperation
			}, null, 8, [
				"rows",
				"is-loading",
				"is-saving",
				"new-name",
				"usage-column-title-locale-key"
			])], 32);
		};
	}
});
//#endregion
//#region src/features/shared/tags/components/TagsManager/NoTagsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "mb-s" };
var _hoisted_2 = { class: "description" };
var NoTagsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "NoTagsView",
	props: {
		titleLocaleKey: { default: "noTagsView.readyToOrganizeYourWorkflows" },
		descriptionLocaleKey: { default: "noTagsView.withWorkflowTagsYouReFree" },
		createLocaleKey: { default: "noTagsView.createTag" },
		canCreate: {
			type: Boolean,
			default: true
		}
	},
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(unref(ElCol), {
				class: "notags",
				span: 16
			}, {
				default: withCtx(() => [_cache[1] || (_cache[1] = createBaseVNode("div", { class: "icon" }, "🗄️", -1)), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nHeading_default), { size: "large" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(__props.titleLocaleKey)), 1)]),
						_: 1
					})]),
					createBaseVNode("div", _hoisted_2, toDisplayString(unref(i18n).baseText(__props.descriptionLocaleKey)), 1),
					__props.canCreate ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						label: unref(i18n).baseText(`${__props.createLocaleKey}`),
						size: "large",
						onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("enableCreate"))
					}, null, 8, ["label"])) : createCommentVNode("", true)
				], 2)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_ebqj6_1",
	content: "_content_ebqj6_8"
} }], ["__scopeId", "data-v-07b25634"]]);
//#endregion
//#region src/features/shared/tags/components/TagsManager/TagsManager.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/shared/tags/components/TagsManager/TagsManager.vue
var TagsManager_default = /* @__PURE__ */ defineComponent({
	__name: "TagsManager",
	props: {
		modalKey: {},
		usageLocaleKey: { default: "tagsView.inUse" },
		usageColumnTitleLocaleKey: { default: "tagsTable.usage" },
		titleLocaleKey: { default: "tagsManager.manageTags" },
		noTagsTitleLocaleKey: { default: "noTagsView.readyToOrganizeYourWorkflows" },
		noTagsDescriptionLocaleKey: { default: "noTagsView.withWorkflowTagsYouReFree" },
		noTagsCreateLocaleKey: { default: "noTagsView.createTag" },
		tags: {},
		isLoading: { type: Boolean },
		canCreate: { type: Boolean },
		canUpdate: { type: Boolean },
		canDelete: { type: Boolean },
		onFetchTags: {},
		onCreateTag: {},
		onUpdateTag: {},
		onDeleteTag: {}
	},
	emits: ["update:tags"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const tagIds = ref(props.tags.map((tag) => tag.id));
		const isCreating = ref(false);
		const modalBus = createEventBus();
		const tags = computed(() => tagIds.value.map((tagId) => props.tags.find((tag) => tag.id === tagId)).filter((tag) => Boolean(tag)));
		const hasTags = computed(() => tags.value.length > 0);
		const i18n = useI18n();
		onMounted(() => {
			props.onFetchTags();
		});
		function onEnableCreate() {
			isCreating.value = true;
		}
		function onDisableCreate() {
			isCreating.value = false;
		}
		async function onCreate(name, createCallback) {
			try {
				if (!name) throw new Error(i18n.baseText("tagsManager.tagNameCannotBeEmpty"));
				const newTag = await props.onCreateTag(name);
				tagIds.value = [newTag.id, ...tagIds.value];
				emit("update:tags", [...props.tags, newTag]);
				createCallback(newTag);
			} catch (error) {
				createCallback(null, error);
			}
		}
		async function onUpdate(id, name, updateCallback) {
			const tag = props.tags.find((t) => t.id === id);
			if (!tag) {
				updateCallback(false, /* @__PURE__ */ new Error("Tag not found"));
				return;
			}
			const oldName = tag.name;
			try {
				if (!name) throw new Error(i18n.baseText("tagsManager.tagNameCannotBeEmpty"));
				if (name === oldName) {
					updateCallback(true);
					return;
				}
				const updatedTag = await props.onUpdateTag(id, name);
				emit("update:tags", props.tags.map((t) => t.id === id ? updatedTag : t));
				updateCallback(true);
			} catch (error) {
				updateCallback(false, error);
			}
		}
		async function onDelete(id, deleteCallback) {
			if (!props.tags.find((t) => t.id === id)) {
				deleteCallback(false, /* @__PURE__ */ new Error("Tag not found"));
				return;
			}
			try {
				const deleted = await props.onDeleteTag(id);
				if (!deleted) throw new Error(i18n.baseText("tagsManager.couldNotDeleteTag"));
				tagIds.value = tagIds.value.filter((tagId) => tagId !== id);
				emit("update:tags", props.tags.filter((t) => t.id !== id));
				deleteCallback(deleted);
			} catch (error) {
				deleteCallback(false, error);
			}
		}
		function onEnter() {
			if (props.isLoading) return;
			else if (!hasTags.value && props.canCreate) onEnableCreate();
			else modalBus.emit("close");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				title: unref(i18n).baseText(__props.titleLocaleKey),
				name: __props.modalKey,
				"event-bus": unref(modalBus),
				"min-width": "620px",
				"min-height": "420px",
				onEnter
			}, {
				content: withCtx(() => [createVNode(unref(ElRow), null, {
					default: withCtx(() => [hasTags.value || isCreating.value ? (openBlock(), createBlock(TagsView_default, {
						key: 0,
						"is-loading": __props.isLoading,
						tags: tags.value,
						"usage-locale-key": __props.usageLocaleKey,
						"usage-column-title-locale-key": __props.usageColumnTitleLocaleKey,
						"can-create": __props.canCreate,
						"can-update": __props.canUpdate,
						"can-delete": __props.canDelete,
						onCreate,
						onUpdate,
						onDelete,
						onDisableCreate
					}, null, 8, [
						"is-loading",
						"tags",
						"usage-locale-key",
						"usage-column-title-locale-key",
						"can-create",
						"can-update",
						"can-delete"
					])) : (openBlock(), createBlock(NoTagsView_default, {
						key: 1,
						"title-locale-key": __props.noTagsTitleLocaleKey,
						"description-locale-key": __props.noTagsDescriptionLocaleKey,
						"create-locale-key": __props.noTagsCreateLocaleKey,
						"can-create": __props.canCreate,
						onEnableCreate
					}, null, 8, [
						"title-locale-key",
						"description-locale-key",
						"create-locale-key",
						"can-create"
					]))]),
					_: 1
				})]),
				footer: withCtx(({ close }) => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					label: unref(i18n).baseText("tagsManager.done"),
					style: { "margin-left": "auto" },
					onClick: close
				}, null, 8, ["label", "onClick"])]),
				_: 1
			}, 8, [
				"title",
				"name",
				"event-bus"
			]);
		};
	}
});
//#endregion
export { TagsManager_default as t };
