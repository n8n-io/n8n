<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY, TEMPLATES_URLS } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { onMounted, ref } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useTemplatesDataQualityStore } from '../stores/templatesDataQuality.store';
import TemplateCard from './TemplateCard.vue';
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nSpinner, N8nText } from '@n8n/design-system';

const uiStore = useUIStore();
const locale = useI18n();
const templatesStore = useTemplatesDataQualityStore();

const closeModal = () => {
	uiStore.closeModal(EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY);
};

const templates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);
const nodeTypesStore = useNodeTypesStore();

const trackTemplatesShown = (templateIds: number[]) => {
	templateIds.forEach((id, index) => {
		templatesStore.trackTemplateShown(id, index + 1);
	});
};

onMounted(async () => {
	isLoadingTemplates.value = true;
	try {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		const ids = templatesStore.getRandomTemplateIds();
		const promises = ids.map(async (id) => await templatesStore.getTemplateData(id));
		const results = await Promise.allSettled(promises);
		templates.value = results
			.filter(
				(r): r is PromiseFulfilledResult<ITemplatesWorkflowFull> =>
					r.status === 'fulfilled' && r.value !== null,
			)
			.map((r) => r.value);
		trackTemplatesShown(ids);
	} finally {
		isLoadingTemplates.value = false;
	}
});
</script>

<template>
	<Modal
		:name="EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY"
		min-width="min(800px, 90vw)"
		max-height="90vh"
		@close="closeModal"
		@canceled="closeModal"
	>
		<template #header>
			<div :class="$style.header">
				<N8nText tag="h2" size="large" :bold="true">{{
					locale.baseText('experiments.templatesDataQuality.modalTitle')
				}}</N8nText>
			</div>
		</template>
		<template #content>
			<div v-if="isLoadingTemplates" :class="$style.loading">
				<N8nSpinner size="small" />
				<N8nText size="small">{{
					locale.baseText('workflows.templatesDataQuality.loadingTemplates')
				}}</N8nText>
			</div>
			<div v-else :class="$style.suggestions">
				<TemplateCard v-for="template in templates" :key="template.id" :template="template" />
			</div>
			<div :class="$style.seeMore">
				<N8nLink :href="TEMPLATES_URLS.BASE_WEBSITE_URL">
					{{ locale.baseText('workflows.templatesDataQuality.seeMoreTemplates') }}
				</N8nLink>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	border-bottom: 1px solid var(--border-color);
	padding-bottom: var(--spacing--sm);
}

.suggestions {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--md);
	min-height: 182px;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
	color: var(--color--text--tint-1);
}

.seeMore {
	display: flex;
	justify-content: flex-end;
	padding-top: var(--spacing--md);
}
</style>
