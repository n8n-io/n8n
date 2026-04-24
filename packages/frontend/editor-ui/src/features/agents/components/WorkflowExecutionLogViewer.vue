<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants/navigation';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';

interface NodeRow {
	name: string;
	executionTime?: number;
	status: 'success' | 'error';
}

const props = defineProps<{
	workflowId: string;
	workflowExecutionId: string;
}>();

const router = useRouter();
const executionsStore = useExecutionsStore();
const i18n = useI18n();

const loading = ref(true);
const errorMessage = ref<string | null>(null);
const status = ref<string | null>(null);
const rows = ref<NodeRow[]>([]);

const statusBanner = computed((): string => {
	if (status.value === 'running' || status.value === 'new')
		return i18n.baseText('agentSessions.workflowLog.stillRunning');
	if (status.value === 'waiting') return i18n.baseText('agentSessions.workflowLog.waiting');
	return '';
});

const fullExecutionHref = computed(
	(): string =>
		router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { name: props.workflowId, executionId: props.workflowExecutionId },
		}).href,
);

function rowsFromRunData(
	runData: Record<string, Array<{ executionTime?: number; error?: unknown }>> | undefined,
): NodeRow[] {
	if (!runData) return [];
	return Object.entries(runData).map(([name, runs]) => {
		const last = runs[runs.length - 1] ?? {};
		return {
			name,
			executionTime: last.executionTime,
			status: last.error !== undefined && last.error !== null ? 'error' : 'success',
		};
	});
}

onMounted(async () => {
	try {
		const execution = await executionsStore.fetchExecution(props.workflowExecutionId);
		if (!execution) {
			errorMessage.value = i18n.baseText('agentSessions.workflowLog.unavailable');
		} else {
			status.value = execution.status ?? null;
			rows.value = rowsFromRunData(execution.data?.resultData?.runData);
		}
	} catch {
		errorMessage.value = i18n.baseText('agentSessions.workflowLog.unavailable');
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<div :class="$style.root">
		<div v-if="loading" :class="$style.loading">
			{{ i18n.baseText('agentSessions.workflowLog.loading') }}
		</div>
		<template v-else-if="errorMessage">
			<div :class="$style.errorBanner">{{ errorMessage }}</div>
			<a
				:href="fullExecutionHref"
				target="_blank"
				rel="noopener"
				data-test-id="open-full-execution"
				:class="$style.openLink"
			>
				{{ i18n.baseText('agentSessions.workflowLog.openFull') }}
			</a>
		</template>
		<template v-else>
			<div v-if="statusBanner" :class="$style.banner">{{ statusBanner }}</div>
			<div :class="$style.nodeList">
				<div
					v-for="row in rows"
					:key="row.name"
					data-test-id="log-node-row"
					:data-node-status="row.status"
					:class="$style.nodeRow"
				>
					<span
						:class="[
							$style.statusDot,
							row.status === 'error' ? $style.statusError : $style.statusSuccess,
						]"
					/>
					<span :class="$style.nodeName">{{ row.name }}</span>
					<span v-if="row.executionTime != null" :class="$style.duration">
						{{ row.executionTime }}ms
					</span>
				</div>
			</div>
			<a
				:href="fullExecutionHref"
				target="_blank"
				rel="noopener"
				data-test-id="open-full-execution"
				:class="$style.openLink"
			>
				{{ i18n.baseText('agentSessions.workflowLog.openFull') }}
			</a>
		</template>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.loading {
	padding: var(--spacing--sm);
	color: var(--color--text--tint-1);
}
.banner {
	background-color: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
}
.errorBanner {
	background-color: var(--color--danger--tint-4);
	color: var(--color--danger);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
}
.nodeList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
.nodeRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-left: 2px solid var(--color--foreground);
	font-size: var(--font-size--2xs);
}
.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}
.statusSuccess {
	background-color: var(--color--success);
}
.statusError {
	background-color: var(--color--danger);
}
.nodeName {
	flex: 1;
	color: var(--color--text);
}
.duration {
	color: var(--color--text--tint-2);
	font-variant-numeric: tabular-nums;
}
.openLink {
	padding: var(--spacing--3xs) 0;
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	text-decoration: underline;
}
</style>
