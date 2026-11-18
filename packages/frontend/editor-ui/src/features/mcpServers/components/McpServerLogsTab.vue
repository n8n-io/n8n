<script lang="ts" setup>
import type { McpServerCallDto, McpServerCallListDto, McpServerCallStatus } from '@n8n/api-types';
import { mcpServerCallStatusSchema } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nIconButton,
	N8nLoading,
	N8nOption,
	N8nSelect,
	N8nStatusDot,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { listMcpServerCalls } from '../mcpServers.api';
import {
	CALL_STATUS_BADGE_VARIANTS,
	CALL_STATUS_LABEL_KEYS,
	formatDuration,
	formatTime,
	toPrettyJson,
} from '../mcpServers.utils';

const ALL = '__all__';
const PAGE_SIZE = 200;

const props = defineProps<{
	serverId: string;
	/** Changes when a call is recorded. The tab then reloads. */
	liveTick: number;
	/** Opens the tab on the calls of one session. */
	initialSession?: string | null;
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const rootStore = useRootStore();

const data = ref<McpServerCallListDto | null>(null);
const loading = ref(true);
const tool = ref(ALL);
const caller = ref(ALL);
const status = ref(ALL);
const emit = defineEmits<{ 'session-change': [sessionId: string | null] }>();

const session = ref<string | null>(props.initialSession ?? null);
// The parent keeps the filter, so it is the same when the tab opens again.
watch(session, (value) => emit('session-change', value));
const selectedId = ref<string | null>(null);

const statuses = mcpServerCallStatusSchema.options;

const selected = computed<McpServerCallDto | null>(
	() => data.value?.items.find((call) => call.id === selectedId.value) ?? null,
);

/** One session reads as a timeline: the first call is at the top. */
const rows = computed(() => {
	const items = data.value?.items ?? [];
	return session.value ? [...items].reverse() : items;
});

function isStatus(value: string): value is McpServerCallStatus {
	return (statuses as string[]).includes(value);
}

async function load() {
	try {
		data.value = await listMcpServerCalls(rootStore.restApiContext, props.serverId, {
			tool: tool.value === ALL ? undefined : tool.value,
			caller: caller.value === ALL ? undefined : caller.value,
			status: isStatus(status.value) ? status.value : undefined,
			session: session.value ?? undefined,
			limit: PAGE_SIZE,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.logs.loadError'));
	} finally {
		loading.value = false;
	}
}

watch([tool, caller, status, session], () => void load());
watch(
	() => props.liveTick,
	() => void load(),
);
onMounted(() => void load());

function displayName(call: McpServerCallDto) {
	return call.kind === 'resource' ? `resources/read ${call.name}` : call.name;
}

function executionHref(call: McpServerCallDto) {
	if (!call.workflowId || !call.executionId) return undefined;
	return router.resolve(`/workflow/${call.workflowId}/executions/${call.executionId}`).href;
}

function openExecution(call: McpServerCallDto) {
	const href = executionHref(call);
	if (href) window.open(href, '_blank', 'noopener');
}
</script>

<template>
	<div :class="$style.logs" data-testid="mcp-server-logs-tab">
		<div :class="$style.filters">
			<N8nSelect
				v-model="tool"
				size="small"
				:class="$style.filter"
				data-testid="mcp-server-logs-tool"
			>
				<N8nOption :value="ALL" :label="i18n.baseText('mcpServers.logs.filter.allTools')" />
				<N8nOption v-for="name in data?.tools ?? []" :key="name" :value="name" :label="name" />
			</N8nSelect>
			<N8nSelect
				v-model="caller"
				size="small"
				:class="$style.filter"
				data-testid="mcp-server-logs-caller"
			>
				<N8nOption :value="ALL" :label="i18n.baseText('mcpServers.logs.filter.allCallers')" />
				<N8nOption v-for="name in data?.callers ?? []" :key="name" :value="name" :label="name" />
			</N8nSelect>
			<N8nSelect
				v-model="status"
				size="small"
				:class="$style.filter"
				data-testid="mcp-server-logs-status"
			>
				<N8nOption :value="ALL" :label="i18n.baseText('mcpServers.logs.filter.allStatuses')" />
				<N8nOption
					v-for="value in statuses"
					:key="value"
					:value="value"
					:label="i18n.baseText(CALL_STATUS_LABEL_KEYS[value])"
				/>
			</N8nSelect>
			<N8nButton
				v-if="session"
				variant="outline"
				size="small"
				icon="x"
				data-testid="mcp-server-logs-clear-session"
				@click="session = null"
			>
				{{ i18n.baseText('mcpServers.logs.filter.oneSession') }}
			</N8nButton>
			<span :class="$style.spacer" />
			<span :class="$style.live">
				<N8nStatusDot variant="success" pulse />
				<N8nText size="small" color="text-light">{{
					i18n.baseText('mcpServers.logs.live')
				}}</N8nText>
			</span>
		</div>

		<div :class="[$style.body, { [$style.withDetails]: selected }]">
			<div :class="$style.tableWrap">
				<N8nLoading v-if="loading" :rows="6" />
				<N8nText v-else-if="!data?.items.length" color="text-light" :class="$style.empty">
					{{ i18n.baseText('mcpServers.logs.empty') }}
				</N8nText>
				<table v-else :class="$style.table">
					<thead>
						<tr>
							<th>{{ i18n.baseText('mcpServers.logs.column.status') }}</th>
							<th>{{ i18n.baseText('mcpServers.logs.column.tool') }}</th>
							<th>{{ i18n.baseText('mcpServers.logs.column.intent') }}</th>
							<th>{{ i18n.baseText('mcpServers.logs.column.caller') }}</th>
							<th>{{ i18n.baseText('mcpServers.logs.column.client') }}</th>
							<th>{{ i18n.baseText('mcpServers.logs.column.duration') }}</th>
							<th>{{ i18n.baseText('mcpServers.logs.column.time') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="call in rows"
							:key="call.id"
							:class="{ [$style.selectedRow]: call.id === selectedId }"
							data-testid="mcp-server-logs-row"
							@click="selectedId = call.id === selectedId ? null : call.id"
						>
							<td>
								<N8nBadge :variant="CALL_STATUS_BADGE_VARIANTS[call.status]" size="xsmall">
									{{ i18n.baseText(CALL_STATUS_LABEL_KEYS[call.status]) }}
								</N8nBadge>
							</td>
							<td :class="$style.mono">{{ displayName(call) }}</td>
							<td :class="$style.intent" :title="call.intent ?? undefined">
								{{ call.intent ?? '–' }}
							</td>
							<td>{{ call.caller }}</td>
							<td>{{ call.clientName ?? '–' }}</td>
							<td>{{ formatDuration(call.durationMs) }}</td>
							<td :class="$style.time" :title="new Date(call.createdAt).toLocaleString()">
								{{ formatTime(call.createdAt) }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<aside v-if="selected" :class="$style.details" data-testid="mcp-server-logs-details">
				<div :class="$style.detailsHeader">
					<N8nHeading tag="h4" size="small" bold :class="$style.mono">
						{{ displayName(selected) }}
					</N8nHeading>
					<N8nBadge :variant="CALL_STATUS_BADGE_VARIANTS[selected.status]" size="xsmall">
						{{ i18n.baseText(CALL_STATUS_LABEL_KEYS[selected.status]) }}
					</N8nBadge>
					<span :class="$style.spacer" />
					<N8nIconButton
						icon="x"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('generic.close')"
						@click="selectedId = null"
					/>
				</div>
				<N8nText size="small" color="text-light">
					{{ selected.caller }} · {{ selected.clientName ?? '–' }} ·
					{{ new Date(selected.createdAt).toLocaleString() }} ·
					{{ formatDuration(selected.durationMs) }}
				</N8nText>
				<N8nButton
					v-if="selected.sessionId && !session"
					variant="outline"
					size="small"
					data-testid="mcp-server-logs-show-session"
					@click="session = selected.sessionId"
				>
					{{ i18n.baseText('mcpServers.logs.showSession') }}
				</N8nButton>
				<div v-if="selected.intent" :class="$style.block">
					<N8nText size="small" bold>{{ i18n.baseText('mcpServers.logs.column.intent') }}</N8nText>
					<N8nText size="small">{{ selected.intent }}</N8nText>
				</div>
				<N8nButton
					v-if="executionHref(selected)"
					variant="outline"
					size="small"
					icon="external-link"
					data-testid="mcp-server-logs-open-execution"
					@click="openExecution(selected)"
				>
					{{ i18n.baseText('mcpServers.logs.openExecution') }}
				</N8nButton>
				<div v-if="selected.error" :class="$style.block">
					<N8nText size="small" bold>{{ i18n.baseText('mcpServers.logs.error') }}</N8nText>
					<pre :class="[$style.json, $style.errorText]">{{ selected.error }}</pre>
				</div>
				<div :class="$style.block">
					<N8nText size="small" bold>{{ i18n.baseText('mcpServers.logs.input') }}</N8nText>
					<pre :class="$style.json">{{ toPrettyJson(selected.input) || '–' }}</pre>
				</div>
				<div :class="$style.block">
					<N8nText size="small" bold>{{ i18n.baseText('mcpServers.logs.output') }}</N8nText>
					<pre :class="$style.json">{{ toPrettyJson(selected.output) || '–' }}</pre>
				</div>
			</aside>
		</div>
	</div>
</template>

<style lang="scss" module>
.logs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.filter {
	width: 180px;
}

.spacer {
	flex: 1;
}

.live {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.body {
	display: grid;
	grid-template-columns: 1fr;
	gap: var(--spacing--sm);
	align-items: start;
}

.withDetails {
	grid-template-columns: minmax(0, 1fr) minmax(280px, 40%);
}

.tableWrap {
	min-width: 0;
	overflow-x: auto;
}

.empty {
	display: block;
	padding: var(--spacing--xl);
	text-align: center;
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--2xs);

	th {
		text-align: left;
		font-weight: var(--font-weight--medium);
		color: var(--text-color--subtle);
		padding: var(--spacing--3xs) var(--spacing--xs);
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

		&:hover {
			background: var(--background--hover);
		}
	}
}

.selectedRow {
	background: var(--background--active);
}

.mono {
	font-family: var(--font-family--monospace);
}

.time {
	color: var(--text-color--subtle);
}

.intent {
	max-width: 280px;
	overflow: hidden;
	text-overflow: ellipsis;
}

.details {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	position: sticky;
	top: 0;
}

.detailsHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
}

.json {
	margin: 0;
	padding: var(--spacing--2xs);
	max-height: 280px;
	overflow: auto;
	border-radius: var(--radius);
	background: var(--background--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	white-space: pre-wrap;
	word-break: break-word;
}

.errorText {
	color: var(--text-color--danger);
}
</style>
