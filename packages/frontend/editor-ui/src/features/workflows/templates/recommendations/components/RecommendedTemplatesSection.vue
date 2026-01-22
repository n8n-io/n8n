<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nText } from '@n8n/design-system';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { useRecommendedTemplatesStore, NUMBER_OF_TEMPLATES } from '../recommendedTemplates.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import RecommendedTemplateCard from './RecommendedTemplateCard.vue';
import SkeletonTemplateCard from './SkeletonTemplateCard.vue';

const locale = useI18n();
const templatesStore = useRecommendedTemplatesStore();
const { websiteTemplateRepositoryURL } = storeToRefs(useTemplatesStore());

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
	<section :class="$style.container" data-test-id="recommended-templates-section">
		<div :class="$style.header">
			<N8nText tag="h2" size="large" :bold="true">
				{{ locale.baseText('workflows.empty.startWithTemplate') }}
			</N8nText>
			<N8nLink :href="websiteTemplateRepositoryURL" :class="$style.allTemplatesLink">
				{{ locale.baseText('templates.featured.seeMore') }}
			</N8nLink>
		</div>

		<div v-if="isLoadingTemplates" :class="$style.suggestions">
			<SkeletonTemplateCard v-for="i in NUMBER_OF_TEMPLATES" :key="i" />
		</div>
		<div v-else :class="$style.suggestions">
			<RecommendedTemplateCard
				v-for="(template, index) in templates"
				:key="template.id"
				:template="template"
				:tile-number="index + 1"
			/>
		</div>
	</section>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as vars;

.container {
	width: 100%;
	text-align: left;
	margin-top: var(--spacing--xl);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--xs);

	@media (max-width: vars.$breakpoint-xs) {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--spacing--xs);
		margin-bottom: var(--spacing--sm);
	}
}

.allTemplatesLink {
	white-space: nowrap;
}

.suggestions {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--2xs);
	min-height: 182px;

	@media (max-width: vars.$breakpoint-md) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	@media (max-width: vars.$breakpoint-2xs) {
		grid-template-columns: 1fr;
		gap: var(--spacing--sm);
		min-height: auto;
	}
}
</style>
