<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import type { DateValue } from '@internationalized/date';
import { N8nHeading, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, toRef } from 'vue';
import { useScheduleData } from '../composables/useScheduleData';
import type { ScheduleHeatmapCell, ScheduleTriggerRow } from '../lib/types';

const props = defineProps<{
	startDate?: DateValue;
	endDate?: DateValue;
	projectId?: string;
}>();

const i18n = useI18n();
const { overview, rows, heatmapCells, forecastWindow, isLoading, error } = useScheduleData({
	startDate: toRef(props, 'startDate'),
	endDate: toRef(props, 'endDate'),
	projectId: toRef(props, 'projectId'),
});

const DISPLAY_TIME_ZONE = 'UTC';

type ScheduleTableRow = ScheduleTriggerRow & {
	showWorkflow: boolean;
	workflowRowSpan: number;
};

const cards = computed(() => [
	{
		id: 'trackedWorkflows',
		label: i18n.baseText('insights.schedule.card.workflows'),
		value: overview.value.trackedWorkflows,
		hint: i18n.baseText('insights.schedule.card.workflows.hint'),
	},
	{
		id: 'scheduledActivations',
		label: i18n.baseText('insights.schedule.card.activations'),
		value: overview.value.scheduledActivations,
		hint: i18n.baseText('insights.schedule.card.activations.hint'),
	},
	{
		id: 'busiestSlotActivations',
		label: i18n.baseText('insights.schedule.card.peakSlot'),
		value: overview.value.busiestSlotActivations,
		hint: i18n.baseText('insights.schedule.card.peakSlot.hint'),
	},
]);

const formatForecastWindowLabel = computed(() => {
	if (!forecastWindow.value) {
		return '--';
	}

	const start = new Date(forecastWindow.value.start);
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: DISPLAY_TIME_ZONE,
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});

	return `${formatter.format(start)}, 00:00 - 24:00`;
});

const shouldShowHourMarker = (slotStart: string) => new Date(slotStart).getUTCMinutes() === 0;

const formatHourMarker = (slotStart: string) => {
	const date = new Date(slotStart);
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: DISPLAY_TIME_ZONE,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(date);
};

