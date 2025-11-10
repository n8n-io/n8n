<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, ref, computed } from 'vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useTelemetry } from '@/composables/useTelemetry';
import { dataTableColumnNameSchema } from '@n8n/api-types';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import { N8nButton, N8nInput, N8nInputLabel, N8nSelect, N8nOption } from '@n8n/design-system';
import Modal from '@/components/Modal.vue';
import { ElUpload, ElIcon } from 'element-plus';
import type { UploadFile } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';

type Props = {
	modalName: string;
};

type CreationMode = 'select' | 'scratch' | 'import' | 'file-selected';
type ColumnType = 'string' | 'number' | 'boolean' | 'date';

interface CsvColumn {
	name: string;
	type: ColumnType;
	compatibleTypes: ColumnType[];
	typeOptions: Array<{ label: string; value: string }>;
	error?: string;
}

const props = defineProps<Props>();

const dataTableStore = useDataTableStore();
const uiStore = useUIStore();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const creationMode = ref<CreationMode>('select');
const dataTableName = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const uploadedFileId = ref<string | null>(null);
const uploadedFileName = ref<string>('');
const csvColumns = ref<CsvColumn[]>([]);
const csvRowCount = ref<number>(0);
const csvColumnCount = ref<number>(0);
const isUploading = ref(false);
const hasHeaders = ref(true);

const allColumnTypeOptions = [
	{ label: 'String', value: 'string' },
	{ label: 'Number', value: 'number' },
	{ label: 'Boolean', value: 'boolean' },
	{ label: 'Datetime', value: 'date' },
];

const getColumnTypeOptions = (compatibleTypes: ColumnType[]) => {
	if (!compatibleTypes || compatibleTypes.length === 0) {
		return allColumnTypeOptions;
	}
	return allColumnTypeOptions.filter((option) =>
		compatibleTypes.includes(option.value as ColumnType),
	);
};

const validateColumnName = (columnName: string): string | undefined => {
	// Check if it's a reserved system column name
	if (DATA_TABLE_SYSTEM_COLUMNS.includes(columnName)) {
		return i18n.baseText('dataTable.import.systemColumnName', {
			interpolate: { columnName },
		});
	}

	// Validate with schema
	const result = dataTableColumnNameSchema.safeParse(columnName);
	if (!result.success) {
		return i18n.baseText('dataTable.import.invalidColumnName');
	}
	return undefined;
};

const hasValidationErrors = computed(() => {
	if (creationMode.value !== 'import') return false;
	return csvColumns.value.some((column) => column.error !== undefined);
});

const hasDuplicateNames = computed(() => {
	if (creationMode.value !== 'import') return false;
	const names = csvColumns.value.map((col) => col.name.toLowerCase());
	return names.length !== new Set(names).size;
});

const modalTitle = computed(() => {
	if (creationMode.value === 'import') {
		return 'Set data table columns';
	}
	return i18n.baseText('dataTable.add.title');
});

const isCreateDisabled = computed(() => {
	if (creationMode.value === 'import') {
		return (
			!dataTableName.value ||
			!uploadedFileId.value ||
			hasValidationErrors.value ||
			hasDuplicateNames.value
		);
	}
	return true;
});

onMounted(() => {
	setTimeout(() => {
		inputRef.value?.focus();
		inputRef.value?.select();
	}, 0);
});

const selectedOption = ref<'scratch' | 'import' | null>(null);

const selectFromScratch = () => {
	selectedOption.value = 'scratch';
};

const selectImportCsv = () => {
	selectedOption.value = 'import';
};

const proceedFromSelect = async () => {
	if (!selectedOption.value || !dataTableName.value) return;

	if (selectedOption.value === 'scratch') {
		// Directly create the table for "From Scratch" option
		await onSubmit();
	} else if (selectedOption.value === 'import') {
		// Upload the CSV file first, then go to the import screen
		if (!selectedFile.value) return;
		await uploadFile();
	}
};

