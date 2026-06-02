<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { DateTime } from 'luxon';
import type { ApiKey } from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import ApiKeyOwnerCell from './ApiKeyOwnerCell.vue';
import ApiKeyScopesCell from './ApiKeyScopesCell.vue';

const props = defineProps<{
	apiKeys: ApiKey[];
	/** When set, Edit is only offered for keys owned by this user. */
	currentUserId?: string;
}>();

const emit = defineEmits<{
	edit: [apiKey: ApiKey];
	revoke: [apiKey: ApiKey];
	'open-scopes': [apiKey: ApiKey];
}>();

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

function onRowClick(apiKey: ApiKey) {
	if (isOwn(apiKey)) emit('edit', apiKey);
	else emit('revoke', apiKey);
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="api-key-table">
		<table :class="$style.table">
			<thead>
				<tr>
					<th>{{ i18n.baseText('settings.api.columns.name') }}</th>
					<th>{{ i18n.baseText('settings.api.columns.owner') }}</th>
					<th>{{ i18n.baseText('settings.api.columns.scopes') }}</th>
					<th>{{ i18n.baseText('settings.api.columns.expiration') }}</th>
					<th>{{ i18n.baseText('settings.api.columns.lastUsed') }}</th>
					<th :class="$style.actions"></th>
				</tr>
			</thead>
			<tbody>
				<tr
					v-for="apiKey in apiKeys"
					:key="apiKey.id"
					:class="$style.row"
					data-test-id="api-key-row"
					:data-key-id="apiKey.id"
					@click="onRowClick(apiKey)"
				>
					<td>
						<div :class="$style.name">
							<N8nText bold size="small">{{ apiKey.label }}</N8nText>
							<N8nText size="xsmall" color="text-light" :class="$style.redacted">
								{{ apiKey.apiKey }}
							</N8nText>
						</div>
					</td>
					<td>
						<ApiKeyOwnerCell
							v-if="apiKey.owner"
							:owner="apiKey.owner"
							:is-current-user="isOwn(apiKey)"
						/>
					</td>
					<td>
						<ApiKeyScopesCell :api-key="apiKey" @open="emit('open-scopes', $event)" />
					</td>
					<td>
						<N8nText size="small">{{ formatExpiration(apiKey.expiresAt) }}</N8nText>
					</td>
					<td>
						<N8nText size="small" :color="apiKey.lastUsedAt ? undefined : 'text-light'">
							{{ formatLastUsed(apiKey.lastUsedAt) }}
						</N8nText>
					</td>
					<td :class="$style.actions">
						<div :class="$style.rowActions">
							<N8nButton
								v-if="isOwn(apiKey)"
								variant="outline"
								size="mini"
								:label="i18n.baseText('settings.api.actions.edit')"
								data-test-id="api-key-edit-action"
								@click.stop="emit('edit', apiKey)"
							/>
							<N8nButton
								variant="outline"
								size="mini"
								:label="i18n.baseText('settings.api.actions.revoke')"
								data-test-id="api-key-revoke-action"
								@click.stop="emit('revoke', apiKey)"
							/>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	overflow: hidden;
	background-color: var(--color--background--light-3);
}

.table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	font-size: var(--font-size--sm);

	thead {
		background-color: var(--color--background--light-1);
		border-bottom: 1px solid var(--color--foreground);

		th {
			text-align: left;
			padding: var(--spacing--2xs) var(--spacing--sm);
			font-weight: var(--font-weight--bold);
			font-size: var(--font-size--2xs);
			color: var(--color--text--shade-1);
			border-bottom: 1px solid var(--color--foreground);
		}
	}

	tbody tr {
		background-color: var(--color--background--light-3);

		&:not(:last-child) td {
			border-bottom: 1px solid var(--color--foreground);
		}

		&:hover {
			background-color: var(--color--background--light-2);
		}
	}

	td {
		padding: var(--spacing--2xs) var(--spacing--sm);
		vertical-align: middle;
	}
}

.row {
	cursor: pointer;
}

.name {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.redacted {
	font-family: var(--font-family--monospace);
}

.actions {
	width: 160px;
	text-align: right;
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
