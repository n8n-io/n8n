<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY, TEMPLATES_URLS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { onMounted, ref } from 'vue';
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

onMounted(async () => {
	isLoadingTemplates.value = true;
	try {
		templates.value = await templatesStore.loadExperimentTemplates();
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
				<TemplateCard
					v-for="(template, index) in templates"
					:key="template.id"
					:template="template"
					:tile-number="index + 1"
				/>
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