const onColumnNameChange = (index: number) => {
	const column = csvColumns.value[index];
	if (!column) return;

	// Validate the column name
	column.error = validateColumnName(column.name);

	// Check for duplicates
	const isDuplicate = csvColumns.value.some(
		(col, idx) => idx !== index && col.name.toLowerCase() === column.name.toLowerCase(),
	);

	if (isDuplicate && !column.error) {
		column.error = i18n.baseText('dataTable.import.duplicateColumnName');
	}

	// Revalidate other columns to clear duplicate errors if needed
	csvColumns.value.forEach((col, idx) => {
		if (idx !== index) {
			const otherIsDuplicate = csvColumns.value.some(
				(c, i) => i !== idx && c.name.toLowerCase() === col.name.toLowerCase(),
			);
			const validationError = validateColumnName(col.name);
			if (otherIsDuplicate && !validationError) {
				col.error = i18n.baseText('dataTable.import.duplicateColumnName');
			} else {
				col.error = validationError;
			}
		}
	});
};

const handleFileChange = (uploadFile: UploadFile) => {
	// Called by el-upload when file is selected or dropped
	if (uploadFile.raw) {
		selectedFile.value = uploadFile.raw;
	}
};

const uploadFile = async () => {
	if (!selectedFile.value) return;

	isUploading.value = true;
	creationMode.value = 'import';

	try {
		const uploadResponse = await dataTableStore.uploadCsvFile(selectedFile.value, hasHeaders.value);
		uploadedFileId.value = uploadResponse.id;
		uploadedFileName.value = uploadResponse.originalName;
		csvRowCount.value = uploadResponse.rowCount;
		csvColumnCount.value = uploadResponse.columnCount;
		csvColumns.value = uploadResponse.columns.map((col) => {
			const compatibleTypes = (col.compatibleTypes || [col.type]) as ColumnType[];
			const sanitizedName = col.name.replace(/\s+/g, '_');
			return {
				name: sanitizedName,
				type: col.type as ColumnType,
				compatibleTypes,
				typeOptions: getColumnTypeOptions(compatibleTypes),
				error: validateColumnName(sanitizedName),
			};
		});

		// Set default table name from file name
		if (!dataTableName.value) {
			const fileName = selectedFile.value.name.replace(/\.csv$/i, '');
			dataTableName.value = fileName;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.upload.error'));
		resetToSelect();
	} finally {
		isUploading.value = false;
	}
};

const onSubmit = async () => {
	try {
		let newDataTable;

		if (selectedOption.value === 'scratch') {
			// Create from scratch
			newDataTable = await dataTableStore.createDataTable(
				dataTableName.value,
				route.params.projectId as string,
			);
		} else if (creationMode.value === 'import' && uploadedFileId.value) {
			// Create from imported CSV
			newDataTable = await dataTableStore.createDataTable(
				dataTableName.value,
				route.params.projectId as string,
				csvColumns.value.map((col) => ({ name: col.name, type: col.type })),
				uploadedFileId.value,
				hasHeaders.value,
			);
		}

		if (newDataTable) {
			telemetry.track('User created data table', {
				data_table_id: newDataTable.id,
				data_table_project_id: newDataTable.project?.id,
				creation_mode: selectedOption.value,
			});
			resetForm();
			uiStore.closeModal(props.modalName);
			void router.push({
				name: DATA_TABLE_DETAILS,
				params: {
					id: newDataTable.id,
				},
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.add.error'));
	}
};

// const onCancel = () => {
// 	resetForm();
// 	uiStore.closeModal(props.modalName);
// 	redirectToDataTables();
// };

const resetForm = () => {
	dataTableName.value = '';
	selectedFile.value = null;
	uploadedFileId.value = null;
	uploadedFileName.value = '';
	csvColumns.value = [];
	csvRowCount.value = 0;
	csvColumnCount.value = 0;
	selectedOption.value = null;
	creationMode.value = 'select';
};

const resetToSelect = () => {
	selectedFile.value = null;
	uploadedFileId.value = null;
	uploadedFileName.value = '';
	csvColumns.value = [];
	csvRowCount.value = 0;
	csvColumnCount.value = 0;
	selectedOption.value = null;
	creationMode.value = 'select';
};

const goBack = () => {
	// Just go back to select mode without clearing the state
	// This preserves the selected file and radio button selection
	creationMode.value = 'select';
};

const redirectToDataTables = () => {
	void router.replace({ name: PROJECT_DATA_TABLES });
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:center="true"
		:width="creationMode === 'import' ? '700px' : '540px'"
		:min-height="creationMode === 'import' ? '600px' : undefined"
		:before-close="redirectToDataTables"
	>
		<template #header>
			<div :class="$style.header">
				<h2>{{ modalTitle }}</h2>
			</div>
		</template>
		<template #content>
			<!-- Step 1: Selection Screen -->
			<div v-if="creationMode === 'select'" :class="$style.selectionContent">
				<N8nInputLabel
					:label="i18n.baseText('dataTable.add.input.name.label')"
					:required="true"
					input-name="dataTableNameSelect"
				>
					<N8nInput
						ref="inputRef"
						v-model="dataTableName"
						type="text"
						:placeholder="i18n.baseText('dataTable.add.input.name.placeholder')"
						data-test-id="data-table-name-input-select"
						name="dataTableNameSelect"
					/>
				</N8nInputLabel>
				<div :class="$style.radioGroup">
					<label :class="$style.radioOption">
						<input
							type="radio"
							name="creationMode"
							value="scratch"
							:class="$style.radioInput"
							:checked="selectedOption === 'scratch'"
							data-test-id="create-from-scratch-option"
							@change="selectFromScratch"
						/>
						<span :class="$style.radioLabel">
							{{ i18n.baseText('dataTable.add.fromScratch') }}
						</span>
					</label>
					<label :class="$style.radioOption">
						<input
							type="radio"
							name="creationMode"
							value="import"
							:class="$style.radioInput"
							:checked="selectedOption === 'import'"
							data-test-id="import-csv-option"
							@change="selectImportCsv"
						/>
						<span :class="$style.radioLabel">
							{{ i18n.baseText('dataTable.add.importCsv') }}
						</span>
					</label>
				</div>

				<!-- Upload section - shown when Import from CSV is selected -->
				<div v-if="selectedOption === 'import'" :class="$style.uploadSection">
					<ElUpload
						:class="$style.uploadDemo"
						drag
						:auto-upload="false"
						:show-file-list="false"
						accept=".csv"
						:on-change="handleFileChange"
					>
						<ElIcon :class="$style.uploadIcon">
							<UploadFilled />
						</ElIcon>
						<div :class="$style.uploadText">
							<span v-if="selectedFile" :class="$style.fileName">{{ selectedFile?.name }}</span>
							<span v-else>
								{{ i18n.baseText('dataTable.upload.dropOrClick') }}
							</span>
						</div>
					</ElUpload>

					<div :class="$style.checkboxContainer">
						<label :class="$style.checkboxLabel">
							<input
								v-model="hasHeaders"
								type="checkbox"
								:class="$style.checkbox"
								data-test-id="has-headers-checkbox"
							/>
							<span>{{ i18n.baseText('dataTable.upload.hasHeaders') }}</span>
						</label>
					</div>
				</div>
			</div>

			<!-- Step 3: Import CSV Column Configuration -->
			<div v-else-if="creationMode === 'import'" :class="$style.content">
				<div v-if="isUploading" :class="$style.uploadingMessage">
					{{ i18n.baseText('dataTable.upload.uploading') }}
				</div>

				<div v-else-if="!uploadedFileId" :class="$style.uploadingMessage">
					{{ i18n.baseText('dataTable.upload.selectFile') }}
				</div>

				<div v-else-if="uploadedFileId && csvColumns.length > 0" :class="$style.importContent">
					<div :class="$style.successNotice">
						{{
							i18n.baseText('dataTable.upload.success', {
								adjustToNumber: csvRowCount,
								interpolate: {
									fileName: uploadedFileName,
									columnCount: csvColumnCount,
									rowCount: csvRowCount,
								},
							})
						}}
					</div>

					<div :class="$style.columnHeaders">
						<div :class="$style.columnHeaderLabel">
							{{ i18n.baseText('dataTable.import.columnName') }}
						</div>
						<div :class="$style.columnHeaderLabel">
							{{ i18n.baseText('dataTable.import.columnType') }}
						</div>
					</div>

					<div :class="$style.columnsContainer">
						<div v-for="(column, index) in csvColumns" :key="index" :class="$style.columnItem">
							<div :class="$style.columnInputWrapper">
								<N8nInput
									v-model="column.name"
									:placeholder="i18n.baseText('dataTable.import.columnNamePlaceholder')"
									:data-test-id="`column-name-${index}`"
									:class="{ [$style.inputError]: column.error }"
									@update:model-value="onColumnNameChange(index)"
								/>
								<div v-if="column.error" :class="$style.columnErrorMessage">
									{{ column.error }}
								</div>
							</div>
							<div :class="$style.columnTypeWrapper">
								<N8nSelect v-model="column.type" :data-test-id="`column-type-${index}`">
									<N8nOption
										v-for="option in column.typeOptions"
										:key="option.value"
										:value="option.value"
										:label="option.label"
									/>
								</N8nSelect>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<!-- Select Mode Buttons -->
				<N8nButton
					v-if="creationMode === 'select'"
					type="secondary"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-select-button"
					@click="redirectToDataTables"
				/>
				<N8nButton
					v-if="creationMode === 'select'"
					size="large"
					:disabled="
						!dataTableName || !selectedOption || (selectedOption === 'import' && !selectedFile)
					"
					:label="i18n.baseText('generic.create')"
					data-test-id="proceed-from-select-button"
					@click="proceedFromSelect"
				/>

				<!-- Import CSV Column Configuration Buttons -->
				<N8nButton
					v-if="creationMode === 'import'"
					type="secondary"
					size="large"
					:label="i18n.baseText('generic.back')"
					data-test-id="back-button"
					@click="goBack"
				/>
				<N8nButton
					v-if="creationMode === 'import'"
					size="large"
					:disabled="isCreateDisabled"
					:label="i18n.baseText('generic.create')"
					data-test-id="confirm-add-data-table-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.header {
	margin-bottom: var(--spacing--xs);
}

.content {
	display: flex;
	flex-direction: column;
}

.selectionContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.radioGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.radioOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	cursor: pointer;
	user-select: none;
}

.radioInput {
	width: 16px;
	height: 16px;
	cursor: pointer;
	flex-shrink: 0;
}

.radioLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	cursor: pointer;
}

.uploadSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--sm);
}

