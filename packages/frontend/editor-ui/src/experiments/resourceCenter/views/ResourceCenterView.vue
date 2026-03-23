<script setup lang="ts">
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { N8nHeading, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import HorizontalGallery from '../components/HorizontalGallery.vue';
import ResourceCenterHeader from '../components/ResourceCenterHeader.vue';
import TemplateCard from '../components/TemplateCard.vue';
import VideoThumbCard from '../components/VideoThumbCard.vue';
import SandboxCard from '../components/SandboxCard.vue';
import {
	featuredTemplateIds,
	inspirationVideos,
	learningVideos,
	learnTemplateIds,
	masterclassVideos,
} from '../data/resourceCenterData';
import { quickStartWorkflows } from '../data/quickStartWorkflows';
import { useResourceCenterStore } from '../stores/resourceCenter.store';

const i18n = useI18n();
const router = useRouter();
const templatesStore = useTemplatesStore();
const resourceCenterStore = useResourceCenterStore();

const templates = ref<ITemplatesWorkflowFull[]>([]);
const learnTemplates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);
const isLoadingLearnTemplates = ref(false);

const handleQuickStartImport = async (quickStartId: string) => {
	resourceCenterStore.trackTileClick('quick-start', 'ready-to-run', quickStartId);
	await resourceCenterStore.createAndOpenQuickStartWorkflow(quickStartId);
};

const handleSeeMore = async (sectionKey: string) => {
	await router.push({ name: VIEWS.RESOURCE_CENTER_SECTION, params: { sectionId: sectionKey } });
};

const handleViewAllTemplates = () => {
	resourceCenterStore.trackTemplateRepoVisit();
	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank', 'noopener,noreferrer');
};

const loadTemplates = async () => {
	if (featuredTemplateIds.length === 0) return;

	isLoadingTemplates.value = true;
	try {
		templates.value = await resourceCenterStore.loadTemplates(featuredTemplateIds);
	} finally {
		isLoadingTemplates.value = false;
	}
};

const loadLearnTemplates = async () => {
	if (learnTemplateIds.length === 0) return;

	isLoadingLearnTemplates.value = true;
	try {
		learnTemplates.value = await resourceCenterStore.loadTemplates(learnTemplateIds);
	} finally {
		isLoadingLearnTemplates.value = false;
	}
};

onMounted(() => {
	// Reset scroll
	setTimeout(() => {
		const content = document.getElementById('content');
		const contentWrapper = content?.querySelector(':scope > div');
		contentWrapper?.scrollTo({ top: 0, behavior: 'auto' });
	}, 50);

	resourceCenterStore.trackResourceCenterView();
	void loadTemplates();
	void loadLearnTemplates();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<!-- Header -->
			<ResourceCenterHeader>
				<N8nHeading tag="h1" :bold="true" :class="$style.title">
					{{ i18n.baseText('experiments.resourceCenter.title') }}
				</N8nHeading>
			</ResourceCenterHeader>

			<!-- Get Started Section -->
			<section :class="$style.mainSection">
				<h2 :class="$style.sectionTitle">
					{{ i18n.baseText('experiments.resourceCenter.getStarted.title') }}
				</h2>
				<div :class="$style.sectionContent">
					<!-- Sandbox Cards Row -->
					<div :class="$style.cardsRow">
						<SandboxCard
							v-for="workflow in quickStartWorkflows"
							:key="workflow.id"
							:workflow="workflow"
							@click="handleQuickStartImport(workflow.id)"
						/>
					</div>
				</div>
			</section>

			<!-- Get Inspired Section -->
			<section :class="$style.mainSection">
				<h2 :class="$style.sectionTitle">
					{{ i18n.baseText('experiments.resourceCenter.getInspired.title') }}
				</h2>
				<div :class="$style.sectionContent">
					<!-- Popular Templates -->
					<HorizontalGallery
						v-if="templates.length > 0 || isLoadingTemplates"
						:title="i18n.baseText('experiments.resourceCenter.popularTemplates.title')"
						:on-title-click="() => handleSeeMore('templates')"
					>
						<template v-if="isLoadingTemplates">
							<div :class="$style.loading">
								<N8nSpinner size="small" />
							</div>
						</template>
						<template v-else>
							<TemplateCard
								v-for="template in templates.slice(0, 3)"
								:key="template.id"
								:template="template"
								section="inspiration"
							/>
						</template>
					</HorizontalGallery>

					<!-- Automation Ideas -->
					<HorizontalGallery
						:title="i18n.baseText('experiments.resourceCenter.automationIdeas.title')"
						:on-title-click="
							inspirationVideos.length > 3 ? () => handleSeeMore('inspiration-videos') : undefined
						"
					>
						<VideoThumbCard
							v-for="video in inspirationVideos.slice(0, 3)"
							:key="video.videoId"
							:video="video"
							icon-type="youtube"
							section="inspiration"
						/>
					</HorizontalGallery>
				</div>
			</section>

			<!-- Learn to use n8n Section -->
			<section :class="$style.mainSection">
				<h2 :class="$style.sectionTitle">
					{{ i18n.baseText('experiments.resourceCenter.learnN8n.title') }}
				</h2>
				<div :class="$style.sectionContent">
					<!-- Featured Video Tutorials -->
					<HorizontalGallery
						:title="i18n.baseText('experiments.resourceCenter.featuredVideos.title')"
						:on-title-click="
							learningVideos.length > 3 ? () => handleSeeMore('learning-videos') : undefined
						"
					>
						<VideoThumbCard
							v-for="video in learningVideos.slice(0, 3)"
							:key="video.videoId"
							:video="video"
							icon-type="youtube"
							section="learn"
						/>
					</HorizontalGallery>

					<!-- Masterclass Videos -->
					<HorizontalGallery
						:title="i18n.baseText('experiments.resourceCenter.masterclass.title')"
						:on-title-click="
							masterclassVideos.length > 3 ? () => handleSeeMore('masterclass-videos') : undefined
						"
					>
						<VideoThumbCard
							v-for="video in masterclassVideos.slice(0, 3)"
							:key="video.videoId"
							:video="video"
							icon-type="youtube"
							section="learn"
						/>
					</HorizontalGallery>

					<!-- Learn Templates -->
					<HorizontalGallery
						v-if="learnTemplates.length > 0 || isLoadingLearnTemplates"
						:title="i18n.baseText('experiments.resourceCenter.learnTemplates.title')"
						:on-title-click="() => handleViewAllTemplates()"
					>
						<template v-if="isLoadingLearnTemplates">
							<div :class="$style.loading">
								<N8nSpinner size="small" />
							</div>
						</template>
						<template v-else>
							<TemplateCard
								v-for="template in learnTemplates.slice(0, 3)"
								:key="template.id"
								:template="template"
								section="learn"
							/>
						</template>
					</HorizontalGallery>
				</div>
			</section>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: block;
	width: 100%;
	max-width: var(--content-container--width);
}

.content {
	width: 100%;
	padding: 0 var(--spacing--2xl) var(--spacing--lg) var(--spacing--2xl);
}

.title {
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--sm);
	letter-spacing: -0.02em;
	color: var(--color--text--shade-1);
	margin: 0;
}

.mainSection {
	margin-bottom: var(--spacing--3xl);
	min-width: 0;
	width: 100%;

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionTitle {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	letter-spacing: -0.01em;
	color: var(--color--text--shade-1);
	margin: 0 0 var(--spacing--lg) 0;
}

.sectionContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	min-width: 0;
	width: 100%;
}

.cardsRow {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--sm);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
}
</style>
