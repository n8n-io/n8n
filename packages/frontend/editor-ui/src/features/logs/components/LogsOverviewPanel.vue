<script setup lang="ts">
import LogsOverviewRows from '@/features/logs/components/LogsOverviewRows.vue';
import LogsPanelHeader from '@/features/logs/components/LogsPanelHeader.vue';
import LogsViewExecutionSummary from '@/features/logs/components/LogsViewExecutionSummary.vue';
import { useClearExecutionButtonVisible } from '@/features/logs/composables/useClearExecutionButtonVisible';
import type { LatestNodeInfo, LogEntry } from '@/features/logs/logs.types';
import { getSubtreeTotalConsumedTokens, getTotalConsumedTokens } from '@/features/logs/logs.utils';
import { type IExecutionResponse } from '@/Interface';
import { getScrollbarWidth } from '@/utils/htmlUtils';
import { N8nButton, N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const {
	isOpen,
	isReadOnly,
	selected,
	isCompact,
	execution,
	entries,
	flatLogEntries,
	latestNodeInfo,
	isHeaderClickable,
} = defineProps<{
	isOpen: boolean;
	selected?: LogEntry;
	isReadOnly: boolean;
	isCompact: boolean;
	execution?: IExecutionResponse;
	entries: LogEntry[];
	flatLogEntries: LogEntry[];
	latestNodeInfo: Record<string, LatestNodeInfo>;
	isHeaderClickable: boolean;
}>();

const emit = defineEmits<{
	clickHeader: [];
	select: [LogEntry | undefined];
	clearExecutionData: [];
	openNdv: [LogEntry];
	toggleExpanded: [LogEntry];
}>();

defineSlots<{ actions: {} }>();

const locale = useI18n();
const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
const isEmpty = computed(() => flatLogEntries.length === 0 || execution === undefined);
const switchViewOptions = computed(() => [
	{ label: locale.baseText('logs.overview.header.switch.overview'), value: 'overview' as const },
	{ label: locale.baseText('logs.overview.header.switch.details'), value: 'details' as const },
]);
const hasStaticScrollbar = getScrollbarWidth() > 0;
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
const timeTook = computed(() =>
	execution?.startedAt && execution.stoppedAt
		? +new Date(execution.stoppedAt) - +new Date(execution.startedAt)
		: undefined,
);
const shouldShowTokenCountColumn = computed(
	() =>
		consumedTokens.value.totalTokens > 0 ||
		entries.some((entry) => getSubtreeTotalConsumedTokens(entry, true).totalTokens > 0),
);

function handleSwitchView(value: 'overview' | 'details') {
	emit('select', value === 'overview' ? undefined : flatLogEntries[0]);
}
</script>

<template>
	<div
		:class="[$style.container, hasStaticScrollbar ? $style.staticScrollBar : '']"
		data-test-id="logs-overview"
	>
		<LogsPanelHeader
			:title="locale.baseText('logs.overview.header.title')"
			data-test-id="logs-overview-header"
			:is-clickable="isHeaderClickable"
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
					:time-took="timeTook"
				/>
				<LogsOverviewRows
					:is-read-only="isReadOnly"
					:selected="selected"
					:is-compact="isCompact"
					:should-show-token-count-column="shouldShowTokenCountColumn"
					:latest-node-info="latestNodeInfo"
					:flat-log-entries="flatLogEntries"
					:can-open-ndv="true"
					@toggle-expanded="emit('toggleExpanded', $event)"
					@open-ndv="emit('openNdv', $event)"
					@select="emit('select', $event)"
				/>
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
@use '@/styles/variables' as vars;

.container {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
	background-color: var(--color--foreground--tint-2);
}

.clearButton {
	border: none;
	color: var(--color--text--tint-1);
	gap: var(--spacing--5xs);
}

.content {
	position: relative;
	flex-grow: 1;
	overflow: auto;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: stretch;
	padding-right: var(--spacing--5xs);

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
	padding: var(--spacing--2xs);
}

.switchViewButtons {
	position: absolute;
	z-index: 10; /* higher than log entry rows background */
	right: 0;
	top: 0;
	margin: var(--spacing--4xs) var(--spacing--2xs);
	visibility: hidden;
	opacity: 0;
	transition: opacity 0.3s vars.$ease-out-expo;

	.content:hover & {
		visibility: visible;
		opacity: 1;
	}
}
</style>
