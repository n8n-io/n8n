<script setup lang="ts">
import { computed } from 'vue';

import { capitalCase } from 'change-case';
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
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { classifyScope, groupScopes } from '@/app/components/scopes/scopes.utils';
import type { ScopeAccess } from '@/app/components/scopes/scopes.utils';
import { getClientBrand, isFullAccessGrant } from '../clients.utils';
import { MCP_SCOPE_RESOURCE_ICONS } from '../mcp.constants';

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

// A grant covering every instance scope (e.g. a pre-scoping consent backfilled
// to the full launch set) shows as a single "Full access" line.
const isFullAccess = computed(() => isFullAccessGrant(props.client?.scopes ?? []));

interface AccessScope {
	scope: string;
	access: ScopeAccess;
	tools: string[];
}

interface AccessGroup {
	resource: string;
	label: string;
	icon: IconName;
	scopes: AccessScope[];
}

function resourceLabel(resource: string): string {
	const key = `settings.mcp.oAuthClients.resource.${resource}` as BaseTextKey;
	const label = i18n.baseText(key);
	// baseText returns the key itself for unknown resources; show them verbatim
	return label === key ? capitalCase(resource) : label;
}

/** The granted scope tokens grouped by their resource prefix, in grant order. */
const accessGroups = computed<AccessGroup[]>(() => {
	const granted = props.client?.scopes;
	if (!granted) return [];

	// Empty group definitions => every resource falls through to its own group,
	// keyed and ordered by first-seen resource prefix (see groupScopes).
	return groupScopes(granted, []).map((group) => ({
		resource: group.key,
		label: resourceLabel(group.key),
		icon: MCP_SCOPE_RESOURCE_ICONS[group.key] ?? 'mcp',
		scopes: group.scopes.map((scope) => ({
			scope,
			access: classifyScope(scope),
			tools: props.scopeTools?.[scope] ?? [],
		})),
	}));
});

function onRevoke() {
	if (!props.client) return;
	emit('revoke', props.client);
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog :open="open" size="xlarge" @update:open="emit('update:open', $event)">
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
					<N8nText v-if="isFullAccess" color="text-dark" size="small">
						{{ i18n.baseText('settings.mcp.oAuthClients.access.full') }}
					</N8nText>
					<template v-else>
						<div
							v-for="group in accessGroups"
							:key="group.resource"
							:class="$style['access-group']"
							:data-test-id="`mcp-client-details-group-${group.resource}`"
						>
							<div :class="$style['access-group-label']">
								<N8nIcon :icon="group.icon" size="small" :class="$style['access-group-icon']" />
								<N8nText color="text-dark" size="small">{{ group.label }}</N8nText>
							</div>
							<div :class="$style['scope-list']">
								<div v-for="entry in group.scopes" :key="entry.scope" :class="$style['scope-row']">
									<N8nTooltip
										:disabled="entry.tools.length === 0"
										placement="top"
										:show-after="150"
										:content-class="$style['tools-tooltip']"
									>
										<template #content>
											<div :class="$style['tools-popover']">
												<div :class="$style['tools-popover-header']">
													{{
														i18n.baseText('settings.mcp.oAuthClients.details.enablesTools', {
															adjustToNumber: entry.tools.length,
															interpolate: { count: entry.tools.length },
														})
													}}
												</div>
												<div v-for="tool in entry.tools" :key="tool" :class="$style['tool-row']">
													<N8nIcon icon="wrench" size="xsmall" :class="$style['tool-icon']" />
													<span :class="$style['tool-name']">{{ tool }}</span>
												</div>
											</div>
										</template>
										<span :class="$style['scope-token']" tabindex="0">{{ entry.scope }}</span>
									</N8nTooltip>
									<N8nBadge
										:theme="entry.access === 'read' ? 'default' : 'danger'"
										:class="$style['access-badge']"
									>
										{{
											i18n.baseText(
												`settings.mcp.oAuthClients.details.badge.${entry.access}` as BaseTextKey,
											)
										}}
									</N8nBadge>
								</div>
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
	min-width: 0;
}

.access-group {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
	min-width: 0;
}

.access-group-label {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 110px;
	flex-shrink: 0;
	padding-top: var(--spacing--5xs);
}

.access-group-icon {
	color: var(--color--text--tint-1);
}

.scope-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.scope-row {
	display: flex;
	align-items: center;
	/* wrap the badge under the token on narrow widths instead of clipping */
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.scope-token {
	display: inline-flex;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	color: var(--color--text--shade-1);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	cursor: default;
}

.access-badge {
	text-transform: uppercase;
	letter-spacing: 0.04em;
	flex-shrink: 0;
}

/* the shared tooltip caps content at 180px and centers it; tool identifiers need more room */
:global(.n8n-tooltip).tools-tooltip {
	max-width: 320px;
	align-items: flex-start;
}

.tools-popover {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: max-content;
	max-width: 100%;
	padding: var(--spacing--4xs);
}

.tools-popover-header {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--4xs);
}

.tool-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.tool-icon {
	color: var(--color--primary);
}

.tool-name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
}
</style>
