<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useRoute } from 'vue-router';

type Props = {
	modalName: string;
};

const props = defineProps<Props>();

const dataStoreStore = useDataStoreStore();
const uiStore = useUIStore();

const route = useRoute();
const i18n = useI18n();
const toast = useToast();

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
		await dataStoreStore.createDataStore(dataStoreName.value, route.params.projectId as string);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.add.error'));
	} finally {
		dataStoreName.value = '';
		uiStore.closeModal(props.modalName);
	}
};
</script>

<template>
	<Modal :name="props.modalName" :center="true" width="540px">
		<template #header>
			<h2>{{ i18n.baseText('dataStore.add.title') }}</h2>
		</template>
		<template #content>
			<div :class="$style.content">
				<p>{{ i18n.baseText('dataStore.add.description') }}</p>
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
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					:disabled="!dataStoreName"
					:label="i18n.baseText('dataStore.add.button.label')"
					data-test-id="confirm-add-data-store-button"
					@click="onSubmit"
				/>
				<n8n-button
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-add-data-store-button"
					@click="close"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
}

.footer {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
	margin-top: var(--spacing-l);
}
</style>
