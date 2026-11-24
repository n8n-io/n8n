<script setup lang="ts">
import type { McpServerResponse } from '@n8n/api-types';
import { N8nActionToggle, N8nCard, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

// The card shows no project label and no icon. Builders cannot choose an icon yet.
defineProps<{
	server: McpServerResponse;
}>();

const emit = defineEmits<{
	open: [];
	copyUrl: [];
}>();

const i18n = useI18n();

type CardAction = 'open' | 'copy-url';

const actions = computed<Array<{ value: CardAction; label: string }>>(() => [
	{ value: 'open', label: i18n.baseText('mcpServers.actions.open') },
	{ value: 'copy-url', label: i18n.baseText('mcpServers.actions.copyUrl') },
]);

function onAction(action: CardAction) {
	if (action === 'open') emit('open');
	if (action === 'copy-url') emit('copyUrl');
}
</script>

<template>
	<N8nCard :class="$style.card" data-test-id="mcp-server-card" @click="emit('open')">
		<template #header>
			<N8nText tag="h2" bold :class="$style.name" data-test-id="mcp-server-card-name">
				{{ server.name }}
			</N8nText>
			<div :class="$style.actions" @click.stop>
				<N8nActionToggle
					:actions="actions"
					:aria-label="i18n.baseText('mcpServers.server.menu')"
					placement="bottom-end"
					data-test-id="mcp-server-card-actions"
					@action="onAction"
				/>
			</div>
		</template>
		<N8nText size="small" color="text-light" :class="$style.description">
			{{ server.description || i18n.baseText('mcpServers.card.noDescription') }}
		</N8nText>
		<template #footer>
			<N8nText size="xsmall" color="text-light" :class="$style.updated">
				{{ i18n.baseText('mcpServers.card.updated') }}
				<N8nTimeAgo :date="server.updatedAt" />
			</N8nText>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--xs);
	height: 100%;
}

.name {
	min-width: 0;
	font-size: var(--font-size--sm);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	cursor: default;
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin-top: var(--spacing--2xs);
}

.updated {
	margin-top: var(--spacing--2xs);
}
</style>
