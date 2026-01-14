<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { FEATURED_TEMPLATES_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { onMounted, ref } from 'vue';
import { useRecommendedTemplatesStore } from '../recommendedTemplates.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import RecommendedTemplateCard from './RecommendedTemplateCard.vue';
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nSpinner, N8nText } from '@n8n/design-system';
import { storeToRefs } from 'pinia';

const uiStore = useUIStore();
const locale = useI18n();
const templatesStore = useRecommendedTemplatesStore();
const { websiteTemplateRepositoryURL } = storeToRefs(useTemplatesStore());

const closeModal = () => {
	uiStore.closeModal(FEATURED_TEMPLATES_MODAL_KEY);
};

const templates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);

onMounted(async () => {
	isLoadingTemplates.value = true;
	try {
		templates.value = await templatesStore.loadRecommendedTemplates();
	} finally {
		isLoadingTemplates.value = false;
	}
});
</script>

<template>
	<Modal
		:name="FEATURED_TEMPLATES_MODAL_KEY"
		min-width="min(800px, 90vw)"
		max-height="90vh"
		@close="closeModal"
		@canceled="closeModal"
	>
		<template #header>
			<div :class="$style.header">
				<N8nText tag="h2" size="large" :bold="true">{{
					locale.baseText('templates.featured.modalTitle')
				}}</N8nText>
			</div>
		</template>
		<template #content>
			<div v-if="isLoadingTemplates" :class="$style.loading">
				<N8nSpinner size="small" />
				<N8nText size="small">{{ locale.baseText('templates.featured.loading') }}</N8nText>
			</div>
			<div v-else :class="$style.suggestions">
				<RecommendedTemplateCard
					v-for="(template, index) in templates"
					:key="template.id"
					:template="template"
					:tile-number="index + 1"
				/>
			</div>
			<div :class="$style.seeMore">
				<N8nLink :href="websiteTemplateRepositoryURL">
					{{ locale.baseText('templates.featured.seeMore') }}
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