const formatTimeLabel = (value: string | null) => {
	if (!value) {
		return '--';
	}

	return new Intl.DateTimeFormat('en-GB', {
		timeZone: DISPLAY_TIME_ZONE,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(value));
};

const getWorkflowStatusLabel = (active: boolean) =>
	active
		? i18n.baseText('insights.schedule.table.active')
		: i18n.baseText('insights.schedule.table.inactive');

const getTriggerStatusLabel = (active: boolean) =>
	active
		? i18n.baseText('insights.schedule.table.enabled')
		: i18n.baseText('insights.schedule.table.disabled');

const getSlotTitle = (cell: ScheduleHeatmapCell) => {
	const slotStart = formatTimeLabel(cell.slotStart);
	const slotEnd = formatTimeLabel(cell.slotEnd);
	const slotTriggers = cell.triggers ?? [];
	if (cell.triggerCount === 0 || slotTriggers.length === 0) {
		return `${slotStart} - ${slotEnd}: 0`;
	}

	const triggerPreview = slotTriggers
		.slice(0, 3)
		.map((trigger) => `${trigger.workflowName} / ${trigger.triggerName}`)
		.join(', ');

	return `${slotStart} - ${slotEnd}: ${cell.activationCount} (${triggerPreview})`;
};

const hasRows = computed(() => rows.value.length > 0);

const tableRows = computed<ScheduleTableRow[]>(() => {
	const workflowCounts = rows.value.reduce<Map<string, number>>((accumulator, row) => {
		accumulator.set(row.workflowId, (accumulator.get(row.workflowId) ?? 0) + 1);
		return accumulator;
	}, new Map());

	let previousWorkflowId: string | null = null;

	return rows.value.map((row) => {
		const showWorkflow = row.workflowId !== previousWorkflowId;
		previousWorkflowId = row.workflowId;

		return {
			...row,
			showWorkflow,
			workflowRowSpan: showWorkflow ? (workflowCounts.get(row.workflowId) ?? 1) : 0,
		};
	});
});

const getWorkflowLink = (workflowId: string) => ({
	name: VIEWS.WORKFLOW,
	params: { name: workflowId },
});

const getWorkflowPath = (workflowId: string) => `/workflow/${workflowId}`;

const getRowKey = (row: ScheduleTriggerRow) => row.triggerId;
</script>

<template>
	<section :class="$style.panel" data-test-id="schedule-control-panel">
		<div :class="$style.header">
			<div>
				<N8nHeading bold tag="h3" size="large">
					{{ i18n.baseText('insights.schedule.title') }}
				</N8nHeading>
				<p :class="$style.description">
					{{ i18n.baseText('insights.schedule.description') }}
				</p>
			</div>
			<div :class="$style.rangeBadge">
				<small>{{ i18n.baseText('insights.schedule.forecastRangeLabel') }}</small>
				<strong>{{ formatForecastWindowLabel }}</strong>
				<span>{{ i18n.baseText('insights.schedule.forecastSlotSize') }}</span>
			</div>
		</div>

		<div :class="$style.cards">
			<article v-for="card in cards" :key="card.id" :class="$style.card">
				<small>{{ card.label }}</small>
				<strong>{{ card.value.toLocaleString('en-US') }}</strong>
				<p>{{ card.hint }}</p>
			</article>
		</div>

		<div :class="$style.contentSections">
			<div :class="$style.timelineSection">
				<div :class="$style.sectionHeading">
					<div>
						<N8nHeading bold tag="h4" size="medium">
							{{ i18n.baseText('insights.schedule.heatmap.title') }}
						</N8nHeading>
						<p :class="$style.sectionDescription">
							{{ i18n.baseText('insights.schedule.heatmap.description') }}
						</p>
					</div>
					<div v-if="isLoading" :class="$style.inlineStatus">
						<N8nSpinner />
						<span>{{ i18n.baseText('insights.schedule.loading') }}</span>
					</div>
				</div>

				<p v-if="error" :class="$style.errorBanner">{{ error }}</p>

				<div :class="$style.timelineWrapper">
					<div :class="$style.timelineHeader">
						<div
							v-for="cell in heatmapCells"
							:key="`hour-${cell.slotStart}`"
							:class="[
								$style.timelineHourCell,
								shouldShowHourMarker(cell.slotStart) ? $style.hourBoundary : '',
							]"
						>
							<span v-if="shouldShowHourMarker(cell.slotStart)" :class="$style.timelineHourLabel">
								{{ formatHourMarker(cell.slotStart) }}
							</span>
						</div>
					</div>

					<div :class="$style.timelineRow">
						<div
							v-for="cell in heatmapCells"
							:key="cell.slotStart"
							:class="[
								$style.timelineSlot,
								cell.activationCount > 0 ? $style.timelineSlotActive : '',
								shouldShowHourMarker(cell.slotStart) ? $style.hourBoundary : '',
							]"
							:title="getSlotTitle(cell)"
						>
							<span>{{ cell.activationCount > 0 ? cell.activationCount : '' }}</span>
						</div>
					</div>
				</div>
			</div>

			<div :class="$style.tableSection">
				<div :class="$style.sectionHeading">
					<div>
						<N8nHeading bold tag="h4" size="medium">
							{{ i18n.baseText('insights.schedule.table.title') }}
						</N8nHeading>
						<p :class="$style.sectionDescription">
							{{ i18n.baseText('insights.schedule.table.description') }}
						</p>
					</div>
				</div>

				<div v-if="hasRows" :class="$style.tableWrapper">
					<table>
						<thead>
							<tr>
								<th>{{ i18n.baseText('insights.schedule.table.workflow') }}</th>
								<th :class="$style.statusColumn">
									{{ i18n.baseText('insights.schedule.table.workflowStatus') }}
								</th>
								<th>{{ i18n.baseText('insights.schedule.table.trigger') }}</th>
								<th :class="$style.statusColumn">
									{{ i18n.baseText('insights.schedule.table.triggerStatus') }}
								</th>
								<th>{{ i18n.baseText('insights.schedule.table.logic') }}</th>
								<th>{{ i18n.baseText('insights.schedule.table.startTime') }}</th>
								<th>{{ i18n.baseText('insights.schedule.table.activationsInWindow') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in tableRows"
								:key="getRowKey(row)"
								:class="row.showWorkflow ? $style.workflowGroupStart : ''"
							>
								<td v-if="row.showWorkflow" :rowspan="row.workflowRowSpan">
									<div :class="$style.workflowCell">
										<RouterLink :to="getWorkflowLink(row.workflowId)" :class="$style.workflowLink">
											{{ row.workflowName }}
										</RouterLink>
										<small :class="$style.workflowPath">{{
											getWorkflowPath(row.workflowId)
										}}</small>
									</div>
								</td>
								<td
									v-if="row.showWorkflow"
									:rowspan="row.workflowRowSpan"
									:class="$style.statusColumn"
								>
									<span
										:class="[
											$style.statusBadge,
											row.workflowActive ? $style.activeBadge : $style.inactiveBadge,
										]"
									>
										{{ getWorkflowStatusLabel(row.workflowActive) }}
									</span>
								</td>
								<td>{{ row.triggerName }}</td>
								<td :class="$style.statusColumn">
									<span
										:class="[
											$style.statusBadge,
											row.triggerActive ? $style.enabledBadge : $style.disabledBadge,
										]"
									>
										{{ getTriggerStatusLabel(row.triggerActive) }}
									</span>
								</td>
								<td>{{ row.triggerLogic }}</td>
								<td>{{ formatTimeLabel(row.startTime) }}</td>
								<td>{{ row.activationsInRange.toLocaleString('en-US') }}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p v-else-if="isLoading" :class="$style.tableState">
					{{ i18n.baseText('insights.schedule.table.loading') }}
				</p>
				<p v-else :class="$style.tableState">
					{{ i18n.baseText('insights.schedule.table.empty') }}
				</p>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	--schedule-slot--width: 18px;

	padding: var(--spacing--lg);
	display: grid;
	gap: var(--spacing--lg);
	background: var(--color--background--light-3);
	border-bottom-left-radius: 6px;
	border-bottom-right-radius: 6px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--lg);
	flex-wrap: wrap;
}

