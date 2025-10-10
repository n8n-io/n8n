<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

import { N8nCard, N8nHeading, N8nText } from '@n8n/design-system';
defineProps<{
	entityType: 'credential' | 'workflow';
}>();

const locale = useI18n();
</script>

<template>
	<div class="entity-un-authorized-view">
		<N8nCard class="entity-card">
			<div class="text-center mb-l">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
				>
					<path
						d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
						stroke="var(--color-text-button-secondary-font)"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
						stroke="var(--color-text-button-secondary-font)"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<N8nHeading size="xlarge" align="center" tag="h2" color="text-dark" class="mb-2xs">
				{{ locale.baseText('error.entityUnAuthorized.title') }}
			</N8nHeading>
			<N8nText color="text-base" tag="p" align="center">
				{{
					locale.baseText('error.entityUnAuthorized.content', {
						interpolate: { entity: locale.baseText(`generic.${entityType}`).toLocaleLowerCase() },
					})
				}}
			</N8nText>
		</N8nCard>
	</div>
</template>

<style scoped>
.entity-un-authorized-view {
	display: flex;
	align-items: center;
	justify-content: center;
}

.entity-card {
	max-width: 400px;
	padding: var(--spacing--xl);
}
</style>
