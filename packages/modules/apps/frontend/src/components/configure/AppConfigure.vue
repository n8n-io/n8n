<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';

import type { AppVersions } from '../../composables/useAppVersions';
import AppConfigureGeneral from './AppConfigureGeneral.vue';
import AppConnectionsCard from './connections/AppConnectionsCard.vue';

defineProps<{ app: AppResponse; versions: AppVersions }>();

const emit = defineEmits<{ updated: [app: AppResponse] }>();
</script>

<template>
	<div :class="$style.page" data-test-id="app-view-configure">
		<div :class="$style.column">
			<AppConfigureGeneral :app="app" @updated="emit('updated', $event)" />
			<AppConnectionsCard :app="app" :versions="versions" @updated="emit('updated', $event)" />
		</div>
	</div>
</template>

<style lang="scss" module>
/* The Agent Builder page layout: 24px above, 48px at the sides and below, a 56rem column.
   It fills the view so that the background reaches the bottom. */
.page {
	flex: 1;
	container-type: inline-size;
	padding-block: var(--spacing--lg) var(--spacing--2xl);
	background-color: var(--background--subtle);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	box-sizing: border-box;
	max-width: calc(56rem + 2 * var(--spacing--2xl));
	margin-inline: auto;
	padding-inline: var(--spacing--2xl);
}

@container (max-width: 40rem) {
	.column {
		padding-inline: var(--spacing--sm);
	}
}
</style>
