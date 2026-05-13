<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useCredentialsStore } from '../../credentials.store';
import type {
	CredentialExecutionSummary,
	CredentialExecutionsResponse,
} from '../../credentials.api';
import {
	getCallerLabel,
	getSingleNodeHeadline,
} from '@/features/execution/executions/executions.utils';

type Props = {
	credentialId: string;
};

const props = defineProps<Props>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();

const rows = ref<CredentialExecutionSummary[]>([]);
const total = ref(0);
const succeeded = ref(0);
const failed = ref(0);
const loadingInitial = ref(false);
const loadingMore = ref(false);
const errorMessage = ref<string | null>(null);
// `hasMore` is conservative: we ask for one more row than we display, and if
// the server returns a full page we assume another page exists. Avoids an
// extra count query and matches the existing executions list behaviour.
const hasMore = ref(false);

const PAGE_SIZE = 20;

const summaryLine = computed(() =>
	i18n.baseText('credentialEdit.executions.summary', {
		interpolate: {
			total: total.value.toString(),
			succeeded: succeeded.value.toString(),
			failed: failed.value.toString(),
		},
	}),
);

const lastId = computed(() => {
	const last = rows.value[rows.value.length - 1];
	return last?.id;
});

async function loadPage(options: { append: boolean }) {
	errorMessage.value = null;
	if (options.append) {
		loadingMore.value = true;
	} else {
		loadingInitial.value = true;
	}
	try {
		const response: CredentialExecutionsResponse = await credentialsStore.fetchCredentialExecutions(
			props.credentialId,
			{ limit: PAGE_SIZE, lastId: options.append ? lastId.value : undefined },
		);
		if (options.append) {
			rows.value = rows.value.concat(response.results);
		} else {
			rows.value = response.results;
			total.value = response.total;
			succeeded.value = response.succeeded;
			failed.value = response.failed;
		}
		hasMore.value = response.results.length === PAGE_SIZE;
	} catch (error) {
		errorMessage.value = i18n.baseText('credentialEdit.executions.error');
	} finally {
		loadingInitial.value = false;
		loadingMore.value = false;
	}
}

function formatDuration(row: CredentialExecutionSummary): string {
	if (!row.startedAt || !row.stoppedAt) return '—';
	const startedMs = new Date(row.startedAt).getTime();
	const stoppedMs = new Date(row.stoppedAt).getTime();
	if (!Number.isFinite(startedMs) || !Number.isFinite(stoppedMs)) return '—';
	const ms = Math.max(0, stoppedMs - startedMs);
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.round(ms / 1000)}s`;
}

function statusIcon(status: string | undefined): {
	name: 'circle-check' | 'circle-x' | 'loader-circle' | 'circle-dot';
	color: string;
} {
	if (status === 'success') return { name: 'circle-check', color: 'var(--color--success)' };
	if (status === 'error' || status === 'crashed') {
		return { name: 'circle-x', color: 'var(--color--danger)' };
	}
	if (status === 'running' || status === 'new') {
		return { name: 'loader-circle', color: 'var(--color--text--tint-2)' };
	}
	return { name: 'circle-dot', color: 'var(--color--text--tint-2)' };
}

function executionUrl(row: CredentialExecutionSummary): string {
	return `/workflow/${encodeURIComponent(row.workflowId)}/executions/${encodeURIComponent(row.id)}`;
}

onMounted(() => {
	void loadPage({ append: false });
});
</script>

<template>
	<div :class="$style.container">
		<div v-if="loadingInitial" :class="$style.state" data-test-id="credential-executions-loading">
			<N8nText :compact="true">{{
				i18n.baseText('credentialEdit.executions.loadingMore')
			}}</N8nText>
		</div>

		<div v-else-if="errorMessage" :class="$style.state" data-test-id="credential-executions-error">
			<N8nText :compact="true">{{ errorMessage }}</N8nText>
			<N8nButton
				type="tertiary"
				size="small"
				:label="i18n.baseText('credentialEdit.executions.loadMore')"
				@click="loadPage({ append: false })"
			/>
		</div>

		<div
			v-else-if="rows.length === 0"
			:class="$style.empty"
			data-test-id="credential-executions-empty"
		>
			<N8nText :compact="true" :bold="true">
				{{ i18n.baseText('credentialEdit.executions.empty.title') }}
			</N8nText>
			<N8nText :compact="true">
				{{ i18n.baseText('credentialEdit.executions.empty.description') }}
			</N8nText>
		</div>

		<template v-else>
			<div :class="$style.summary" data-test-id="credential-executions-summary">
				<N8nText :compact="true">{{ summaryLine }}</N8nText>
			</div>

			<table :class="$style.table" data-test-id="credential-executions-table">
				<thead>
					<tr>
						<th :class="$style.statusCell"></th>
						<th>{{ i18n.baseText('credentialEdit.executions.column.action') }}</th>
						<th>{{ i18n.baseText('credentialEdit.executions.column.caller') }}</th>
						<th>{{ i18n.baseText('credentialEdit.executions.column.when') }}</th>
						<th :class="$style.durationCell">
							{{ i18n.baseText('credentialEdit.executions.column.duration') }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="row in rows"
						:key="row.id"
						:class="$style.row"
						data-test-id="credential-executions-row"
					>
						<td :class="$style.statusCell">
							<N8nIcon
								:icon="statusIcon(row.status).name"
								:style="{ color: statusIcon(row.status).color }"
								size="small"
							/>
						</td>
						<td>
							<a :href="executionUrl(row)" rel="noopener" :class="$style.actionLink">
								{{ getSingleNodeHeadline(row, row.id) }}
							</a>
						</td>
						<td>{{ getCallerLabel(row.caller, i18n) }}</td>
						<td>
							<TimeAgo v-if="row.startedAt" :date="String(row.startedAt)" />
							<span v-else>—</span>
						</td>
						<td :class="$style.durationCell">{{ formatDuration(row) }}</td>
					</tr>
				</tbody>
			</table>

			<div v-if="hasMore" :class="$style.footer">
				<N8nButton
					type="tertiary"
					size="small"
					:loading="loadingMore"
					:label="
						loadingMore
							? i18n.baseText('credentialEdit.executions.loadingMore')
							: i18n.baseText('credentialEdit.executions.loadMore')
					"
					data-test-id="credential-executions-load-more"
					@click="loadPage({ append: true })"
				/>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.state {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl) 0;
	align-items: center;
}

.empty {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xl) 0;
	align-items: center;
	text-align: center;
}

.summary {
	color: var(--color--text--tint-1);
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);

	th,
	td {
		text-align: left;
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: 1px solid var(--color--background--shade-1);
	}

	th {
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
	}
}

.statusCell {
	width: 24px;
	text-align: center;
}

.durationCell {
	width: 80px;
	text-align: right;
	color: var(--color--text--tint-1);
}

.row:hover {
	background: var(--color--background--shade-1);
}

.actionLink {
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.footer {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--sm);
}
</style>
