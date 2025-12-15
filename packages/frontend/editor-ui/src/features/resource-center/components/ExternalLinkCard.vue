<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

export interface ExternalLink {
	id: string;
	name: string;
	description: string;
	url: string;
	icon?: string;
	metadata?: string;
	badge?: string;
}

const props = defineProps<{
	link: ExternalLink;
}>();

const openLink = () => {
	window.open(props.link.url, '_blank');
};
</script>

<template>
	<div :class="$style.card" @click="openLink">
		<div :class="$style.content">
			<div :class="$style.header">
				<div :class="$style.iconWrapper">
					<N8nIcon :icon="link.icon || 'link'" size="medium" :class="$style.icon" />
				</div>
				<N8nIcon icon="external-link" size="small" :class="$style.externalIcon" />
			</div>
			<div :class="$style.body">
				<div :class="$style.titleRow">
					<h3>{{ link.name }}</h3>
					<span v-if="link.badge" :class="$style.badge">{{ link.badge }}</span>
				</div>
				<p :class="$style.description">{{ link.description }}</p>
				<div v-if="link.metadata" :class="$style.metadata">
					<span :class="$style.metadataText">{{ link.metadata }}</span>
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

		.icon {
			transform: scale(1.1) rotate(5deg);
		}

		.externalIcon {
			transform: translate(2px, -2px);
		}
	}
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	background: var(--color--background--light-2);
	border-radius: 10px;
}

.icon {
	color: var(--color--text--tint-1);
	transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.externalIcon {
	color: var(--color--text--tint-1);
	transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);

	h3 {
		font-family: 'DM Sans', var(--font-family);
		font-weight: 600;
		color: var(--color--text);
		line-height: 1.3;
		font-size: var(--font-size--md);
		flex: 1;
	}
}

.badge {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	background: var(--color--background--light-2);
	border-radius: 4px;
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: 600;
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	white-space: nowrap;
}

.description {
	font-family: 'DM Sans', var(--font-family);
	color: var(--color--text--tint-2);
	line-height: 1.55;
	font-size: var(--font-size--sm);
}

.metadata {
	padding-top: var(--spacing--xs);
	border-top: 1px solid var(--border-color);
}

.metadataText {
	font-family: 'DM Sans', var(--font-family);
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-2);
	font-weight: 500;
}
</style>
