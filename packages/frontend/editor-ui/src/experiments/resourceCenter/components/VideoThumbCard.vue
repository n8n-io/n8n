<script setup lang="ts">
import type { YouTubeVideo } from '../data/resourceCenterData';
import { useResourceCenterStore } from '../stores/resourceCenter.store';

const props = defineProps<{
	video: YouTubeVideo;
}>();

const { trackVideoClick } = useResourceCenterStore();

const openVideo = () => {
	trackVideoClick(props.video.videoId, props.video.title);
	window.open(`https://www.youtube.com/watch?v=${props.video.videoId}`, '_blank');
};
</script>

<template>
	<div :class="$style.card" @click="openVideo">
		<div :class="$style.content">
			<div :class="$style.thumbnailContainer">
				<img
					:src="video.thumbnailUrl"
					:alt="video.title"
					:class="$style.thumbnail"
					loading="lazy"
				/>
				<div :class="$style.playButton">
					<div :class="$style.playIcon" />
				</div>
			</div>
			<div :class="$style.info">
				<h3 :class="$style.title">{{ video.title }}</h3>
				<p :class="$style.description">{{ video.description }}</p>
				<span v-if="video.author" :class="$style.author">{{ video.author }}</span>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	flex: 1 1 0;
	min-width: 0;
	cursor: pointer !important;
	position: relative;
	border-radius: var(--radius--lg);
	overflow: hidden;
	border: var(--border);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		border-color: var(--color--foreground--shade-1);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

		.playButton {
			transform: translate(-50%, -50%) scale(1.1);
		}
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
}

.thumbnailContainer {
	position: relative;
	width: calc(100% + var(--spacing--xs) * 2);
	height: 170px;
	margin: calc(var(--spacing--xs) * -1) calc(var(--spacing--xs) * -1) 0;
	overflow: hidden;
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

.playIcon {
	width: 0;
	height: 0;
	border-style: solid;
	border-width: 10px 0 10px 18px;
	border-color: transparent transparent transparent #f00;
	margin-left: 4px;
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.title {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	line-height: var(--line-height--md);
	font-size: var(--font-size--sm);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin: 0;
}

.description {
	color: var(--color--text--tint-1);
	line-height: var(--line-height--md);
	font-size: var(--font-size--xs);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin: 0;
}

.author {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin-top: var(--spacing--2xs);
}
</style>
