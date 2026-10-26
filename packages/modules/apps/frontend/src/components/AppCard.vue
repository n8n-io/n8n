<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { N8nCard, N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import AppActions from './AppActions.vue';
import AppPublicationBadge from './AppPublicationBadge.vue';

defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ select: [app: AppResponse]; deleted: [appId: string] }>();

const i18n = useI18n();
const rootStore = useRootStore();
</script>

<template>
	<N8nCard :class="$style.card" data-test-id="app-card" @click="emit('select', app)">
		<template #prepend>
			<N8nIcon icon="layout-template" size="large" />
		</template>
		<template #header>
			<N8nText tag="h2" bold :class="$style.heading" data-test-id="app-card-name">
				{{ app.name }}
			</N8nText>
		</template>
		<div :class="$style.description">
			<span>{{ app.namespace }}</span>
			<span>|</span>
			<span>{{ i18n.baseText(`apps.card.visibility.${app.visibility}`) }}</span>
			<span>|</span>
			<span>
				{{ i18n.baseText('apps.card.updated') }}
				<N8nTimeAgo :date="app.updatedAt" :locale="rootStore.defaultLocale" />
			</span>
		</div>
		<template #append>
			<div :class="$style.actions" @click.stop>
				<AppPublicationBadge :app="app" />
				<AppActions :app="app" @deleted="emit('deleted', $event)" />
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	padding: 0 0 0 var(--spacing--sm);
	align-items: stretch;
	cursor: pointer;
}

.heading {
	font-size: var(--font-size--sm);
	word-break: break-word;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.description {
	min-height: var(--spacing--xl);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.actions {
	display: flex;
	cursor: default;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--sm);
}
</style>
