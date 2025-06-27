<script setup lang="ts">
import LogsPanelHeader from '@/features/logs/components/LogsPanelHeader.vue';
import { useClearExecutionButtonVisible } from '@/features/logs/composables/useClearExecutionButtonVisible';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, nextTick, toRef, watch } from 'vue';
import LogsOverviewRow from '@/features/logs/components/LogsOverviewRow.vue';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useRouter } from 'vue-router';
import LogsViewExecutionSummary from '@/features/logs/components/LogsViewExecutionSummary.vue';
import {
	getSubtreeTotalConsumedTokens,
	getTotalConsumedTokens,
	hasSubExecution,
} from '@/features/logs/logs.utils';
import { useVirtualList } from '@vueuse/core';
import { type IExecutionResponse } from '@/Interface';
import type { LatestNodeInfo, LogEntry } from '@/features/logs/logs.types';

const {
	isOpen,
	isReadOnly,
	selected,
	isCompact,
	execution,
	entries,
	flatLogEntries,
	latestNodeInfo,
} = defineProps<{
	isOpen: boolean;
	selected?: LogEntry;
	isReadOnly: boolean;
	isCompact: boolean;
	execution?: IExecutionResponse;
	entries: LogEntry[];
	flatLogEntries: LogEntry[];
	latestNodeInfo: Record<string, LatestNodeInfo>;
}>();

const emit = defineEmits<{
	clickHeader: [];
	select: [LogEntry | undefined];
	clearExecutionData: [];
	openNdv: [LogEntry];
	toggleExpanded: [LogEntry];
	loadSubExecution: [LogEntry];
}>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const router = useRouter();
const runWorkflow = useRunWorkflow({ router });
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
const isEmpty = computed(() => flatLogEntries.length === 0 || execution === undefined);
const switchViewOptions = computed(() => [
	{ label: locale.baseText('logs.overview.header.switch.overview'), value: 'overview' as const },
	{ label: locale.baseText('logs.overview.header.switch.details'), value: 'details' as const },
]);
const consumedTokens = computed(() =>
	getTotalConsumedTokens(
		...entries.map((entry) =>
			getSubtreeTotalConsumedTokens(
				entry,
				false, // Exclude token usages from sub workflow which is loaded only after expanding the row
			),
		),
	),
);

const shouldShowTokenCountColumn = computed(
	() =>
		consumedTokens.value.totalTokens > 0 ||
		entries.some((entry) => getSubtreeTotalConsumedTokens(entry, true).totalTokens > 0),
);
const virtualList = useVirtualList(
	toRef(() => flatLogEntries),
	{ itemHeight: 32 },
);

function handleSwitchView(value: 'overview' | 'details') {
	emit('select', value === 'overview' ? undefined : flatLogEntries[0]);
}

function handleToggleExpanded(treeNode: LogEntry) {
	if (hasSubExecution(treeNode) && treeNode.children.length === 0) {
		emit('loadSubExecution', treeNode);
		return;
	}
	emit('toggleExpanded', treeNode);
}

async function handleTriggerPartialExecution(treeNode: LogEntry) {
	const latestName = latestNodeInfo[treeNode.node.id]?.name ?? treeNode.node.name;

	if (latestName) {
		await runWorkflow.runWorkflow({ destinationNode: latestName });
	}
}

// Scroll selected row into view
watch(
	() => selected,
	async (selection) => {
		if (selection && virtualList.list.value.every((e) => e.data.id !== selection.id)) {
			const index = flatLogEntries.findIndex((e) => e.id === selection?.id);

			if (index >= 0) {
				// Wait for the node to be added to the list, and then scroll
				await nextTick(() => virtualList.scrollTo(index));
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.container" data-test-id="logs-overview">
		<LogsPanelHeader
			:title="locale.baseText('logs.overview.header.title')"
			data-test-id="logs-overview-header"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip
					v-if="isClearExecutionButtonVisible"
					:content="locale.baseText('logs.overview.header.actions.clearExecution.tooltip')"
				>
					<N8nButton
						size="mini"
						type="secondary"
						icon="trash-2"
						icon-size="medium"
						data-test-id="clear-execution-data-button"
						:class="$style.clearButton"
						@click.stop="emit('clearExecutionData')"
						>{{ locale.baseText('logs.overview.header.actions.clearExecution') }}</N8nButton
					>
				</N8nTooltip>
				<slot name="actions" />
			</template>
		</LogsPanelHeader>
		<div
			v-if="isOpen"
			:class="[$style.content, isEmpty ? $style.empty : '']"
			data-test-id="logs-overview-body"
		>
			<N8nText
				v-if="isEmpty || execution === undefined"
				tag="p"
				size="medium"
				color="text-base"
				:class="$style.emptyText"
				data-test-id="logs-overview-empty"
			>
				{{ locale.baseText('logs.overview.body.empty.message') }}
			</N8nText>
			<template v-else>
				<LogsViewExecutionSummary
					data-test-id="logs-overview-status"
					:class="$style.summary"
					:status="execution.status"
					:consumed-tokens="consumedTokens"
					:start-time="+new Date(execution.startedAt)"
					:time-took="
						execution.startedAt && execution.stoppedAt
							? +new Date(execution.stoppedAt) - +new Date(execution.startedAt)
							: undefined
					"
				/>
				<div :class="$style.tree" v-bind="virtualList.containerProps">
					<div v-bind="virtualList.wrapperProps.value" role="tree">
						<LogsOverviewRow
							v-for="{ data, index } of virtualList.list.value"
							:key="index"
							:data="data"
							:is-read-only="isReadOnly"
							:is-selected="data.id === selected?.id"
							:is-compact="isCompact"
							:should-show-token-count-column="shouldShowTokenCountColumn"
							:latest-info="latestNodeInfo[data.node.id]"
							:expanded="virtualList.list.value[index + 1]?.data.parent?.id === data.id"
							:can-open-ndv="data.executionId === execution?.id"
							@toggle-expanded="handleToggleExpanded(data)"
							@open-ndv="emit('openNdv', data)"
							@trigger-partial-execution="handleTriggerPartialExecution(data)"
							@toggle-selected="emit('select', selected?.id === data.id ? undefined : data)"
						/>
					</div>
				</div>
				<N8nRadioButtons
					size="small-medium"
					:class="$style.switchViewButtons"
					:model-value="selected ? 'details' : 'overview'"
					:options="switchViewOptions"
					@update:model-value="handleSwitchView"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
	background-color: var(--color-foreground-xlight);
}

.clearButton {
	border: none;
	color: var(--color-text-light);
	gap: var(--spacing-5xs);
}

.content {
	position: relative;
	flex-grow: 1;
	overflow: auto;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: stretch;

	&.empty {
		align-items: center;
		justify-content: center;
	}
}

.emptyText {
	max-width: 20em;
	text-align: center;
}

.summary {
	padding: var(--spacing-2xs);
}

.tree {
	padding: 0 var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs);

	scroll-padding-block: var(--spacing-3xs);

	& :global(.el-icon) {
		display: none;
	}
}

.switchViewButtons {
	position: absolute;
	z-index: 10; /* higher than log entry rows background */
	right: 0;
	top: 0;
	margin: var(--spacing-4xs) var(--spacing-2xs);
	visibility: hidden;
	opacity: 0;
	transition: opacity 0.3s $ease-out-expo;

	.content:hover & {
		visibility: visible;
		opacity: 1;
	}
}
</style>
