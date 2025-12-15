<script setup lang="ts">
import { N8nHeading, N8nIcon, N8nInput, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import HorizontalGallery from '../components/HorizontalGallery.vue';
import VideoThumbCard from '../components/VideoThumbCard.vue';
import TemplatePreviewCard from '../components/TemplatePreviewCard.vue';
import ExternalLinkCard from '../components/ExternalLinkCard.vue';
import QuickStartWorkflowCard from '../components/QuickStartWorkflowCard.vue';
import {
	inspirationVideos,
	courses,
	quickStartWorkflows,
	learningVideos,
	templatePreviews,
	externalLinks,
} from '../mockData';

const i18n = useI18n();

const handleWorkflowImport = (workflowId: number) => {
	// TODO: Implement workflow import logic
	console.log('Importing workflow:', workflowId);
};

const navigateToSection = (sectionKey: string) => {
	// TODO: Navigate to detail view
	console.log('Navigate to section:', sectionKey);
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<!-- Header with search -->
			<header :class="$style.header">
				<div :class="$style.headerTop">
					<N8nHeading tag="h1" size="large" :bold="true" :class="$style.title">
						{{ i18n.baseText('resourceCenter.title') }}
					</N8nHeading>
					<div :class="$style.headerRight">
						<N8nInput placeholder="Search resources..." size="small" :class="$style.searchInput">
							<template #prefix>
								<N8nIcon icon="search" />
							</template>
						</N8nInput>
						<N8nButton text :class="$style.textButton">Browse all</N8nButton>
					</div>
				</div>
			</header>

			<!-- Getting Started Section -->
			<section :class="$style.mainSection">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h2" size="xlarge" :class="$style.sectionTitle">
						{{ i18n.baseText('resourceCenter.gettingStarted.title') }}
					</N8nHeading>
				</div>

				<div :class="$style.sectionContent">
					<!-- QuickStart Workflows -->
					<HorizontalGallery
						:title="i18n.baseText('resourceCenter.quickStart.title')"
						:items="quickStartWorkflows"
					>
						<template #actions> </template>
						<QuickStartWorkflowCard
							v-for="workflow in quickStartWorkflows"
							:key="workflow.id"
							:workflow="workflow"
							@import="handleWorkflowImport"
						/>
					</HorizontalGallery>

					<!-- Template Libraries -->
					<HorizontalGallery
						:title="i18n.baseText('resourceCenter.templatePreviews.title')"
						:items="templatePreviews"
					>
						<template #actions>
							<N8nButton text :class="$style.textButton" @click="navigateToSection('templates')">
								{{ i18n.baseText('resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<TemplatePreviewCard
							v-for="template in templatePreviews"
							:key="template.id"
							:template="template"
						/>
					</HorizontalGallery>
				</div>
			</section>

			<!-- Learn Anything Section -->
			<section :class="$style.mainSection">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h2" size="xlarge" :class="$style.sectionTitle">
						{{ i18n.baseText('resourceCenter.learnAnything.title') }}
					</N8nHeading>
				</div>

				<div :class="$style.sectionContent">
					<!-- Official Courses -->
					<HorizontalGallery
						:title="i18n.baseText('resourceCenter.courses.title')"
						:items="courses"
					>
						<template #actions>
							<N8nButton text :class="$style.textButton" @click="navigateToSection('courses')">
								{{ i18n.baseText('resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<VideoThumbCard
							v-for="course in courses"
							:key="course.id"
							:video="{
								videoId: course.id,
								title: course.title,
								description: course.description,
								thumbnailUrl: course.thumbnailUrl,
							}"
						/>
					</HorizontalGallery>

					<!-- Learning Videos -->
					<HorizontalGallery
						:title="i18n.baseText('resourceCenter.youtubeLearn.title')"
						:items="learningVideos"
					>
						<template #actions>
							<N8nButton
								text
								:class="$style.textButton"
								@click="navigateToSection('learning-videos')"
							>
								{{ i18n.baseText('resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<VideoThumbCard v-for="video in learningVideos" :key="video.videoId" :video="video" />
					</HorizontalGallery>
				</div>
			</section>

			<!-- Get Inspired Section -->
			<section :class="$style.mainSection">
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h2" size="xlarge" :class="$style.sectionTitle">
						{{ i18n.baseText('resourceCenter.getInspired.title') }}
					</N8nHeading>
				</div>

				<div :class="$style.sectionContent">
					<!-- Inspiration Videos -->
					<HorizontalGallery
						:title="i18n.baseText('resourceCenter.youtubeInspiration.title')"
						:items="inspirationVideos"
					>
						<template #actions>
							<N8nButton
								text
								:class="$style.textButton"
								@click="navigateToSection('inspiration-videos')"
							>
								{{ i18n.baseText('resourceCenter.seeMore') }}
							</N8nButton>
						</template>
						<VideoThumbCard
							v-for="video in inspirationVideos"
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

/* Header */
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--2xl);
}

.headerTop {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--xs) 0;
	flex-wrap: wrap;
	border-bottom: 1px solid var(--border-color);
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.title {
	letter-spacing: -0.02em;
	color: var(--color--text);
	margin: 0;
	font-weight: 400 !important;
	font-size: unset !important;
}

.searchInput {
	min-width: 280px;
	max-width: 400px;
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
	margin-bottom: 16px;
	// padding-bottom: var(--spacing--md);
	// border-bottom: 1px solid var(--border-color);
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
}
</style>
