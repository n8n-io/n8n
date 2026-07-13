<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import {
	N8nButton,
	N8nIcon,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nText,
} from '@n8n/design-system';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getClientBrand, scopeLabelKeySuffix } from '@/features/ai/mcpAccess/clients.utils';

const PREVIEW_COUNT = 3;

const props = defineProps<{
	clients: OAuthClientResponseDto[];
	/** Instance-wide client count shown on the "All connected clients" row. */
	totalCount: number;
}>();

const emit = defineEmits<{
	openDetails: [client: OAuthClientResponseDto];
	revoke: [client: OAuthClientResponseDto];
	viewAll: [];
}>();

const i18n = useI18n();

const previewClients = computed(() => props.clients.slice(0, PREVIEW_COUNT));

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

/** "IDE · connected by Jan Ostrówka" — the segments before the activity time. */
function metaPrefix(client: OAuthClientResponseDto): string {
	const parts: string[] = [];
	const type = getClientBrand(client.name).type;
	if (type) {
		parts.push(i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey));
	}
	const owner = client.owner;
	const ownerName = owner
		? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email
		: null;
	parts.push(
		ownerName
			? i18n.baseText('settings.mcp.connectedClients.preview.connectedBy', {
					interpolate: { name: ownerName },
				})
			: i18n.baseText('settings.mcp.connectedClients.preview.connectedByYou'),
	);
	return parts.join(' · ');
}
</script>

<template>
	<div :class="$style.container">
		<template v-if="previewClients.length > 0">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="client in previewClients"
					:key="client.id + (client.owner?.id ?? '')"
					show-visual
					clickable
					reveal-actions-on-hover
					:aria-label="
						i18n.baseText('settings.mcp.connectedClients.preview.ariaLabel', {
							interpolate: { name: client.name },
						})
					"
					data-test-id="mcp-client-preview-row"
					@click="emit('openDetails', client)"
				>
					<template #visual>
						<component
							:is="getClientBrand(client.name).icon"
							v-if="getClientBrand(client.name).icon"
						/>
						<N8nIcon v-else icon="mcp" />
					</template>
					<template #info>
						<div :class="$style.info">
							<N8nText bold size="medium" color="text-dark" :class="$style.line">
								{{ client.name }}
							</N8nText>
							<N8nText size="small" color="text-light" :class="$style.line">
								{{ metaPrefix(client) }} ·
								{{ i18n.baseText('settings.mcp.connectedClients.preview.active') }}
								<TimeAgo :date="new Date(client.lastActiveAt ?? client.grantedAt).toISOString()" />
							</N8nText>
							<span :class="$style.access" data-test-id="mcp-client-preview-access">
								{{ accessSummary(client) }}
							</span>
						</div>
					</template>
					<template #action>
						<N8nButton
							variant="outline"
							size="medium"
							:label="i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess')"
							data-test-id="mcp-client-preview-revoke"
							@click.stop="emit('revoke', client)"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>

			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.mcp.connectedClients.viewAll.title')"
					:description="
						i18n.baseText('settings.mcp.connectedClients.viewAll.description', {
							adjustToNumber: totalCount,
							interpolate: { count: String(totalCount) },
						})
					"
					clickable
					data-test-id="mcp-clients-view-all-row"
					@click="emit('viewAll')"
				>
					<template #action>
						<N8nSettingsRowConfigure
							:value="i18n.baseText('settings.mcp.connectedClients.viewAll.action')"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</template>

		<div v-else :class="$style.empty" data-test-id="mcp-clients-preview-empty">
			<N8nIcon icon="plug-zap" size="large" color="text-light" />
			<N8nText bold size="medium" color="text-dark">
				{{ i18n.baseText('settings.mcp.connectedClients.empty.title') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.mcp.connectedClients.empty.description') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.line {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Muted single-line grant summary; the whole row opens the details modal. */
.access {
	display: block;
	max-width: 100%;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xl);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
}
</style>
