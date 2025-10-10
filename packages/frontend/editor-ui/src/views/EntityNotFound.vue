<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nCard, N8nHeading, N8nText } from '@n8n/design-system';
defineProps<{
	entityType: 'credential' | 'workflow';
}>();

const locale = useI18n();
</script>

<template>
	<div class="entity-not-found-view">
		<N8nCard class="entity-card">
			<div class="text-center mb-l">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
				>
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="var(--color-text-button-secondary-font)"
						stroke-width="2"
					/>
					<rect x="11" y="6" width="2" height="8" fill="var(--color-text-button-secondary-font)" />
					<rect x="11" y="16" width="2" height="2" fill="var(--color-text-button-secondary-font)" />
				</svg>
			</div>

			<N8nHeading size="xlarge" align="center" tag="h2" color="text-dark" class="mb-2xs">
				{{
					locale.baseText('error.entityNotFound.title', {
						interpolate: { entity: locale.baseText(`generic.${entityType}`) },
					})
				}}
			</N8nHeading>
			<N8nText color="text-base" tag="p" align="center" class="mb-m">
				{{
					locale.baseText('error.entityNotFound.text', {
						interpolate: { entity: locale.baseText(`generic.${entityType}`).toLocaleLowerCase() },
					})
				}}
			</N8nText>
			<N8nButton href="/" element="a" type="secondary">
				{{ locale.baseText('error.entityNotFound.action') }}
			</N8nButton>
		</N8nCard>
	</div>
</template>

<style scoped>
.entity-not-found-view {
	display: flex;
	align-items: center;
	justify-content: center;
}

.entity-card {
	max-width: 400px;
	padding: var(--spacing--xl);
}
</style>
