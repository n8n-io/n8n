<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nDataTableServer,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import type { IUser, TabOptions } from '@n8n/design-system';
import { computed, ref } from 'vue';
import debounce from 'lodash/debounce';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import TimeAgo from '@/app/components/TimeAgo.vue';
import {
	EMPTY_OAUTH_CLIENT_FILTERS,
	getClientBrand,
	isFullAccessGrant,
	scopeLabel,
} from '../../clients.utils';
import type { OAuthClientFilters } from '../../clients.utils';
import OAuthClientDetailsModal from '../OAuthClientDetailsModal.vue';
import OAuthClientOwnerCell from './OAuthClientOwnerCell.vue';
import OAuthClientsFilters from './OAuthClientsFilters.vue';

const i18n = useI18n();
const mcpStore = useMCPStore();
const rbacStore = useRBACStore();
const usersStore = useUsersStore();

type Props = {
	clients: OAuthClientResponseDto[];
	loading: boolean;
	scopeTools?: Record<string, string[]>;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	revokeClient: [client: OAuthClientResponseDto];
	'update:ownership': [ownership: 'mine' | 'all'];
	'update:filters': [filters: OAuthClientFilters];
	'update:options': [options: { page: number; itemsPerPage: number }];
}>();

// The store is the source of truth for pagination; setters route through the
// parent so it can wrap the refetch in its loading state.
const page = computed({
	get: () => mcpStore.oauthClientsPage,
	set: (value: number) => emit('update:options', { page: value, itemsPerPage: itemsPerPage.value }),
});
const itemsPerPage = computed({
	get: () => mcpStore.oauthClientsPageSize,
	set: (value: number) => emit('update:options', { page: page.value, itemsPerPage: value }),
});

const detailsClient = ref<OAuthClientResponseDto | null>(null);
const detailsOpen = ref(false);

const canManageAllClients = computed(() => rbacStore.hasScope('mcp:manage'));
const ownership = computed(() => mcpStore.oauthClientsOwnership);

// Badges show the unfiltered totals so a search-narrowed "Mine (0)" doesn't read
// as "no connected clients" when there are clients that just don't match.
const tabOptions = computed<Array<TabOptions<'mine' | 'all'>>>(() => [
	{
		label: i18n.baseText('settings.mcp.oAuthClients.tabs.mine'),
		value: 'mine' as const,
		tag: String(mcpStore.oauthClientTotals.mine),
	},
	{
		label: i18n.baseText('settings.mcp.oAuthClients.tabs.all'),
		value: 'all' as const,
		tag: String(mcpStore.oauthClientTotals.all ?? 0),
	},
]);

// Local UI state of the search + popover; every change is emitted so the
// parent can push it to the store and refetch server-side.
const filters = ref<OAuthClientFilters>({ ...EMPTY_OAUTH_CLIENT_FILTERS });
const searchQuery = ref('');

const hasActiveFilters = computed(
	() =>
		filters.value.search.trim() !== '' ||
		filters.value.type !== null ||
		filters.value.ownerId !== null ||
		filters.value.connected !== null,
);

function onFiltersChange(newFilters: OAuthClientFilters) {
	filters.value = newFilters;
	emit('update:filters', newFilters);
}

const applySearch = debounce((value: string) => {
	onFiltersChange({ ...filters.value, search: value });
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function onSearchInput(value: string) {
	searchQuery.value = value;
	void applySearch(value);
}

const ownerOptions = computed<IUser[]>(() =>
	mcpStore.oauthClientOwners.map((owner) => ({
		id: owner.id,
		firstName: owner.firstName,
		lastName: owner.lastName,
		email: owner.email,
		fullName: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || undefined,
	})),
);

function onOwnershipChange(newOwnership: 'mine' | 'all') {
	if (newOwnership === ownership.value) return;
	// Drop any queued search so a stale term can't re-filter after the switch.
	applySearch.cancel();
	filters.value = { ...EMPTY_OAUTH_CLIENT_FILTERS };
	searchQuery.value = '';
	emit('update:ownership', newOwnership);
}

// A consent row is (client × owner): the same client id can appear once per
// owner in the All view, so row identity must include the owner.
function rowId(row: OAuthClientResponseDto) {
	return `${row.id}:${row.owner?.id ?? 'mine'}`;
}

const tableHeaders = computed<Array<TableHeader<OAuthClientResponseDto>>>(() => [
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.clientName'),
		key: 'name',
		width: 220,
		disableSort: true,
		value() {
			return;
		},
	},
	...(ownership.value === 'all'
		? [
				{
					title: i18n.baseText('settings.mcp.oAuthClients.table.connectedBy'),
					key: 'owner',
					width: 200,
					disableSort: true,
					value() {
						return;
					},
				} satisfies TableHeader<OAuthClientResponseDto>,
			]
		: []),
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.access'),
		key: 'scopes',
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.connectedAt'),
		key: 'grantedAt',
		width: 160,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 140,
		disableSort: true,
		value() {
			return;
		},
	},
]);

function accessSummary(client: OAuthClientResponseDto): string {
	if (client.scopes.length === 0) return i18n.baseText('settings.mcp.oAuthClients.access.none');
	if (isFullAccessGrant(client.scopes)) {
		return i18n.baseText('settings.mcp.oAuthClients.access.full');
	}
	const visible = client.scopes
		.slice(0, 2)
		.map((scope) => scopeLabel(i18n, scope))
		.join(', ');
	const remaining = client.scopes.length - 2;
	if (remaining <= 0) return visible;
	return `${visible} ${i18n.baseText('settings.mcp.oAuthClients.scope.more', {
		interpolate: { count: remaining },
	})}`;
}

