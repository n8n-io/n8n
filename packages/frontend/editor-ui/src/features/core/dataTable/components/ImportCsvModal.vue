<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { ref, computed, watch } from 'vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import { N8nButton, N8nIcon, N8nText, N8nCallout } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { ElUpload } from 'element-plus';
import type { UploadFile } from 'element-plus';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';

type Props = {
	modalName: string;
	dataTable: DataTable;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	imported: [];
	close: [];
}>();

const dataTableStore = useDataTableStore();
const uiStore = useUIStore();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const selectedFile = ref<File | null>(null);
const uploadedFileId = ref<string | null>(null);
const csvRowCount = ref(0);
const isUploading = ref(false);
const isImporting = ref(false);
const isUploadHovered = ref(false);

const matchedColumns = ref<string[]>([]);
const unrecognizedColumns = ref<string[]>([]);

const uploaded = computed(() => uploadedFileId.value !== null);

const tableColumnNames = computed(() => new Set(props.dataTable.columns.map((col) => col.name)));

const missingTableColumns = computed(() => {
	if (!uploaded.value) return [];
	return props.dataTable.columns
		.filter((col) => !matchedColumns.value.includes(col.name))
		.map((col) => col.name);
});

const canImport = computed(() => {
	return (
		uploaded.value &&
		matchedColumns.value.length > 0 &&
		unrecognizedColumns.value.length === 0 &&
		!isImporting.value
	);
});

const handleFileChange = (uploadFile: UploadFile) => {
	if (uploadFile.raw) {
		selectedFile.value = uploadFile.raw;
		void processUpload();
	}
};

const processUpload = async () => {
	if (!selectedFile.value) return;

	isUploading.value = true;
	try {
		const response = await dataTableStore.uploadCsvFile(selectedFile.value, true);
		uploadedFileId.value = response.id;
		csvRowCount.value = response.rowCount;

		matchedColumns.value = [];
		unrecognizedColumns.value = [];

		for (const csvCol of response.columns) {
			if (DATA_TABLE_SYSTEM_COLUMNS.includes(csvCol.name)) {
				// System columns are silently skipped during import
			} else if (tableColumnNames.value.has(csvCol.name)) {
				matchedColumns.value.push(csvCol.name);
			} else {
				unrecognizedColumns.value.push(csvCol.name);
			}
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.upload.error'));
		reset();
	} finally {
		isUploading.value = false;
	}
};

const onImport = async () => {
	if (!uploadedFileId.value || !canImport.value) return;

	isImporting.value = true;
	try {
		const result = await dataTableStore.importCsvToDataTable(
			props.dataTable.id,
			props.dataTable.projectId,
			uploadedFileId.value,
		);

		toast.showMessage({
			title: i18n.baseText('dataTable.importCsv.success', {
				adjustToNumber: result.importedRowCount,
				interpolate: { count: String(result.importedRowCount) },
			}),
			type: 'success',
		});

		telemetry.track('User imported CSV to data table', {
			data_table_id: props.dataTable.id,
			data_table_project_id: props.dataTable.projectId,
			imported_row_count: result.importedRowCount,
			system_columns_ignored: result.systemColumnsIgnored,
		});

		uiStore.closeModal(props.modalName);
		emit('imported');
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.importCsv.error'));
	} finally {
		isImporting.value = false;
	}
};

const reset = () => {
	selectedFile.value = null;
	uploadedFileId.value = null;
	csvRowCount.value = 0;
	matchedColumns.value = [];
	unrecognizedColumns.value = [];
};

const isModalOpen = computed(() => uiStore.modalsById[props.modalName]?.open);

watch(isModalOpen, (open) => {
	if (!open) {
		reset();
	}
});

const onClose = () => {
	reset();
	emit('close');
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('dataTable.importCsv.title')"
		:center="true"
		width="540px"
		:event-bus="undefined"
	>
		<template #content>
			<div :class="$style.content">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('dataTable.importCsv.description') }}
				</N8nText>

				<ElUpload
					:class="$style.uploadDemo"
					drag
					:auto-upload="false"
					:show-file-list="false"
					accept=".csv"
					:on-change="handleFileChange"
					data-test-id="import-csv-upload"
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
						{{ selectedFile.name }}
					</N8nText>
					<N8nText v-else size="medium" :color="isUploadHovered ? 'text-dark' : 'text-light'">
						{{ i18n.baseText('dataTable.upload.dropOrClick') }}
					</N8nText>
				</ElUpload>

				<div v-if="isUploading" :class="$style.uploadingMessage">
					{{ i18n.baseText('dataTable.upload.uploading') }}
				</div>

				<div v-if="uploaded && !isUploading" :class="$style.columnResults">
					<N8nCallout
						v-if="unrecognizedColumns.length > 0 && missingTableColumns.length > 0"
						theme="danger"
						data-test-id="import-csv-column-mismatch"
					>
						{{
							i18n.baseText('dataTable.importCsv.columnMismatch', {
								interpolate: {
									unrecognized: unrecognizedColumns.join(', '),
									missing: missingTableColumns.join(', '),
								},
							})
						}}
					</N8nCallout>

					<N8nCallout
						v-else-if="unrecognizedColumns.length > 0"
						theme="danger"
						data-test-id="import-csv-unrecognized-columns"
					>
						{{
							i18n.baseText('dataTable.importCsv.unrecognizedColumnsOnly', {
								interpolate: { columns: unrecognizedColumns.join(', ') },
							})
						}}
					</N8nCallout>

					<N8nCallout
						v-else-if="missingTableColumns.length > 0"
						theme="info"
						data-test-id="import-csv-missing-columns"
					>
						{{
							i18n.baseText('dataTable.importCsv.missingColumnsOnly', {
								interpolate: { columns: missingTableColumns.join(', ') },
							})
						}}
					</N8nCallout>

					<N8nCallout
						v-if="matchedColumns.length === 0 && unrecognizedColumns.length === 0"
						theme="danger"
						data-test-id="import-csv-no-matching-columns"
					>
						{{ i18n.baseText('dataTable.importCsv.noMatchingColumns') }}
					</N8nCallout>

					<N8nText
						v-if="canImport"
						size="small"
						:class="$style.readyToImport"
						data-test-id="import-csv-ready-to-import"
					>
						{{
							i18n.baseText('dataTable.importCsv.readyToImport', {
								adjustToNumber: csvRowCount,
								interpolate: { count: String(csvRowCount) },
							})
						}}
					</N8nText>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					size="large"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="import-csv-cancel"
					@click="onClose"
				/>
				<N8nButton
					size="large"
					:label="i18n.baseText('dataTable.importCsv.importButton')"
					:disabled="!canImport"
					:loading="isImporting"
					data-test-id="import-csv-confirm"
					@click="onImport"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
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
		background-color: var(--color--background);
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

.uploadingMessage {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
}

.columnResults {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.readyToImport {
	font-weight: var(--font-weight--bold);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
