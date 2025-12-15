<script setup lang="ts">
import type { YouTubeVideo } from '../mockData';

const props = defineProps<{
	video: YouTubeVideo;
}>();

const openVideo = () => {
	window.open(`https://www.youtube.com/watch?v=${props.video.videoId}`, '_blank');
};
</script>

<template>
	<div :class="$style.card" @click="openVideo">
		<div :class="$style.content">
			<img :src="video.thumbnailUrl" :alt="video.title" :class="$style.thumbnail" />
			<div :class="$style.info">
				<h3>{{ video.title }}</h3>
				<p :class="$style.description">{{ video.description }}</p>
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
	background: white;
	border-radius: 14px;
	overflow: hidden;
	border: 1px solid var(--border-color);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		border-color: var(--border-color--strong);

		.thumbnail {
			&::before {
				opacity: 1;
			}

			&::after {
				transform: translate(-50%, -50%) scale(1.1);
			}
		}
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
}

.thumbnail {
	width: calc(100% + var(--spacing--xs) * 2);
	height: 170px;
	object-fit: cover;
	margin: calc(var(--spacing--xs) * -1) calc(var(--spacing--xs) * -1) 0;
	position: relative;
	transition: transform 0.35s ease;

	/* Play icon using CSS triangle */
	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-42%, -50%);
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 10px 0 10px 18px;
		border-color: transparent transparent transparent hsl(0, 100%, 50%);
		z-index: 2;
		opacity: 0.92;
		transition: opacity 0.35s ease;
	}

	/* YouTube play button overlay with gradient vignette */
	&::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 64px;
		height: 64px;
		border-radius: 50%;
		transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
		background:
			radial-gradient(circle at center, hsla(0, 0%, 0%, 0) 20%, hsla(0, 0%, 0%, 0.15) 100%),
			linear-gradient(135deg, hsla(0, 0%, 100%, 0.95) 0%, hsla(0, 0%, 100%, 0.85) 100%);
	}
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	h3 {
		font-family: 'DM Sans', var(--font-family);
		font-weight: 600;
		color: var(--color--text);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
}

.description {
	font-family: 'DM Sans', var(--font-family);
	color: var(--color--text--tint-2);
	line-height: 1.5;
	font-size: var(--font-size--xs);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
