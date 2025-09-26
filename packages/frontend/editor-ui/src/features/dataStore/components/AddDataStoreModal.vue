<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useRoute, useRouter } from 'vue-router';
import { DATA_STORE_DETAILS, PROJECT_DATA_STORES } from '@/features/dataStore/constants';
import { useTelemetry } from '@/composables/useTelemetry';

type Props = {
	modalName: string;
};

const props = defineProps<Props>();

const dataStoreStore = useDataStoreStore();
const uiStore = useUIStore();

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const dataStoreName = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
	setTimeout(() => {
		inputRef.value?.focus();
		inputRef.value?.select();
	}, 0);
});

const onSubmit = async () => {
	try {
		const newDataStore = await dataStoreStore.createDataStore(
			dataStoreName.value,
			route.params.projectId as string,
		);
		telemetry.track('User created data table', {
			data_table_id: newDataStore.id,
			data_table_project_id: newDataStore.project?.id,
		});
		dataStoreName.value = '';
		uiStore.closeModal(props.modalName);
		void router.push({
			name: DATA_STORE_DETAILS,
			params: {
				id: newDataStore.id,
			},
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.add.error'));
	}
};

const onCancel = () => {
	uiStore.closeModal(props.modalName);
	redirectToDataStores();
};

const redirectToDataStores = () => {
	void router.replace({ name: PROJECT_DATA_STORES });
};
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="540px" :before-close="redirectToDataStores">
		<template #header>
			<div :class="$style.header">
				<h2>{{ i18n.baseText('dataStore.add.title') }}</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<n8n-input-label
					:label="i18n.baseText('dataStore.add.input.name.label')"
					:required="true"
					input-name="dataStoreName"
				>
					<n8n-input
						ref="inputRef"
						v-model="dataStoreName"
						type="text"
						:placeholder="i18n.baseText('dataStore.add.input.name.placeholder')"
						data-test-id="data-store-name-input"
						name="dataStoreName"
						@keyup.enter="onSubmit"
					/>
				</n8n-input-label>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button
					:disabled="!dataStoreName"
					:label="i18n.baseText('generic.create')"
					data-test-id="confirm-add-data-store-button"
					@click="onSubmit"
				/>
				<n8n-button
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-add-data-store-button"
					@click="onCancel"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.header {
	margin-bottom: var(--spacing-xs);
}

.content {
	display: flex;
	flex-direction: column;
}

.footer {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
	margin-top: var(--spacing-l);
}
</style>
