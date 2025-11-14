<script setup lang="ts">
import type { OAuthClientResponseDto } from '@n8n/api-types';
import ConnectionParameter from '@/features/ai/mcpAccess/components/connectionInstructions/ConnectionParameter.vue';
import OAuthClientsTable from '@/features/ai/mcpAccess/components/connectionInstructions/OAuthClientsTable.vue';
import { useI18n } from '@n8n/i18n';

type Props = {
	serverUrl: string;
	clients: OAuthClientResponseDto[];
	clientsLoading: boolean;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	revokeClient: [client: OAuthClientResponseDto];
	refresh: [];
}>();

const i18n = useI18n();

const onRefreshOAuthClients = () => {
	emit('refresh');
};

const onRevokeClientAccess = (client: OAuthClientResponseDto) => {
	emit('revokeClient', client);
};
</script>

<template>
	<div :class="$style.container">
		<ol :class="$style.instructions">
			<li>
				<div :class="$style.item">
					<span :class="$style.label">
						{{ i18n.baseText('settings.mcp.instructions.enableAccess') }}
					</span>
				</div>
			</li>
			<li>
				<div :class="$style.item">
					<span :class="$style.label">
						{{ i18n.baseText('settings.mcp.instructions.serverUrl') }}:
					</span>
					<ConnectionParameter :value="props.serverUrl" />
				</div>
			</li>
		</ol>
		<div :class="$style['clients-table']">
			<OAuthClientsTable
				:data-test-id="'mcp-oauth-clients-table'"
				:clients="props.clients"
				:loading="props.clientsLoading"
				@revoke-client="onRevokeClientAccess"
				@refresh="onRefreshOAuthClients"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs) var(--spacing--xs) 0;
}

.instructions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--lg);
	margin: var(--spacing--sm);

	li {
		min-height: var(--spacing--lg);
	}

	.item {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);

		:global(.n8n-loading) div {
			height: 32px;
			width: 300px;
			margin: 0;
		}
	}

	.label {
		font-size: var(--font-size--sm);
		flex: none;
	}

	.url {
		display: flex;
		align-items: stretch;
		gap: var(--spacing--2xs);
		background: var(--color--background--light-3);
		border: var(--border);
		border-radius: var(--radius);
		font-size: var(--font-size--sm);
		overflow: hidden;

		code {
			text-overflow: ellipsis;
			overflow: hidden;
			white-space: pre;
			padding: var(--spacing--2xs) var(--spacing--3xs);
		}

		.copy-url-wrapper {
			display: flex;
			align-items: center;
			border-left: var(--border);
		}

		.copy-url-button {
			border: none;
			border-radius: 0;
		}

		@media screen and (max-width: 820px) {
			word-wrap: break-word;
			margin-top: var(--spacing--2xs);
		}
	}
}

.clients-table {
	padding: 0 var(--spacing--lg);
}
</style>
