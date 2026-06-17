<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { DateTime } from 'luxon';
import type { ApiKey } from '@n8n/api-types';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import { N8nActionDropdown, N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';

import ApiKeyLabelCell from './ApiKeyLabelCell.vue';
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
	rotate: [apiKey: ApiKey];
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

// Rotation preserves the original expiry, so an already-expired key can't be rotated.
function isExpired(apiKey: ApiKey): boolean {
	return apiKey.expiresAt !== null && apiKey.expiresAt <= Math.floor(Date.now() / 1000);
}

function onRowClick(_event: MouseEvent, payload: { item: ApiKey }) {
	emit('edit', payload.item);
}

type ApiKeyAction = 'edit' | 'view' | 'revoke' | 'rotate';

function getRowActions(apiKey: ApiKey): Array<ActionDropdownItem<ApiKeyAction>> {
	const actions: Array<ActionDropdownItem<ApiKeyAction>> = [];
	if (isOwn(apiKey)) {
		actions.push({
			id: 'edit',
			label: i18n.baseText('settings.api.actions.edit'),
			icon: 'square-pen',
			testId: 'api-key-edit-action',
		});
		if (!isExpired(apiKey)) {
			actions.push({
				id: 'rotate',
				label: i18n.baseText('settings.api.actions.rotate'),
				icon: 'refresh-cw',
				testId: 'api-key-rotate-action',
			});
		}
	} else {
		// Non-owners open the same modal, which renders read-only based on ownership.
		actions.push({
			id: 'view',
			label: i18n.baseText('settings.api.actions.view'),
			icon: 'eye',
			testId: 'api-key-view-action',
		});
	}
	actions.push({
		id: 'revoke',
		label: i18n.baseText('settings.api.actions.revoke'),
		icon: 'trash-2',
		testId: 'api-key-revoke-action',
		divided: true,
	});
	return actions;
}

function onAction(action: ApiKeyAction, apiKey: ApiKey) {
	if (action === 'revoke') emit('revoke', apiKey);
	else if (action === 'rotate') emit('rotate', apiKey);
	else emit('edit', apiKey);
}

const rows = computed(() => props.apiKeys);

// `resize: false` everywhere — these columns are fixed-shape and the resizer
// handle otherwise highlights on every header hover.
const headers = ref<Array<TableHeader<ApiKey>>>([
	{ title: i18n.baseText('settings.api.columns.name'), key: 'label', width: 280, resize: false },
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
		width: 80,
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
			@update:options="emit('update:options', $event)"
			@click:row="onRowClick"
		>
			<template #[`item.label`]="{ item }">
				<ApiKeyLabelCell :label="item.label" :api-key="item.apiKey" />
			</template>
			<template #[`item.owner`]="{ item }">
				<ApiKeyOwnerCell v-if="item.owner" :owner="item.owner" :is-current-user="isOwn(item)" />
			</template>
			<template #[`item.scopes`]="{ item }">
				<ApiKeyScopesCell :api-key="item" @open="emit('open-scopes', $event)" />
			</template>
			<template #[`item.expiresAt`]="{ item }">
				<N8nText :color="item.expiresAt ? undefined : 'text-light'">
					{{ formatExpiration(item.expiresAt) }}
				</N8nText>
			</template>
			<template #[`item.lastUsedAt`]="{ item }">
				<N8nText :color="item.lastUsedAt ? undefined : 'text-light'">
					{{ formatLastUsed(item.lastUsedAt) }}
				</N8nText>
			</template>
			<template #[`item.actions`]="{ item }">
				<div :class="$style.rowActions" @click.stop>
					<N8nActionDropdown
						:items="getRowActions(item)"
						placement="bottom-end"
						activator-size="small"
						data-test-id="api-key-actions-toggle"
						@select="(action) => onAction(action, item)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.rowActions {
	display: flex;
	justify-content: flex-end;
}
</style>
