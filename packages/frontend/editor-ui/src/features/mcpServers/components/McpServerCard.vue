<script lang="ts" setup>
import type { McpServerSummaryDto } from '@n8n/api-types';
import { N8nBadge, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatNumber, formatPercent } from '../mcpServers.utils';

const props = defineProps<{ server: McpServerSummaryDto }>();
const emit = defineEmits<{ open: [server: McpServerSummaryDto] }>();

const i18n = useI18n();

const countChips = computed(() => {
	const chips: string[] = [];
	const { workflowToolCount, agentToolCount, skillCount } = props.server;
	if (workflowToolCount) {
		chips.push(
			i18n.baseText('mcpServers.card.workflows', {
				adjustToNumber: workflowToolCount,
				interpolate: { count: workflowToolCount },
			}),
		);
	}
	if (agentToolCount) {
		chips.push(
			i18n.baseText('mcpServers.card.agents', {
				adjustToNumber: agentToolCount,
				interpolate: { count: agentToolCount },
			}),
		);
	}
	if (skillCount) {
		chips.push(
			i18n.baseText('mcpServers.card.skills', {
				adjustToNumber: skillCount,
				interpolate: { count: skillCount },
			}),
		);
	}
	return chips;
});

const accessLabel = computed(() => {
	switch (props.server.accessMode) {
		case 'public':
			return i18n.baseText('mcpServers.access.mode.public');
		case 'apiKey':
			return i18n.baseText('mcpServers.card.access.apiKeys', {
				interpolate: { count: props.server.apiKeyCount },
			});
		default:
			return i18n.baseText('mcpServers.access.mode.oauth');
	}
});

const accessIcon = computed(() => {
	switch (props.server.accessMode) {
		case 'public':
			return 'globe' as const;
		case 'apiKey':
			return 'key-round' as const;
		default:
			return 'lock' as const;
	}
});

const footer = computed(() =>
	[
		i18n.baseText('mcpServers.card.callsThisWeek', {
			adjustToNumber: props.server.calls7d,
			interpolate: { count: formatNumber(props.server.calls7d) },
		}),
		i18n.baseText('mcpServers.card.errors', {
			interpolate: { rate: formatPercent(props.server.errorRate7d) },
		}),
		props.server.ownerName,
	]
		.filter(Boolean)
		.join(' · '),
);
</script>

<template>
	<N8nCard
		:class="$style.card"
		hoverable
		data-testid="mcp-server-card"
		data-attr="mcp-server-card"
		@click="emit('open', server)"
	>
		<div :class="$style.body">
			<div :class="$style.titleRow">
				<N8nIcon icon="mcp" :size="18" :class="$style.icon" />
				<N8nText bold size="large" :class="$style.name">{{ server.name }}</N8nText>
				<N8nBadge :variant="server.active ? 'success' : 'subtle'" size="small">
					{{
						i18n.baseText(server.active ? 'mcpServers.status.active' : 'mcpServers.status.inactive')
					}}
				</N8nBadge>
				<N8nBadge v-if="server.shareVisibility === 'public'" variant="info" size="small">
					{{ i18n.baseText('mcpServers.card.publicPage') }}
				</N8nBadge>
			</div>
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ server.description || i18n.baseText('mcpServers.card.noDescription') }}
			</N8nText>
			<div :class="$style.chips">
				<N8nBadge v-for="chip in countChips" :key="chip" variant="outline" size="small">
					{{ chip }}
				</N8nBadge>
				<N8nText v-if="countChips.length === 0" size="small" color="text-light">
					{{ i18n.baseText('mcpServers.card.empty') }}
				</N8nText>
				<span :class="$style.spacer" />
				<span :class="$style.access">
					<N8nIcon :icon="accessIcon" size="small" />
					<N8nText size="small" color="text-light">{{ accessLabel }}</N8nText>
				</span>
			</div>
			<N8nText size="xsmall" color="text-light" :class="$style.footer">{{ footer }}</N8nText>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
	height: 100%;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.icon {
	color: var(--text-color--subtle);
	flex-shrink: 0;
}

.name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	min-height: calc(2 * var(--line-height--md) * var(--font-size--sm));
}

.chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.spacer {
	flex: 1;
}

.access {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtle);
}

.footer {
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}
</style>