function clientTypeLabel(client: OAuthClientResponseDto): string | null {
	const type = getClientBrand(client.name).type;
	if (!type) return null;
	return i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey);
}

function openDetails(item: OAuthClientResponseDto) {
	detailsClient.value = item;
	detailsOpen.value = true;
}

function onRevoke(item: OAuthClientResponseDto) {
	emit('revokeClient', item);
}
</script>

<template>
	<div data-test-id="oauth-clients-table">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<div :class="$style.toolbar">
				<N8nTabs
					v-if="canManageAllClients"
					:model-value="ownership"
					:options="tabOptions"
					data-test-id="mcp-clients-tabs"
					@update:model-value="onOwnershipChange"
				/>
				<div v-else />
				<div :class="$style.filters">
					<N8nInput
						:model-value="searchQuery"
						:placeholder="i18n.baseText('settings.mcp.oAuthClients.search.placeholder')"
						:class="$style.search"
						size="medium"
						clearable
						data-test-id="mcp-clients-search"
						@update:model-value="onSearchInput"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<OAuthClientsFilters
						:model-value="filters"
						:owners="ownerOptions"
						:show-owner-filter="ownership === 'all'"
						:current-user-id="usersStore.currentUser?.id"
						@update:model-value="onFiltersChange"
					/>
				</div>
			</div>
			<N8nDataTableServer
				v-model:page="page"
				v-model:items-per-page="itemsPerPage"
				data-test-id="oauth-clients-data-table"
				:headers="tableHeaders"
				:items="props.clients"
				:items-length="mcpStore.oauthClientsCount"
				:item-value="rowId"
				@click:row="(_, { item }) => openDetails(item)"
			>
				<template v-if="mcpStore.oauthClientsCount === 0" #cover>
					<div v-if="!hasActiveFilters" :class="$style['empty-state']">
						<N8nText data-test-id="mcp-workflow-table-empty-state" size="large" color="text-base">
							{{ i18n.baseText('settings.mcp.oauth.table.empty.title') }}
						</N8nText>
						<N8nText
							data-test-id="mcp-workflow-table-empty-state-description"
							size="small"
							color="text-base"
						>
							{{ i18n.baseText('settings.mcp.oauth.table.empty.description') }}
						</N8nText>
						<N8nButton
							variant="solid"
							data-test-id="mcp-oauth-create-client-button"
							@click="mcpStore.openConnectPopover()"
						>
							{{ i18n.baseText('settings.mcp.oauth.table.empty.button') }}
						</N8nButton>
					</div>
					<div v-else :class="$style['empty-state']">
						<N8nText data-test-id="mcp-clients-no-results" size="small" color="text-base">
							{{ i18n.baseText('settings.mcp.oAuthClients.search.noResults') }}
						</N8nText>
					</div>
				</template>
				<template #[`item.name`]="{ item }">
					<div :class="$style.client">
						<span :class="$style['client-icon-chip']">
							<component
								:is="getClientBrand(item.name).icon"
								v-if="getClientBrand(item.name).icon"
								:class="$style['client-icon']"
							/>
							<N8nIcon v-else icon="mcp" :class="$style['client-icon']" />
						</span>
						<div :class="$style['client-name']">
							<N8nText data-test-id="mcp-client-name" color="text-dark">
								{{ item.name }}
							</N8nText>
							<N8nText
								v-if="clientTypeLabel(item)"
								data-test-id="mcp-client-type"
								size="xsmall"
								color="text-light"
							>
								{{ clientTypeLabel(item) }}
							</N8nText>
						</div>
					</div>
				</template>
				<template #[`item.owner`]="{ item }">
					<OAuthClientOwnerCell
						v-if="item.owner"
						:owner="item.owner"
						:is-current-user="item.owner.id === usersStore.currentUser?.id"
					/>
				</template>
				<template #[`item.scopes`]="{ item }">
					<N8nText data-test-id="mcp-client-access" color="text-light" :class="$style.access">
						{{ accessSummary(item) }}
					</N8nText>
				</template>
				<template #[`item.grantedAt`]="{ item }">
					<N8nText data-test-id="mcp-client-created-at" color="text-base">
						<TimeAgo :date="new Date(item.grantedAt).toISOString()" capitalize />
					</N8nText>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nButton
						variant="outline"
						size="small"
						data-test-id="mcp-oauth-client-revoke-button"
						@click.stop="onRevoke(item)"
					>
						{{ i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess') }}
					</N8nButton>
				</template>
			</N8nDataTableServer>
		</div>

		<OAuthClientDetailsModal
			v-model:open="detailsOpen"
			:client="detailsClient"
			:scope-tools="props.scopeTools"
			@revoke="onRevoke"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.search {
	max-width: 240px;
}

.client {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.client-icon-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	flex-shrink: 0;
	/* fixed white tile so dark brand marks stay visible on the dark theme */
	background-color: var(--color--neutral-white);
	border: var(--border);
	border-radius: var(--radius);
}

.client-icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	/* the tile is always white, so the fallback MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

/* the whole row opens the details modal; hint that on the access summary */
.access:hover {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
}

.client-name {
	display: flex;
	flex-direction: column;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg) 0;
	min-height: 250px;
}
</style>
