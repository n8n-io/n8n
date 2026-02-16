<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, ref, computed } from 'vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { dataTableColumnNameSchema } from '@n8n/api-types';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nSelect,
	N8nOption,
	N8nText,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { ElUpload, ElRadio, ElRadioGroup } from 'element-plus';
import type { UploadFile } from 'element-plus';

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
	included: boolean;
	csvColumnName: string;
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
const isLoading = ref(false);
const hasHeaders = ref(true);
const isUploadHovered = ref(false);

const allColumnTypeOptions = [
	{ label: 'String', value: 'string' },
	{ label: 'Number', value: 'number' },
	{ label: 'Boolean', value: 'boolean' },
	{ label: 'Datetime', value: 'date' },
];

const isColumnType = (value: unknown): value is ColumnType => {
	return allColumnTypeOptions.some((option) => option.value === value);
};

const getColumnTypeOptions = (compatibleTypes: ColumnType[]) => {
	if (!compatibleTypes || compatibleTypes.length === 0) {
		return allColumnTypeOptions;
	}
	return allColumnTypeOptions.filter((option) =>
		compatibleTypes.includes(option.value as ColumnType),
	);
};

const validateColumnName = (columnName: string): string | undefined => {
	if (DATA_TABLE_SYSTEM_COLUMNS.includes(columnName)) {
		return i18n.baseText('dataTable.import.systemColumnName', {
			interpolate: { columnName },
		});
	}

	const result = dataTableColumnNameSchema.safeParse(columnName);
	if (!result.success) {
		return i18n.baseText('dataTable.import.invalidColumnName');
	}
	return undefined;
};

const includedColumns = computed(() => csvColumns.value.filter((col) => col.included));

const hasValidationErrors = computed(() => {
	if (creationMode.value !== 'import') return false;
	return includedColumns.value.some((column) => column.error !== undefined);
});

const hasDuplicateNames = computed(() => {
	if (creationMode.value !== 'import') return false;
	const names = includedColumns.value.map((col) => col.name.toLowerCase());
	return names.length !== new Set(names).size;
});

