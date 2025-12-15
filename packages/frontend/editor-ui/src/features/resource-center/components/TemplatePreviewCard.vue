<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

export interface TemplatePreview {
	id: number | string;
	name: string;
	description: string;
	previewImageUrl?: string;
	url: string;
	workflowCount?: number;
	category?: string;
}

const props = defineProps<{
	template: TemplatePreview;
}>();

const openTemplate = () => {
	window.open(props.template.url, '_blank');
};
</script>

<template>
	<div :class="$style.card" @click="openTemplate">
		<div :class="$style.content">
			<div :class="$style.previewContainer">
				<img
					v-if="template.previewImageUrl"
					:src="template.previewImageUrl"
					:alt="template.name"
					:class="$style.preview"
				/>
				<div v-else :class="$style.previewPlaceholder">
					<N8nIcon icon="file-code" size="xlarge" :class="$style.placeholderIcon" />
				</div>
			</div>
			<div :class="$style.info">
				<div :class="$style.header">
					<h3>{{ template.name }}</h3>
					<N8nIcon icon="external-link" size="small" :class="$style.externalIcon" />
				</div>
				<p :class="$style.description">{{ template.description }}</p>
				<div v-if="template.workflowCount" :class="$style.meta">
					<N8nIcon icon="network-wired" size="xsmall" :class="$style.metaIcon" />
					<span :class="$style.metaText">{{ template.workflowCount }}+ workflows</span>
				</div>
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
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid var(--border-color);
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		border-color: var(--border-color--strong);

		.preview {
			transform: scale(1.05);
		}

		.externalIcon {
			transform: translate(2px, -2px);
			color: hsl(280, 70%, 58%);
		}
	}
}

.content {
	display: flex;
	flex-direction: column;
}

.previewContainer {
	width: 100%;
	height: 160px;
	overflow: hidden;
	background: var(--color--background--light-2);
	position: relative;
}

.preview {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.previewPlaceholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--background--light-2);
}

.placeholderIcon {
	color: var(--color--text--tint-1);
	opacity: 0.3;
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--xs);

	h3 {
		font-family: 'DM Sans', var(--font-family);
		font-weight: 600;
		color: var(--color--text);
		line-height: 1.3;
		font-size: var(--font-size--md);
	}
}

.externalIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	margin-top: 2px;
	transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.description {
	font-family: 'DM Sans', var(--font-family);
	color: var(--color--text--tint-2);
	line-height: 1.55;
	font-size: var(--font-size--sm);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
	border-top: 1px solid var(--border-color);
}

.metaIcon {
	color: var(--color--text--tint-1);
}

.metaText {
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-2);
	font-weight: 500;
}
</style>
