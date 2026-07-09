<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { N8nButton, N8nDataTableServer, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getClientBrand, scopeLabelKeySuffix } from '../../clients.utils';
import OAuthClientDetailsModal from '../OAuthClientDetailsModal.vue';

const i18n = useI18n();
const mcpStore = useMCPStore();

type Props = {
	clients: OAuthClientResponseDto[];
	loading: boolean;
};

const props = defineProps<Props>();

const page = ref(0);
const itemsPerPage = ref(10);

const detailsClient = ref<OAuthClientResponseDto | null>(null);
const detailsOpen = ref(false);

const visibleClients = computed(() => {
	const start = page.value * itemsPerPage.value;
	return props.clients.slice(start, start + itemsPerPage.value);
});

watch(
	() => props.clients.length,
	(length) => {
		const maxPage = Math.max(0, Math.ceil(length / itemsPerPage.value) - 1);
		if (page.value > maxPage) {
			page.value = maxPage;
		}
	},
);

const emit = defineEmits<{
	revokeClient: [client: OAuthClientResponseDto];
}>();

const tableHeaders = ref<Array<TableHeader<OAuthClientResponseDto>>>([
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.clientName'),
		key: 'name',
		width: 220,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.access'),
		key: 'scopes',
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.lastActive'),
		key: 'lastActiveAt',
		width: 160,
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

function scopeLabel(scope: string): string {
	const key = `settings.mcp.oAuthClients.scope.${scopeLabelKeySuffix(scope)}` as BaseTextKey;
	const label = i18n.baseText(key);
	// baseText returns the key itself for unknown scopes; show them verbatim
	return label === key ? scope : label;
}

function accessSummary(client: OAuthClientResponseDto): string {
	const labels = client.scopes.map(scopeLabel);
	const visible = labels.slice(0, 2).join(', ');
	const remaining = labels.length - 2;
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
			<N8nDataTableServer
				v-model:page="page"
				v-model:items-per-page="itemsPerPage"
				data-test-id="oauth-clients-data-table"
				:headers="tableHeaders"
				:items="visibleClients"
				:items-length="props.clients.length"
				@click:row="(_, { item }) => openDetails(item)"
			>
				<template v-if="props.clients.length === 0" #cover>
					<div :class="$style['empty-state']">
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
				<template #[`item.scopes`]="{ item }">
					<N8nText data-test-id="mcp-client-access" color="text-light" :class="$style.access">
						{{ accessSummary(item) }}
					</N8nText>
				</template>
				<template #[`item.lastActiveAt`]="{ item }">
					<N8nText data-test-id="mcp-client-last-active" color="text-base">
						<TimeAgo
							v-if="item.lastActiveAt !== null"
							:date="new Date(item.lastActiveAt).toISOString()"
							capitalize
						/>
						<template v-else>&ndash;</template>
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
