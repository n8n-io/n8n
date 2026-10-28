<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { N8nBadge, N8nCard, N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { APP_DETAIL_VIEW } from '../apps.constants';
import AppActions from './AppActions.vue';

const props = defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const rootStore = useRootStore();

const isPublished = computed(() => props.app.publishedVersionId !== null);
const appRoute = computed(() => ({
	name: APP_DETAIL_VIEW,
	params: { projectId: props.app.projectId, appId: props.app.id },
}));
</script>

<template>
	<RouterLink :to="appRoute" :class="$style.link" data-test-id="app-card-link">
		<N8nCard :class="$style.card" data-test-id="app-card">
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
				<div :class="$style.actions" @click.stop.prevent>
					<N8nBadge
						:variant="isPublished ? 'success' : 'outline'"
						data-test-id="app-card-publication"
					>
						{{ i18n.baseText(isPublished ? 'apps.card.published' : 'apps.card.draft') }}
					</N8nBadge>
					<AppActions :app="app" @deleted="emit('deleted', $event)" />
				</div>
			</template>
		</N8nCard>
	</RouterLink>
</template>

<style lang="scss" module>
.link {
	display: block;
	color: inherit;
	text-decoration: none;
}

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