.uploadingMessage {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
}

.importContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.successNotice {
	padding: var(--spacing--sm) var(--spacing--md);
	background-color: var(--color--success--tint-4);
	border-radius: var(--radius);
	color: var(--color--success--shade-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.columnHeaders {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--md);
	padding: 0 var(--spacing--2xs);
}

.columnHeaderLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
}

.columnsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	max-height: 400px;
	overflow-y: auto;
	padding: var(--spacing--2xs);
}

.columnItem {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--md);
	align-items: start;
}

.columnInputWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.columnTypeWrapper {
	display: flex;
	align-items: center;
}

.inputError {
	border-color: var(--color--danger) !important;

	&:focus {
		box-shadow: 0 0 0 2px var(--color--danger--tint-3) !important;
	}
}

.columnErrorMessage {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
	line-height: var(--line-height--sm);
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	margin-top: var(--spacing--lg);
}

.fileSelectedContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg) 0;
}

.uploadDemo {
	width: 100%;

	:global(.el-upload) {
		width: 100%;
		border-radius: var(--radius--lg);
	}

	:global(.el-upload-dragger) {
		width: 100%;
		padding: var(--spacing--2xl) var(--spacing--lg);
		border: 2px dashed var(--color--foreground);
		background-color: var(--color--foreground);
		border-radius: var(--radius--lg);
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;

		&:hover {
			border-color: var(--color--primary);
			background-color: var(--color--foreground--shade-1);
		}
	}

	// Hide the default file input button
	:global(input[type='file']) {
		display: none !important;
	}
}

.uploadIcon {
	font-size: 48px;
	color: var(--color--primary);
	margin-bottom: var(--spacing--sm);
}

.uploadText {
	font-size: var(--font-size--md);
	color: var(--color--text);
	line-height: var(--line-height--lg);
	text-align: center;
}

.fileName {
	font-weight: var(--font-weight--bold);
	color: var(--color--primary);
}

.uploadTip {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	margin-top: var(--spacing--xs);
	line-height: var(--line-height--lg);
}

.checkboxContainer {
	display: flex;
	align-items: center;
	padding: var(--spacing--sm) 0;
}

.checkboxLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	cursor: pointer;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	user-select: none;
}

.checkbox {
	width: 18px;
	height: 18px;
	cursor: pointer;
}
</style>
