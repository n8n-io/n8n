<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import type { YouTubeVideo } from '../data/resourceCenterData';
import { useResourceCenterStore } from '../stores/resourceCenter.store';

const props = withDefaults(
	defineProps<{
		video: YouTubeVideo;
		iconType?: 'youtube' | 'lightbulb';
		section?: 'inspiration' | 'learn';
	}>(),
	{
		iconType: 'youtube',
		section: 'inspiration',
	},
);

const i18n = useI18n();
const { trackTileClick } = useResourceCenterStore();

const openVideo = () => {
	const videoUrl = `https://www.youtube.com/watch?v=${props.video.videoId}`;
	trackTileClick(props.section, 'video', videoUrl);
	window.open(videoUrl, '_blank', 'noopener,noreferrer');
};
</script>

<template>
	<div :class="$style.card" @click="openVideo">
		<div :class="$style.thumbnailContainer">
			<img :src="video.thumbnailUrl" :alt="video.title" :class="$style.thumbnail" loading="lazy" />
		</div>
		<div :class="$style.content">
			<div :class="$style.titleRow">
				<N8nIcon
					:icon="iconType === 'youtube' ? 'youtube' : 'lightbulb'"
					:class="$style.icon"
					size="medium"
				/>
				<h3 :class="$style.title">{{ video.title }}</h3>
			</div>
			<div v-if="video.duration || video.level" :class="$style.meta">
				<span v-if="video.duration">{{ video.duration }}</span>
				<span v-if="video.duration && video.level" :class="$style.separator">·</span>
				<span v-if="video.level">
					{{
						i18n.baseText('experiments.resourceCenter.video.level', {
							interpolate: { level: video.level },
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
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 9;
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

.playButton {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.9);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding-left: calc(20px + var(--spacing--2xs)); /* align with title text (icon width + gap) */
}

.separator {
	color: var(--color--text);
	font-weight: var(--font-weight--bold);
}
</style>
