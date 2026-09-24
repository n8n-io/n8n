<script setup lang="ts">
import { computed } from 'vue';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nSettingsRow, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { getAccessSummary, getClientBrand } from '@/features/ai/mcpAccess/clients.utils';

/**
 * One of the current user's connected clients, previewed inline on the MCP
 * settings overview. The row opens the client's details; the hover-revealed
 * action starts the revoke flow.
 */
const props = defineProps<{
	client: OAuthClientResponseDto;
	/** Tool names each scope unlocks on this instance; decides when a grant reads as "Full access". */
	scopeTools?: Record<string, string[]>;
}>();

const emit = defineEmits<{
	click: [];
	revoke: [];
}>();

const i18n = useI18n();

const brand = computed(() => getClientBrand(props.client.name));

const typeLabel = computed(() => {
	const type = brand.value.type;
	if (!type) return null;
	return i18n.baseText(`settings.mcp.oAuthClients.clientType.${type}` as BaseTextKey);
});

const offeredScopes = computed(() =>
	props.scopeTools ? Object.keys(props.scopeTools) : undefined,
);

const accessSummary = computed(() => getAccessSummary(i18n, props.client, offeredScopes.value));

const grantedAt = computed(() => new Date(props.client.grantedAt).toISOString());

const revokeLabel = computed(() =>
	i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccessFor', {
		interpolate: { name: props.client.name },
	}),
);
</script>

<template>
	<N8nSettingsRow
		:title="client.name"
		show-visual
		clickable
		reveal-actions-on-hover
		data-test-id="mcp-client-preview-row"
		@click="emit('click')"
	>
		<template #visual>
			<span :class="$style.tile">
				<component :is="brand.icon" v-if="brand.icon" :class="$style.icon" />
				<N8nIcon v-else icon="mcp" :class="$style.icon" />
			</span>
		</template>
		<template #info>
			<div :class="$style.info">
				<N8nText
					bold
					size="medium"
					color="text-dark"
					:class="$style.line"
					data-test-id="mcp-client-preview-name"
				>
					{{ client.name }}
				</N8nText>
				<N8nText size="small" color="text-light" :class="$style.line">
					<template v-if="typeLabel">{{ typeLabel }} · </template>
					{{ i18n.baseText('settings.mcp.connectedClients.preview.connected') }}
					<TimeAgo :date="grantedAt" />
				</N8nText>
				<N8nText
					size="xsmall"
					color="text-light"
					:class="$style.line"
					data-test-id="mcp-client-preview-access"
				>
					{{ accessSummary }}
				</N8nText>
			</div>
		</template>
		<template #action>
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('settings.mcp.oAuthClients.table.action.revokeAccess')"
				:aria-label="revokeLabel"
				data-test-id="mcp-client-preview-revoke-button"
				@click="emit('revoke')"
			/>
		</template>
	</N8nSettingsRow>
</template>

<style lang="scss" module>
/* Fills the row's bordered visual box. Fixed white so dark brand marks stay visible on the dark theme. */
.tile {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background-color: var(--color--neutral-white);
}

.icon {
	width: var(--spacing--md);
	height: var(--spacing--md);
	/* the tile is always white, so the fallback MCP glyph must stay dark in both themes */
	color: var(--color--neutral-black);
}

/* Mirrors the row's own title/description stack so the extra access line slots in beneath them. */
.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.line {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
