<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nLink, N8nSpinner, N8nText } from '@n8n/design-system';
import { TEMPLATES_URLS } from '@/app/constants';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { useTemplatesDataQualityStore } from '../stores/templatesDataQuality.store';
import TemplateCard from './TemplateCard.vue';

const locale = useI18n();
const templatesStore = useTemplatesDataQualityStore();

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
	<section :class="$style.container" data-test-id="templates-data-quality-inline">
		<div :class="$style.header">
			<N8nText tag="h2" size="large" :bold="true">
				{{ locale.baseText('workflows.empty.startWithTemplate') }}
			</N8nText>
			<N8nLink :href="TEMPLATES_URLS.BASE_WEBSITE_URL" :class="$style.allTemplatesLink">
				{{ locale.baseText('workflows.templatesDataQuality.seeMoreTemplates') }}
			</N8nLink>
		</div>

		<div v-if="isLoadingTemplates" :class="$style.loading">
			<N8nSpinner size="small" />
			<N8nText size="small">
				{{ locale.baseText('workflows.templatesDataQuality.loadingTemplates') }}
			</N8nText>
		</div>
		<div v-else :class="$style.suggestions">
			<TemplateCard
				v-for="(template, index) in templates"
				:key="template.id"
				:template="template"
				:tile-number="index + 1"
			/>
		</div>
	</section>
</template>

<style lang="scss" module>
.container {
	width: 900px;
	margin-top: var(--spacing--4xl);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	text-align: left;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--md);
}

.allTemplatesLink {
	white-space: nowrap;
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
</style>
