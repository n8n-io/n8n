<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nText } from '@n8n/design-system';
import type { LocationProfile } from '../dataProfiling.types';
import ProfileLocationMap from './ProfileLocationMap.vue';

defineProps<{
	location: LocationProfile;
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.header">
			<N8nText bold color="text-dark">{{ location.latPath }} / {{ location.lonPath }}</N8nText>
			<N8nBadge size="small" :show-border="false">
				{{ i18n.baseText('runData.profile.locationBadge') }}
			</N8nBadge>
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('runData.profile.locationPointCount', {
						interpolate: { count: location.points.length },
					})
				}}
			</N8nText>
		</div>

		<ProfileLocationMap :points="location.points" />
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}
</style>
