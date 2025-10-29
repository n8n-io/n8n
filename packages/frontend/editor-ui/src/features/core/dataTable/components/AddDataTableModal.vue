<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, ref, computed } from 'vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useTelemetry } from '@/composables/useTelemetry';
import { dataTableColumnNameSchema, DATA_TABLE_COLUMN_ERROR_MESSAGE } from '@n8n/api-types';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nSelect,
	N8nOption,
	N8nIcon,
} from '@n8n/design-system';
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

const getTypeIcon = (type: ColumnType) => {
	switch (type) {
		case 'string':
			return 'text' as const;
		case 'number':
			return 'hash' as const;
		case 'boolean':
			return 'check' as const;
		case 'date':
			return 'clock' as const;
		default:
			return 'text' as const;
	}
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
		return DATA_TABLE_COLUMN_ERROR_MESSAGE;
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
	if (creationMode.value === 'select') {
		return i18n.baseText('dataTable.add.title');
	}
	return i18n.baseText('dataTable.add.title');
});

const isCreateDisabled = computed(() => {
	if (creationMode.value === 'scratch') {
		return !dataTableName.value;
	}
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

const selectFromScratch = () => {
	creationMode.value = 'scratch';
	setTimeout(() => {
		inputRef.value?.focus();
	}, 0);
};

const selectImportCsv = () => {
	creationMode.value = 'file-selected';
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

		if (creationMode.value === 'scratch') {
			newDataTable = await dataTableStore.createDataTable(
				dataTableName.value,
				route.params.projectId as string,
			);
		} else if (creationMode.value === 'import' && uploadedFileId.value) {
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
				creation_mode: creationMode.value,
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
	creationMode.value = 'select';
};

const resetToSelect = () => {
	dataTableName.value = '';
	selectedFile.value = null;
	uploadedFileId.value = null;
	uploadedFileName.value = '';
	csvColumns.value = [];
	csvRowCount.value = 0;
	csvColumnCount.value = 0;
	creationMode.value = 'select';
};

const goBack = () => {
	if (creationMode.value === 'import' && uploadedFileId.value) {
		// If we have uploaded file data, clear it
		resetToSelect();
	} else {
		creationMode.value = 'select';
	}
};

const redirectToDataTables = () => {
	void router.replace({ name: PROJECT_DATA_TABLES });
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:center="true"
		:width="creationMode === 'import' && uploadedFileId ? '700px' : '540px'"
		:min-height="creationMode === 'import' && uploadedFileId ? '600px' : undefined"
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
				<div :class="$style.optionCards">
					<button
						:class="$style.optionCard"
						@click="selectFromScratch"
						data-test-id="create-from-scratch-option"
					>
						<div :class="$style.optionIcon">
							<N8nIcon icon="plus" size="large" />
						</div>
						<div :class="$style.optionLabel">
							{{ i18n.baseText('dataTable.add.fromScratch') }}
						</div>
					</button>
					<button
						:class="$style.optionCard"
						@click="selectImportCsv"
						data-test-id="import-csv-option"
					>
						<div :class="$style.optionIcon">
							<N8nIcon icon="file" size="large" />
						</div>
						<div :class="$style.optionLabel">
							{{ i18n.baseText('dataTable.add.importCsv') }}
						</div>
					</button>
				</div>
			</div>

			<!-- Step 2: From Scratch -->
			<div v-else-if="creationMode === 'scratch'" :class="$style.content">
				<N8nInputLabel
					:label="i18n.baseText('dataTable.add.input.name.label')"
					:required="true"
					input-name="dataTableName"
				>
					<N8nInput
						ref="inputRef"
						v-model="dataTableName"
						type="text"
						:placeholder="i18n.baseText('dataTable.add.input.name.placeholder')"
						data-test-id="data-table-name-input"
						name="dataTableName"
						@keydown.enter="onSubmit"
					/>
				</N8nInputLabel>
			</div>

			<!-- Step 2.5: File Selected - Configure Upload -->
			<div v-else-if="creationMode === 'file-selected'" :class="$style.content">
				<div :class="$style.fileSelectedContainer">
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
						<template #tip>
							<div :class="$style.uploadTip">
								{{ i18n.baseText('dataTable.upload.csvOnly') }}
							</div>
						</template>
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

			<!-- Step 3: Import CSV -->
			<div v-else-if="creationMode === 'import'" :class="$style.content">
				<div v-if="isUploading" :class="$style.uploadingMessage">
					{{ i18n.baseText('dataTable.upload.uploading') }}
				</div>

				<div v-else-if="!uploadedFileId" :class="$style.uploadingMessage">
					{{ i18n.baseText('dataTable.upload.selectFile') }}
				</div>

				<div v-else-if="uploadedFileId && csvColumns.length > 0">
					<div :class="$style.uploadSuccessMessage">
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

					<div :class="$style.columnMappingSection">
						<h3 :class="$style.sectionTitle">
							{{ i18n.baseText('dataTable.import.columnsFound') }}
						</h3>
						<p :class="$style.sectionDescription">
							{{ i18n.baseText('dataTable.import.columnsDescription') }}
						</p>

						<div :class="$style.columnsList">
							<div :class="$style.columnsHeader">
								<div :class="$style.columnNameHeader">
									{{ i18n.baseText('dataTable.import.columnName') }}
								</div>
								<div :class="$style.columnTypeHeader">
									{{ i18n.baseText('dataTable.import.columnType') }}
								</div>
							</div>
							<div :class="$style.columnsScrollableContainer">
								<div v-for="(column, index) in csvColumns" :key="index" :class="$style.columnRow">
									<div :class="$style.columnNameWrapper">
										<N8nInput
											v-model="column.name"
											:placeholder="i18n.baseText('dataTable.import.columnNamePlaceholder')"
											:data-test-id="`column-name-${index}`"
											:class="{ [$style.inputError]: column.error }"
											size="small"
											@update:model-value="onColumnNameChange(index)"
										/>
										<div v-if="column.error" :class="$style.errorMessage">
											{{ column.error }}
										</div>
									</div>
									<div :class="$style.columnType">
										<div :class="$style.typeSelectWrapper">
											<N8nIcon
												:icon="getTypeIcon(column.type)"
												:class="$style.typeIcon"
												size="small"
											/>
											<N8nSelect
												v-model="column.type"
												:data-test-id="`column-type-${index}`"
												:class="$style.typeSelect"
												size="small"
											>
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
					</div>

					<div :class="$style.tableNameSection">
						<N8nInputLabel
							:label="i18n.baseText('dataTable.add.input.name.label')"
							:required="true"
							input-name="dataTableName"
						>
							<N8nInput
								ref="inputRef"
								v-model="dataTableName"
								type="text"
								:placeholder="i18n.baseText('dataTable.add.input.name.placeholder')"
								data-test-id="data-table-name-input"
								name="dataTableName"
								@keydown.enter="onSubmit"
							/>
						</N8nInputLabel>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<!-- File Selected Step Buttons -->
				<N8nButton
					v-if="creationMode === 'file-selected'"
					type="secondary"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-file-button"
					@click="resetToSelect"
				/>
				<N8nButton
					v-if="creationMode === 'file-selected'"
					size="large"
					:disabled="!selectedFile"
					:label="i18n.baseText('dataTable.upload.uploadButton')"
					data-test-id="upload-csv-button"
					@click="uploadFile"
				/>

				<!-- Other Modes Buttons -->
				<N8nButton
					v-if="creationMode !== 'select' && creationMode !== 'file-selected'"
					type="secondary"
					size="large"
					:label="i18n.baseText('generic.back')"
					data-test-id="back-button"
					@click="goBack"
				/>
				<N8nButton
					v-if="creationMode !== 'select' && creationMode !== 'file-selected'"
					size="large"
					:disabled="isCreateDisabled"
					:label="i18n.baseText('generic.create')"
					data-test-id="confirm-add-data-table-button"
					@click="onSubmit"
				/>
				<!-- <N8nButton
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-add-data-table-button"
					@click="onCancel"
				/> -->
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
	padding: var(--spacing--md) 0;
}

.optionCards {
	display: flex;
	gap: var(--spacing--md);
	justify-content: center;
}

.optionCard {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	border: 2px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--foreground);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		background-color: var(--color--foreground--shade-1);
		border-color: var(--color--primary);
	}

	&:focus {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.optionIcon {
	margin-bottom: var(--spacing--sm);
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}

.optionLabel {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.uploadingMessage {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
}

.uploadSuccessMessage {
	padding: var(--spacing--sm) var(--spacing--md);
	margin-bottom: var(--spacing--md);
	background-color: var(--color--success--tint-4);
	border-radius: var(--radius);
	color: var(--color--success--shade-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.columnMappingSection {
	margin-bottom: var(--spacing--lg);
}

.sectionTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--3xs);
	color: var(--color--text);
}

.sectionDescription {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--sm);
	line-height: var(--line-height--lg);
}

.columnsList {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
}

.columnsHeader {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--color--foreground--shade-1);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.columnNameHeader,
.columnTypeHeader {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.columnsScrollableContainer {
	max-height: 300px;
	overflow-y: auto;
	overflow-x: hidden;
}

.columnRow {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	align-items: start;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.columnNameWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.columnName,
.columnType {
	display: flex;
	align-items: flex-start;
}

.inputError {
	border-color: var(--color--danger) !important;

	&:focus {
		box-shadow: 0 0 0 2px var(--color--danger--tint-3) !important;
	}
}

.errorMessage {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--5xs);
}

.typeSelectWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.typeIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.typeSelect {
	flex: 1;
}

.tableNameSection {
	margin-top: var(--spacing--md);
	padding-top: var(--spacing--md);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
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
