<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import type { UserAction } from '@/Interface';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { ref } from 'vue';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import TimeAgo from '@/app/components/TimeAgo.vue';

const i18n = useI18n();

type Props = {
	clients: OAuthClientResponseDto[];
	loading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	revokeClient: [client: OAuthClientResponseDto];
	refresh: [];
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
	<div data-test-id="oauth-clients-table">
		<div v-if="props.loading">
			<N8nLoading :loading="props.loading" variant="h1" class="mb-l" />
			<N8nLoading :loading="props.loading" variant="p" :rows="5" :shrink-last="false" />
		</div>
		<div v-else class="mt-s mb-xl">
			<div :class="[$style.header, 'mb-s']">
				<N8nHeading size="medium" :bold="true">
					{{ i18n.baseText('settings.mcp.oAuthClients.heading') }} ({{ props.clients.length }})
				</N8nHeading>
				<N8nTooltip :content="i18n.baseText('settings.mcp.refresh.tooltip')">
					<N8nButton
						data-test-id="mcp-oauth-clients-refresh-button"
						size="small"
						type="tertiary"
						icon="refresh-cw"
						:square="true"
						@click="$emit('refresh')"
					/>
				</N8nTooltip>
			</div>
			<N8nActionBox
				v-if="props.clients.length === 0"
				data-test-id="empty-oauth-clients-list-box"
				:heading="i18n.baseText('settings.mcp.oAuthClients.table.empty.title')"
			/>
			<N8nDataTableServer
				v-else
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
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						data-test-id="mcp-oauth-client-action-toggle"
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
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
