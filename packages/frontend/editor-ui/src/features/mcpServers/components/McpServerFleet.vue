<script lang="ts" setup>
import type { McpServerHealth, McpServerSummaryDto } from '@n8n/api-types';
import { N8nBadge, N8nText } from '@n8n/design-system';
import type { BadgeVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { formatNumber, formatPercent } from '../mcpServers.utils';

/** The health of all servers in one list. The server that needs the most attention is first. */
const props = defineProps<{ servers: McpServerSummaryDto[] }>();

const emit = defineEmits<{ open: [server: McpServerSummaryDto] }>();

const i18n = useI18n();

const HEALTH_ORDER: McpServerHealth[] = ['failing', 'attention', 'healthy', 'idle'];
const HEALTH_VARIANTS: Record<McpServerHealth, BadgeVariant> = {
	failing: 'danger',
	attention: 'warning',
	healthy: 'success',
	idle: 'subtle',
};
const HEALTH_LABEL_KEYS: Record<McpServerHealth, BaseTextKey> = {
	failing: 'mcpServers.fleet.health.failing',
	attention: 'mcpServers.fleet.health.attention',
	healthy: 'mcpServers.fleet.health.healthy',
	idle: 'mcpServers.fleet.health.idle',
};

const rows = computed(() =>
	[...props.servers].sort(
		(a, b) =>
			HEALTH_ORDER.indexOf(a.health) - HEALTH_ORDER.indexOf(b.health) ||
			b.errorRate7d - a.errorRate7d ||
			b.calls7d - a.calls7d,
	),
);

const sum = (pick: (server: McpServerSummaryDto) => number) =>
	props.servers.reduce((total, server) => total + pick(server), 0);

const tiles = computed(() => {
	const calls = sum((server) => server.calls7d);
	const sessions = sum((server) => server.sessions7d);
	return [
		{
			label: i18n.baseText('mcpServers.fleet.needAttention'),
			value: formatNumber(
				props.servers.filter(
					(server) => server.health === 'failing' || server.health === 'attention',
				).length,
			),
		},
		{ label: i18n.baseText('mcpServers.analytics.calls'), value: formatNumber(calls) },
		{
			label: i18n.baseText('mcpServers.analytics.errorRate'),
			// Each server counts by its number of calls.
			value: formatPercent(
				calls ? sum((server) => server.errorRate7d * server.calls7d) / calls : 0,
			),
		},
		{
			label: i18n.baseText('mcpServers.analytics.deadEnds'),
			value: formatPercent(sessions ? sum((server) => server.deadEnds7d) / sessions : 0),
		},
		{
			label: i18n.baseText('mcpServers.analytics.missingCapabilities'),
			value: formatNumber(sum((server) => server.missingTools7d)),
		},
	];
});
</script>

<template>
	<div :class="$style.fleet" data-testid="mcp-servers-fleet">
		<N8nText size="small" color="text-light">{{ i18n.baseText('mcpServers.fleet.hint') }}</N8nText>
		<div :class="$style.tiles">
			<div v-for="tile in tiles" :key="tile.label" :class="$style.tile">
				<N8nText size="small" color="text-light">{{ tile.label }}</N8nText>
				<span :class="$style.tileValue">{{ tile.value }}</span>
			</div>
		</div>
		<div :class="$style.tableWrap">
			<table :class="$style.table">
				<thead>
					<tr>
						<th>{{ i18n.baseText('mcpServers.fleet.column.server') }}</th>
						<th>{{ i18n.baseText('mcpServers.fleet.column.health') }}</th>
						<th>{{ i18n.baseText('mcpServers.analytics.calls') }}</th>
						<th>{{ i18n.baseText('mcpServers.analytics.errorRate') }}</th>
						<th>{{ i18n.baseText('mcpServers.fleet.column.deadEnds') }}</th>
						<th>{{ i18n.baseText('mcpServers.analytics.missingCapabilities') }}</th>
						<th>{{ i18n.baseText('mcpServers.fleet.column.worstTool') }}</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="server in rows"
						:key="server.id"
						tabindex="0"
						data-testid="mcp-servers-fleet-row"
						@click="emit('open', server)"
						@keydown.enter="emit('open', server)"
					>
						<td>
							{{ server.name }}
							<N8nBadge v-if="!server.active" variant="outline" size="xsmall">
								{{ i18n.baseText('mcpServers.status.inactive') }}
							</N8nBadge>
						</td>
						<td>
							<N8nBadge :variant="HEALTH_VARIANTS[server.health]" size="xsmall">
								{{ i18n.baseText(HEALTH_LABEL_KEYS[server.health]) }}
							</N8nBadge>
						</td>
						<td :class="$style.number">{{ formatNumber(server.calls7d) }}</td>
						<td :class="$style.number">{{ formatPercent(server.errorRate7d) }}</td>
						<td :class="$style.number">
							{{ formatNumber(server.deadEnds7d) }} / {{ formatNumber(server.sessions7d) }}
						</td>
						<td :class="$style.number">{{ formatNumber(server.missingTools7d) }}</td>
						<td :class="$style.mono">{{ server.worstTool ?? '–' }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style lang="scss" module>
.fleet {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.tiles {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: var(--spacing--xs);
}

.tile {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.tileValue {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
}

.tableWrap {
	min-width: 0;
	overflow-x: auto;
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--2xs);

	th {
		text-align: left;
		font-weight: var(--font-weight--medium);
		color: var(--text-color--subtle);
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: var(--border);
		white-space: nowrap;
	}

	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: var(--border);
		white-space: nowrap;
	}

	tbody tr {
		cursor: pointer;

		&:hover,
		&:focus-visible {
			background: var(--background--hover);
		}

		&:last-child td {
			border-bottom: none;
		}
	}
}

.number {
	font-variant-numeric: tabular-nums;
}

.mono {
	font-family: var(--font-family--monospace);
}
</style>
