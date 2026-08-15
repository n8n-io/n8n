<script setup lang="ts">
import { computed } from 'vue';

import type { OAuthClientResponseDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { getClientBrand, scopeLabel } from '../clients.utils';

const props = defineProps<{
	client: OAuthClientResponseDto | null;
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	revoke: [client: OAuthClientResponseDto];
}>();

const i18n = useI18n();

const brand = computed(() => (props.client ? getClientBrand(props.client.name) : null));

const ownerLabel = computed(() => {
	const owner = props.client?.owner;
	if (!owner) return null;
	const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ');
	return name ? `${name} (${owner.email})` : owner.email;
});

const subtitle = computed(() => {
	const type = brand.value?.type;
	if (!type) return i18n.baseText('settings.mcp.oAuthClients.details.subtitle');
	return i18n.baseText('settings.mcp.oAuthClients.details.subtitleWithType', {
		interpolate: {
			type: i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey),
		},
	});
});

/** Granted scopes as human labels, listed plainly in grant order. */
const grantedScopes = computed(() => props.client?.scopes ?? []);

function onRevoke() {
	if (!props.client) return;
	emit('revoke', props.client);
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog :open="open" size="medium" @update:open="emit('update:open', $event)">
		<div v-if="client" :class="$style.container" data-test-id="mcp-client-details-modal">
			<N8nDialogHeader>
				<N8nDialogTitle>
					<span :class="$style.title">
						<span :class="$style['icon-chip']">
							<component :is="brand.icon" v-if="brand?.icon" :class="$style.icon" />
							<N8nIcon v-else icon="mcp" :class="$style.icon" />
						</span>
						{{ client.name }}
					</span>
				</N8nDialogTitle>
				<N8nDialogDescription>{{ subtitle }}</N8nDialogDescription>
			</N8nDialogHeader>

			<div :class="$style.details">
				<template v-if="ownerLabel">
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedBy') }}
					</N8nText>
					<N8nText color="text-dark" size="small" data-test-id="mcp-client-details-connected-by">
						{{ ownerLabel }}
					</N8nText>
				</template>

				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedOn') }}
				</N8nText>
				<N8nText color="text-dark" size="small" data-test-id="mcp-client-details-connected-on">
					<TimeAgo :date="new Date(client.grantedAt).toISOString()" capitalize />
				</N8nText>

				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.mcp.oAuthClients.details.access') }}
				</N8nText>
				<div :class="$style.access" data-test-id="mcp-client-details-access">
					<N8nText
						v-for="scope in grantedScopes"
						:key="scope"
						color="text-dark"
						size="small"
						:data-test-id="`mcp-client-details-scope-${scope}`"
					>
						{{ scopeLabel(i18n, scope) }}
					</N8nText>
				</div>
			</div>

			<N8nDialogFooter>
				<N8nButton
					variant="subtle"
					data-test-id="mcp-client-details-close"
					@click="emit('update:open', false)"
				>
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
				<N8nButton variant="destructive" data-test-id="mcp-client-details-revoke" @click="onRevoke">
					{{ i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess') }}
				</N8nButton>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon-chip {
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

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	/* the tile is always white, so the fallback MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

.details {
	display: grid;
	grid-template-columns: minmax(120px, auto) 1fr;
	column-gap: var(--spacing--lg);
	row-gap: var(--spacing--xs);
	align-items: start;
	max-height: 60vh;
	overflow-y: auto;
}

.access {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}
</style>
