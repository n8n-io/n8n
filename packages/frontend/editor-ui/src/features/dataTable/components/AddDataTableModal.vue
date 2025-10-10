<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/dataTable/constants';
import { useTelemetry } from '@/composables/useTelemetry';

import { N8nButton, N8nInput, N8nInputLabel } from '@n8n/design-system';
import Modal from '@/components/Modal.vue';
type Props = {
	modalName: string;
};

const props = defineProps<Props>();

const dataTableStore = useDataTableStore();
const uiStore = useUIStore();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const dataTableName = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
	setTimeout(() => {
		inputRef.value?.focus();
		inputRef.value?.select();
	}, 0);
});

const onSubmit = async () => {
	try {
		const newDataTable = await dataTableStore.createDataTable(
			dataTableName.value,
			route.params.projectId as string,
		);
		telemetry.track('User created data table', {
			data_table_id: newDataTable.id,
			data_table_project_id: newDataTable.project?.id,
		});
		dataTableName.value = '';
		uiStore.closeModal(props.modalName);
		void router.push({
			name: DATA_TABLE_DETAILS,
			params: {
				id: newDataTable.id,
			},
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.add.error'));
	}
};

const onCancel = () => {
	uiStore.closeModal(props.modalName);
	redirectToDataTables();
};

const redirectToDataTables = () => {
	void router.replace({ name: PROJECT_DATA_TABLES });
};
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="540px" :before-close="redirectToDataTables">
		<template #header>
			<div :class="$style.header">
				<h2>{{ i18n.baseText('dataTable.add.title') }}</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
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
						@keyup.enter="onSubmit"
					/>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					:disabled="!dataTableName"
					:label="i18n.baseText('generic.create')"
					data-test-id="confirm-add-data-table-button"
					@click="onSubmit"
				/>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-add-data-table-button"
					@click="onCancel"
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

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	margin-top: var(--spacing--lg);
}
</style>
