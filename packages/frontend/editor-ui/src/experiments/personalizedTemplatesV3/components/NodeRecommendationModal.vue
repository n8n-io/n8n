<script setup lang="ts">
import { EXPERIMENT_TEMPLATE_RECO_V3_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { computed, ref, watchEffect } from 'vue';
import { usePersonalizedTemplatesV3Store } from '../stores/personalizedTemplatesV3.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import TemplateCard from './TemplateCard.vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nCard,
	N8nDialog,
	N8nDialogBody,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';

const uiStore = useUIStore();
const modalOpen = computed(
	() => uiStore.modalsById[EXPERIMENT_TEMPLATE_RECO_V3_KEY]?.open === true,
);
const templatesStore = useTemplatesStore();
const {
	getHubSpotData,
	getTemplateData,
	trackPersonalizationModalView,
	trackTemplatesRepoClickFromModal,
} = usePersonalizedTemplatesV3Store();
const locale = useI18n();

async function closeDialog() {
	uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V3_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

const openTemplateRepository = () => {
	trackTemplatesRepoClickFromModal();
	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
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
	<N8nDialog
		:open="modalOpen"
		size="2xlarge"
		:container-class="$style.modal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ locale.baseText('experiments.personalizedTemplatesV3.recommendedForYou') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.scrollBody">
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
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
.modal.modal {
	background-color: var(--color--background--light-3);
}

.scrollBody {
	overflow: auto;
	max-height: calc(90vh - var(--spacing--3xl));
}

.templates {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
	color: var(--color--text--tint-1);
}

.footerCard {
	border: 1px solid var(--color--foreground);
	background-color: var(--color--background--light-2);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--color--primary);
		color: var(--color--primary);
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
	color: var(--color--text--tint-1);
}
</style>