.description {
	margin: var(--spacing--2xs) 0 0;
	max-width: 720px;
	color: var(--color--text--tint-1);
	line-height: 1.5;
}

.rangeBadge {
	min-width: 240px;
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);
	display: grid;
	gap: var(--spacing--4xs);

	small,
	span {
		color: var(--color--text--tint-1);
		font-size: var(--font-size--2xs);
	}

	strong {
		color: var(--color--text-base);
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		line-height: 1.4;
	}
}

.cards,
.contentSections {
	display: grid;
	gap: var(--spacing--lg);
}

.cards {
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: var(--spacing--md);
}

.card {
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);

	small {
		display: block;
		margin-bottom: var(--spacing--2xs);
		color: var(--color--text--tint-1);
		font-size: var(--font-size--2xs);
	}

	strong {
		display: block;
		margin-bottom: var(--spacing--xs);
		color: var(--color--text-base);
		font-size: 28px;
		line-height: 1.1;
	}

	p {
		margin: 0;
		color: var(--color--text--tint-1);
		line-height: 1.5;
	}
}

.timelineSection,
.tableSection {
	display: grid;
	gap: var(--spacing--sm);
}

.sectionHeading {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--md);
	flex-wrap: wrap;
}

.sectionDescription {
	margin: var(--spacing--4xs) 0 0;
	color: var(--color--text--tint-1);
	line-height: 1.5;
}

