<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nBadge,
	N8nCard,
	N8nIcon,
	N8nText,
	N8nTimeAgo,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';

import { deleteApp } from '../apps.api';
import { getAppPermissions } from '../apps.permissions';

const props = defineProps<{ app: AppResponse }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const canDelete = computed(() => getAppPermissions(props.app.projectId).canDelete);

const isPublished = computed(() => props.app.publishedVersionId !== null);
const actions = computed(() => [{ label: i18n.baseText('generic.delete'), value: 'delete' }]);

async function onAction(action: string) {
	if (action !== 'delete') return;

	const answer = await message.confirm(
		i18n.baseText('apps.delete.message', { interpolate: { name: props.app.name } }),
		i18n.baseText('apps.delete.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (answer !== 'confirm') return;

	try {
		await deleteApp(rootStore.restApiContext, props.app.projectId, props.app.id);
		emit('deleted', props.app.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.delete.error'));
	}
}
</script>

<template>
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
			<div :class="$style.actions">
				<N8nBadge
					:variant="isPublished ? 'success' : 'outline'"
					data-test-id="app-card-publication"
				>
					{{ i18n.baseText(isPublished ? 'apps.card.published' : 'apps.card.draft') }}
				</N8nBadge>
				<N8nActionToggle
					v-if="canDelete"
					:actions="actions"
					theme="dark"
					data-test-id="app-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	padding: 0 0 0 var(--spacing--sm);
	align-items: stretch;
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
	align-items: center;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--sm);
}
</style>
