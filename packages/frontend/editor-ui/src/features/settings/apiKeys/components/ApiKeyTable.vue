<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { DateTime } from 'luxon';
import type { ApiKey } from '@n8n/api-types';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import { N8nButton, N8nDataTableServer, N8nText } from '@n8n/design-system';

import ApiKeyOwnerCell from './ApiKeyOwnerCell.vue';
import ApiKeyScopesCell from './ApiKeyScopesCell.vue';

const props = defineProps<{
	apiKeys: ApiKey[];
	itemsLength: number;
	loading?: boolean;
	/** When set, Edit is only offered for keys owned by this user. */
	currentUserId?: string;
}>();

const emit = defineEmits<{
	edit: [apiKey: ApiKey];
	revoke: [apiKey: ApiKey];
	'open-scopes': [apiKey: ApiKey];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', {
	default: () => ({}),
});

const i18n = useI18n();

function formatExpiration(expiresAt: number | null): string {
	if (!expiresAt) return i18n.baseText('settings.api.expiration.never');
	return DateTime.fromSeconds(expiresAt).toFormat('d LLL yyyy');
}

function formatLastUsed(iso: string | null): string {
	if (!iso) return i18n.baseText('settings.api.lastUsed.never');
	return DateTime.fromISO(iso).toRelative() ?? i18n.baseText('settings.api.lastUsed.never');
}

function isOwn(apiKey: ApiKey): boolean {
	if (!props.currentUserId) return true;
	return apiKey.owner?.id === props.currentUserId;
}

function onRowClick(_event: MouseEvent, payload: { item: ApiKey }) {
	if (isOwn(payload.item)) emit('edit', payload.item);
	else emit('revoke', payload.item);
}

const rows = computed(() => props.apiKeys);

// `resize: false` everywhere — these columns are fixed-shape and the resizer
// handle otherwise highlights on every header hover.
const headers = ref<Array<TableHeader<ApiKey>>>([
	{ title: i18n.baseText('settings.api.columns.name'), key: 'label', resize: false },
	{
		title: i18n.baseText('settings.api.columns.owner'),
		key: 'owner',
		width: 280,
		disableSort: true,
		resize: false,
	},
	{ title: i18n.baseText('settings.api.columns.scopes'), key: 'scopes', resize: false },
	// expiresAt lives in the JWT, not a column — can't ORDER BY without a migration.
	{
		title: i18n.baseText('settings.api.columns.expiration'),
		key: 'expiresAt',
		disableSort: true,
		resize: false,
	},
	{ title: i18n.baseText('settings.api.columns.lastUsed'), key: 'lastUsedAt', resize: false },
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 130,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);
</script>

<template>
	<div data-test-id="api-key-table">
		<N8nDataTableServer
			v-model:sort-by="tableOptions.sortBy"
			v-model:page="tableOptions.page"
			v-model:items-per-page="tableOptions.itemsPerPage"
			:headers="headers"
			:items="rows"
			:items-length="itemsLength"
			:loading="loading"
			:page-sizes="[10, 25, 50]"
			:row-props="{ class: $style.row }"
			@update:options="emit('update:options', $event)"
			@click:row="onRowClick"
		>
			<template #[`item.label`]="{ item }">
				<div :class="$style.name">
					<N8nText bold>{{ item.label }}</N8nText>
					<N8nText size="small" color="text-light" :class="$style.redacted">
						{{ item.apiKey }}
					</N8nText>
				</div>
			</template>
			<template #[`item.owner`]="{ item }">
				<ApiKeyOwnerCell v-if="item.owner" :owner="item.owner" :is-current-user="isOwn(item)" />
			</template>
			<template #[`item.scopes`]="{ item }">
				<ApiKeyScopesCell :api-key="item" @open="emit('open-scopes', $event)" />
			</template>
			<template #[`item.expiresAt`]="{ item }">
				<N8nText>{{ formatExpiration(item.expiresAt) }}</N8nText>
			</template>
			<template #[`item.lastUsedAt`]="{ item }">
				<N8nText :color="item.lastUsedAt ? undefined : 'text-light'">
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
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
	opacity: 0;
	transition: opacity var(--transition--fast);
}

.row:hover .rowActions,
.row:focus-within .rowActions {
	opacity: 1;
}
</style>
