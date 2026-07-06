<script setup lang="ts">
import { computed } from 'vue';

import type { OAuthClientResponseDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogClose,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { classifyScope } from '@/app/components/scopes/scopes.utils';
import { getClientBrand, scopeLabelKeySuffix } from '../clients.utils';

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

const subtitle = computed(() => {
	const type = brand.value?.type;
	if (!type) return i18n.baseText('settings.mcp.oAuthClients.details.subtitle');
	return i18n.baseText('settings.mcp.oAuthClients.details.subtitleWithType', {
		interpolate: {
			type: i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey),
		},
	});
});

function scopeLabel(scope: string): string {
	const key = `settings.mcp.oAuthClients.scope.${scopeLabelKeySuffix(scope)}` as BaseTextKey;
	const label = i18n.baseText(key);
	// baseText returns the key itself for unknown scopes; show them verbatim
	return label === key ? scope : label;
}

const readScopes = computed(
	() => props.client?.scopes?.filter((scope) => classifyScope(scope) === 'read') ?? [],
);
const writeScopes = computed(
	() => props.client?.scopes?.filter((scope) => classifyScope(scope) === 'write') ?? [],
);

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
						<component :is="brand?.icon" v-if="brand?.icon" :class="$style.icon" />
						{{ client.name }}
					</span>
				</N8nDialogTitle>
				<N8nDialogDescription>{{ subtitle }}</N8nDialogDescription>
			</N8nDialogHeader>

			<div :class="$style.details">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.mcp.oAuthClients.details.connectedOn') }}
				</N8nText>
				<N8nText color="text-dark" size="small" data-test-id="mcp-client-details-connected-on">
					<TimeAgo :date="new Date(client.grantedAt).toISOString()" />
				</N8nText>

				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.mcp.oAuthClients.details.lastActive') }}
				</N8nText>
				<N8nText color="text-dark" size="small" data-test-id="mcp-client-details-last-active">
					<TimeAgo
						v-if="client.lastActiveAt !== null"
						:date="new Date(client.lastActiveAt).toISOString()"
					/>
					<template v-else>&ndash;</template>
				</N8nText>

				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.mcp.oAuthClients.details.access') }}
				</N8nText>
				<div :class="$style.access" data-test-id="mcp-client-details-access">
					<N8nText v-if="client.scopes === null" color="text-dark" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.scope.fullAccess') }}
					</N8nText>
					<template v-else>
						<div v-if="readScopes.length" :class="$style['access-group']">
							<N8nText color="text-light" size="xsmall" :class="$style['access-heading']">
								{{ i18n.baseText('settings.mcp.oAuthClients.details.readOnly') }}
							</N8nText>
							<N8nText v-for="scope in readScopes" :key="scope" color="text-dark" size="small">
								{{ scopeLabel(scope) }}
							</N8nText>
						</div>
						<div v-if="writeScopes.length" :class="$style['access-group']">
							<N8nText color="text-light" size="xsmall" :class="$style['access-heading']">
								{{ i18n.baseText('settings.mcp.oAuthClients.details.write') }}
							</N8nText>
							<N8nText v-for="scope in writeScopes" :key="scope" color="text-dark" size="small">
								{{ scopeLabel(scope) }}
							</N8nText>
						</div>
					</template>
				</div>
			</div>

			<N8nDialogFooter>
				<N8nDialogClose>
					<N8nButton variant="subtle" data-test-id="mcp-client-details-close">
						{{ i18n.baseText('generic.close') }}
					</N8nButton>
				</N8nDialogClose>
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

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	flex-shrink: 0;
}

.details {
	display: grid;
	grid-template-columns: minmax(120px, auto) 1fr;
	column-gap: var(--spacing--lg);
	row-gap: var(--spacing--xs);
	align-items: start;
}

.access {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.access-group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.access-heading {
	text-transform: uppercase;
	letter-spacing: 0.5px;
}
</style>
