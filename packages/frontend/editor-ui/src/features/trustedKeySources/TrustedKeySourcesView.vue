<script setup lang="ts">
import type { TrustedKeySource } from '@n8n/api-types';
import { N8nBadge, N8nEmptyState, N8nHeading, N8nLoading2, N8nText } from '@n8n/design-system';
import type { BadgeTheme } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { ElTable, ElTableColumn } from 'element-plus';
import { onMounted } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import { useTrustedKeySources } from './composables/useTrustedKeySources';

const i18n = useI18n();
const documentTitle = useDocumentTitle();

const { sources, isLoading, fetchSources } = useTrustedKeySources();

const STATUS_BADGE_THEME: Record<TrustedKeySource['status'], BadgeTheme> = {
	healthy: 'success',
	pending: 'warning',
	error: 'danger',
};

function statusLabel(status: TrustedKeySource['status']): string {
	return i18n.baseText(`settings.trustedKeySources.status.${status}`);
}

function managedByLabel(managedBy: TrustedKeySource['managedBy']): string {
	return i18n.baseText(`settings.trustedKeySources.managedBy.${managedBy}`);
}

function typeLabel(type: TrustedKeySource['type']): string {
	return i18n.baseText(`settings.trustedKeySources.type.${type}`);
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.trustedKeySources.title'));
	await fetchSources();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.trustedKeySources.title') }}
			</N8nHeading>
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.trustedKeySources.description') }}
			</N8nText>
		</div>
		<N8nLoading2 v-if="isLoading && sources.length === 0" :rows="5" :shrink-last="false" />
		<N8nEmptyState
			v-else-if="sources.length === 0"
			:description="i18n.baseText('settings.trustedKeySources.empty.description')"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.trustedKeySources.empty.title') }}</span>
			</template>
		</N8nEmptyState>
		<ElTable v-else v-loading="isLoading" :border="true" :data="sources" style="width: 100%">
			<ElTableColumn type="expand">
				<template #default="{ row }: { row: TrustedKeySource }">
					<pre :class="$style.config">{{ JSON.stringify(row.config, null, 2) }}</pre>
				</template>
			</ElTableColumn>
			<ElTableColumn
				prop="issuer"
				:label="i18n.baseText('settings.trustedKeySources.column.issuer')"
			>
				<template #default="{ row }: { row: TrustedKeySource }">
					{{ row.issuer ?? i18n.baseText('settings.trustedKeySources.issuer.unset') }}
				</template>
			</ElTableColumn>
			<ElTableColumn :label="i18n.baseText('settings.trustedKeySources.column.type')">
				<template #default="{ row }: { row: TrustedKeySource }">
					{{ typeLabel(row.type) }}
				</template>
			</ElTableColumn>
			<ElTableColumn :label="i18n.baseText('settings.trustedKeySources.column.managedBy')">
				<template #default="{ row }: { row: TrustedKeySource }">
					{{ managedByLabel(row.managedBy) }}
				</template>
			</ElTableColumn>
			<ElTableColumn :label="i18n.baseText('settings.trustedKeySources.column.status')">
				<template #default="{ row }: { row: TrustedKeySource }">
					<N8nBadge :theme="STATUS_BADGE_THEME[row.status]">
						{{ statusLabel(row.status) }}
					</N8nBadge>
					<N8nText v-if="row.lastError" color="danger" size="small" :class="$style.lastError">
						{{ row.lastError }}
					</N8nText>
				</template>
			</ElTableColumn>
			<ElTableColumn :label="i18n.baseText('settings.trustedKeySources.column.lastRefreshedAt')">
				<template #default="{ row }: { row: TrustedKeySource }">
					<TimeAgo v-if="row.lastRefreshedAt" :date="row.lastRefreshedAt.toString()" />
					<N8nText v-else color="text-light" size="small">
						{{ i18n.baseText('settings.trustedKeySources.lastRefreshedAt.never') }}
					</N8nText>
				</template>
			</ElTableColumn>
		</ElTable>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: var(--spacing--xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--xl);
}

.config {
	margin: 0;
	padding: var(--spacing--sm);
	white-space: pre-wrap;
	word-break: break-word;
	font-size: var(--font-size--2xs);
}

.lastError {
	display: block;
}
</style>
