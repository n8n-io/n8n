<script setup lang="ts">
import { N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import HorizontalGallery from '../components/HorizontalGallery.vue';
import VideoThumbCard from '../components/VideoThumbCard.vue';
import TemplatePreviewCard from '../components/TemplatePreviewCard.vue';
import QuickStartWorkflowCard from '../components/QuickStartWorkflowCard.vue';
import {
	inspirationVideos,
	courses,
	quickStartWorkflows,
	learningVideos,
	templatePreviews,
} from '../mockData';

const i18n = useI18n();

const handleWorkflowImport = (workflowId: number) => {
	console.log('Importing workflow:', workflowId);
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<!-- Header -->
			<header :class="$style.header">
				<N8nHeading tag="h1" size="large" :bold="true" :class="$style.title">
					{{ i18n.baseText('resourceCenter.title') }}
				</N8nHeading>
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

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--2xl);
	padding: var(--spacing--xs) 0;
	border-bottom: 1px solid var(--border-color);
}

.title {
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
</style>
