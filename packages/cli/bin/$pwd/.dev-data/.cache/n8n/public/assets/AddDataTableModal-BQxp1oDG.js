import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Pd as Fragment, Ql as ElUpload, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Iu as PROJECT_DATA_TABLES, Jg as useUIStore, MA as RadioGroupItem_default, Pu as DATA_TABLE_DETAILS, SN as _plugin_vue_export_helper_default, _M as Checkbox_default, _N as N8nText_default, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, hC as useTelemetry, jA as RadioGroup_default, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, tk as DATA_TABLE_SYSTEM_COLUMNS, xN as N8nIcon_default, xu as useDataTableStore, yA as dataTableColumnNameSchema, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/core/dataTable/components/AddDataTableModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["aria-label"];
var AddDataTableModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AddDataTableModal",
	props: { modalName: {} },
	setup(__props) {
		const props = __props;
		const dataTableStore = useDataTableStore();
		const uiStore = useUIStore();
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const creationMode = ref("select");
		const dataTableName = ref("");
		const inputRef = ref(null);
		const selectedFile = ref(null);
		const uploadedFileId = ref(null);
		const uploadedFileName = ref("");
		const csvColumns = ref([]);
		const csvRowCount = ref(0);
		const csvColumnCount = ref(0);
		const isLoading = ref(false);
		const hasHeaders = ref(true);
		const isUploadHovered = ref(false);
		const allColumnTypeOptions = [
			{
				label: "String",
				value: "string"
			},
			{
				label: "Number",
				value: "number"
			},
			{
				label: "Boolean",
				value: "boolean"
			},
			{
				label: "Datetime",
				value: "date"
			}
		];
		const isColumnType = (value) => {
			return allColumnTypeOptions.some((option) => option.value === value);
		};
		const getColumnTypeOptions = (compatibleTypes) => {
			if (!compatibleTypes || compatibleTypes.length === 0) return allColumnTypeOptions;
			return allColumnTypeOptions.filter((option) => compatibleTypes.includes(option.value));
		};
		const validateColumnName = (columnName) => {
			if (DATA_TABLE_SYSTEM_COLUMNS.some((sc) => sc.toLowerCase() === columnName.toLowerCase())) return i18n.baseText("dataTable.import.systemColumnName", { interpolate: { columnName } });
			if (!dataTableColumnNameSchema.safeParse(columnName).success) return i18n.baseText("dataTable.import.invalidColumnName");
		};
		const includedColumns = computed(() => csvColumns.value.filter((col) => col.included));
		const hasValidationErrors = computed(() => {
			if (creationMode.value !== "import") return false;
			return includedColumns.value.some((column) => column.error !== void 0);
		});
		const hasDuplicateNames = computed(() => {
			if (creationMode.value !== "import") return false;
			const names = includedColumns.value.map((col) => col.name.toLowerCase());
			return names.length !== new Set(names).size;
		});
		const hasNoIncludedColumns = computed(() => {
			if (creationMode.value !== "import") return false;
			return includedColumns.value.length === 0;
		});
		const modalTitle = computed(() => {
			if (creationMode.value === "import") return "Set data table columns";
			return i18n.baseText("dataTable.add.title");
		});
		const isCreateDisabled = computed(() => {
			if (creationMode.value === "import") return !dataTableName.value || !uploadedFileId.value || hasValidationErrors.value || hasDuplicateNames.value || hasNoIncludedColumns.value;
			return true;
		});
		onMounted(() => {
			setTimeout(() => {
				inputRef.value?.focus();
				inputRef.value?.select();
			}, 0);
		});
		const selectedOption = ref("scratch");
		const proceedFromSelect = async () => {
			if (!selectedOption.value || !dataTableName.value || isLoading.value) return;
			if (selectedOption.value === "scratch") await onSubmit();
			else if (selectedOption.value === "import") {
				if (!selectedFile.value) return;
				await uploadFile();
			}
		};
		const revalidateAllColumns = () => {
			csvColumns.value.forEach((col, idx) => {
				if (!col.included) {
					col.error = void 0;
					return;
				}
				const validationError = validateColumnName(col.name);
				if (csvColumns.value.some((c, i) => i !== idx && c.included && c.name.toLowerCase() === col.name.toLowerCase()) && !validationError) col.error = i18n.baseText("dataTable.import.duplicateColumnName");
				else col.error = validationError;
			});
		};
		const onColumnNameChange = (index) => {
			if (!csvColumns.value[index]) return;
			revalidateAllColumns();
		};
		const onColumnIncludedChange = () => {
			revalidateAllColumns();
		};
		const reset = (clearTableName = false) => {
			if (clearTableName) dataTableName.value = "";
			selectedFile.value = null;
			uploadedFileId.value = null;
			uploadedFileName.value = "";
			csvColumns.value = [];
			csvRowCount.value = 0;
			csvColumnCount.value = 0;
			selectedOption.value = "scratch";
			creationMode.value = "select";
		};
		function onSelectedOption(value) {
			if (value === "scratch" || value === "import") selectedOption.value = value;
		}
		const deriveNameFromFileName = (fileName) => {
			return fileName.replace(/\.csv$/i, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().slice(0, 128).trim();
		};
		const handleFileChange = async (uploadFile) => {
			if (!uploadFile.raw) return;
			const file = uploadFile.raw;
			selectedFile.value = file;
			if (dataTableName.value) return;
			const baseName = deriveNameFromFileName(file.name);
			if (!baseName) return;
			const projectId = route.params.projectId;
			try {
				const suggested = await dataTableStore.findAvailableDataTableName(baseName, projectId);
				if (selectedFile.value === file && !dataTableName.value) dataTableName.value = suggested;
			} catch {
				if (selectedFile.value === file && !dataTableName.value) dataTableName.value = baseName;
			}
		};
		const uploadFile = async () => {
			if (!selectedFile.value) return;
			isLoading.value = true;
			creationMode.value = "import";
			try {
				const uploadResponse = await dataTableStore.uploadCsvFile(selectedFile.value, hasHeaders.value);
				uploadedFileId.value = uploadResponse.id;
				uploadedFileName.value = uploadResponse.originalName;
				csvRowCount.value = uploadResponse.rowCount;
				csvColumnCount.value = uploadResponse.columnCount;
				csvColumns.value = uploadResponse.columns.map((col) => {
					const compatibleTypes = (col.compatibleTypes || [col.type]).filter(isColumnType);
					const sanitizedName = col.name.replace(/\s+/g, "_");
					return {
						name: sanitizedName,
						type: isColumnType(col.type) ? col.type : "string",
						compatibleTypes,
						typeOptions: getColumnTypeOptions(compatibleTypes),
						error: validateColumnName(sanitizedName),
						included: true,
						csvColumnName: col.name
					};
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("dataTable.upload.error"));
				reset();
			} finally {
				isLoading.value = false;
			}
		};
		const onSubmit = async () => {
			isLoading.value = true;
			try {
				let newDataTable;
				if (selectedOption.value === "scratch") newDataTable = await dataTableStore.createDataTable(dataTableName.value, route.params.projectId);
				else if (creationMode.value === "import" && uploadedFileId.value) {
					const hasColumnChanges = csvColumns.value.some((col) => !col.included || col.name !== col.csvColumnName.replace(/\s+/g, "_"));
					newDataTable = await dataTableStore.createDataTable(dataTableName.value, route.params.projectId, includedColumns.value.map((col) => ({
						name: col.name,
						type: col.type,
						...hasColumnChanges ? { csvColumnName: col.csvColumnName } : {}
					})), uploadedFileId.value, hasHeaders.value);
				}
				if (newDataTable) {
					telemetry.track("User created data table", {
						data_table_id: newDataTable.id,
						data_table_project_id: newDataTable.project?.id,
						creation_mode: selectedOption.value
					});
					reset(true);
					uiStore.closeModal(props.modalName);
					router.push({
						name: DATA_TABLE_DETAILS,
						params: { id: newDataTable.id }
					});
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("dataTable.add.error"));
			} finally {
				isLoading.value = false;
			}
		};
		const goBack = () => {
			creationMode.value = "select";
		};
		const redirectToDataTables = () => {
			router.replace({ name: PROJECT_DATA_TABLES });
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: props.modalName,
				center: true,
				width: creationMode.value === "import" ? "700px" : "540px",
				"min-height": creationMode.value === "import" ? "600px" : void 0,
				"before-close": redirectToDataTables
			}, {
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("h2", null, toDisplayString(modalTitle.value), 1)], 2)]),
				content: withCtx(() => [creationMode.value === "select" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.selectionContent)
				}, [
					createVNode(unref(N8nInputLabel_default), {
						label: unref(i18n).baseText("dataTable.add.input.name.label"),
						required: true,
						"input-name": "dataTableNameSelect"
					}, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							ref_key: "inputRef",
							ref: inputRef,
							modelValue: dataTableName.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => dataTableName.value = $event),
							type: "text",
							placeholder: unref(i18n).baseText("dataTable.add.input.name.placeholder"),
							"data-test-id": "data-table-name-input-select",
							name: "dataTableNameSelect",
							onKeydown: withKeys(proceedFromSelect, ["enter"])
						}, null, 8, ["modelValue", "placeholder"])]),
						_: 1
					}, 8, ["label"]),
					createVNode(unref(RadioGroup_default), {
						"model-value": selectedOption.value,
						class: normalizeClass(_ctx.$style.radioGroup),
						"onUpdate:modelValue": onSelectedOption
					}, {
						default: withCtx(() => [createVNode(unref(RadioGroupItem_default), {
							value: "scratch",
							label: unref(i18n).baseText("dataTable.add.fromScratch"),
							"data-test-id": "create-from-scratch-option"
						}, null, 8, ["label"]), createVNode(unref(RadioGroupItem_default), {
							value: "import",
							label: unref(i18n).baseText("dataTable.add.importCsv"),
							"data-test-id": "import-csv-option"
						}, null, 8, ["label"])]),
						_: 1
					}, 8, ["model-value", "class"]),
					selectedOption.value === "import" ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.uploadSection)
					}, [createVNode(unref(ElUpload), {
						class: normalizeClass(_ctx.$style.uploadDemo),
						drag: "",
						"auto-upload": false,
						"show-file-list": false,
						accept: ".csv",
						"on-change": handleFileChange,
						onMouseenter: _cache[1] || (_cache[1] = ($event) => isUploadHovered.value = true),
						onMouseleave: _cache[2] || (_cache[2] = ($event) => isUploadHovered.value = false)
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
							default: withCtx(() => [createTextVNode(toDisplayString(selectedFile.value?.name), 1)]),
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
					}, 8, ["class"]), createVNode(unref(Checkbox_default), {
						modelValue: hasHeaders.value,
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => hasHeaders.value = $event),
						label: unref(i18n).baseText("dataTable.upload.hasHeaders"),
						"data-test-id": "has-headers-checkbox"
					}, null, 8, ["modelValue", "label"])], 2)) : createCommentVNode("", true)
				], 2)) : creationMode.value === "import" ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.content)
				}, [isLoading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.uploadingMessage)
				}, toDisplayString(unref(i18n).baseText("dataTable.upload.uploading")), 3)) : !uploadedFileId.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.uploadingMessage)
				}, toDisplayString(unref(i18n).baseText("dataTable.upload.selectFile")), 3)) : uploadedFileId.value && csvColumns.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.importContent)
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.successNotice) }, toDisplayString(unref(i18n).baseText("dataTable.upload.success", {
						adjustToNumber: csvRowCount.value,
						interpolate: {
							fileName: uploadedFileName.value,
							columnCount: csvColumnCount.value,
							rowCount: csvRowCount.value
						}
					})), 3),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnHeaders) }, [
						createBaseVNode("div", { "aria-label": unref(i18n).baseText("dataTable.import.includeColumn") }, null, 8, _hoisted_1),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnHeaderLabel) }, toDisplayString(unref(i18n).baseText("dataTable.import.columnName")), 3),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnHeaderLabel) }, toDisplayString(unref(i18n).baseText("dataTable.import.columnType")), 3)
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnsContainer) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(csvColumns.value, (column, index) => {
						return openBlock(), createElementBlock("div", {
							key: index,
							class: normalizeClass(_ctx.$style.columnItem)
						}, [
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnCheckboxWrapper) }, [createVNode(unref(Checkbox_default), {
								modelValue: column.included,
								"onUpdate:modelValue": [($event) => column.included = $event, onColumnIncludedChange],
								"data-test-id": `column-include-${index}`
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"data-test-id"
							])], 2),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnInputWrapper) }, [createVNode(unref(Input_default), {
								modelValue: column.name,
								"onUpdate:modelValue": [($event) => column.name = $event, ($event) => onColumnNameChange(index)],
								placeholder: unref(i18n).baseText("dataTable.import.columnNamePlaceholder"),
								"data-test-id": `column-name-${index}`,
								disabled: !column.included,
								class: normalizeClass({ [_ctx.$style.inputError]: column.error })
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"data-test-id",
								"disabled",
								"class"
							]), column.error ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.columnErrorMessage)
							}, toDisplayString(column.error), 3)) : createCommentVNode("", true)], 2),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnTypeWrapper) }, [createVNode(unref(N8nSelect_default), {
								modelValue: column.type,
								"onUpdate:modelValue": ($event) => column.type = $event,
								disabled: !column.included || column.typeOptions.length === 1,
								class: normalizeClass({ "column-type-excluded": !column.included }),
								"data-test-id": `column-type-${index}`
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(column.typeOptions, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										value: option.value,
										label: option.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 2
							}, 1032, [
								"modelValue",
								"onUpdate:modelValue",
								"disabled",
								"class",
								"data-test-id"
							])], 2)
						], 2);
					}), 128))], 2)
				], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [
					creationMode.value === "select" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						size: "large",
						label: unref(i18n).baseText("generic.cancel"),
						"data-test-id": "cancel-select-button",
						onClick: redirectToDataTables
					}, null, 8, ["label"])) : createCommentVNode("", true),
					creationMode.value === "select" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						loading: isLoading.value,
						size: "large",
						disabled: !dataTableName.value || !selectedOption.value || selectedOption.value === "import" && !selectedFile.value,
						label: unref(i18n).baseText("generic.create"),
						"data-test-id": "proceed-from-select-button",
						onClick: proceedFromSelect
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])) : createCommentVNode("", true),
					creationMode.value === "import" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						variant: "outline",
						size: "large",
						label: unref(i18n).baseText("generic.back"),
						"data-test-id": "back-button",
						onClick: goBack
					}, null, 8, ["label"])) : createCommentVNode("", true),
					creationMode.value === "import" ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 3,
						loading: isLoading.value,
						size: "large",
						disabled: isCreateDisabled.value,
						label: unref(i18n).baseText("generic.create"),
						"data-test-id": "confirm-add-data-table-button",
						onClick: onSubmit
					}, null, 8, [
						"loading",
						"disabled",
						"label"
					])) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, [
				"name",
				"width",
				"min-height"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1lak9_1",
	content: "_content_1lak9_5",
	selectionContent: "_selectionContent_1lak9_10",
	radioGroup: "_radioGroup_1lak9_16",
	uploadSection: "_uploadSection_1lak9_22",
	uploadingMessage: "_uploadingMessage_1lak9_28",
	importContent: "_importContent_1lak9_34",
	successNotice: "_successNotice_1lak9_40",
	columnHeaders: "_columnHeaders_1lak9_49",
	columnHeaderLabel: "_columnHeaderLabel_1lak9_57",
	columnsContainer: "_columnsContainer_1lak9_63",
	columnItem: "_columnItem_1lak9_72",
	columnCheckboxWrapper: "_columnCheckboxWrapper_1lak9_79",
	columnInputWrapper: "_columnInputWrapper_1lak9_86",
	columnTypeWrapper: "_columnTypeWrapper_1lak9_92",
	inputError: "_inputError_1lak9_105",
	columnErrorMessage: "_columnErrorMessage_1lak9_112",
	footer: "_footer_1lak9_118",
	fileSelectedContainer: "_fileSelectedContainer_1lak9_125",
	uploadDemo: "_uploadDemo_1lak9_132",
	uploadIcon: "_uploadIcon_1lak9_158",
	fileName: "_fileName_1lak9_162"
} }]]);
//#endregion
export { AddDataTableModal_default as default };
