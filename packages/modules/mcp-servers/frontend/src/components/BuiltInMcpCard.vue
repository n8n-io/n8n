<script setup lang="ts">
import { N8nBadge, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { MCP_SETTINGS_ROUTE } from '../mcp-servers.constants';

// A card pinned first in the list, so that builders do not confuse the instance MCP with a
// custom server. It opens the settings page of the instance MCP.
const i18n = useI18n();
const router = useRouter();

function openSettings() {
	void router.push({ name: MCP_SETTINGS_ROUTE });
}
</script>

<template>
	<div
		:class="$style.card"
		role="link"
		tabindex="0"
		data-test-id="builtin-mcp-card"
		@click="openSettings"
		@keydown.enter="openSettings"
	>
		<div :class="$style.header">
			<N8nText tag="h2" bold :class="$style.name">
				{{ i18n.baseText('mcpServers.builtIn.name') }}
			</N8nText>
			<N8nBadge variant="outline" size="small">
				{{ i18n.baseText('mcpServers.builtIn.badge') }}
			</N8nBadge>
		</div>
		<N8nText size="small" color="text-light" :class="$style.description">
			{{ i18n.baseText('mcpServers.builtIn.description') }}
		</N8nText>
		<div :class="$style.footer">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('mcpServers.builtIn.managed') }}
			</N8nText>
			<N8nLink size="small" theme="text" @click.stop="openSettings">
				{{ i18n.baseText('mcpServers.builtIn.link') }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	height: 100%;
	box-sizing: border-box;
	padding: var(--spacing--sm);
	border: var(--border-width) dashed var(--border-color--strong);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		border-color: var(--border-color--stronger);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.name {
	font-size: var(--font-size--sm);
}

.description {
	flex: 1;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}
</style>
