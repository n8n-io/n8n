import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Ql as ElUpload, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Du as DOWNLOAD_DATA_TABLE_MODAL_KEY, Eu as DATA_TABLE_CARD_ACTIONS, IA as escapeHtml, Jg as useUIStore, LM as N8nCallout_default, PA as useMessage, SN as _plugin_vue_export_helper_default, YM as N8nActionToggle_default, _M as Checkbox_default, _N as N8nText_default, dC as useToast, hC as useTelemetry, jN as useI18n, ku as IMPORT_CSV_MODAL_KEY, tk as DATA_TABLE_SYSTEM_COLUMNS, xN as N8nIcon_default, xu as useDataTableStore, yN as N8nButton_default, ym as useFavoritesStore } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { i as getProtectedInstanceTooltip } from "./sourceControl.utils-wyA1x_2k.js";
//#region src/features/core/dataTable/components/DownloadDataTableModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DownloadDataTableModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DownloadDataTableModal",
	props: {
		modalName: {},
		dataTableName: {}
	},
	emits: ["confirm", "close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const includeSystemColumns = ref(false);
		const onConfirm = () => {
			emit("confirm", includeSystemColumns.value);
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: props.modalName,
				title: unref(i18n).baseText("dataTable.download.modal.title"),
				center: true,
				width: "460px",
				"event-bus": void 0,
				onEnter: onConfirm
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(Checkbox_default), {
					modelValue: includeSystemColumns.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => includeSystemColumns.value = $event),
					label: unref(i18n).baseText("dataTable.download.modal.includeSystemColumns"),
					"data-test-id": "download-include-system-columns"
				}, null, 8, ["modelValue", "label"])], 2)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					size: "large",
					label: unref(i18n).baseText("dataTable.download.modal.cancel"),
					"data-test-id": "download-modal-cancel",
					onClick: _cache[1] || (_cache[1] = () => _ctx.$emit("close"))
				}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
					size: "large",
					label: unref(i18n).baseText("dataTable.download.modal.confirm"),
					"data-test-id": "download-modal-confirm",
					onClick: onConfirm
				}, null, 8, ["label"])], 2)]),
				_: 1
			}, 8, ["name", "title"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_5ejyq_1",
	footer: "_footer_5ejyq_5"
} }]]);
//#endregion
//#region src/features/core/dataTable/components/ImportCsvModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ImportCsvModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ImportCsvModal",
	props: {
		modalName: {},
		dataTable: {}
	},
	emits: ["imported", "close"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const dataTableStore = useDataTableStore();
		const uiStore = useUIStore();
		const i18n = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const { next: nextUpload } = useLatestFetch();
		const selectedFile = ref(null);
		const uploadedFileId = ref(null);
		const csvRowCount = ref(0);
		const isUploading = ref(false);
		const isImporting = ref(false);
		const isUploadHovered = ref(false);
		const matchedColumns = ref([]);
		const unrecognizedColumns = ref([]);
		const uploaded = computed(() => uploadedFileId.value !== null);
		const tableColumnNames = computed(() => new Set(props.dataTable.columns.map((col) => col.name)));
		const missingTableColumns = computed(() => {
			if (!uploaded.value) return [];
			return props.dataTable.columns.filter((col) => !matchedColumns.value.includes(col.name)).map((col) => col.name);
		});
		const canImport = computed(() => {
			return uploaded.value && matchedColumns.value.length > 0 && unrecognizedColumns.value.length === 0 && !isUploading.value && !isImporting.value;
		});
		const clearUploadMetadata = () => {
			uploadedFileId.value = null;
			csvRowCount.value = 0;
			matchedColumns.value = [];
			unrecognizedColumns.value = [];
		};
		const handleFileChange = (uploadFile) => {
			if (uploadFile.raw) {
				selectedFile.value = uploadFile.raw;
				processUpload();
			}
		};
		const processUpload = async () => {
			const file = selectedFile.value;
			if (!file) return;
			const isCurrent = nextUpload();
			isUploading.value = true;
			clearUploadMetadata();
			try {
				const response = await dataTableStore.uploadCsvFile(file, true);
				if (!isCurrent()) return;
				uploadedFileId.value = response.id;
				csvRowCount.value = response.rowCount;
				for (const csvCol of response.columns) if (DATA_TABLE_SYSTEM_COLUMNS.includes(csvCol.name)) {} else if (tableColumnNames.value.has(csvCol.name)) matchedColumns.value.push(csvCol.name);
				else unrecognizedColumns.value.push(csvCol.name);
			} catch (error) {
				if (!isCurrent()) return;
				toast.showError(error, i18n.baseText("dataTable.upload.error"));
				reset();
			} finally {
				if (isCurrent()) isUploading.value = false;
			}
		};
		const onImport = async () => {
			if (!uploadedFileId.value || !canImport.value) return;
			isImporting.value = true;
			try {
				const result = await dataTableStore.importCsvToDataTable(props.dataTable.id, props.dataTable.projectId, uploadedFileId.value);
				toast.showMessage({
					title: i18n.baseText("dataTable.importCsv.success", {
						adjustToNumber: result.importedRowCount,
						interpolate: { count: String(result.importedRowCount) }
					}),
					type: "success"
				});
				telemetry.track("User imported CSV to data table", {
					data_table_id: props.dataTable.id,
					data_table_project_id: props.dataTable.projectId,
					imported_row_count: result.importedRowCount,
					system_columns_ignored: result.systemColumnsIgnored
				});
				uiStore.closeModal(props.modalName);
				emit("imported");
			} catch (error) {
				toast.showError(error, i18n.baseText("dataTable.importCsv.error"));
			} finally {
				isImporting.value = false;
			}
		};
		const reset = () => {
			nextUpload();
			isUploading.value = false;
			selectedFile.value = null;
			clearUploadMetadata();
		};
		const isModalOpen = computed(() => uiStore.modalsById[props.modalName]?.open);
		watch(isModalOpen, (open) => {
			if (!open) reset();
		});
		const onClose = () => {
			reset();
			emit("close");
		};
		onBeforeUnmount(() => {
			nextUpload();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: props.modalName,
				title: unref(i18n).baseText("dataTable.importCsv.title"),
				center: true,
				width: "540px",
				"event-bus": void 0
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.importCsv.description")), 1)]),
						_: 1
					}),
					createVNode(unref(ElUpload), {
						class: normalizeClass(_ctx.$style.uploadDemo),
						drag: "",
						"auto-upload": false,
						"show-file-list": false,
						accept: ".csv",
						"on-change": handleFileChange,
						"data-test-id": "import-csv-upload",
						onMouseenter: _cache[0] || (_cache[0] = ($event) => isUploadHovered.value = true),
						onMouseleave: _cache[1] || (_cache[1] = ($event) => isUploadHovered.value = false)
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "cloud-arrow-up",
							size: 24,
							color: isUploadHovered.value ? "text-dark" : "text-light",
							class: normalizeClass(_ctx.$style.uploadIcon)
						}, null, 8, ["color", "class"]), selectedFile.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							color: isUploadHovered.value ? "text-dark" : "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(selectedFile.value.name), 1)]),
							_: 1
						}, 8, ["color"])) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "medium",
							color: isUploadHovered.value ? "text-dark" : "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.upload.dropOrClick")), 1)]),
							_: 1
						}, 8, ["color"]))]),
						_: 1
					}, 8, ["class"]),
					isUploading.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.uploadingMessage)
					}, toDisplayString(unref(i18n).baseText("dataTable.upload.uploading")), 3)) : createCommentVNode("", true),
					uploaded.value && !isUploading.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.columnResults)
					}, [
						unrecognizedColumns.value.length > 0 && missingTableColumns.value.length > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "danger",
							"data-test-id": "import-csv-column-mismatch"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.importCsv.columnMismatch", { interpolate: {
								unrecognized: unrecognizedColumns.value.join(", "),
								missing: missingTableColumns.value.join(", ")
							} })), 1)]),
							_: 1
						})) : unrecognizedColumns.value.length > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 1,
							theme: "danger",
							"data-test-id": "import-csv-unrecognized-columns"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.importCsv.unrecognizedColumnsOnly", { interpolate: { columns: unrecognizedColumns.value.join(", ") } })), 1)]),
							_: 1
						})) : missingTableColumns.value.length > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 2,
							theme: "info",
							"data-test-id": "import-csv-missing-columns"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.importCsv.missingColumnsOnly", { interpolate: { columns: missingTableColumns.value.join(", ") } })), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						matchedColumns.value.length === 0 && unrecognizedColumns.value.length === 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 3,
							theme: "danger",
							"data-test-id": "import-csv-no-matching-columns"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.importCsv.noMatchingColumns")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						canImport.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 4,
							size: "small",
							class: normalizeClass(_ctx.$style.readyToImport),
							"data-test-id": "import-csv-ready-to-import"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("dataTable.importCsv.readyToImport", {
								adjustToNumber: csvRowCount.value,
								interpolate: { count: String(csvRowCount.value) }
							})), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					], 2)) : createCommentVNode("", true)
				], 2)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "large",
					label: unref(i18n).baseText("generic.cancel"),
					"data-test-id": "import-csv-cancel",
					onClick: onClose
				}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
					size: "large",
					label: unref(i18n).baseText("dataTable.importCsv.importButton"),
					disabled: !canImport.value,
					loading: isImporting.value,
					"data-test-id": "import-csv-confirm",
					onClick: onImport
				}, null, 8, [
					"label",
					"disabled",
					"loading"
				])], 2)]),
				_: 1
			}, 8, ["name", "title"]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1gwh2_1",
	uploadDemo: "_uploadDemo_1gwh2_7",
	uploadIcon: "_uploadIcon_1gwh2_33",
	uploadingMessage: "_uploadingMessage_1gwh2_37",
	columnResults: "_columnResults_1gwh2_43",
	readyToImport: "_readyToImport_1gwh2_49",
	footer: "_footer_1gwh2_53"
} }]]);
//#endregion
//#region src/features/core/dataTable/components/DataTableActions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/core/dataTable/components/DataTableActions.vue
var DataTableActions_default = /* @__PURE__ */ defineComponent({
	__name: "DataTableActions",
	props: {
		dataTable: {},
		schemaReadOnly: {
			type: Boolean,
			default: false
		},
		location: {}
	},
	emits: [
		"rename",
		"onDeleted",
		"imported"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const dataTableStore = useDataTableStore();
		const uiStore = useUIStore();
		const favoritesStore = useFavoritesStore();
		const i18n = useI18n();
		const message = useMessage();
		const toast = useToast();
		const telemetry = useTelemetry();
		const downloadModalKey = computed(() => `${DOWNLOAD_DATA_TABLE_MODAL_KEY}-${props.dataTable.id}`);
		const importCsvModalKey = computed(() => `${IMPORT_CSV_MODAL_KEY}-${props.dataTable.id}`);
		const actions = computed(() => {
			const schemaReadOnlyTooltip = props.schemaReadOnly ? getProtectedInstanceTooltip() : void 0;
			const availableActions = [
				{
					label: i18n.baseText("dataTable.importCsv"),
					value: DATA_TABLE_CARD_ACTIONS.IMPORT_CSV,
					disabled: !dataTableStore.projectPermissions.dataTable.writeRow
				},
				{
					label: i18n.baseText("dataTable.download.csv"),
					value: DATA_TABLE_CARD_ACTIONS.DOWNLOAD_CSV,
					disabled: !dataTableStore.projectPermissions.dataTable.readRow
				},
				{
					label: favoritesStore.isFavorite(props.dataTable.id, "dataTable") ? i18n.baseText("favorites.remove") : i18n.baseText("favorites.add"),
					value: DATA_TABLE_CARD_ACTIONS.FAVORITE,
					disabled: false
				},
				{
					label: i18n.baseText("generic.delete"),
					value: DATA_TABLE_CARD_ACTIONS.DELETE,
					disabled: !dataTableStore.projectPermissions.dataTable.delete || props.schemaReadOnly,
					tooltip: schemaReadOnlyTooltip
				}
			];
			if (props.location === "breadcrumbs") availableActions.unshift({
				label: i18n.baseText("generic.rename"),
				value: DATA_TABLE_CARD_ACTIONS.RENAME,
				disabled: !dataTableStore.projectPermissions.dataTable.update || props.schemaReadOnly,
				tooltip: schemaReadOnlyTooltip
			});
			return availableActions;
		});
		const onAction = async (action) => {
			switch (action) {
				case DATA_TABLE_CARD_ACTIONS.RENAME:
					emit("rename", {
						dataTable: props.dataTable,
						action: "rename"
					});
					break;
				case DATA_TABLE_CARD_ACTIONS.IMPORT_CSV:
					uiStore.openModal(importCsvModalKey.value);
					break;
				case DATA_TABLE_CARD_ACTIONS.DOWNLOAD_CSV:
					uiStore.openModal(downloadModalKey.value);
					break;
				case DATA_TABLE_CARD_ACTIONS.FAVORITE:
					await favoritesStore.toggleFavorite(props.dataTable.id, "dataTable");
					break;
				case DATA_TABLE_CARD_ACTIONS.DELETE: if (await message.confirm(i18n.baseText("dataTable.delete.confirm.message", { interpolate: { name: escapeHtml(props.dataTable.name) } }), i18n.baseText("dataTable.delete.confirm.title"), {
					confirmButtonText: i18n.baseText("generic.delete"),
					cancelButtonText: i18n.baseText("generic.cancel")
				}) === "confirm") await deleteDataTable();
			}
		};
		const downloadDataTableCsv = async (includeSystemColumns) => {
			try {
				uiStore.closeModal(downloadModalKey.value);
				await dataTableStore.downloadDataTableCsv(props.dataTable.id, props.dataTable.projectId, includeSystemColumns);
				telemetry.track("User downloaded data table CSV", {
					data_table_id: props.dataTable.id,
					data_table_project_id: props.dataTable.projectId,
					include_system_columns: includeSystemColumns
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("dataTable.download.error"));
			}
		};
		const deleteDataTable = async () => {
			try {
				if (!await dataTableStore.deleteDataTable(props.dataTable.id, props.dataTable.projectId)) throw new Error(i18n.baseText("generic.unknownError"));
				emit("onDeleted");
				telemetry.track("User deleted data table", {
					data_table_id: props.dataTable.id,
					data_table_project_id: props.dataTable.projectId
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("dataTable.delete.error"));
			}
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createVNode(unref(N8nActionToggle_default), {
					actions: actions.value,
					theme: "dark",
					"data-test-id": "data-table-card-actions",
					onAction
				}, null, 8, ["actions"]),
				createVNode(DownloadDataTableModal_default, {
					"modal-name": downloadModalKey.value,
					"data-table-name": __props.dataTable.name,
					onConfirm: downloadDataTableCsv,
					onClose: _cache[0] || (_cache[0] = () => unref(uiStore).closeModal(downloadModalKey.value))
				}, null, 8, ["modal-name", "data-table-name"]),
				createVNode(ImportCsvModal_default, {
					"modal-name": importCsvModalKey.value,
					"data-table": __props.dataTable,
					onImported: _cache[1] || (_cache[1] = ($event) => emit("imported")),
					onClose: _cache[2] || (_cache[2] = () => unref(uiStore).closeModal(importCsvModalKey.value))
				}, null, 8, ["modal-name", "data-table"])
			]);
		};
	}
});
//#endregion
export { DataTableActions_default as t };
