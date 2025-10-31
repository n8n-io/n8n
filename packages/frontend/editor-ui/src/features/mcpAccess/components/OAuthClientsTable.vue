<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import type { UserAction } from '@/Interface';
import {
	N8nActionToggle,
	N8nDataTableServer,
	N8nHeading,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { ref } from 'vue';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import TimeAgo from '@/components/TimeAgo.vue';

const i18n = useI18n();

type Props = {
	clients: OAuthClientResponseDto[];
	loading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	revokeClient: [client: OAuthClientResponseDto];
}>();

const tableHeaders = ref<Array<TableHeader<OAuthClientResponseDto>>>([
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.clientName'),
		key: 'name',
		width: 250,
		disableSort: true,
		value(client: OAuthClientResponseDto) {
			return client.name;
		},
	},
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.connectedAt'),
		key: 'createdAt',
		width: 250,
		disableSort: true,
		value() {
			return;
		},
	},
	{
		title: i18n.baseText('settings.mcp.oAuthClients.table.lastUsedAt'),
		key: 'updatedAt',
		width: 250,
		disableSort: true,
		value(client: OAuthClientResponseDto) {
			return client.updatedAt;
		},
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 50,
		disableSort: true,
		value() {
			return;
		},
	},
]);

const tableActions = ref<Array<UserAction<OAuthClientResponseDto>>>([
	{
		label: i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess'),
		value: 'revokeClient',
	},
]);

const onTableAction = (action: string, item: OAuthClientResponseDto) => {
	if (action === 'revokeClient') {
		emit('revokeClient', item);
	}
};
</script>

<template>
	<div :class="$style['oauth-clients-table-container']">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<div :class="[$style.header, 'mb-s']">
				<N8nHeading size="medium" :bold="true">
					{{ i18n.baseText('settings.mcp.oAuthClients.heading') }} ({{ props.clients.length }})
				</N8nHeading>
			</div>
			<N8nDataTableServer
				:class="$style['client-table']"
				data-test-id="oauth-clients-data-table"
				:headers="tableHeaders"
				:items="props.clients"
				:items-length="props.clients.length"
			>
				<template #[`item.createdAt`]="{ item }">
					<N8nText data-test-id="mcp-client-created-at">
						<TimeAgo :date="String(item.createdAt)" />
					</N8nText>
				</template>
				<template #[`item.updatedAt`]="{ item }">
					<N8nText data-test-id="mcp-client-last-used-at">
						<TimeAgo :date="String(item.updatedAt)" />
					</N8nText>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						placement="bottom"
						:actions="tableActions"
						theme="dark"
						@action="onTableAction($event, item)"
					/>
				</template>
			</N8nDataTableServer>
		</div>
	</div>
</template>

<style lang="scss" module>
.oauth-clients-table-container {
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
}
</style>
