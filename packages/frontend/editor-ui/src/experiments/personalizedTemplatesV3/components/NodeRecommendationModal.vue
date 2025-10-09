<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { EXPERIMENT_TEMPLATE_RECO_V3_KEY, TEMPLATES_URLS } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { ref, watchEffect } from 'vue';
import { usePersonalizedTemplatesV3Store } from '../stores/personalizedTemplatesV3.store';
import TemplateCard from './TemplateCard.vue';
import { useI18n } from '@n8n/i18n';
import { N8nCard, N8nIcon, N8nSpinner, N8nText } from '@n8n/design-system';

const uiStore = useUIStore();
const {
	getHubSpotData,
	getTemplateData,
	trackPersonalizationModalView,
	trackTemplatesRepoClickFromModal,
} = usePersonalizedTemplatesV3Store();
const locale = useI18n();

const closeModal = () => {
	uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V3_KEY);
};

const openTemplateRepository = () => {
	trackTemplatesRepoClickFromModal();
	window.open(TEMPLATES_URLS.BASE_WEBSITE_URL, '_blank');
};

const templates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);

watchEffect(async () => {
	trackPersonalizationModalView();

	isLoadingTemplates.value = true;
	try {
		const hubspotData = getHubSpotData();
		const templatePromises =
			hubspotData.templates?.map(async (id) => await getTemplateData(id)) || [];

		const results = await Promise.allSettled(templatePromises);

		templates.value = results
			.filter(
				(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull> =>
					result.status === 'fulfilled' && result.value !== null,
			)
			.map((result) => result.value);
	} catch (error) {
		console.error('Error loading templates:', error);
	} finally {
		isLoadingTemplates.value = false;
	}
});
</script>

<template>
	<Modal
		:name="EXPERIMENT_TEMPLATE_RECO_V3_KEY"
		min-width="min(800px, 90vw)"
		max-height="90vh"
		:class="$style.modal"
		@close="closeModal"
		@canceled="closeModal"
	>
		<template #header>
			<div :class="$style.header">
				<N8nText tag="h1" size="large" :bold="true">
					{{ locale.baseText('experiments.personalizedTemplatesV3.recommendedForYou') }}
				</N8nText>
			</div>
		</template>
		<template #content>
			<div v-if="isLoadingTemplates" :class="$style.loading">
				<N8nSpinner size="small" />
				<N8nText size="small">{{
					locale.baseText('experiments.personalizedTemplatesV3.loadingTemplates')
				}}</N8nText>
			</div>
			<div v-else>
				<div :class="$style.templates">
					<TemplateCard v-for="template in templates" :key="template.id" :template="template" />
				</div>
				<N8nCard :class="[$style.footerCard]" @click="openTemplateRepository">
					<div :class="$style.footerContent">
						<div :class="$style.footerText">
							<N8nText size="medium" :bold="true" class="mr-s" color="text-light">
								{{ locale.baseText('experiments.personalizedTemplatesV3.couldntFind') }}
							</N8nText>
							<N8nText size="small" :class="'mt-2xs'">
								{{ locale.baseText('experiments.personalizedTemplatesV3.browseAllTemplates') }}
							</N8nText>
						</div>
						<div :class="$style.footerIcon">
							<N8nIcon icon="external-link" size="medium" />
						</div>
					</div>
				</N8nCard>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modal {
	background-color: var(--color-background-xlight);
}

.header {
	border-bottom: 1px solid var(--border-color-base);
	padding-bottom: var(--spacing-s);
}

.templates {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: var(--spacing-m);
	padding: var(--spacing-s) 0;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-xs);
	padding: var(--spacing-l);
	color: var(--color-text-light);
}

.footerCard {
	border: 1px solid var(--color-foreground-base);
	background-color: var(--color-background-light);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
}

.footerContent {
	display: flex;
	justify-content: space-between;
	align-items: start;
	width: 100%;

	.footerText {
		display: flex;
		flex-direction: column;
	}
}

.footerIcon {
	color: var(--color-text-light);
}
</style>
