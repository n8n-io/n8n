<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowExport } from '@/app/composables/useWorkflowExport';
import { EXPORT_WORKFLOW_MODAL_KEY } from '@/app/constants/modals';
import { N8nButton, N8nCheckbox, N8nNotice, N8nText } from '@n8n/design-system';

const i18n = useI18n();
const uiStore = useUIStore();
const {
	extractDataTablesFromWorkflow,
	extractSubworkflowsFromWorkflow,
	exportWorkflowAsJson,
	exportWorkflowWithDataTables,
} = useWorkflowExport();

const includeDataTables = ref(true);
const includeSubworkflows = ref(true);
const isExporting = ref(false);
const dataTables = ref<Array<{ id: string; name: string }>>([]);
const subworkflows = ref<Array<{ id: string; name: string }>>([]);

const hasDataTables = computed(() => dataTables.value.length > 0);
const dataTableCount = computed(() => dataTables.value.length);
const hasSubworkflows = computed(() => subworkflows.value.length > 0);
const subworkflowCount = computed(() => subworkflows.value.length);

onMounted(() => {
	// Extract data table and subworkflow references from workflow
	dataTables.value = extractDataTablesFromWorkflow();
	subworkflows.value = extractSubworkflowsFromWorkflow();
});

const closeModal = () => {
	uiStore.closeModal(EXPORT_WORKFLOW_MODAL_KEY);
};

const handleExport = async () => {
	isExporting.value = true;
	try {
		// Export as ZIP if including data tables or subworkflows
		if ((hasDataTables.value && includeDataTables.value) || (hasSubworkflows.value && includeSubworkflows.value)) {
			await exportWorkflowWithDataTables(includeDataTables.value, includeSubworkflows.value);
		} else {
			await exportWorkflowAsJson();
		}
		closeModal();
	} catch (error) {
		// Error handling is done in the composable
	} finally {
		isExporting.value = false;
	}
};
</script>

<template>
	<Modal
		:name="EXPORT_WORKFLOW_MODAL_KEY"
		:title="i18n.baseText('exportWorkflow.title')"
		:show-close="true"
		:center="true"
		width="500px"
	>
		<template #content>
			<div :class="$style.content">
				<N8nText v-if="!hasDataTables && !hasSubworkflows">
					{{ i18n.baseText('exportWorkflow.noDataTablesOrSubworkflows') }}
				</N8nText>

				<template v-else>
					<N8nText>
						{{ i18n.baseText('exportWorkflow.message') }}
					</N8nText>

					<!-- Data Tables Section -->
					<template v-if="hasDataTables">
						<N8nNotice type="info" :class="$style.notice">
							{{
								i18n.baseText('exportWorkflow.dataTables.found', {
									interpolate: { count: dataTableCount.toString() },
								})
							}}
						</N8nNotice>

						<N8nCheckbox v-model="includeDataTables" :class="$style.checkbox">
							<N8nText bold color="text-dark">
								{{ i18n.baseText('exportWorkflow.includeDataTables') }}
							</N8nText>
						</N8nCheckbox>

						<div v-if="includeDataTables" :class="$style.details">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('exportWorkflow.dataTables.details') }}
							</N8nText>
							<ul :class="$style.tableList">
								<li v-for="table in dataTables" :key="table.id">
									<N8nText size="small">{{ table.name }}</N8nText>
								</li>
							</ul>
						</div>
					</template>

					<!-- Subworkflows Section -->
					<template v-if="hasSubworkflows">
						<N8nNotice type="info" :class="$style.notice">
							{{
								i18n.baseText('exportWorkflow.subworkflows.found', {
									interpolate: { count: subworkflowCount.toString() },
								})
							}}
						</N8nNotice>

						<N8nCheckbox v-model="includeSubworkflows" :class="$style.checkbox">
							<N8nText bold color="text-dark">
								{{ i18n.baseText('exportWorkflow.includeSubworkflows') }}
							</N8nText>
						</N8nCheckbox>

						<div v-if="includeSubworkflows" :class="$style.details">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('exportWorkflow.subworkflows.warning') }}
							</N8nText>
							<N8nText size="small" color="text-light" :class="$style.detailsLabel">
								{{ i18n.baseText('exportWorkflow.subworkflows.details') }}
							</N8nText>
							<ul :class="$style.tableList">
								<li v-for="subworkflow in subworkflows" :key="subworkflow.id">
									<N8nText size="small">{{ subworkflow.name }}</N8nText>
								</li>
							</ul>
						</div>
					</template>
				</template>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					data-test-id="cancel-workflow-export-button"
					@click="closeModal"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="primary"
					:loading="isExporting"
					data-test-id="confirm-workflow-export-button"
					@click="handleExport"
				>
					{{ i18n.baseText('generic.download') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.notice {
	margin-top: var(--spacing--xs);
}

.checkbox {
	margin-top: var(--spacing--xs);
}

.details {
	margin-top: var(--spacing--2xs);
	margin-left: var(--spacing--lg);
}

.detailsLabel {
	margin-top: var(--spacing--2xs);
	display: block;
}

.tableList {
	margin-top: var(--spacing--2xs);
	padding-left: var(--spacing--sm);
	list-style-type: disc;

	li {
		margin-bottom: var(--spacing--3xs);
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
