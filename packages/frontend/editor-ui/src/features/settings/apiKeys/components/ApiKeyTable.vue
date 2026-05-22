<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { DateTime } from 'luxon';
import type { ApiKey } from '@n8n/api-types';
import { N8nButton, N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import ApiKeyOwnerCell from './ApiKeyOwnerCell.vue';
import ApiKeyScopesCell from './ApiKeyScopesCell.vue';

const props = defineProps<{
	apiKeys: ApiKey[];
	/** When set, Edit is only offered for keys owned by this user. */
	currentUserId?: string;
	/** Hide the Owner column (e.g. on the "Mine" tab where every row is the user). */
	hideOwner?: boolean;
}>();

const emit = defineEmits<{
	edit: [apiKey: ApiKey];
	revoke: [apiKey: ApiKey];
	'open-scopes': [apiKey: ApiKey];
}>();

const i18n = useI18n();

const page = ref(0);
const itemsPerPage = ref(10);
const sortBy = ref<Array<{ id: string; desc: boolean }>>([]);

const sortedApiKeys = computed(() => {
	const sort = sortBy.value[0];
	if (!sort) return props.apiKeys;
	const dir = sort.desc ? -1 : 1;
	return [...props.apiKeys].sort((a, b) => {
		const aValue = (a as unknown as Record<string, unknown>)[sort.id] ?? '';
		const bValue = (b as unknown as Record<string, unknown>)[sort.id] ?? '';
		if (aValue === bValue) return 0;
		return aValue > bValue ? dir : -dir;
	});
});

const pagedApiKeys = computed(() => {
	const start = page.value * itemsPerPage.value;
	return sortedApiKeys.value.slice(start, start + itemsPerPage.value);
});

watch(
	() => props.apiKeys.length,
	() => {
		page.value = 0;
	},
);

const headers = computed<Array<TableHeader<ApiKey>>>(() => {
	const cols: Array<TableHeader<ApiKey>> = [
		{
			key: 'label',
			title: i18n.baseText('settings.api.columns.name'),
			disableSort: true,
			width: 260,
			value: (row) => row.label,
		},
	];

	if (!props.hideOwner) {
		cols.push({
			key: 'owner',
			title: i18n.baseText('settings.api.columns.owner'),
			disableSort: true,
			width: 220,
			value: (row) => row.owner?.email ?? '',
		});
	}

	cols.push(
		{
			key: 'scopes',
			title: i18n.baseText('settings.api.columns.scopes'),
			disableSort: true,
			width: 90,
			value: (row) => row.scopes.length,
		},
		{
			key: 'createdAt',
			title: i18n.baseText('settings.api.columns.created'),
			width: 130,
			value: (row) => row.createdAt,
		},
		{
			key: 'lastUsedAt',
			title: i18n.baseText('settings.api.columns.lastUsed'),
			width: 130,
			value: (row) => row.lastUsedAt ?? '',
		},
		{
			key: 'actions',
			title: '',
			disableSort: true,
			align: 'end',
			width: 150,
			value() {
				return;
			},
		},
	);

	return cols;
});

function formatCreated(iso: string): string {
	return DateTime.fromISO(iso).toFormat('d LLL yyyy');
}

function formatLastUsed(iso: string | null): string {
	if (!iso) return i18n.baseText('settings.api.lastUsed.never');
	return DateTime.fromISO(iso).toRelative() ?? i18n.baseText('settings.api.lastUsed.never');
}

function isOwn(apiKey: ApiKey): boolean {
	if (!props.currentUserId) return true;
	return apiKey.owner?.id === props.currentUserId;
}
</script>

<template>
	<div data-test-id="api-key-table">
		<N8nDataTableServer
			:key="hideOwner ? 'no-owner' : 'with-owner'"
			v-model:sort-by="sortBy"
			v-model:page="page"
			v-model:items-per-page="itemsPerPage"
			:headers="headers"
			:items="pagedApiKeys"
			:items-length="apiKeys.length"
			:page-sizes="[10, 25, 50]"
		>
			<template #[`item.label`]="{ item }">
				<div :class="$style.name">
					<N8nText bold size="small">{{ item.label }}</N8nText>
					<N8nText size="xsmall" color="text-light" :class="$style.redacted">
						{{ item.apiKey }}
					</N8nText>
				</div>
			</template>

			<template #[`item.owner`]="{ item }">
				<ApiKeyOwnerCell v-if="item.owner" :owner="item.owner" />
			</template>

			<template #[`item.scopes`]="{ item }">
				<ApiKeyScopesCell :api-key="item" @open="emit('open-scopes', $event)" />
			</template>

			<template #[`item.createdAt`]="{ item }">
				<N8nText size="small">{{ formatCreated(item.createdAt) }}</N8nText>
			</template>

			<template #[`item.lastUsedAt`]="{ item }">
				<N8nText size="small" :color="item.lastUsedAt ? undefined : 'text-light'">
					{{ formatLastUsed(item.lastUsedAt) }}
				</N8nText>
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.rowActions">
					<N8nButton
						v-if="isOwn(item)"
						variant="outline"
						size="mini"
						:label="i18n.baseText('settings.api.actions.edit')"
						data-test-id="api-key-edit-action"
						@click.stop="emit('edit', item)"
					/>
					<N8nButton
						variant="outline"
						size="mini"
						:label="i18n.baseText('settings.api.actions.revoke')"
						data-test-id="api-key-revoke-action"
						@click.stop="emit('revoke', item)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.name {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.redacted {
	font-family: var(--font-family--monospace);
}

.rowActions {
	display: inline-flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}
</style>
