<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

type Props = {
	modalName: string;
};

const props = defineProps<Props>();

const i18n = useI18n();

const dataStoreName = ref('');
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
						v-model="dataStoreName"
						:placeholder="i18n.baseText('dataStore.add.input.name.placeholder')"
						data-test-id="data-store-name-input"
						name="dataStoreName"
					/>
				</n8n-input-label>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					:disabled="!dataStoreName"
					:label="i18n.baseText('dataStore.add.button.label')"
					data-test-id="confirm-move-folder-button"
				/>
				<n8n-button
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="cancel-move-folder-button"
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
