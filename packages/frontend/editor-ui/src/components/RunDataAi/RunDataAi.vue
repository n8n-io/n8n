<script lang="ts" setup>
import LogsOverviewRows from '@/features/logs/components/LogsOverviewRows.vue';
import { useLogsExecutionData } from '@/features/logs/composables/useLogsExecutionData';
import { useLogsTreeExpand } from '@/features/logs/composables/useLogsTreeExpand';
import type { LogEntry, LogTreeFilter } from '@/features/logs/logs.types';
import { findLogEntryById } from '@/features/logs/logs.utils';
import type { INodeUi } from '@/Interface';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, shallowRef, watch } from 'vue';
import RunDataAiContent from './RunDataAiContent.vue';

export interface Props {
	node: INodeUi;
	runIndex?: number;
}

const { node, runIndex = 0 } = defineProps<Props>();

const i18n = useI18n();

const filter = computed<LogTreeFilter>(() => ({
	rootNodeId: node.id,
	rootNodeRunIndex: runIndex,
}));
const { entries, execution, latestNodeNameById, loadSubExecution } = useLogsExecutionData({
	filter,
});
const { flatLogEntries, toggleExpanded } = useLogsTreeExpand(entries, loadSubExecution);
const selected = shallowRef<LogEntry>();

function select(entry: LogEntry | undefined) {
	selected.value = entry?.node.id === node.id ? undefined : entry;
}

watch(
	entries,
	(latestEntries) => {
		if (!selected.value || findLogEntryById(selected.value.id, latestEntries) === undefined) {
			selected.value = latestEntries[0]?.children[0];
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.container">
		<template v-if="flatLogEntries.length > 0">
			<LogsOverviewRows
				:class="$style.tree"
				is-compact
				is-read-only
				:flat-log-entries="flatLogEntries"
				:should-show-token-count-column="false"
				:latest-node-info="latestNodeNameById"
				:selected="selected"
				:can-open-ndv="false"
				:execution="execution"
				@toggle-expanded="toggleExpanded"
				@select="select"
			/>
			<div :class="$style.runData">
				<RunDataAiContent v-if="selected" :input-data="selected" />
				<div v-else :class="$style.empty">
					<N8nText size="large">
						{{ i18n.baseText('ndv.output.ai.empty', { interpolate: { node: node.name } }) }}
					</N8nText>
				</div>
			</div>
		</template>
		<div v-else :class="$style.noData">
			{{ i18n.baseText('ndv.output.ai.waiting') }}
		</div>
	</div>
</template>

<style lang="scss" module>
.noData {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	color: var(--color--text--tint-1);
}

.empty {
	padding: var(--spacing--lg);
}

.tree {
	flex-shrink: 0;
	flex-grow: 0;
	width: 30%;
	min-width: 180px;
}

.runData {
	width: 100%;
	height: 100%;
	overflow: auto;
}

.container {
	height: 100%;
	padding: 0 var(--spacing--xs);
	display: flex;
	gap: var(--spacing--xs);
}
</style>
