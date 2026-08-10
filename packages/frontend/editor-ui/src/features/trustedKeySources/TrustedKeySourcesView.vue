<script setup lang="ts">
import type { TrustedKeySource, TrustedKeySourcePolicy } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nEmptyState,
	N8nHeading,
	N8nLoading2,
	N8nText,
} from '@n8n/design-system';
import type { BadgeTheme } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { ElTable, ElTableColumn } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

import TrustedKeySourcePolicyModal from './components/TrustedKeySourcePolicyModal.vue';
import { useTrustedKeySources } from './composables/useTrustedKeySources';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const rbacStore = useRBACStore();

const { sources, isLoading, fetchSources, updatePolicy } = useTrustedKeySources();

const canEditPolicy = computed(() => rbacStore.hasScope('trustedKeySource:update'));

const editingSource = ref<TrustedKeySource | null>(null);
const isPolicyModalOpen = ref(false);

function hasPolicy(source: TrustedKeySource): boolean {
	return Object.values(source.policy ?? {}).some((value) => value !== undefined);
}

function onEdit(source: TrustedKeySource) {
	editingSource.value = source;
	isPolicyModalOpen.value = true;
}

async function onSavePolicy(id: string, policy: TrustedKeySourcePolicy) {
	// Keep the form open on failure so a rejected save doesn't discard the edit.
	if (await updatePolicy(id, policy)) {
		isPolicyModalOpen.value = false;
	}
}

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
					<div :class="$style.expanded">
						<div>
							<N8nText size="small" bold color="text-light">
								{{ i18n.baseText('settings.trustedKeySources.detail.config') }}
							</N8nText>
							<pre :class="$style.config">{{ JSON.stringify(row.config, null, 2) }}</pre>
						</div>
						<div>
							<N8nText size="small" bold color="text-light">
								{{ i18n.baseText('settings.trustedKeySources.detail.policy') }}
							</N8nText>
							<pre v-if="hasPolicy(row)" :class="$style.config">{{
								JSON.stringify(row.policy, null, 2)
							}}</pre>
							<N8nText v-else :class="$style.config" size="small" color="text-light">
								{{ i18n.baseText('settings.trustedKeySources.detail.noPolicy') }}
							</N8nText>
						</div>
					</div>
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
			<ElTableColumn :label="i18n.baseText('settings.trustedKeySources.column.policy')">
				<template #default="{ row }: { row: TrustedKeySource }">
					<N8nBadge v-if="hasPolicy(row)" theme="tertiary">
						{{ i18n.baseText('settings.trustedKeySources.policy.overridden') }}
					</N8nBadge>
					<N8nText v-else color="text-light" size="small">
						{{ i18n.baseText('settings.trustedKeySources.policy.none') }}
					</N8nText>
				</template>
			</ElTableColumn>
			<ElTableColumn v-if="canEditPolicy" width="120">
				<template #default="{ row }: { row: TrustedKeySource }">
					<N8nButton
						type="tertiary"
						size="small"
						:label="i18n.baseText('settings.trustedKeySources.policy.edit')"
						data-test-id="trusted-key-source-edit-policy"
						@click="onEdit(row)"
					/>
				</template>
			</ElTableColumn>
		</ElTable>

		<TrustedKeySourcePolicyModal
			v-model:open="isPolicyModalOpen"
			:source="editingSource"
			@save="onSavePolicy"
		/>
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

.expanded {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}

.config {
	margin: 0;
	padding-top: var(--spacing--3xs);
	white-space: pre-wrap;
	word-break: break-word;
	font-size: var(--font-size--2xs);
}

.lastError {
	display: block;
}
</style>
