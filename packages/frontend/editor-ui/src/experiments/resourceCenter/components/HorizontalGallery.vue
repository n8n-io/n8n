<script setup lang="ts">
import { N8nHeading } from '@n8n/design-system';

defineProps<{
	title: string;
	onTitleClick?: () => void;
}>();
</script>

<template>
	<section :class="$style.section">
		<div :class="$style.header">
			<component
				:is="onTitleClick ? 'button' : 'div'"
				:type="onTitleClick ? 'button' : undefined"
				:class="[$style.titleWrapper, onTitleClick && $style.clickable]"
				@click="onTitleClick"
			>
				<N8nHeading tag="h3" size="large" :class="$style.title">{{ title }}</N8nHeading>
				<span v-if="onTitleClick" :class="$style.chevron">→</span>
			</component>
			<slot name="actions" />
		</div>
		<div :class="$style.gallery">
			<slot />
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	position: relative;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--md);
	position: relative;
}

.titleWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background: none;
	border: none;
	padding: 0;
	margin: 0;
	font: inherit;
	color: inherit;

	&.clickable {
		cursor: pointer;

		&:hover {
			.title {
				color: var(--color--primary);
			}

			.chevron {
				transform: translateX(4px);
				color: var(--color--primary);
			}
		}
	}
}

.title {
	letter-spacing: -0.01em;
	color: var(--color--text--shade-1);
	font-size: var(--font-size--md);
	margin: 0;
	transition: color 0.2s ease;
}

.chevron {
	font-size: var(--font-size--md);
	color: var(--color--text--tint-1);
	transition:
		transform 0.2s ease,
		color 0.2s ease;
}

.gallery {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--sm);
}
</style>
