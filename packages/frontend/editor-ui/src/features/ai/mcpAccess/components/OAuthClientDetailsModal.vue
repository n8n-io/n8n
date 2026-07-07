<script setup lang="ts">
import { computed } from 'vue';

import type { OAuthClientResponseDto } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { classifyScope } from '@/app/components/scopes/scopes.utils';
import type { ScopeAccess } from '@/app/components/scopes/scopes.utils';
import { getClientBrand, isFullAccessGrant, scopeLabel } from '../clients.utils';
import { MCP_SCOPE_GROUPS, MCP_SCOPE_GROUP_ICONS } from '../mcp.constants';

const props = defineProps<{
	client: OAuthClientResponseDto | null;
	open: boolean;
	/** Tool names each scope unlocks on this instance. */
	scopeTools?: Record<string, string[]>;
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

// A grant covering every instance scope (e.g. a pre-scoping consent backfilled
// to the full launch set) shows as a single "Full access" line.
const isFullAccess = computed(() => isFullAccessGrant(props.client?.scopes ?? []));

interface AccessGroupScope {
	scope: string;
	label: string;
	access: ScopeAccess;
	tools: string[];
}

interface AccessGroup {
	key: string;
	label: string;
	icon: IconName;
	toolCount: number;
	scopes: AccessGroupScope[];
}

/**
 * The user's granted scopes arranged into the same display groups as the
 * consent screen picker, with the tool identifiers each scope unlocks.
 */
const accessGroups = computed<AccessGroup[]>(() => {
	const granted = props.client?.scopes;
	if (!granted) return [];

	return MCP_SCOPE_GROUPS.map((group) => {
		const scopes = granted
			.filter((scope) => group.resources.includes(scope.split(':')[0]))
			.map((scope) => ({
				scope,
				label: scopeLabel(i18n, scope),
				access: classifyScope(scope),
				tools: props.scopeTools?.[scope] ?? [],
			}));

		const toolCount = new Set(scopes.flatMap((entry) => entry.tools)).size;

		return {
			key: group.key,
			label: i18n.baseText(`settings.mcp.oAuthClients.group.${group.key}` as BaseTextKey),
			icon: MCP_SCOPE_GROUP_ICONS[group.key] ?? 'mcp',
			toolCount,
			scopes,
		};
	}).filter((group) => group.scopes.length > 0);
});

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
					<N8nText v-if="isFullAccess" color="text-dark" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.access.full') }}
					</N8nText>
					<template v-else>
						<div
							v-for="group in accessGroups"
							:key="group.key"
							:class="$style['access-group']"
							:data-test-id="`mcp-client-details-group-${group.key}`"
						>
							<div :class="$style['access-group-header']">
								<N8nIcon :icon="group.icon" size="small" :class="$style['access-group-icon']" />
								<N8nText color="text-dark" size="small" :bold="true">{{ group.label }}</N8nText>
								<N8nText v-if="group.toolCount > 0" color="text-light" size="xsmall">
									{{
										i18n.baseText('settings.mcp.oAuthClients.details.toolCount', {
											adjustToNumber: group.toolCount,
											interpolate: { count: group.toolCount },
										})
									}}
								</N8nText>
							</div>
							<div v-for="entry in group.scopes" :key="entry.scope" :class="$style['scope-row']">
								<div :class="$style['scope-info']">
									<N8nText color="text-dark" size="small">{{ entry.label }}</N8nText>
									<span v-for="tool in entry.tools" :key="tool" :class="$style['tool-name']">
										{{ tool }}
									</span>
								</div>
								<N8nBadge :theme="entry.access === 'read' ? 'default' : 'danger'">
									{{
										i18n.baseText(
											`settings.mcp.oAuthClients.details.badge.${entry.access}` as BaseTextKey,
										)
									}}
								</N8nBadge>
							</div>
						</div>
					</template>
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
	gap: var(--spacing--sm);
}

.access-group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.access-group-header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.access-group-icon {
	color: var(--color--text--tint-1);
}

.scope-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding-left: var(--spacing--lg);
}

.scope-info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.tool-name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}
</style>
