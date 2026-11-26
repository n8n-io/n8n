<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';
import type { Iso8601DateTimeString } from '@n8n/api-types';
import { N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
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
	const { saveDataSuccessExecution, saveDataErrorExecution } = workflowDocumentStore.value.settings;
	return (
		isSavingAll(saveDataSuccessExecution, settingsStore.saveDataSuccessExecution) &&
		isSavingAll(saveDataErrorExecution, settingsStore.saveDataErrorExecution)
	);
});

// Hovering repeatedly must not flood the server, and on Postgres the times only change after the statistics rollup.
const HOVER_REFRESH_INTERVAL = 30 * TIME.SECOND;

let lastLoadStartedAt = 0;
// Only the latest request can write the times, so an older response cannot overwrite newer data.
let loadSequence = 0;

async function loadLastExecutionTimes() {
	const sequence = ++loadSequence;
	const id = workflowId.value;
	if (!id || !workflowsStore.isWorkflowSaved[id]) return;

	lastLoadStartedAt = Date.now();

	try {
		const times = await getWorkflowStatisticsTimes(rootStore.restApiContext, id);
		if (sequence !== loadSequence) return;
		lastSucceededAt.value = times.productionSuccess;
		lastFailedAt.value = times.productionError;
	} catch {
		// The last execution times are extra context, so a failed request must not affect the sidebar.
	}
}

// The refresh runs only on hover or focus. If the first load fails or finds no production execution,
// the icon stays hidden until the workflow changes or the sidebar mounts again.
function onTriggerActivate() {
	if (Date.now() - lastLoadStartedAt < HOVER_REFRESH_INTERVAL) return;
	void loadLastExecutionTimes();
}

// Each source is compared on its own, so writes to the workflows cache do not trigger a reload.
watch(
	[() => workflowId.value, () => workflowsStore.isWorkflowSaved[workflowId.value] === true],
	async () => {
		lastSucceededAt.value = null;
		lastFailedAt.value = null;
		await loadLastExecutionTimes();
	},
	{ immediate: true },
);
</script>

<template>
	<N8nTooltip v-if="lastSucceededAt || lastFailedAt" placement="bottom" as-child>
		<template #content>
			<div data-test-id="last-production-execution-tooltip">
				<N8nText tag="div" size="small" :bold="true">
					{{ i18n.baseText('executionsList.lastProductionExecution.title') }}
				</N8nText>
				<N8nText
					v-if="lastSucceededAt"
					tag="div"
					size="small"
					data-test-id="last-production-success"
				>
					<I18nT keypath="executionsList.lastProductionExecution.row" scope="global">
						<template #status>
							<span :class="$style.succeeded">{{
								i18n.baseText('executionsList.lastProductionExecution.succeeded')
							}}</span>
						</template>
						<template #time>
							<TimeAgo :date="lastSucceededAt" />
						</template>
					</I18nT>
				</N8nText>
				<N8nText v-if="lastFailedAt" tag="div" size="small" data-test-id="last-production-error">
					<I18nT keypath="executionsList.lastProductionExecution.row" scope="global">
						<template #status>
							<span :class="$style.failed">{{
								i18n.baseText('executionsList.lastProductionExecution.failed')
							}}</span>
						</template>
						<template #time>
							<TimeAgo :date="lastFailedAt" />
						</template>
					</I18nT>
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
		<N8nIconButton
			variant="ghost"
			icon="clock"
			size="xsmall"
			icon-size="small"
			:aria-label="i18n.baseText('executionsList.lastProductionExecution.title')"
			data-test-id="last-production-execution-icon"
			@mouseenter="onTriggerActivate"
			@focus="onTriggerActivate"
		/>
	</N8nTooltip>
</template>

<style module lang="scss">
/* The tooltip surface is always black, so these colors do not follow the theme. */
.succeeded {
	color: var(--color--green-400);
}

.failed {
	color: var(--color--red-400);
}

.note {
	margin-top: var(--spacing--3xs);
	color: var(--color--neutral-400);
}
</style>
