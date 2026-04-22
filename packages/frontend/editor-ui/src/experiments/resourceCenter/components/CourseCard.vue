<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { Course } from '../data/resourceCenterData';
import { useResourceCenterStore } from '../stores/resourceCenter.store';

const props = withDefaults(
	defineProps<{
		course: Course;
		section?: 'inspiration' | 'learn';
	}>(),
	{
		section: 'learn',
	},
);

const i18n = useI18n();
const { trackTileClick } = useResourceCenterStore();

const openCourse = () => {
	trackTileClick(props.section, 'video', props.course.url);
	window.open(props.course.url, '_blank', 'noopener,noreferrer');
};
</script>

<template>
	<div :class="$style.card" @click="openCourse">
		<div :class="$style.thumbnailContainer">
			<img
				:src="course.thumbnailUrl"
				:alt="course.title"
				:class="$style.thumbnail"
				loading="lazy"
			/>
		</div>
		<div :class="$style.content">
			<div :class="$style.titleRow">
				<N8nIcon icon="graduation-cap" :class="$style.icon" size="medium" />
				<h3 :class="$style.title">{{ course.title }}</h3>
			</div>
			<div :class="$style.meta">
				<span v-if="course.duration">{{ course.duration }}</span>
				<span v-if="course.duration && course.lessonCount" :class="$style.separator">·</span>
				<span v-if="course.lessonCount">
					{{
						i18n.baseText('experiments.resourceCenter.course.lessons', {
							interpolate: { count: course.lessonCount },
						})
					}}
				</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	flex: 1 1 0;
	min-width: 0;
	cursor: pointer;
	position: relative;
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		.thumbnailContainer {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		}
	}
}

.thumbnailContainer {
	width: 100%;
	height: 170px;
	overflow: hidden;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
	border: 1px solid var(--color--foreground--tint-1);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.thumbnail {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.35s ease;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
}

.titleRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	width: 20px;
	height: 20px;
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	line-height: var(--line-height--md);
	font-size: var(--font-size--sm);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin: 0;
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding-left: calc(20px + var(--spacing--2xs)); /* align with title text (icon width + gap) */
}

.separator {
	color: var(--color--text--tint-2);
}
</style>
