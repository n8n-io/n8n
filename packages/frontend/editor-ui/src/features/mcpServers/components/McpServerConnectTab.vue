<script lang="ts" setup>
import type { McpServerDetailDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nCard,
	N8nCopyInput,
	N8nHeading,
	N8nSegmentControl,
	N8nText,
	type SegmentOption,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref } from 'vue';

import {
	CONNECT_CLIENTS,
	CONNECT_CLIENT_LABEL_KEYS,
	type ConnectClient,
} from '../mcpServers.utils';
import McpServerClientInstructions from './McpServerClientInstructions.vue';

const N8N_AGENT_OPTION = 'n8nAgent';

const props = defineProps<{ server: McpServerDetailDto }>();

const i18n = useI18n();
const usersStore = useUsersStore();

const client = ref<ConnectClient>('claude');

const clientOptions = computed(() => [
	...CONNECT_CLIENTS.map(
		(value): SegmentOption<string> => ({
			value,
			label: i18n.baseText(CONNECT_CLIENT_LABEL_KEYS[value]),
		}),
	),
	{
		value: N8N_AGENT_OPTION,
		label: i18n.baseText('mcpServers.connect.client.n8nAgent'),
		disabled: true,
	},
]);

function isConnectClient(value: string): value is ConnectClient {
	return (CONNECT_CLIENTS as readonly string[]).includes(value);
}

function onClientChange(value: string) {
	if (isConnectClient(value)) client.value = value;
}

const enabledTools = computed(() => props.server.tools.filter((tool) => tool.enabled));
const consentText = computed(() =>
	i18n.baseText('mcpServers.connect.consent.ask', {
		interpolate: {
			client: i18n.baseText(CONNECT_CLIENT_LABEL_KEYS[client.value]),
			server: props.server.name,
			email: usersStore.currentUser?.email ?? 'you@example.com',
		},
	}),
);
const consentScope = computed(() => {
	const risky = enabledTools.value.filter((tool) => tool.behavior !== 'read').length;
	return i18n.baseText('mcpServers.connect.consent.scope', {
		interpolate: {
			tools: enabledTools.value.length,
			resources: props.server.resources.length,
			risky,
		},
	});
});

function openSharePage() {
	window.open(props.server.shareUrl, '_blank', 'noopener');
}
</script>

<template>
	<div :class="$style.connect" data-testid="mcp-server-connect-tab">
		<N8nSegmentControl
			:model-value="client"
			:options="clientOptions"
			size="small"
			data-testid="mcp-server-connect-client"
			@update:model-value="onClientChange"
		/>

		<N8nCard :class="$style.card">
			<div :class="$style.cardBody">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText(CONNECT_CLIENT_LABEL_KEYS[client]) }}
				</N8nHeading>
				<McpServerClientInstructions
					:client="client"
					:slug="server.slug"
					:url="server.url"
					:access-mode="server.accessMode"
				/>
			</div>
		</N8nCard>

		<N8nCard v-if="server.accessMode === 'oauth'" :class="$style.card">
			<div :class="$style.cardBody">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.connect.colleague.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('mcpServers.connect.colleague.subtitle') }}
				</N8nText>
				<div :class="$style.steps">
					<div :class="$style.step">
						<N8nText bold>{{ i18n.baseText('mcpServers.connect.colleague.step1') }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.connect.colleague.step1.description') }}
						</N8nText>
					</div>
					<div :class="$style.step">
						<N8nText bold>{{ i18n.baseText('mcpServers.connect.colleague.step2') }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('mcpServers.connect.colleague.step2.description') }}
						</N8nText>
					</div>
					<div :class="$style.step">
						<N8nText bold>{{ i18n.baseText('mcpServers.connect.colleague.step3') }}</N8nText>
						<div :class="$style.consent" data-testid="mcp-server-consent-mock">
							<N8nText size="small">{{ consentText }}</N8nText>
							<N8nText size="xsmall" color="text-light">{{ consentScope }}</N8nText>
							<div :class="$style.consentButtons">
								<N8nButton variant="brand" size="mini" tabindex="-1">
									{{ i18n.baseText('mcpServers.connect.consent.allow') }}
								</N8nButton>
								<N8nButton variant="outline" size="mini" tabindex="-1">
									{{ i18n.baseText('mcpServers.connect.consent.deny') }}
								</N8nButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</N8nCard>

		<N8nCard :class="$style.card">
			<div :class="$style.cardBody">
				<N8nHeading tag="h3" size="small" bold>
					{{ i18n.baseText('mcpServers.connect.send.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('mcpServers.connect.send.subtitle') }}
				</N8nText>
				<N8nCopyInput
					:value="server.shareUrl"
					:label="i18n.baseText('mcpServers.connect.send.label')"
					size="medium"
					data-testid="mcp-server-share-url"
				/>
				<div>
					<N8nButton
						variant="outline"
						size="small"
						icon="external-link"
						data-testid="mcp-server-open-share"
						@click="openSharePage"
					>
						{{ i18n.baseText('mcpServers.connect.send.open') }}
					</N8nButton>
				</div>
			</div>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
.connect {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.card {
	width: 100%;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.steps {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: var(--spacing--xs);
}

.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border-radius: var(--radius--lg);
	background: var(--background--subtle);
}

.consent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.consentButtons {
	display: flex;
	gap: var(--spacing--3xs);
	pointer-events: none;
}
</style>