const hasNoIncludedColumns = computed(() => {
	if (creationMode.value !== 'import') return false;
	return includedColumns.value.length === 0;
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
			hasDuplicateNames.value ||
			hasNoIncludedColumns.value
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

const selectedOption = ref<'scratch' | 'import'>('scratch');

const proceedFromSelect = async () => {
	if (!selectedOption.value || !dataTableName.value || isLoading.value) return;

	if (selectedOption.value === 'scratch') {
		await onSubmit();
	} else if (selectedOption.value === 'import') {
		if (!selectedFile.value) return;
		await uploadFile();
	}
};

const revalidateAllColumns = () => {
	csvColumns.value.forEach((col, idx) => {
		if (!col.included) {
			col.error = undefined;
			return;
		}
		const validationError = validateColumnName(col.name);
		const isDuplicate = csvColumns.value.some(
			(c, i) => i !== idx && c.included && c.name.toLowerCase() === col.name.toLowerCase(),
		);
		if (isDuplicate && !validationError) {
			col.error = i18n.baseText('dataTable.import.duplicateColumnName');
		} else {
			col.error = validationError;
		}
	});
};

const onColumnNameChange = (index: number) => {
	const column = csvColumns.value[index];
	if (!column) return;
	revalidateAllColumns();
};

const onColumnIncludedChange = () => {
	revalidateAllColumns();
};

const reset = (clearTableName = false) => {
	if (clearTableName) {
		dataTableName.value = '';
	}
	selectedFile.value = null;
	uploadedFileId.value = null;
	uploadedFileName.value = '';
	csvColumns.value = [];
	csvRowCount.value = 0;
	csvColumnCount.value = 0;
	selectedOption.value = 'scratch';
	creationMode.value = 'select';
};

const handleFileChange = (uploadFile: UploadFile) => {
	if (uploadFile.raw) {
		selectedFile.value = uploadFile.raw;
	}
};

const uploadFile = async () => {
	if (!selectedFile.value) return;

	isLoading.value = true;
	creationMode.value = 'import';

	try {
		const uploadResponse = await dataTableStore.uploadCsvFile(selectedFile.value, hasHeaders.value);
		uploadedFileId.value = uploadResponse.id;
		uploadedFileName.value = uploadResponse.originalName;
		csvRowCount.value = uploadResponse.rowCount;
		csvColumnCount.value = uploadResponse.columnCount;
		csvColumns.value = uploadResponse.columns.map((col) => {
			const compatibleTypes = (col.compatibleTypes || [col.type]).filter(isColumnType);
			const sanitizedName = col.name.replace(/\s+/g, '_');
			const colType = isColumnType(col.type) ? col.type : 'string';
			return {
				name: sanitizedName,
				type: colType,
				compatibleTypes,
				typeOptions: getColumnTypeOptions(compatibleTypes),
				error: validateColumnName(sanitizedName),
				included: true,
				csvColumnName: col.name,
			};
		});

		if (!dataTableName.value) {
			const fileName = selectedFile.value.name.replace(/\.csv$/i, '');
			dataTableName.value = fileName;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.upload.error'));
		reset();
	} finally {
		isLoading.value = false;
	}
};

const onSubmit = async () => {
	isLoading.value = true;
	try {
		let newDataTable;

		if (selectedOption.value === 'scratch') {
			newDataTable = await dataTableStore.createDataTable(
				dataTableName.value,
				route.params.projectId as string,
			);
		} else if (creationMode.value === 'import' && uploadedFileId.value) {
			const hasColumnChanges = csvColumns.value.some(
				(col) => !col.included || col.name !== col.csvColumnName.replace(/\s+/g, '_'),
			);

			newDataTable = await dataTableStore.createDataTable(
				dataTableName.value,
				route.params.projectId as string,
				includedColumns.value.map((col) => ({
					name: col.name,
					type: col.type,
					...(hasColumnChanges ? { csvColumnName: col.csvColumnName } : {}),
				})),
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
			reset(true);
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
	} finally {
		isLoading.value = false;
	}
};

const goBack = () => {
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
						@keydown.enter="proceedFromSelect"
					/>
				</N8nInputLabel>
				<ElRadioGroup v-model="selectedOption" :class="$style.radioGroup">
					<ElRadio label="scratch" data-test-id="create-from-scratch-option">
						{{ i18n.baseText('dataTable.add.fromScratch') }}
					</ElRadio>
					<ElRadio label="import" data-test-id="import-csv-option">
						{{ i18n.baseText('dataTable.add.importCsv') }}
					</ElRadio>
				</ElRadioGroup>

				<div v-if="selectedOption === 'import'" :class="$style.uploadSection">
					<ElUpload
						:class="$style.uploadDemo"
						drag
						:auto-upload="false"
						:show-file-list="false"
						accept=".csv"
						:on-change="handleFileChange"
						@mouseenter="isUploadHovered = true"
						@mouseleave="isUploadHovered = false"
					>
						<N8nIcon
							icon="file"
							:size="24"
							:color="isUploadHovered ? 'text-dark' : 'text-light'"
							:class="$style.uploadIcon"
						/>
						<N8nText v-if="selectedFile" :color="isUploadHovered ? 'text-dark' : 'text-light'">
							{{ selectedFile?.name }}
						</N8nText>
						<N8nText v-else size="medium" :color="isUploadHovered ? 'text-dark' : 'text-light'">
							{{ i18n.baseText('dataTable.upload.dropOrClick') }}
						</N8nText>
					</ElUpload>

					<N8nCheckbox
						v-model="hasHeaders"
						:label="i18n.baseText('dataTable.upload.hasHeaders')"
						data-test-id="has-headers-checkbox"
					/>
				</div>
			</div>

			<div v-else-if="creationMode === 'import'" :class="$style.content">
				<div v-if="isLoading" :class="$style.uploadingMessage">
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
						<div :aria-label="i18n.baseText('dataTable.import.includeColumn')" />
						<div :class="$style.columnHeaderLabel">
							{{ i18n.baseText('dataTable.import.columnName') }}
						</div>
						<div :class="$style.columnHeaderLabel">
							{{ i18n.baseText('dataTable.import.columnType') }}
						</div>
					</div>

					<div :class="$style.columnsContainer">
						<div v-for="(column, index) in csvColumns" :key="index" :class="$style.columnItem">
							<div :class="$style.columnCheckboxWrapper">
								<N8nCheckbox
									v-model="column.included"
									:data-test-id="`column-include-${index}`"
									@update:model-value="onColumnIncludedChange"
								/>
							</div>
							<div :class="$style.columnInputWrapper">
								<N8nInput
									v-model="column.name"
									:placeholder="i18n.baseText('dataTable.import.columnNamePlaceholder')"
									:data-test-id="`column-name-${index}`"
									:disabled="!column.included"
									:class="{ [$style.inputError]: column.error }"
									@update:model-value="onColumnNameChange(index)"
								/>
								<div v-if="column.error" :class="$style.columnErrorMessage">
									{{ column.error }}
								</div>
							</div>
							<div :class="$style.columnTypeWrapper">
								<N8nSelect
									v-model="column.type"
									:disabled="!column.included || column.typeOptions.length === 1"
									:class="{ 'column-type-excluded': !column.included }"
									:data-test-id="`column-type-${index}`"
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
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					v-if="creationMode === 'select'"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-select-button"
					@click="redirectToDataTables"
				/>
				<N8nButton
					v-if="creationMode === 'select'"
					:loading="isLoading"
					size="large"
					:disabled="
						!dataTableName || !selectedOption || (selectedOption === 'import' && !selectedFile)
					"
					:label="i18n.baseText('generic.create')"
					data-test-id="proceed-from-select-button"
					@click="proceedFromSelect"
				/>

				<N8nButton
					variant="subtle"
					v-if="creationMode === 'import'"
					size="large"
					:label="i18n.baseText('generic.back')"
					data-test-id="back-button"
					@click="goBack"
				/>
				<N8nButton
					v-if="creationMode === 'import'"
					:loading="isLoading"
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
	gap: var(--spacing--xs);

	:global(.el-radio) {
		height: auto;
		margin-right: 0;
	}

	:global(.el-radio__input.is-checked .el-radio__inner) {
		background-color: var(--color--primary);
		border-color: var(--color--primary);
	}

	:global(.el-radio__inner) {
		width: 16px;
		height: 16px;
	}

	:global(.el-radio__input:hover .el-radio__inner) {
		border-color: var(--color--foreground);
	}

	:global(.el-radio__input.is-checked:hover .el-radio__inner) {
		border-color: var(--color--primary);
	}

	:global(.el-radio__label) {
		font-size: var(--font-size--sm);
		color: var(--color--text) !important;
		padding-left: var(--spacing--xs);
	}

	:global(.el-radio.is-checked .el-radio__label) {
		color: var(--color--text) !important;
	}
}

.uploadSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
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
	grid-template-columns: var(--spacing--sm) 1fr 1fr;
	gap: var(--spacing--md);
	padding: 0 var(--spacing--2xs);
	align-items: baseline;
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
	grid-template-columns: var(--spacing--sm) 1fr 1fr;
	gap: var(--spacing--md);
	align-items: start;
}

.columnCheckboxWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--spacing--xl);
}

.columnInputWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.columnTypeWrapper {
	display: flex;
	align-items: center;

	:global(.column-type-excluded.n8n-select) {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		--el-disabled-bg-color: var(--color--background--light-3);
		--input--color--background--disabled: var(--color--background--light-3);
		pointer-events: none;
		cursor: not-allowed;
		opacity: 0.6;
	}
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
		border: 1px solid var(--color--foreground);
		background-color: var(--color--background-base);
		border-radius: var(--radius--lg);
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;

		&:hover {
			background-color: var(--color--background);
		}
	}

	:global(input[type='file']) {
		display: none !important;
	}
}

.uploadIcon {
	margin-bottom: var(--spacing--sm);
}

.fileName {
	font-weight: var(--font-weight--regular);
}
</style>