.inlineStatus {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.errorBanner,
.tableState {
	margin: 0;
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);
	color: var(--color--text--tint-1);
	line-height: 1.5;
}

.errorBanner {
	color: var(--color--danger);
}

.timelineWrapper,
.tableWrapper {
	overflow-x: auto;
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);
	-webkit-overflow-scrolling: touch;
}

.timelineWrapper {
	padding: var(--spacing--sm);
}

.timelineHeader,
.timelineRow {
	display: grid;
	grid-auto-flow: column;
	grid-auto-columns: var(--schedule-slot--width);
	min-width: max-content;
}

.timelineHeader {
	min-height: 28px;
	margin-bottom: var(--spacing--2xs);
	align-items: end;
}

.timelineHourCell {
	position: relative;
	min-height: 28px;
}

.timelineHourLabel {
	position: absolute;
	left: 2px;
	bottom: 0;
	font-size: 11px;
	line-height: 1;
	color: var(--color--text--tint-1);
	white-space: nowrap;
	transform: translateX(-2px);
	background: var(--color--background-xlight);
	padding-right: var(--spacing--3xs);
	pointer-events: none;
}

.timelineSlot {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--schedule-slot--width);
	height: 34px;
	border-radius: 4px;
	background: var(--color--foreground-xlight);
	color: var(--color--text--tint-1);
	font-size: 10px;
	line-height: 1;
	box-shadow: inset -1px 0 0 rgba(17, 24, 39, 0.06);
}

.timelineSlotActive {
	background: rgba(81, 114, 255, 0.12);
	color: var(--color--text-base);
	font-weight: var(--font-weight--bold);
}

.hourBoundary {
	box-shadow: inset 1px 0 0 rgba(17, 24, 39, 0.12);
}

.tableWrapper {
	table {
		width: 100%;
		min-width: 980px;
		border-collapse: collapse;
	}

	thead {
		background: var(--color--background-base);
	}

	th,
	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		text-align: left;
		vertical-align: top;
	}

	th {
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
		white-space: nowrap;
		border-bottom: var(--border-width) var(--border-style) var(--color--foreground-base);
	}

	td {
		color: var(--color--text-base);
		line-height: 1.35;
		border-bottom: 0;
	}

	tbody tr:first-child td {
		border-top: 0;
	}
}

.workflowGroupStart td {
	border-top: var(--border-width) solid rgba(17, 24, 39, 0.18);
}

.statusColumn {
	width: 1%;
	min-width: 110px;
	white-space: nowrap;
}

.workflowCell {
	display: grid;
	gap: 1px;
	min-width: 220px;
}

.workflowLink {
	color: var(--color--text-base);
	font-weight: var(--font-weight--bold);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.workflowPath {
	color: var(--color--text--tint-1);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.statusBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 1px 7px;
	border-radius: 999px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
}

.activeBadge {
	background: rgba(49, 196, 159, 0.12);
	color: var(--color--success);
}

.inactiveBadge {
	background: var(--color--foreground-xlight);
	color: var(--color--text--tint-1);
}

.enabledBadge {
	background: rgba(49, 196, 159, 0.12);
	color: var(--color--success);
}

.disabledBadge {
	background: var(--color--foreground-xlight);
	color: var(--color--text--tint-1);
}

@media (max-width: 1024px) {
	.panel {
		--schedule-slot--width: 16px;
		padding: var(--spacing--md);
	}

	.rangeBadge {
		min-width: 0;
		width: 100%;
	}

	.tableWrapper {
		th,
		td {
			padding: var(--spacing--xs) var(--spacing--sm);
		}
	}
}

@media (max-width: 768px) {
	.panel {
		--schedule-slot--width: 14px;
	}

	.cards {
		grid-template-columns: 1fr;
	}

	.timelineWrapper {
		padding: var(--spacing--xs);
	}

	.timelineSlot {
		height: 28px;
		font-size: 9px;
	}

	.card {
		padding: var(--spacing--sm);

		strong {
			font-size: 24px;
		}
	}
}
</style>
