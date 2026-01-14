<script setup lang="ts">
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { N8nButton, N8nHeading, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import HorizontalGallery from '../components/HorizontalGallery.vue';
import ResourceCenterHeader from '../components/ResourceCenterHeader.vue';
import TemplateCard from '../components/TemplateCard.vue';
import VideoThumbCard from '../components/VideoThumbCard.vue';
import QuickStartCard from '../components/QuickStartCard.vue';
import {
	courses,
	featuredTemplateIds,
	inspirationVideos,
	learningVideos,
} from '../data/resourceCenterData';
import { quickStartWorkflows } from '../data/quickStartWorkflows';
import { useResourceCenterStore } from '../stores/resourceCenter.store';

const i18n = useI18n();
const router = useRouter();
const templatesStore = useTemplatesStore();
const resourceCenterStore = useResourceCenterStore();

const templates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);

const handleQuickStartImport = async (quickStartId: string) => {
	await resourceCenterStore.createAndOpenQuickStartWorkflow(quickStartId);
};

const handleCourseClick = (courseId: string, courseTitle: string, url: string) => {
	resourceCenterStore.trackCourseClick(courseId, courseTitle);
	window.open(url, '_blank');
};

const handleSeeMore = async (sectionKey: string) => {
	resourceCenterStore.trackSectionSeeMore(sectionKey);
	await router.push({ name: VIEWS.RESOURCE_CENTER_SECTION, params: { sectionId: sectionKey } });
};

const handleViewAllTemplates = () => {
	resourceCenterStore.trackSectionSeeMore('all-templates');
	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
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

onMounted(() => {
	// Reset scroll
	setTimeout(() => {
		const content = document.getElementById('content');
		const contentWrapper = content?.querySelector(':scope > div');
		contentWrapper?.scrollTo({ top: 0, behavior: 'auto' });
	}, 50);

	resourceCenterStore.trackResourceCenterView();
	void loadTemplates();
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

			<!-- Getting Started Section -->
			<section :class="$style.mainSection">
				<div :class="$style.sectionContent">
					<!-- QuickStart Workflows -->
					<HorizontalGallery :title="i18n.baseText('experiments.resourceCenter.quickStart.title')">
						<template #actions />
						<QuickStartCard
							v-for="workflow in quickStartWorkflows.slice(0, 3)"
							:key="workflow.id"
							:workflow="workflow"
							@click="handleQuickStartImport(workflow.id)"
						/>
					</HorizontalGallery>

					<!-- Template Libraries -->
					<HorizontalGallery
						v-if="templates.length > 0 || isLoadingTemplates"
						:title="i18n.baseText('experiments.resourceCenter.templatePreviews.title')"
					>
						<template #actions>
							<N8nButton text :class="$style.textButton" @click="handleViewAllTemplates">
								{{ i18n.baseText('experiments.resourceCenter.viewAllTemplates') }}
							</N8nButton>
						</template>
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
							/>
						</template>
					</HorizontalGallery>
				</div>
			</section>

			<!-- Learn Anything Section -->
			<section :class="$style.mainSection">
				<div :class="$style.sectionContent">
					<!-- Official Courses -->
					<HorizontalGallery :title="i18n.baseText('experiments.resourceCenter.courses.title')">
						<template v-if="courses.length > 3" #actions>
							<N8nButton text :class="$style.textButton" @click="handleSeeMore('courses')">
								{{ i18n.baseText('experiments.resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<VideoThumbCard
							v-for="course in courses.slice(0, 3)"
							:key="course.id"
							:video="{
								videoId: course.id,
								title: course.title,
								description: course.description,
								thumbnailUrl: course.thumbnailUrl,
							}"
							@click="handleCourseClick(course.id, course.title, course.url)"
						/>
					</HorizontalGallery>

					<!-- Learning Videos -->
					<HorizontalGallery
						:title="i18n.baseText('experiments.resourceCenter.youtubeLearn.title')"
					>
						<template v-if="learningVideos.length > 3" #actions>
							<N8nButton text :class="$style.textButton" @click="handleSeeMore('learning-videos')">
								{{ i18n.baseText('experiments.resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<VideoThumbCard
							v-for="video in learningVideos.slice(0, 3)"
							:key="video.videoId"
							:video="video"
						/>
					</HorizontalGallery>
				</div>
			</section>

			<!-- Get Inspired Section -->
			<section :class="$style.mainSection">
				<div :class="$style.sectionContent">
					<HorizontalGallery
						:title="i18n.baseText('experiments.resourceCenter.youtubeInspiration.title')"
					>
						<template v-if="inspirationVideos.length > 3" #actions>
							<N8nButton
								text
								:class="$style.textButton"
								@click="handleSeeMore('inspiration-videos')"
							>
								{{ i18n.baseText('experiments.resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<VideoThumbCard
							v-for="video in inspirationVideos.slice(0, 3)"
							:key="video.videoId"
							:video="video"
						/>
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
	font-size: var(--font-size--md);
	letter-spacing: -0.02em;
	color: var(--color--text);
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

.sectionHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--md);
}

.sectionTitle {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	letter-spacing: -0.01em;
	color: var(--color--text);
	margin: 0;
}

.sectionContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
	min-width: 0;
	width: 100%;
}

.textButton {
	color: var(--color--text) !important;
	cursor: pointer !important;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
}
</style>
