<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { N8nHeading, N8nText, N8nSelect, N8nOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
// eslint-disable-next-line import-x/extensions
import { useAIGatewayStore } from './aiGateway.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const aiGatewayStore = useAIGatewayStore();

const categories = computed(() => aiGatewayStore.categories);
const selectedCategory = computed(() => aiGatewayStore.selectedCategory);
const selectedModel = computed(() => aiGatewayStore.selectedModel);
const modelsForCategory = computed(() => aiGatewayStore.modelsForCurrentCategory);
const isManualMode = computed(() => aiGatewayStore.selectedCategory === 'manual');
const allModels = computed(() => aiGatewayStore.availableModels);
function onCategoryChange(value: string) {
	aiGatewayStore.setCategory(value);
}

function onModelChange(value: string) {
	aiGatewayStore.setModel(value);
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.aiGateway.title'));
	aiGatewayStore.initialize();
});
</script>

<template>
	<div :class="$style.container" data-test-id="ai-gateway-settings">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.aiGateway.title') }}</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.aiGateway.description') }}
			</N8nText>
		</div>

		<div :class="$style.section">
			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.category.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.aiGateway.category.description') }}
				</N8nText>
				<N8nSelect
					:model-value="selectedCategory"
					size="medium"
					@update:model-value="onCategoryChange"
				>
					<N8nOption v-for="cat in categories" :key="cat.id" :value="cat.id" :label="cat.label" />
				</N8nSelect>
			</div>

			<div :class="$style.field">
				<N8nText :bold="true" size="medium">
					{{ i18n.baseText('settings.aiGateway.model.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.aiGateway.model.description') }}
				</N8nText>
				<N8nSelect
					:model-value="selectedModel"
					:placeholder="i18n.baseText('settings.aiGateway.model.placeholder')"
					size="medium"
					filterable
					@update:model-value="onModelChange"
				>
					<N8nOption
						v-for="model in isManualMode ? allModels : modelsForCategory"
						:key="model.id"
						:value="model.id"
						:label="model.name"
					/>
				</N8nSelect>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
