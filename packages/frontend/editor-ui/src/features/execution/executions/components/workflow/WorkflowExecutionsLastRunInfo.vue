<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Iso8601DateTimeString } from '@n8n/api-types';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { WorkflowSettings } from 'n8n-workflow';
import { getWorkflowStatisticsTimes } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { TIME } from '@/app/constants/durations';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

const i18n = useI18n();
const workflowId = useInjectWorkflowId();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

// The statistics outlive pruned executions and also count executions that were never saved.
const lastSucceededAt = ref<Iso8601DateTimeString | null>(null);
const lastFailedAt = ref<Iso8601DateTimeString | null>(null);

function isSavingAll(
	value: WorkflowSettings.SaveDataExecution | undefined,
	instanceDefault: WorkflowSettings.SaveDataExecution,
) {
	return (value === undefined || value === 'DEFAULT' ? instanceDefault : value) === 'all';
}

const isSavingAllProductionExecutions = computed(() => {
	const { saveDataSuccessExecution, saveDataErrorExecution } =
		workflowDocumentStore?.value?.getSettingsSnapshot() ?? {};
	return (
		isSavingAll(saveDataSuccessExecution, settingsStore.saveDataSuccessExecution) &&
		isSavingAll(saveDataErrorExecution, settingsStore.saveDataErrorExecution)
	);
});

// Hovering repeatedly must not flood the server, and on Postgres the times only change after the statistics rollup.
const HOVER_REFRESH_INTERVAL = 30 * TIME.SECOND;

let lastLoadStartedAt = 0;

async function loadLastExecutionTimes() {
	const id = workflowId.value;
	if (!id || !workflowsStore.isWorkflowSaved[id]) return;

	lastLoadStartedAt = Date.now();

	try {
		const times = await getWorkflowStatisticsTimes(rootStore.restApiContext, id);
		if (id !== workflowId.value) return;
		lastSucceededAt.value = times.productionSuccess;
		lastFailedAt.value = times.productionError;
	} catch {
		// The last execution times are extra context, so a failed request must not affect the sidebar.
	}
}

function onIconHover() {
	if (Date.now() - lastLoadStartedAt < HOVER_REFRESH_INTERVAL) return;
	void loadLastExecutionTimes();
}

watch(
	() => [workflowId.value, workflowsStore.isWorkflowSaved[workflowId.value]],
	async () => {
		lastSucceededAt.value = null;
		lastFailedAt.value = null;
		await loadLastExecutionTimes();
	},
	{ immediate: true },
);
</script>

<template>
	<N8nTooltip v-if="lastSucceededAt || lastFailedAt" placement="bottom">
		<template #content>
			<div data-test-id="last-production-execution-tooltip">
				<N8nText tag="div" size="small" :bold="true">
					{{ i18n.baseText('executionsList.lastProductionExecution.title') }}
				</N8nText>
				<N8nText
					v-if="lastSucceededAt"
					tag="div"
					size="small"
					:class="$style.row"
					data-test-id="last-production-success"
				>
					<span :class="$style.succeeded">{{
						i18n.baseText('executionsList.lastProductionExecution.succeeded')
					}}</span>
					{{ ' ' }}
					<TimeAgo :date="lastSucceededAt" />
				</N8nText>
				<N8nText
					v-if="lastFailedAt"
					tag="div"
					size="small"
					:class="$style.row"
					data-test-id="last-production-error"
				>
					<span :class="$style.failed">{{
						i18n.baseText('executionsList.lastProductionExecution.failed')
					}}</span>
					{{ ' ' }}
					<TimeAgo :date="lastFailedAt" />
				</N8nText>
				<N8nText
					v-if="!isSavingAllProductionExecutions"
					tag="div"
					size="small"
					:class="$style.note"
					data-test-id="last-production-execution-note"
				>
					{{ i18n.baseText('executionsList.lastProductionExecution.notSavedNote') }}
				</N8nText>
			</div>
		</template>
		<N8nIcon
			icon="clock"
			size="small"
			color="text-light"
			:aria-label="i18n.baseText('executionsList.lastProductionExecution.title')"
			data-test-id="last-production-execution-icon"
			@mouseenter="onIconHover"
		/>
	</N8nTooltip>
</template>

<style module lang="scss">
.row {
	display: flex;
	gap: var(--spacing--4xs);
}

.succeeded {
	color: var(--color--success);
}

.failed {
	color: var(--color--danger);
}

.note {
	margin-top: var(--spacing--3xs);
	color: var(--color--text--tint-2);
}
</style>
