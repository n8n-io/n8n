<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { formatDateRange } from '@/features/execution/insights/insights.utils';
import type { DateValue } from '@internationalized/date';
import { onClickOutside, useLocalStorage } from '@vueuse/core';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nCheckbox,
	N8nIconButton,
	N8nInputNumber,
	N8nSpinner,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { useScheduleData } from '../composables/useScheduleData';
import type {
	ScheduleCustomTimeMode,
	ScheduleCustomWindowPreset,
	ScheduleDayPanel,
	ScheduleHeatmapCell,
	ScheduleHistoricalWorkflowRow,
	ScheduleRangeMode,
	ScheduleTriggerRow,
	ScheduleWorkflowTriggerStatus,
} from '../lib/types';

const props = defineProps<{
	startDate?: DateValue;
	endDate?: DateValue;
	projectId?: string;
}>();

const rootStore = useRootStore();
const UTC_TIME_ZONE = 'UTC';
const TIMELINE_LABEL_SLOT_INTERVAL = 8;
const TIMELINE_BAR_ZERO_HEIGHT = 5;
const TIMELINE_BAR_MIN_ACTIVE_HEIGHT = 10;
const TIMELINE_BAR_MAX_HEIGHT = 156;
const TIMELINE_BAR_COMPACT_HEIGHT = 12;
const TIMELINE_COMPACT_HEIGHT = 36;
const TIMELINE_AXIS_SEGMENTS = 4;
const DEFAULT_TIMELINE_MAX_DISPLAY_COUNT = 20;
const MIN_TIMELINE_MAX_DISPLAY_COUNT = 1;
const MAX_TIMELINE_MAX_DISPLAY_COUNT = 200;
const NOW_TICK_INTERVAL_MS = 30_000;
const TIMELINE_MAX_COUNT_STORAGE_KEY = 'n8n.insights.schedule.timelineMaxDisplayCount';
const DAY_CHART_DENSITY_STORAGE_KEY = 'n8n.insights.schedule.dayChartDensity';
const DAY_PANEL_DENSITY_OVERRIDES_STORAGE_KEY = 'n8n.insights.schedule.dayPanelDensityOverrides';
const SHOW_UNPUBLISHED_WORKFLOWS_STORAGE_KEY = 'n8n.insights.schedule.showUnpublishedWorkflows';
const SHOW_DISABLED_TRIGGERS_STORAGE_KEY = 'n8n.insights.schedule.showDisabledTriggers';
const SHOW_ZERO_HIT_ROWS_STORAGE_KEY = 'n8n.insights.schedule.showZeroHitRows';
const RANGE_MODE_STORAGE_KEY = 'n8n.insights.schedule.rangeMode';
const CUSTOM_WINDOW_PRESET_STORAGE_KEY = 'n8n.insights.schedule.customWindowPreset';
const CUSTOM_TIME_MODE_STORAGE_KEY = 'n8n.insights.schedule.customTimeMode';
const CUSTOM_TABLE_COLUMN_WIDTHS_STORAGE_KEY = 'n8n.insights.schedule.customTableColumnWidths';
const HISTORICAL_TABLE_COLUMN_WIDTHS_STORAGE_KEY =
	'n8n.insights.schedule.historicalTableColumnWidths';

type ScheduleDayChartDensity = 'manual' | 'expanded' | 'compact';
type ScheduleDayPanelDensityOverride = 'expanded' | 'compact';
type ScheduleCustomTableColumnId =
	| 'workflow'
	| 'workflowStatus'
	| 'trigger'
	| 'triggerStatus'
	| 'logic'
	| 'timezone'
	| 'hits';
type ScheduleHistoricalTableColumnId =
	| 'workflow'
	| 'workflowStatus'
	| 'triggerStatus'
	| 'firstStart'
	| 'lastStart'
	| 'starts';
type ScheduleTableKind = 'custom' | 'historical';

type ScheduleTableRow = ScheduleTriggerRow & {
	showWorkflow: boolean;
	workflowRowSpan: number;
};

type ScheduleTimelineBarTone = 'Idle' | 'Success' | 'Warning' | 'Alert' | 'Danger' | 'Overflow';

type ScheduleTimelineBar = ScheduleHeatmapCell & {
	barHeight: string;
	overflowLabel: string | null;
	tone: ScheduleTimelineBarTone;
};

type ScheduleTimelinePanel = ScheduleDayPanel & {
	timelineBars: ScheduleTimelineBar[];
	timeAxisLabels: Array<{ slotStart: string; span: number }>;
	isCompact: boolean;
	showAxis: boolean;
	chartStyle: Record<string, string>;
};

const CUSTOM_TABLE_COLUMN_DEFAULT_WIDTHS: Record<ScheduleCustomTableColumnId, number> = {
	workflow: 280,
	workflowStatus: 96,
	trigger: 180,
	triggerStatus: 96,
	logic: 220,
	timezone: 92,
	hits: 110,
};

const CUSTOM_TABLE_COLUMN_MIN_WIDTHS: Record<ScheduleCustomTableColumnId, number> = {
	workflow: 180,
	workflowStatus: 80,
	trigger: 120,
	triggerStatus: 80,
	logic: 150,
	timezone: 76,
	hits: 90,
};

const HISTORICAL_TABLE_COLUMN_DEFAULT_WIDTHS: Record<ScheduleHistoricalTableColumnId, number> = {
	workflow: 300,
	workflowStatus: 96,
	triggerStatus: 96,
	firstStart: 150,
	lastStart: 150,
	starts: 110,
};

const HISTORICAL_TABLE_COLUMN_MIN_WIDTHS: Record<ScheduleHistoricalTableColumnId, number> = {
	workflow: 200,
	workflowStatus: 80,
	triggerStatus: 80,
	firstStart: 130,
	lastStart: 130,
	starts: 90,
};

const i18n = useI18n();

const settingsRef = ref<HTMLElement | null>(null);
const isSettingsOpen = ref(false);
const resizeCleanup = ref<null | (() => void)>(null);
const now = ref(new Date());
const nowIntervalId = ref<number | null>(null);

onClickOutside(settingsRef, () => {
	isSettingsOpen.value = false;
});

onMounted(() => {
	now.value = new Date();
	nowIntervalId.value = window.setInterval(() => {
		now.value = new Date();
	}, NOW_TICK_INTERVAL_MS);
});

onBeforeUnmount(() => {
	resizeCleanup.value?.();
	if (nowIntervalId.value !== null) {
		window.clearInterval(nowIntervalId.value);
		nowIntervalId.value = null;
	}
});

const clampTimelineMaxDisplayCount = (value: unknown) => {
	const parsedValue =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim() !== ''
				? Number.parseInt(value, 10)
				: Number.NaN;

	if (!Number.isFinite(parsedValue)) {
		return DEFAULT_TIMELINE_MAX_DISPLAY_COUNT;
	}

	return Math.min(
		MAX_TIMELINE_MAX_DISPLAY_COUNT,
		Math.max(MIN_TIMELINE_MAX_DISPLAY_COUNT, Math.round(parsedValue)),
	);
};

const normalizeRangeMode = (value: unknown): ScheduleRangeMode =>
	value === 'n8n' ? 'n8n' : 'custom';

const normalizeCustomWindowPreset = (value: unknown): ScheduleCustomWindowPreset => {
	if (value === 'nextSevenDays' || value === 'todayPlusMinusThree') {
		return value;
	}

	return 'today';
};

const normalizeDayChartDensity = (value: unknown): ScheduleDayChartDensity => {
	if (value === 'expanded' || value === 'compact' || value === 'manual') {
		return value;
	}

	if (value === 'auto') {
		return 'manual';
	}

	return 'manual';
};

const normalizeDayPanelDensityOverrides = (value: unknown) => {
	if (typeof value !== 'object' || value === null) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).filter(
			([panelId, panelDensity]) =>
				typeof panelId === 'string' && (panelDensity === 'compact' || panelDensity === 'expanded'),
		),
	) as Record<string, ScheduleDayPanelDensityOverride>;
};

const normalizeCustomTimeMode = (value: unknown): ScheduleCustomTimeMode =>
	value === 'realTime' ? 'realTime' : 'calculated';

const normalizeColumnWidths = <ColumnId extends string>(
	value: unknown,
	defaultWidths: Record<ColumnId, number>,
	minWidths: Record<ColumnId, number>,
) => {
	const parsedWidths = typeof value === 'object' && value !== null ? value : {};

	return Object.fromEntries(
		Object.entries(defaultWidths).map(([columnId, defaultWidth]) => {
			const rawValue = (parsedWidths as Record<string, unknown>)[columnId];
			const parsedWidth = typeof rawValue === 'number' ? rawValue : Number.NaN;
			const normalizedWidth = Number.isFinite(parsedWidth)
				? Math.max(minWidths[columnId as ColumnId], Math.round(parsedWidth))
				: defaultWidth;

			return [columnId, normalizedWidth];
		}),
	) as Record<ColumnId, number>;
};

const storedTimelineMaxDisplayCount = useLocalStorage<number>(
	TIMELINE_MAX_COUNT_STORAGE_KEY,
	DEFAULT_TIMELINE_MAX_DISPLAY_COUNT,
);
const storedRangeMode = useLocalStorage<ScheduleRangeMode>(RANGE_MODE_STORAGE_KEY, 'custom');
const storedCustomWindowPreset = useLocalStorage<ScheduleCustomWindowPreset>(
	CUSTOM_WINDOW_PRESET_STORAGE_KEY,
	'today',
);
const storedCustomTimeMode = useLocalStorage<ScheduleCustomTimeMode>(
	CUSTOM_TIME_MODE_STORAGE_KEY,
	'calculated',
);
const storedDayChartDensity = useLocalStorage<ScheduleDayChartDensity>(
	DAY_CHART_DENSITY_STORAGE_KEY,
	'manual',
);
const storedDayPanelDensityOverrides = useLocalStorage<
	Record<string, ScheduleDayPanelDensityOverride>
>(DAY_PANEL_DENSITY_OVERRIDES_STORAGE_KEY, {});
const showUnpublishedWorkflows = useLocalStorage<boolean>(
	SHOW_UNPUBLISHED_WORKFLOWS_STORAGE_KEY,
	true,
);
const showDisabledTriggers = useLocalStorage<boolean>(SHOW_DISABLED_TRIGGERS_STORAGE_KEY, true);
const showZeroHitRows = useLocalStorage<boolean>(SHOW_ZERO_HIT_ROWS_STORAGE_KEY, true);
const storedCustomTableColumnWidths = useLocalStorage<Record<ScheduleCustomTableColumnId, number>>(
	CUSTOM_TABLE_COLUMN_WIDTHS_STORAGE_KEY,
	{ ...CUSTOM_TABLE_COLUMN_DEFAULT_WIDTHS },
);
const storedHistoricalTableColumnWidths = useLocalStorage<
	Record<ScheduleHistoricalTableColumnId, number>
>(HISTORICAL_TABLE_COLUMN_WIDTHS_STORAGE_KEY, { ...HISTORICAL_TABLE_COLUMN_DEFAULT_WIDTHS });

const timelineMaxDisplayCount = computed({
	get: () => clampTimelineMaxDisplayCount(storedTimelineMaxDisplayCount.value),
	set: (value: number) => {
		storedTimelineMaxDisplayCount.value = clampTimelineMaxDisplayCount(value);
	},
});

const rangeMode = computed<ScheduleRangeMode>({
	get: () => normalizeRangeMode(storedRangeMode.value),
	set: (value) => {
		storedRangeMode.value = normalizeRangeMode(value);
	},
});

const customWindowPreset = computed<ScheduleCustomWindowPreset>({
	get: () => normalizeCustomWindowPreset(storedCustomWindowPreset.value),
	set: (value) => {
		storedCustomWindowPreset.value = normalizeCustomWindowPreset(value);
	},
});

const customTimeMode = computed<ScheduleCustomTimeMode>({
	get: () => normalizeCustomTimeMode(storedCustomTimeMode.value),
	set: (value) => {
		storedCustomTimeMode.value = normalizeCustomTimeMode(value);
	},
});

const dayChartDensity = computed<ScheduleDayChartDensity>({
	get: () => normalizeDayChartDensity(storedDayChartDensity.value),
	set: (value) => {
		storedDayChartDensity.value = normalizeDayChartDensity(value);
	},
});

const dayPanelDensityOverrides = computed<Record<string, ScheduleDayPanelDensityOverride>>({
	get: () => normalizeDayPanelDensityOverrides(storedDayPanelDensityOverrides.value),
	set: (value) => {
		storedDayPanelDensityOverrides.value = normalizeDayPanelDensityOverrides(value);
	},
});

const customTableColumnWidths = computed<Record<ScheduleCustomTableColumnId, number>>({
	get: () =>
		normalizeColumnWidths(
			storedCustomTableColumnWidths.value,
			CUSTOM_TABLE_COLUMN_DEFAULT_WIDTHS,
			CUSTOM_TABLE_COLUMN_MIN_WIDTHS,
		),
	set: (value) => {
		storedCustomTableColumnWidths.value = normalizeColumnWidths(
			value,
			CUSTOM_TABLE_COLUMN_DEFAULT_WIDTHS,
			CUSTOM_TABLE_COLUMN_MIN_WIDTHS,
		);
	},
});

const historicalTableColumnWidths = computed<Record<ScheduleHistoricalTableColumnId, number>>({
	get: () =>
		normalizeColumnWidths(
			storedHistoricalTableColumnWidths.value,
			HISTORICAL_TABLE_COLUMN_DEFAULT_WIDTHS,
			HISTORICAL_TABLE_COLUMN_MIN_WIDTHS,
		),
	set: (value) => {
		storedHistoricalTableColumnWidths.value = normalizeColumnWidths(
			value,
			HISTORICAL_TABLE_COLUMN_DEFAULT_WIDTHS,
			HISTORICAL_TABLE_COLUMN_MIN_WIDTHS,
		);
	},
});

const {
	overview,
	rows,
	historicalRows,
	executionLoadState,
	heatmapCells,
	dayPanels,
	forecastWindow,
	isLoading,
	error,
} = useScheduleData({
	startDate: toRef(props, 'startDate'),
	endDate: toRef(props, 'endDate'),
	projectId: toRef(props, 'projectId'),
	rangeMode,
	customWindowPreset,
	customTimeMode,
});

const isCustomMode = computed(() => rangeMode.value === 'custom');
const isN8nMode = computed(() => rangeMode.value === 'n8n');
const isRealTimeCustomModeAvailable = computed(() => customWindowPreset.value !== 'nextSevenDays');
const effectiveCustomTimeMode = computed<ScheduleCustomTimeMode>(() =>
	isRealTimeCustomModeAvailable.value ? customTimeMode.value : 'calculated',
);
const isCustomRealTimeMode = computed(
	() => isCustomMode.value && effectiveCustomTimeMode.value === 'realTime',
);
const instanceTimeZone = computed(() => rootStore.timezone || UTC_TIME_ZONE);

const insightsRangeLabel = computed(
	() => formatDateRange({ start: props.startDate, end: props.endDate }) || '--',
);

const customWindowPresetOptions = computed<
	Array<{ id: ScheduleCustomWindowPreset; label: string; disabled: boolean }>
>(() => [
	{
		id: 'today',
		label: i18n.baseText('insights.schedule.mode.preset.today'),
		disabled: false,
	},
	{
		id: 'nextSevenDays',
		label: i18n.baseText('insights.schedule.mode.preset.nextSevenDays'),
		disabled: false,
	},
	{
		id: 'todayPlusMinusThree',
		label: i18n.baseText('insights.schedule.mode.preset.todayPlusMinusThree'),
		disabled: false,
	},
]);

const customTimeModeOptions = computed<
	Array<{ id: ScheduleCustomTimeMode; label: string; disabled: boolean }>
>(() => [
	{
		id: 'calculated',
		label: i18n.baseText('insights.schedule.mode.custom.timeMode.calculated'),
		disabled: false,
	},
	{
		id: 'realTime',
		label: i18n.baseText('insights.schedule.mode.custom.timeMode.realTime'),
		disabled: !isRealTimeCustomModeAvailable.value,
	},
]);

const dayChartDensityOptions = computed<Array<{ id: ScheduleDayChartDensity; label: string }>>(
	() => [
		{ id: 'manual', label: i18n.baseText('insights.schedule.settings.diagram.density.manual') },
		{ id: 'expanded', label: i18n.baseText('insights.schedule.settings.diagram.density.expanded') },
		{ id: 'compact', label: i18n.baseText('insights.schedule.settings.diagram.density.compact') },
	],
);

const timelineMaxDisplayCountLabel = computed(() =>
	timelineMaxDisplayCount.value.toLocaleString('en-US'),
);

const timelineMaxDisplayCountHint = computed(() =>
	i18n.baseText('insights.schedule.settings.diagram.maxOverlap.hint', {
		interpolate: { max: timelineMaxDisplayCountLabel.value },
	}),
);

const isCustomMultiDayWindow = computed(() => {
	if (!isCustomMode.value) {
		return false;
	}

	if (dayPanels.value.length > 1) {
		return true;
	}

	if (!forecastWindow.value) {
		return customWindowPreset.value !== 'today';
	}

	const start = new Date(forecastWindow.value.start).getTime();
	const end = new Date(forecastWindow.value.end).getTime();
	return end - start > 24 * 60 * 60 * 1000;
});

const getDateKeyForTimeZone = (date: Date, timeZone: string) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);

const getTimeZoneNamePart = (
	timeZone: string,
	value: string | null,
	timeZoneName: 'short' | 'shortOffset',
) => {
	const date = value ? new Date(value) : now.value;
	const part = new Intl.DateTimeFormat('en-US', {
		timeZone,
		timeZoneName,
	})
		.formatToParts(date)
		.find((item) => item.type === 'timeZoneName');

	return part?.value ?? timeZone;
};

const formatOffsetLabel = (rawLabel: string, includeUtcPrefix = true) => {
	const normalizedLabel = rawLabel.replace(/^GMT/, 'UTC');
	if (normalizedLabel === 'UTC') {
		return includeUtcPrefix ? 'UTC+0' : '+0';
	}

	const offsetMatch = normalizedLabel.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
	if (!offsetMatch) {
		return normalizedLabel;
	}

	const [, sign, rawHours, rawMinutes] = offsetMatch;
	const hours = Number.parseInt(rawHours, 10);
	const minutes = rawMinutes ? Number.parseInt(rawMinutes, 10) : 0;
	const prefix = includeUtcPrefix ? 'UTC' : '';

	if (minutes === 0) {
		return `${prefix}${sign}${hours}`;
	}

	return `${prefix}${sign}${hours}:${String(minutes).padStart(2, '0')}`;
};

const getTimeZoneDisplayLabel = (timeZone: string, referenceValue: string | null) => {
	const offsetLabel = formatOffsetLabel(
		getTimeZoneNamePart(timeZone, referenceValue, 'shortOffset'),
	);
	const shortLabel = formatOffsetLabel(getTimeZoneNamePart(timeZone, referenceValue, 'short'));
	const relativeOffsetLabel = formatOffsetLabel(
		getTimeZoneNamePart(timeZone, referenceValue, 'shortOffset'),
		false,
	);

	if (shortLabel === offsetLabel || shortLabel.startsWith('UTC')) {
		return offsetLabel;
	}

	return `${shortLabel} (${relativeOffsetLabel})`;
};

const serverTimeZoneMetaLabel = computed(
	() =>
		`${instanceTimeZone.value} • ${getTimeZoneDisplayLabel(instanceTimeZone.value, now.value.toISOString())}`,
);

const cards = computed(() => [
	{
		id: 'trackedWorkflows',
		label: i18n.baseText('insights.schedule.card.workflows'),
		valueLabel: overview.value.trackedWorkflows.toLocaleString('en-US'),
		hint: i18n.baseText('insights.schedule.card.workflows.hint'),
	},
	{
		id: 'scheduledActivations',
		label: i18n.baseText(
			isN8nMode.value
				? 'insights.schedule.card.activationsInRange'
				: isCustomRealTimeMode.value
					? 'insights.schedule.card.activationsRealtime'
					: isCustomMultiDayWindow.value
						? 'insights.schedule.card.activationsForecastRange'
						: 'insights.schedule.card.activations',
		),
		valueLabel: overview.value.scheduledActivations.toLocaleString('en-US'),
		hint: i18n.baseText(
			isN8nMode.value
				? 'insights.schedule.card.activationsInRange.hint'
				: isCustomRealTimeMode.value
					? 'insights.schedule.card.activationsRealtime.hint'
					: isCustomMultiDayWindow.value
						? 'insights.schedule.card.activationsForecastRange.hint'
						: 'insights.schedule.card.activations.hint',
		),
	},
	{
		id: 'busiestSlotActivations',
		label: i18n.baseText('insights.schedule.card.peakSlot'),
		valueLabel: overview.value.busiestSlotActivations.toLocaleString('en-US'),
		hint: i18n.baseText(
			isN8nMode.value
				? 'insights.schedule.card.peakSlot.historicalHint'
				: isCustomRealTimeMode.value
					? 'insights.schedule.card.peakSlot.realtimeHint'
					: isCustomMultiDayWindow.value
						? 'insights.schedule.card.peakSlot.forecastRangeHint'
						: 'insights.schedule.card.peakSlot.hint',
		),
	},
	{
		id: 'serverTime',
		label: i18n.baseText('insights.schedule.card.serverTime'),
		valueLabel: formatTimeLabel(now.value.toISOString(), instanceTimeZone.value),
		metaLabel: serverTimeZoneMetaLabel.value,
		hint: i18n.baseText('insights.schedule.card.serverTime.hint', {
			interpolate: {
				timezone: instanceTimeZone.value,
				time: formatTimeLabel(now.value.toISOString(), instanceTimeZone.value),
			},
		}),
	},
	{
		id: 'utcTime',
		label: i18n.baseText('insights.schedule.card.utcTime'),
		valueLabel: formatTimeLabel(now.value.toISOString(), UTC_TIME_ZONE),
		metaLabel: 'UTC+0',
		hint: i18n.baseText('insights.schedule.card.utcTime.hint'),
	},
]);

const formatForecastWindowLabel = computed(() => {
	if (!forecastWindow.value) {
		return '--';
	}

	const start = new Date(forecastWindow.value.start);
	const endExclusive = new Date(forecastWindow.value.end);
	const end = new Date(endExclusive.getTime() - 1);
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: instanceTimeZone.value,
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});

	if (
		getDateKeyForTimeZone(start, instanceTimeZone.value) ===
		getDateKeyForTimeZone(end, instanceTimeZone.value)
	) {
		return `${formatter.format(start)}, 00:00 - 24:00`;
	}

	return `${formatter.format(start)} - ${formatter.format(end)}`;
});

const forecastWindowInlineLabel = computed(
	() =>
		`${i18n.baseText(
			isCustomRealTimeMode.value
				? 'insights.schedule.displayRangeLabel'
				: 'insights.schedule.forecastRangeLabel',
		)} ${formatForecastWindowLabel.value}`,
);

const insightsRangeInlineLabel = computed(
	() => `${i18n.baseText('insights.schedule.mode.n8n.windowLabel')} ${insightsRangeLabel.value}`,
);

const executionPartialWarningLabel = computed(() => {
	if (!executionLoadState.value?.isPartial) {
		return null;
	}

	return i18n
		.baseText(
			isN8nMode.value
				? 'insights.schedule.mode.n8n.partialHistory'
				: 'insights.schedule.mode.custom.partialRealtime',
		)
		.replace('{{max}}', executionLoadState.value.maxExecutionCount.toLocaleString('en-US'));
});

const formatTimeLabel = (value: string | null, timeZone = instanceTimeZone.value) => {
	if (!value) {
		return '--';
	}

	return new Intl.DateTimeFormat('en-GB', {
		timeZone,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(value));
};

const formatHistoricalDateTimeLabel = (value: string | null, timeZone = instanceTimeZone.value) => {
	if (!value) {
		return '--';
	}

	return new Intl.DateTimeFormat('en-GB', {
		timeZone,
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(value));
};

const getCustomTriggerTimezoneLabel = (row: ScheduleTriggerRow) =>
	getTimeZoneDisplayLabel(
		row.effectiveTimezone,
		row.nextActivation ?? row.firstActivationInRange ?? row.lastActivationInRange,
	);

const compareNullableIsoValues = (left: string | null, right: string | null) => {
	if (left === right) {
		return 0;
	}

	if (left === null) {
		return 1;
	}

	if (right === null) {
		return -1;
	}

	return left.localeCompare(right);
};

const formatAxisLabel = (slotStart: string) =>
	new Intl.DateTimeFormat('en-GB', {
		timeZone: instanceTimeZone.value,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(slotStart));

const getWorkflowStatusLabel = (active: boolean) =>
	active
		? i18n.baseText('insights.schedule.table.active')
		: i18n.baseText('insights.schedule.table.inactive');

const getTriggerStatusLabel = (active: boolean) =>
	active
		? i18n.baseText('insights.schedule.table.enabled')
		: i18n.baseText('insights.schedule.table.disabled');

const getHistoricalTriggerStatusLabel = (status: ScheduleWorkflowTriggerStatus) => {
	if (status === 'mixed') {
		return i18n.baseText('insights.schedule.table.mixed');
	}

	return status === 'enabled'
		? i18n.baseText('insights.schedule.table.enabled')
		: i18n.baseText('insights.schedule.table.disabled');
};

const getSlotTitle = (cell: ScheduleHeatmapCell) => {
	const slotStart = formatTimeLabel(cell.slotStart);
	const slotEnd = formatTimeLabel(cell.slotEnd);
	if (cell.triggerCount === 0 || cell.triggers.length === 0) {
		return `${slotStart} - ${slotEnd}: 0`;
	}

	const triggerPreview = cell.triggers
		.slice(0, 3)
		.map((trigger) =>
			isN8nMode.value && trigger.triggerName === 'Historical actuals'
				? trigger.workflowName
				: `${trigger.workflowName} / ${trigger.triggerName}`,
		)
		.join(', ');

	return `${slotStart} - ${slotEnd}: ${cell.activationCount} (${triggerPreview})`;
};

const currentSlotStartIso = computed(() => {
	const slotMinutes = forecastWindow.value?.slotMinutes ?? 15;
	const slotDurationMs = slotMinutes * 60_000;
	return new Date(Math.floor(now.value.getTime() / slotDurationMs) * slotDurationMs).toISOString();
});

const isCurrentTimelineSlot = (slotStart: string, slotEnd: string) => {
	const currentTimeMs = now.value.getTime();
	return (
		currentTimeMs >= new Date(slotStart).getTime() && currentTimeMs < new Date(slotEnd).getTime()
	);
};

const hasRows = computed(() => rows.value.length > 0);
const hasHistoricalRows = computed(() => historicalRows.value.length > 0);
const hasHistoricalDayPanels = computed(() => dayPanels.value.length > 0);
const hasMultipleDayPanels = computed(() => dayPanels.value.length > 1);
const isRangeAwareCustomTable = computed(() => isCustomMode.value && hasMultipleDayPanels.value);

const filteredRows = computed(() => {
	return rows.value.filter((row) => {
		if (!showUnpublishedWorkflows.value && !row.workflowActive) {
			return false;
		}

		if (!showDisabledTriggers.value && !row.triggerActive) {
			return false;
		}

		if (!showZeroHitRows.value && row.activationsInRange === 0) {
			return false;
		}

		return true;
	});
});

const hasVisibleRows = computed(() => filteredRows.value.length > 0);

const filteredHistoricalRows = computed(() => {
	return historicalRows.value.filter((row) => {
		if (!showUnpublishedWorkflows.value && !row.workflowActive) {
			return false;
		}

		if (!showDisabledTriggers.value && row.triggerStatus === 'disabled') {
			return false;
		}

		if (!showZeroHitRows.value && row.startsInRange === 0) {
			return false;
		}

		return true;
	});
});

const hasVisibleHistoricalRows = computed(() => filteredHistoricalRows.value.length > 0);

const sortedCustomRows = computed(() => {
	if (!isRangeAwareCustomTable.value) {
		return filteredRows.value;
	}

	const workflowMetrics = filteredRows.value.reduce<
		Map<
			string,
			{
				workflowId: string;
				workflowName: string;
				workflowActive: boolean;
				totalHits: number;
				earliestNextActivation: string | null;
				earliestActivationInRange: string | null;
			}
		>
	>((accumulator, row) => {
		const existingMetric = accumulator.get(row.workflowId) ?? {
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			workflowActive: row.workflowActive,
			totalHits: 0,
			earliestNextActivation: null,
			earliestActivationInRange: null,
		};

		existingMetric.workflowActive = existingMetric.workflowActive || row.workflowActive;
		existingMetric.totalHits += row.activationsInRange;
		if (
			row.nextActivation !== null &&
			(existingMetric.earliestNextActivation === null ||
				row.nextActivation < existingMetric.earliestNextActivation)
		) {
			existingMetric.earliestNextActivation = row.nextActivation;
		}
		if (
			row.firstActivationInRange !== null &&
			(existingMetric.earliestActivationInRange === null ||
				row.firstActivationInRange < existingMetric.earliestActivationInRange)
		) {
			existingMetric.earliestActivationInRange = row.firstActivationInRange;
		}

		accumulator.set(row.workflowId, existingMetric);
		return accumulator;
	}, new Map());

	const workflowOrder = new Map(
		[...workflowMetrics.values()]
			.sort(
				(left, right) =>
					right.totalHits - left.totalHits ||
					compareNullableIsoValues(left.earliestNextActivation, right.earliestNextActivation) ||
					compareNullableIsoValues(
						left.earliestActivationInRange,
						right.earliestActivationInRange,
					) ||
					Number(right.workflowActive) - Number(left.workflowActive) ||
					left.workflowName.localeCompare(right.workflowName),
			)
			.map((metric, index) => [metric.workflowId, index] as const),
	);

	return [...filteredRows.value].sort(
		(left, right) =>
			(workflowOrder.get(left.workflowId) ?? Number.MAX_SAFE_INTEGER) -
				(workflowOrder.get(right.workflowId) ?? Number.MAX_SAFE_INTEGER) ||
			right.activationsInRange - left.activationsInRange ||
			compareNullableIsoValues(left.nextActivation, right.nextActivation) ||
			compareNullableIsoValues(left.firstActivationInRange, right.firstActivationInRange) ||
			Number(right.triggerActive) - Number(left.triggerActive) ||
			left.triggerName.localeCompare(right.triggerName),
	);
});

const tableRows = computed<ScheduleTableRow[]>(() => {
	const workflowCounts = sortedCustomRows.value.reduce<Map<string, number>>((accumulator, row) => {
		accumulator.set(row.workflowId, (accumulator.get(row.workflowId) ?? 0) + 1);
		return accumulator;
	}, new Map());

	let previousWorkflowId: string | null = null;

	return sortedCustomRows.value.map((row) => {
		const showWorkflow = row.workflowId !== previousWorkflowId;
		previousWorkflowId = row.workflowId;

		return {
			...row,
			showWorkflow,
			workflowRowSpan: showWorkflow ? (workflowCounts.get(row.workflowId) ?? 1) : 0,
		};
	});
});

const getTimelineBarTone = (
	activationCount: number,
	chartMaximum: number,
): ScheduleTimelineBarTone => {
	if (activationCount === 0) {
		return 'Idle';
	}

	if (activationCount > chartMaximum) {
		return 'Overflow';
	}

	const ratio = activationCount / chartMaximum;
	if (ratio >= 0.75) {
		return 'Danger';
	}

	if (ratio >= 0.5) {
		return 'Alert';
	}

	if (ratio >= 0.25) {
		return 'Warning';
	}

	return 'Success';
};

const chartAxisTicks = computed(() => {
	const chartMaximum = timelineMaxDisplayCount.value;
	const tickValues = [
		...new Set(
			Array.from({ length: TIMELINE_AXIS_SEGMENTS + 1 }, (_, index) =>
				Math.round((chartMaximum * (TIMELINE_AXIS_SEGMENTS - index)) / TIMELINE_AXIS_SEGMENTS),
			),
		),
	];

	return tickValues.map((value) => ({
		value,
		offset: chartMaximum === 0 ? 0 : (value / chartMaximum) * 100,
	}));
});

const customHitsColumnLabel = computed(() =>
	i18n.baseText(
		isRangeAwareCustomTable.value
			? 'insights.schedule.table.hitsInRange'
			: 'insights.schedule.table.activationsInWindow',
	),
);

const manualDefaultCompactDayPanels = computed(
	() => hasMultipleDayPanels.value && dayPanels.value.length >= 7,
);

watch(
	dayPanels,
	(newPanels) => {
		const validPanelIds = new Set(newPanels.map((panel) => panel.id));
		dayPanelDensityOverrides.value = Object.fromEntries(
			Object.entries(dayPanelDensityOverrides.value).filter(([panelId]) =>
				validPanelIds.has(panelId),
			),
		);
	},
	{ immediate: true },
);

const getDayPanelCompactState = (panelId: string) => {
	if (dayChartDensity.value === 'compact') {
		return true;
	}

	if (dayChartDensity.value === 'expanded') {
		return false;
	}

	const override = dayPanelDensityOverrides.value[panelId];
	if (override === 'compact') {
		return true;
	}

	if (override === 'expanded') {
		return false;
	}

	return manualDefaultCompactDayPanels.value;
};

const buildRenderedDayPanelStates = () =>
	Object.fromEntries(
		dayPanels.value.map((panel) => [panel.id, getDayPanelCompactState(panel.id)] as const),
	);

const persistManualDayPanelStates = (states: Record<string, boolean>) => {
	dayPanelDensityOverrides.value = Object.fromEntries(
		dayPanels.value.map((panel) => [panel.id, states[panel.id] ? 'compact' : 'expanded'] as const),
	);
};

const syncDensityModeWithStates = (states: Record<string, boolean>) => {
	const densityStates = dayPanels.value.map((panel) => states[panel.id]);

	if (densityStates.length > 0 && densityStates.every(Boolean)) {
		dayChartDensity.value = 'compact';
		return;
	}

	if (densityStates.length > 0 && densityStates.every((isCompact) => !isCompact)) {
		dayChartDensity.value = 'expanded';
		return;
	}

	dayChartDensity.value = 'manual';
};

const getTableColumnResizeLabel = (columnLabel: string) =>
	i18n.baseText('insights.schedule.table.resizeColumn', {
		interpolate: { column: columnLabel },
	});

const updateCustomTableColumnWidth = (columnId: ScheduleCustomTableColumnId, width: number) => {
	customTableColumnWidths.value = {
		...customTableColumnWidths.value,
		[columnId]: width,
	};
};

const updateHistoricalTableColumnWidth = (
	columnId: ScheduleHistoricalTableColumnId,
	width: number,
) => {
	historicalTableColumnWidths.value = {
		...historicalTableColumnWidths.value,
		[columnId]: width,
	};
};

const getCustomTableColumnStyle = (columnId: ScheduleCustomTableColumnId) => ({
	width: `${customTableColumnWidths.value[columnId]}px`,
	minWidth: `${CUSTOM_TABLE_COLUMN_MIN_WIDTHS[columnId]}px`,
});

const getHistoricalTableColumnStyle = (columnId: ScheduleHistoricalTableColumnId) => ({
	width: `${historicalTableColumnWidths.value[columnId]}px`,
	minWidth: `${HISTORICAL_TABLE_COLUMN_MIN_WIDTHS[columnId]}px`,
});

const customTableStyle = computed(() => ({
	width: `${Object.values(customTableColumnWidths.value).reduce((sum, width) => sum + width, 0)}px`,
	minWidth: '100%',
}));

const historicalTableStyle = computed(() => ({
	width: `${Object.values(historicalTableColumnWidths.value).reduce((sum, width) => sum + width, 0)}px`,
	minWidth: '100%',
}));

const startTableColumnResize = (
	tableKind: ScheduleTableKind,
	columnId: ScheduleCustomTableColumnId | ScheduleHistoricalTableColumnId,
	event: PointerEvent,
) => {
	if (event.button !== 0) {
		return;
	}

	event.preventDefault();
	event.stopPropagation();
	resizeCleanup.value?.();

	const startX = event.clientX;
	const initialWidth =
		tableKind === 'custom'
			? customTableColumnWidths.value[columnId as ScheduleCustomTableColumnId]
			: historicalTableColumnWidths.value[columnId as ScheduleHistoricalTableColumnId];
	const minimumWidth =
		tableKind === 'custom'
			? CUSTOM_TABLE_COLUMN_MIN_WIDTHS[columnId as ScheduleCustomTableColumnId]
			: HISTORICAL_TABLE_COLUMN_MIN_WIDTHS[columnId as ScheduleHistoricalTableColumnId];
	const previousCursor = document.body.style.cursor;
	const previousUserSelect = document.body.style.userSelect;
	document.body.style.cursor = 'col-resize';
	document.body.style.userSelect = 'none';

	const handlePointerMove = (moveEvent: PointerEvent) => {
		const nextWidth = Math.max(minimumWidth, initialWidth + (moveEvent.clientX - startX));

		if (tableKind === 'custom') {
			updateCustomTableColumnWidth(columnId as ScheduleCustomTableColumnId, nextWidth);
			return;
		}

		updateHistoricalTableColumnWidth(columnId as ScheduleHistoricalTableColumnId, nextWidth);
	};

	const cleanup = () => {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', cleanup);
		window.removeEventListener('pointercancel', cleanup);
		document.body.style.cursor = previousCursor;
		document.body.style.userSelect = previousUserSelect;
		resizeCleanup.value = null;
	};

	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', cleanup);
	window.addEventListener('pointercancel', cleanup);
	resizeCleanup.value = cleanup;
};

const getChartHeightStyle = (compact: boolean, slotCount: number) => ({
	'--schedule-chart--height': compact
		? `${TIMELINE_COMPACT_HEIGHT}px`
		: `${TIMELINE_BAR_MAX_HEIGHT}px`,
	'--width--schedule-timeline-slot-count': `${slotCount}`,
});

const buildTimelineBars = (
	cells: ScheduleHeatmapCell[],
	compact = false,
): ScheduleTimelineBar[] => {
	const chartMaximum = timelineMaxDisplayCount.value;

	return cells.map((cell) => {
		const cappedCount = Math.min(cell.activationCount, chartMaximum);
		const ratio = chartMaximum === 0 ? 0 : cappedCount / chartMaximum;
		const barHeight = compact
			? TIMELINE_BAR_COMPACT_HEIGHT
			: cell.activationCount === 0
				? TIMELINE_BAR_ZERO_HEIGHT
				: Math.max(TIMELINE_BAR_MIN_ACTIVE_HEIGHT, Math.round(ratio * TIMELINE_BAR_MAX_HEIGHT));

		return {
			...cell,
			barHeight: `${barHeight}px`,
			overflowLabel:
				!compact && cell.activationCount > chartMaximum
					? `${chartMaximum.toLocaleString('en-US')}+`
					: null,
			tone: getTimelineBarTone(cell.activationCount, chartMaximum),
		};
	});
};

const timelineBars = computed<ScheduleTimelineBar[]>(() =>
	buildTimelineBars(heatmapCells.value, false),
);

const singleTimelineChartStyle = computed(() =>
	getChartHeightStyle(false, timelineBars.value.length),
);

const getTimeAxisLabels = (cells: ScheduleHeatmapCell[]) => {
	return cells.reduce<Array<{ slotStart: string; span: number }>>((accumulator, cell, index) => {
		if (index % TIMELINE_LABEL_SLOT_INTERVAL !== 0) {
			return accumulator;
		}

		accumulator.push({
			slotStart: cell.slotStart,
			span: Math.min(TIMELINE_LABEL_SLOT_INTERVAL, cells.length - index),
		});

		return accumulator;
	}, []);
};

const timeAxisLabels = computed(() => getTimeAxisLabels(heatmapCells.value));

const timelinePanels = computed<ScheduleTimelinePanel[]>(() =>
	dayPanels.value.map((panel) => ({
		...panel,
		isCompact: getDayPanelCompactState(panel.id),
		showAxis: !getDayPanelCompactState(panel.id),
		timelineBars: buildTimelineBars(panel.heatmapCells, getDayPanelCompactState(panel.id)),
		timeAxisLabels: getDayPanelCompactState(panel.id) ? [] : getTimeAxisLabels(panel.heatmapCells),
		chartStyle: getChartHeightStyle(getDayPanelCompactState(panel.id), panel.heatmapCells.length),
	})),
);

const getWorkflowLink = (workflowId: string) => ({
	name: VIEWS.WORKFLOW,
	params: { name: workflowId },
});

const getWorkflowPath = (workflowId: string) => `/workflow/${workflowId}`;

const getRowKey = (row: ScheduleTriggerRow) => row.triggerId;

const getHistoricalRowKey = (row: ScheduleHistoricalWorkflowRow) => row.workflowId;

const getCustomRangeSummary = (row: ScheduleTriggerRow) => {
	if (!row.firstActivationInRange || !row.lastActivationInRange) {
		return i18n.baseText('insights.schedule.table.rangeSummaryEmpty');
	}

	return `${i18n.baseText('insights.schedule.table.rangeSummaryFirst')} ${formatHistoricalDateTimeLabel(row.firstActivationInRange)} • ${i18n.baseText('insights.schedule.table.rangeSummaryLast')} ${formatHistoricalDateTimeLabel(row.lastActivationInRange)}`;
};

const getDayPanelToggleLabel = (panel: ScheduleTimelinePanel) =>
	panel.isCompact
		? i18n.baseText('insights.schedule.dayPanel.expand')
		: i18n.baseText('insights.schedule.dayPanel.collapse');

const toggleSettings = () => {
	isSettingsOpen.value = !isSettingsOpen.value;
};

const selectRangeMode = (value: ScheduleRangeMode) => {
	rangeMode.value = value;
};

const selectCustomWindowPreset = (value: ScheduleCustomWindowPreset) => {
	const preset = customWindowPresetOptions.value.find((item) => item.id === value);
	if (!preset || preset.disabled) {
		return;
	}

	customWindowPreset.value = value;
};

const selectCustomTimeMode = (value: ScheduleCustomTimeMode) => {
	const option = customTimeModeOptions.value.find((item) => item.id === value);
	if (!option || option.disabled) {
		return;
	}

	customTimeMode.value = value;
};

const selectDayChartDensity = (value: ScheduleDayChartDensity) => {
	dayChartDensity.value = value;
};

const toggleDayPanelDensity = (panelId: string) => {
	const nextStates = buildRenderedDayPanelStates();
	nextStates[panelId] = !nextStates[panelId];
	persistManualDayPanelStates(nextStates);
	syncDensityModeWithStates(nextStates);
};

const updateTimelineMaxDisplayCount = (value: number) => {
	timelineMaxDisplayCount.value = value;
};
</script>

<template>
	<section :class="$style.panel" data-test-id="schedule-control-panel">
		<div :class="$style.controlsBar">
			<div :class="$style.modeGroup">
				<span :class="$style.controlsLabel">{{
					i18n.baseText('insights.schedule.mode.label')
				}}</span>
				<div :class="$style.modeSwitch" data-test-id="schedule-range-mode-switch">
					<button
						type="button"
						:class="[$style.modeButton, isCustomMode ? $style.modeButtonActive : '']"
						:aria-pressed="isCustomMode"
						data-test-id="schedule-mode-button-custom"
						@click="selectRangeMode('custom')"
					>
						{{ i18n.baseText('insights.schedule.mode.custom') }}
					</button>
					<button
						type="button"
						:class="[$style.modeButton, isN8nMode ? $style.modeButtonActive : '']"
						:aria-pressed="isN8nMode"
						data-test-id="schedule-mode-button-n8n"
						@click="selectRangeMode('n8n')"
					>
						{{ i18n.baseText('insights.schedule.mode.n8n') }}
					</button>
				</div>
			</div>

			<div v-if="isCustomMode" :class="$style.rangeControls">
				<div :class="$style.labelWithHint">
					<span :class="$style.controlsLabel">
						{{ i18n.baseText('insights.schedule.mode.custom.windowLabel') }}
					</span>
					<N8nTooltip placement="top" :show-after="250">
						<template #content>
							{{ i18n.baseText('insights.schedule.mode.custom.hint') }}
						</template>
						<button
							type="button"
							:class="$style.inlineHintButton"
							:aria-label="i18n.baseText('insights.schedule.mode.custom.hint')"
							data-test-id="schedule-custom-window-hint"
						>
							?
						</button>
					</N8nTooltip>
				</div>
				<div :class="$style.presetButtons" data-test-id="schedule-custom-preset-group">
					<button
						v-for="preset in customWindowPresetOptions"
						:key="preset.id"
						type="button"
						:disabled="preset.disabled"
						:class="[
							$style.presetButton,
							customWindowPreset === preset.id ? $style.presetButtonActive : '',
							preset.disabled ? $style.presetButtonDisabled : '',
						]"
						@click="selectCustomWindowPreset(preset.id)"
					>
						{{ preset.label }}
					</button>
				</div>
			</div>

			<div v-if="isCustomMode" :class="$style.rangeControls">
				<div :class="$style.labelWithHint">
					<span :class="$style.controlsLabel">
						{{ i18n.baseText('insights.schedule.mode.custom.timeModeLabel') }}
					</span>
					<N8nTooltip placement="top" :show-after="250">
						<template #content>
							{{ i18n.baseText('insights.schedule.mode.custom.timeMode.hint') }}
						</template>
						<button
							type="button"
							:class="$style.inlineHintButton"
							:aria-label="i18n.baseText('insights.schedule.mode.custom.timeMode.hint')"
							data-test-id="schedule-custom-time-mode-hint"
						>
							?
						</button>
					</N8nTooltip>
				</div>
				<div :class="$style.presetButtons" data-test-id="schedule-custom-time-mode-group">
					<button
						v-for="option in customTimeModeOptions"
						:key="option.id"
						type="button"
						:disabled="option.disabled"
						:class="[
							$style.presetButton,
							effectiveCustomTimeMode === option.id ? $style.presetButtonActive : '',
							option.disabled ? $style.presetButtonDisabled : '',
						]"
						@click="selectCustomTimeMode(option.id)"
					>
						{{ option.label }}
					</button>
				</div>
			</div>

			<div v-else :class="$style.rangeControls">
				<span :class="$style.controlsLabel">
					{{ i18n.baseText('insights.schedule.mode.n8n.windowLabel') }}
				</span>
				<p :class="$style.rangeValue">{{ insightsRangeLabel }}</p>
			</div>
		</div>

		<template v-if="isCustomMode">
			<div :class="$style.cards">
				<article v-for="card in cards" :key="card.id" :class="$style.card">
					<div :class="$style.cardLabelRow">
						<small>{{ card.label }}</small>
						<N8nTooltip placement="top" :show-after="250">
							<template #content>
								{{ card.hint }}
							</template>
							<button type="button" :class="$style.inlineHintButton" :aria-label="card.hint">
								?
							</button>
						</N8nTooltip>
					</div>
					<strong>{{ card.valueLabel }}</strong>
					<small v-if="card.metaLabel" :class="$style.cardMeta">{{ card.metaLabel }}</small>
				</article>
			</div>

			<div :class="$style.contentSections">
				<div :class="$style.timelineSection">
					<div :class="[$style.sectionHeading, $style.timelineToolbar]">
						<div :class="$style.sectionActions">
							<div v-if="isLoading" :class="$style.inlineStatus">
								<N8nSpinner />
								<span>{{ i18n.baseText('insights.schedule.loading') }}</span>
							</div>
							<div ref="settingsRef" :class="$style.settingsWrapper">
								<N8nTooltip placement="left" :show-after="250">
									<template #content>
										{{ i18n.baseText('insights.schedule.settings.button') }}
									</template>
									<N8nIconButton
										variant="ghost"
										icon="settings"
										size="small"
										:aria-label="i18n.baseText('insights.schedule.settings.button')"
										data-test-id="schedule-settings-button"
										@click.stop="toggleSettings"
									/>
								</N8nTooltip>
								<div v-if="isSettingsOpen" :class="$style.settingsPanel" @click.stop>
									<div :class="$style.settingsHeader">
										<strong>{{ i18n.baseText('insights.schedule.settings.title') }}</strong>
										<p>{{ i18n.baseText('insights.schedule.settings.description') }}</p>
									</div>
									<section :class="$style.settingsSection">
										<h5>{{ i18n.baseText('insights.schedule.settings.section.diagram') }}</h5>
										<label
											:class="$style.settingsFieldLabel"
											for="schedule-timeline-max-display-count"
										>
											{{ i18n.baseText('insights.schedule.settings.diagram.maxOverlap.label') }}
										</label>
										<N8nInputNumber
											id="schedule-timeline-max-display-count"
											size="mini"
											:min="MIN_TIMELINE_MAX_DISPLAY_COUNT"
											:max="MAX_TIMELINE_MAX_DISPLAY_COUNT"
											:model-value="timelineMaxDisplayCount"
											@update:model-value="updateTimelineMaxDisplayCount"
										/>
										<p :class="$style.settingsHint">
											{{ timelineMaxDisplayCountHint }}
										</p>
										<div v-if="hasMultipleDayPanels" :class="$style.settingsFieldGroup">
											<label :class="$style.settingsFieldLabel">
												{{ i18n.baseText('insights.schedule.settings.diagram.density.label') }}
											</label>
											<div :class="$style.settingsToggleGroup">
												<button
													v-for="option in dayChartDensityOptions"
													:key="option.id"
													type="button"
													:data-test-id="`schedule-density-button-${option.id}`"
													:class="[
														$style.settingsToggleButton,
														dayChartDensity === option.id ? $style.settingsToggleButtonActive : '',
													]"
													@click="selectDayChartDensity(option.id)"
												>
													{{ option.label }}
												</button>
											</div>
											<p :class="$style.settingsHint">
												{{ i18n.baseText('insights.schedule.settings.diagram.density.hint') }}
											</p>
										</div>
									</section>
									<section :class="$style.settingsSection">
										<h5>{{ i18n.baseText('insights.schedule.settings.section.table') }}</h5>
										<div :class="$style.settingsCheckboxList">
											<N8nCheckbox
												v-model="showUnpublishedWorkflows"
												:label="
													i18n.baseText('insights.schedule.settings.table.showUnpublishedWorkflows')
												"
												data-test-id="schedule-settings-show-unpublished-workflows"
											/>
											<N8nCheckbox
												v-model="showDisabledTriggers"
												:label="
													i18n.baseText('insights.schedule.settings.table.showDisabledTriggers')
												"
												data-test-id="schedule-settings-show-disabled-triggers"
											/>
											<N8nCheckbox
												v-model="showZeroHitRows"
												:label="i18n.baseText('insights.schedule.settings.table.showZeroHitRows')"
												data-test-id="schedule-settings-show-zero-hit-rows"
											/>
										</div>
										<p :class="$style.settingsHint">
											{{ i18n.baseText('insights.schedule.settings.table.hint') }}
										</p>
									</section>
								</div>
							</div>
						</div>
					</div>

					<p v-if="error" :class="$style.errorBanner">{{ error }}</p>
					<p v-else-if="executionPartialWarningLabel" :class="$style.warningBanner">
						{{ executionPartialWarningLabel }}
					</p>
					<div
						v-if="hasMultipleDayPanels"
						:class="$style.dayPanels"
						:data-multi-day="hasMultipleDayPanels ? 'true' : 'false'"
					>
						<section
							v-for="panel in timelinePanels"
							:key="panel.id"
							:class="$style.dayPanel"
							:style="panel.chartStyle"
							data-test-id="schedule-day-panel"
							:data-compact="panel.isCompact ? 'true' : 'false'"
						>
							<div :class="$style.dayPanelHeader">
								<strong>{{ panel.label }}</strong>
								<N8nTooltip placement="top" :show-after="250">
									<template #content>
										{{ getDayPanelToggleLabel(panel) }}
									</template>
									<N8nIconButton
										variant="ghost"
										:size="'small'"
										:class="$style.dayPanelToggle"
										:icon="panel.isCompact ? 'chevron-down' : 'chevron-up'"
										:aria-label="getDayPanelToggleLabel(panel)"
										data-test-id="schedule-day-panel-toggle"
										@click="toggleDayPanelDensity(panel.id)"
									/>
								</N8nTooltip>
							</div>
							<div :class="$style.timelineWrapper">
								<div :class="[$style.chartShell, !panel.showAxis ? $style.chartShellCompact : '']">
									<div v-if="panel.showAxis" :class="$style.chartYAxis">
										<span
											v-for="tick in chartAxisTicks"
											:key="`${panel.id}-tick-${tick.value}`"
											:class="$style.chartYAxisLabel"
											:style="{ bottom: `${tick.offset}%` }"
										>
											{{ tick.value.toLocaleString('en-US') }}
										</span>
									</div>
									<div :class="$style.chartMain">
										<div
											:class="[$style.chartPlot, !panel.showAxis ? $style.chartPlotCompact : '']"
										>
											<div
												v-for="tick in panel.showAxis ? chartAxisTicks : []"
												:key="`${panel.id}-line-${tick.value}`"
												:class="$style.chartGridLine"
												:style="{ bottom: `${tick.offset}%` }"
											></div>
											<div :class="$style.chartBars">
												<div
													v-for="bar in panel.timelineBars"
													:key="bar.slotStart"
													:class="[
														$style.chartBarColumn,
														isCurrentTimelineSlot(bar.slotStart, bar.slotEnd)
															? $style.chartBarColumnCurrent
															: '',
													]"
													:data-current-slot="
														isCurrentTimelineSlot(bar.slotStart, bar.slotEnd) ? 'true' : 'false'
													"
													data-test-id="schedule-timeline-bar"
													:title="getSlotTitle(bar)"
												>
													<span v-if="bar.overflowLabel" :class="$style.chartOverflowLabel">
														{{ bar.overflowLabel }}
													</span>
													<div
														:class="[$style.chartBar, $style[`chartBar${bar.tone}`]]"
														:style="{ height: bar.barHeight }"
													></div>
												</div>
											</div>
										</div>
										<div v-if="panel.showAxis" :class="$style.chartXAxis">
											<div
												v-for="label in panel.timeAxisLabels"
												:key="label.slotStart"
												:class="$style.chartXAxisLabel"
												:style="{ gridColumn: `span ${label.span}` }"
											>
												{{ formatAxisLabel(label.slotStart) }}
											</div>
										</div>
									</div>
								</div>
							</div>
						</section>
					</div>
					<div v-else :class="$style.timelineWrapper">
						<div :class="$style.chartShell" :style="singleTimelineChartStyle">
							<div :class="$style.chartYAxis">
								<span
									v-for="tick in chartAxisTicks"
									:key="`tick-${tick.value}`"
									:class="$style.chartYAxisLabel"
									:style="{ bottom: `${tick.offset}%` }"
								>
									{{ tick.value.toLocaleString('en-US') }}
								</span>
							</div>
							<div :class="$style.chartMain">
								<div :class="$style.chartPlot">
									<div
										v-for="tick in chartAxisTicks"
										:key="`line-${tick.value}`"
										:class="$style.chartGridLine"
										:style="{ bottom: `${tick.offset}%` }"
									></div>
									<div :class="$style.chartBars">
										<div
											v-for="bar in timelineBars"
											:key="bar.slotStart"
											:class="[
												$style.chartBarColumn,
												isCurrentTimelineSlot(bar.slotStart, bar.slotEnd)
													? $style.chartBarColumnCurrent
													: '',
											]"
											:data-current-slot="
												isCurrentTimelineSlot(bar.slotStart, bar.slotEnd) ? 'true' : 'false'
											"
											data-test-id="schedule-timeline-bar"
											:title="getSlotTitle(bar)"
										>
											<span v-if="bar.overflowLabel" :class="$style.chartOverflowLabel">
												{{ bar.overflowLabel }}
											</span>
											<div
												:class="[$style.chartBar, $style[`chartBar${bar.tone}`]]"
												:style="{ height: bar.barHeight }"
											></div>
										</div>
									</div>
								</div>
								<div :class="$style.chartXAxis">
									<div
										v-for="label in timeAxisLabels"
										:key="label.slotStart"
										:class="$style.chartXAxisLabel"
										:style="{ gridColumn: `span ${label.span}` }"
									>
										{{ formatAxisLabel(label.slotStart) }}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div :class="$style.tableSection">
					<div :class="[$style.sectionHeading, $style.tableToolbar]">
						<p :class="$style.sectionMeta">
							{{ forecastWindowInlineLabel }}
						</p>
					</div>

					<div v-if="hasVisibleRows" :class="$style.tableWrapper">
						<table :style="customTableStyle">
							<colgroup>
								<col :style="getCustomTableColumnStyle('workflow')" />
								<col :style="getCustomTableColumnStyle('workflowStatus')" />
								<col :style="getCustomTableColumnStyle('trigger')" />
								<col :style="getCustomTableColumnStyle('triggerStatus')" />
								<col :style="getCustomTableColumnStyle('logic')" />
								<col :style="getCustomTableColumnStyle('timezone')" />
								<col :style="getCustomTableColumnStyle('hits')" />
							</colgroup>
							<thead>
								<tr>
									<th :class="$style.workflowColumn">
										<div :class="$style.tableHeaderContent">
											<span :class="$style.tableHeaderLabel">{{
												i18n.baseText('insights.schedule.table.workflow')
											}}</span>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="
													getTableColumnResizeLabel(
														i18n.baseText('insights.schedule.table.workflow'),
													)
												"
												@pointerdown="startTableColumnResize('custom', 'workflow', $event)"
											></button>
										</div>
									</th>
									<th :class="$style.statusColumn">
										<div :class="$style.tableHeaderContent">
											<span :class="$style.tableHeaderLabel">{{
												i18n.baseText('insights.schedule.table.workflowStatus')
											}}</span>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="
													getTableColumnResizeLabel(
														i18n.baseText('insights.schedule.table.workflowStatus'),
													)
												"
												@pointerdown="startTableColumnResize('custom', 'workflowStatus', $event)"
											></button>
										</div>
									</th>
									<th :class="$style.triggerColumn">
										<div :class="$style.tableHeaderContent">
											<span :class="$style.tableHeaderLabel">{{
												i18n.baseText('insights.schedule.table.trigger')
											}}</span>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="
													getTableColumnResizeLabel(
														i18n.baseText('insights.schedule.table.trigger'),
													)
												"
												@pointerdown="startTableColumnResize('custom', 'trigger', $event)"
											></button>
										</div>
									</th>
									<th :class="$style.statusColumn">
										<div :class="$style.tableHeaderContent">
											<span :class="$style.tableHeaderLabel">{{
												i18n.baseText('insights.schedule.table.triggerStatus')
											}}</span>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="
													getTableColumnResizeLabel(
														i18n.baseText('insights.schedule.table.triggerStatus'),
													)
												"
												@pointerdown="startTableColumnResize('custom', 'triggerStatus', $event)"
											></button>
										</div>
									</th>
									<th :class="$style.logicColumn">
										<div :class="$style.tableHeaderContent">
											<span :class="$style.tableHeaderLabel">{{
												i18n.baseText('insights.schedule.table.logic')
											}}</span>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="
													getTableColumnResizeLabel(i18n.baseText('insights.schedule.table.logic'))
												"
												@pointerdown="startTableColumnResize('custom', 'logic', $event)"
											></button>
										</div>
									</th>
									<th :class="$style.timezoneColumn">
										<div :class="$style.tableHeaderContent">
											<div :class="$style.tableHeaderLabelGroup">
												<span :class="$style.tableHeaderLabel">{{
													i18n.baseText('insights.schedule.table.timezone')
												}}</span>
												<N8nTooltip placement="top" :show-after="250">
													<template #content>
														{{ i18n.baseText('insights.schedule.table.timezone.hint') }}
													</template>
													<button
														type="button"
														:class="$style.inlineHintButton"
														:aria-label="i18n.baseText('insights.schedule.table.timezone.hint')"
													>
														?
													</button>
												</N8nTooltip>
											</div>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="
													getTableColumnResizeLabel(
														i18n.baseText('insights.schedule.table.timezone'),
													)
												"
												@pointerdown="startTableColumnResize('custom', 'timezone', $event)"
											></button>
										</div>
									</th>
									<th :class="$style.numericColumn">
										<div :class="$style.tableHeaderContent">
											<span :class="$style.tableHeaderLabel">{{ customHitsColumnLabel }}</span>
											<button
												type="button"
												:class="$style.columnResizeHandle"
												:aria-label="getTableColumnResizeLabel(customHitsColumnLabel)"
												@pointerdown="startTableColumnResize('custom', 'hits', $event)"
											></button>
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="row in tableRows"
									:key="getRowKey(row)"
									:class="row.showWorkflow ? $style.workflowGroupStart : ''"
								>
									<td
										v-if="row.showWorkflow"
										:rowspan="row.workflowRowSpan"
										:class="$style.workflowColumn"
									>
										<div :class="$style.workflowCell">
											<RouterLink
												:to="getWorkflowLink(row.workflowId)"
												:class="$style.workflowLink"
											>
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
									<td :class="$style.triggerColumn">{{ row.triggerName }}</td>
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
									<td :class="$style.logicColumn">
										<div :class="$style.logicCell">
											<span>{{ row.triggerLogic }}</span>
											<small v-if="isRangeAwareCustomTable" :class="$style.rangeSummary">
												{{ getCustomRangeSummary(row) }}
											</small>
										</div>
									</td>
									<td :class="$style.timezoneColumn">
										<span :class="$style.timezoneValue">{{
											getCustomTriggerTimezoneLabel(row)
										}}</span>
									</td>
									<td :class="$style.numericColumn">
										{{ row.activationsInRange.toLocaleString('en-US') }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<p v-else-if="hasRows" :class="$style.tableState">
						{{ i18n.baseText('insights.schedule.table.filteredEmpty') }}
					</p>

					<p v-else-if="isLoading" :class="$style.tableState">
						{{ i18n.baseText('insights.schedule.table.loading') }}
					</p>
					<p v-else :class="$style.tableState">
						{{ i18n.baseText('insights.schedule.table.empty') }}
					</p>
				</div>
			</div>
		</template>

		<div v-else :class="$style.contentSections">
			<div :class="$style.cards">
				<article v-for="card in cards" :key="card.id" :class="$style.card">
					<div :class="$style.cardLabelRow">
						<small>{{ card.label }}</small>
						<N8nTooltip placement="top" :show-after="250">
							<template #content>
								{{ card.hint }}
							</template>
							<button type="button" :class="$style.inlineHintButton" :aria-label="card.hint">
								?
							</button>
						</N8nTooltip>
					</div>
					<strong>{{ card.valueLabel }}</strong>
					<small v-if="card.metaLabel" :class="$style.cardMeta">{{ card.metaLabel }}</small>
				</article>
			</div>

			<div :class="$style.timelineSection">
				<div :class="[$style.sectionHeading, $style.timelineToolbar]">
					<div :class="$style.sectionActions">
						<div v-if="isLoading" :class="$style.inlineStatus">
							<N8nSpinner />
							<span>{{ i18n.baseText('insights.schedule.loading') }}</span>
						</div>
						<div ref="settingsRef" :class="$style.settingsWrapper">
							<N8nTooltip placement="left" :show-after="250">
								<template #content>
									{{ i18n.baseText('insights.schedule.settings.button') }}
								</template>
								<N8nIconButton
									variant="ghost"
									icon="settings"
									size="small"
									:aria-label="i18n.baseText('insights.schedule.settings.button')"
									data-test-id="schedule-settings-button"
									@click.stop="toggleSettings"
								/>
							</N8nTooltip>
							<div v-if="isSettingsOpen" :class="$style.settingsPanel" @click.stop>
								<div :class="$style.settingsHeader">
									<strong>{{ i18n.baseText('insights.schedule.settings.title') }}</strong>
									<p>{{ i18n.baseText('insights.schedule.settings.description') }}</p>
								</div>
								<section :class="$style.settingsSection">
									<h5>{{ i18n.baseText('insights.schedule.settings.section.diagram') }}</h5>
									<label
										:class="$style.settingsFieldLabel"
										for="schedule-timeline-max-display-count-n8n"
									>
										{{ i18n.baseText('insights.schedule.settings.diagram.maxOverlap.label') }}
									</label>
									<N8nInputNumber
										id="schedule-timeline-max-display-count-n8n"
										size="mini"
										:min="MIN_TIMELINE_MAX_DISPLAY_COUNT"
										:max="MAX_TIMELINE_MAX_DISPLAY_COUNT"
										:model-value="timelineMaxDisplayCount"
										@update:model-value="updateTimelineMaxDisplayCount"
									/>
									<p :class="$style.settingsHint">
										{{ timelineMaxDisplayCountHint }}
									</p>
									<div v-if="hasMultipleDayPanels" :class="$style.settingsFieldGroup">
										<label :class="$style.settingsFieldLabel">
											{{ i18n.baseText('insights.schedule.settings.diagram.density.label') }}
										</label>
										<div :class="$style.settingsToggleGroup">
											<button
												v-for="option in dayChartDensityOptions"
												:key="option.id"
												type="button"
												:data-test-id="`schedule-density-button-${option.id}`"
												:class="[
													$style.settingsToggleButton,
													dayChartDensity === option.id ? $style.settingsToggleButtonActive : '',
												]"
												@click="selectDayChartDensity(option.id)"
											>
												{{ option.label }}
											</button>
										</div>
										<p :class="$style.settingsHint">
											{{ i18n.baseText('insights.schedule.settings.diagram.density.hint') }}
										</p>
									</div>
								</section>
								<section :class="$style.settingsSection">
									<h5>{{ i18n.baseText('insights.schedule.settings.section.table') }}</h5>
									<div :class="$style.settingsCheckboxList">
										<N8nCheckbox
											v-model="showUnpublishedWorkflows"
											:label="
												i18n.baseText('insights.schedule.settings.table.showUnpublishedWorkflows')
											"
										/>
										<N8nCheckbox
											v-model="showDisabledTriggers"
											:label="
												i18n.baseText('insights.schedule.settings.table.showDisabledTriggers')
											"
										/>
										<N8nCheckbox
											v-model="showZeroHitRows"
											:label="i18n.baseText('insights.schedule.settings.table.showZeroHitRows')"
										/>
									</div>
									<p :class="$style.settingsHint">
										{{ i18n.baseText('insights.schedule.settings.table.hint') }}
									</p>
								</section>
							</div>
						</div>
					</div>
				</div>

				<p v-if="error" :class="$style.errorBanner">{{ error }}</p>
				<p v-else-if="executionPartialWarningLabel" :class="$style.warningBanner">
					{{ executionPartialWarningLabel }}
				</p>

				<div
					v-else-if="hasHistoricalDayPanels"
					:class="$style.dayPanels"
					:data-multi-day="hasMultipleDayPanels ? 'true' : 'false'"
				>
					<section
						v-for="panel in timelinePanels"
						:key="panel.id"
						:class="$style.dayPanel"
						:style="panel.chartStyle"
						data-test-id="schedule-day-panel"
						:data-compact="panel.isCompact ? 'true' : 'false'"
					>
						<div :class="$style.dayPanelHeader">
							<strong>{{ panel.label }}</strong>
							<N8nTooltip placement="top" :show-after="250">
								<template #content>
									{{ getDayPanelToggleLabel(panel) }}
								</template>
								<N8nIconButton
									variant="ghost"
									:size="'small'"
									:class="$style.dayPanelToggle"
									:icon="panel.isCompact ? 'chevron-down' : 'chevron-up'"
									:aria-label="getDayPanelToggleLabel(panel)"
									data-test-id="schedule-day-panel-toggle"
									@click="toggleDayPanelDensity(panel.id)"
								/>
							</N8nTooltip>
						</div>

						<div :class="$style.timelineWrapper">
							<div :class="[$style.chartShell, !panel.showAxis ? $style.chartShellCompact : '']">
								<div v-if="panel.showAxis" :class="$style.chartYAxis">
									<span
										v-for="tick in chartAxisTicks"
										:key="`${panel.id}-tick-${tick.value}`"
										:class="$style.chartYAxisLabel"
										:style="{ bottom: `${tick.offset}%` }"
									>
										{{ tick.value.toLocaleString('en-US') }}
									</span>
								</div>
								<div :class="$style.chartMain">
									<div :class="[$style.chartPlot, !panel.showAxis ? $style.chartPlotCompact : '']">
										<div
											v-for="tick in panel.showAxis ? chartAxisTicks : []"
											:key="`${panel.id}-line-${tick.value}`"
											:class="$style.chartGridLine"
											:style="{ bottom: `${tick.offset}%` }"
										></div>
										<div :class="$style.chartBars">
											<div
												v-for="bar in panel.timelineBars"
												:key="bar.slotStart"
												:class="[
													$style.chartBarColumn,
													isCurrentTimelineSlot(bar.slotStart, bar.slotEnd)
														? $style.chartBarColumnCurrent
														: '',
												]"
												:data-current-slot="
													isCurrentTimelineSlot(bar.slotStart, bar.slotEnd) ? 'true' : 'false'
												"
												data-test-id="schedule-timeline-bar"
												:title="getSlotTitle(bar)"
											>
												<span v-if="bar.overflowLabel" :class="$style.chartOverflowLabel">
													{{ bar.overflowLabel }}
												</span>
												<div
													:class="[$style.chartBar, $style[`chartBar${bar.tone}`]]"
													:style="{ height: bar.barHeight }"
												></div>
											</div>
										</div>
									</div>
									<div v-if="panel.showAxis" :class="$style.chartXAxis">
										<div
											v-for="label in panel.timeAxisLabels"
											:key="label.slotStart"
											:class="$style.chartXAxisLabel"
											:style="{ gridColumn: `span ${label.span}` }"
										>
											{{ formatAxisLabel(label.slotStart) }}
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>
				</div>

				<p v-else-if="!isLoading" :class="$style.tableState">
					{{ i18n.baseText('insights.schedule.mode.n8n.empty') }}
				</p>
			</div>

			<div :class="$style.tableSection">
				<div :class="[$style.sectionHeading, $style.tableToolbar]">
					<p :class="$style.sectionMeta">
						{{ insightsRangeInlineLabel }}
					</p>
				</div>
				<div v-if="hasVisibleHistoricalRows" :class="$style.tableWrapper">
					<table :style="historicalTableStyle">
						<colgroup>
							<col :style="getHistoricalTableColumnStyle('workflow')" />
							<col :style="getHistoricalTableColumnStyle('workflowStatus')" />
							<col :style="getHistoricalTableColumnStyle('triggerStatus')" />
							<col :style="getHistoricalTableColumnStyle('firstStart')" />
							<col :style="getHistoricalTableColumnStyle('lastStart')" />
							<col :style="getHistoricalTableColumnStyle('starts')" />
						</colgroup>
						<thead>
							<tr>
								<th :class="$style.workflowColumn">
									<div :class="$style.tableHeaderContent">
										<span :class="$style.tableHeaderLabel">{{
											i18n.baseText('insights.schedule.table.workflow')
										}}</span>
										<button
											type="button"
											:class="$style.columnResizeHandle"
											:aria-label="
												getTableColumnResizeLabel(i18n.baseText('insights.schedule.table.workflow'))
											"
											@pointerdown="startTableColumnResize('historical', 'workflow', $event)"
										></button>
									</div>
								</th>
								<th :class="$style.statusColumn">
									<div :class="$style.tableHeaderContent">
										<span :class="$style.tableHeaderLabel">{{
											i18n.baseText('insights.schedule.table.workflowStatus')
										}}</span>
										<button
											type="button"
											:class="$style.columnResizeHandle"
											:aria-label="
												getTableColumnResizeLabel(
													i18n.baseText('insights.schedule.table.workflowStatus'),
												)
											"
											@pointerdown="startTableColumnResize('historical', 'workflowStatus', $event)"
										></button>
									</div>
								</th>
								<th :class="$style.statusColumn">
									<div :class="$style.tableHeaderContent">
										<span :class="$style.tableHeaderLabel">{{
											i18n.baseText('insights.schedule.table.triggerStatus')
										}}</span>
										<button
											type="button"
											:class="$style.columnResizeHandle"
											:aria-label="
												getTableColumnResizeLabel(
													i18n.baseText('insights.schedule.table.triggerStatus'),
												)
											"
											@pointerdown="startTableColumnResize('historical', 'triggerStatus', $event)"
										></button>
									</div>
								</th>
								<th :class="$style.timeColumn">
									<div :class="$style.tableHeaderContent">
										<span :class="$style.tableHeaderLabel">{{
											i18n.baseText('insights.schedule.table.firstStart')
										}}</span>
										<button
											type="button"
											:class="$style.columnResizeHandle"
											:aria-label="
												getTableColumnResizeLabel(
													i18n.baseText('insights.schedule.table.firstStart'),
												)
											"
											@pointerdown="startTableColumnResize('historical', 'firstStart', $event)"
										></button>
									</div>
								</th>
								<th :class="$style.timeColumn">
									<div :class="$style.tableHeaderContent">
										<span :class="$style.tableHeaderLabel">{{
											i18n.baseText('insights.schedule.table.lastStart')
										}}</span>
										<button
											type="button"
											:class="$style.columnResizeHandle"
											:aria-label="
												getTableColumnResizeLabel(
													i18n.baseText('insights.schedule.table.lastStart'),
												)
											"
											@pointerdown="startTableColumnResize('historical', 'lastStart', $event)"
										></button>
									</div>
								</th>
								<th :class="$style.numericColumn">
									<div :class="$style.tableHeaderContent">
										<span :class="$style.tableHeaderLabel">{{
											i18n.baseText('insights.schedule.table.startsInRange')
										}}</span>
										<button
											type="button"
											:class="$style.columnResizeHandle"
											:aria-label="
												getTableColumnResizeLabel(
													i18n.baseText('insights.schedule.table.startsInRange'),
												)
											"
											@pointerdown="startTableColumnResize('historical', 'starts', $event)"
										></button>
									</div>
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in filteredHistoricalRows" :key="getHistoricalRowKey(row)">
								<td :class="$style.workflowColumn">
									<div :class="$style.workflowCell">
										<RouterLink :to="getWorkflowLink(row.workflowId)" :class="$style.workflowLink">
											{{ row.workflowName }}
										</RouterLink>
										<small :class="$style.workflowPath">{{
											getWorkflowPath(row.workflowId)
										}}</small>
									</div>
								</td>
								<td :class="$style.statusColumn">
									<span
										:class="[
											$style.statusBadge,
											row.workflowActive ? $style.activeBadge : $style.inactiveBadge,
										]"
									>
										{{ getWorkflowStatusLabel(row.workflowActive) }}
									</span>
								</td>
								<td :class="$style.statusColumn">
									<span
										:class="[
											$style.statusBadge,
											row.triggerStatus === 'mixed'
												? $style.mixedBadge
												: row.triggerStatus === 'enabled'
													? $style.enabledBadge
													: $style.disabledBadge,
										]"
									>
										{{ getHistoricalTriggerStatusLabel(row.triggerStatus) }}
									</span>
								</td>
								<td :class="$style.timeColumn">
									{{ formatHistoricalDateTimeLabel(row.firstStartedAt) }}
								</td>
								<td :class="$style.timeColumn">
									{{ formatHistoricalDateTimeLabel(row.lastStartedAt) }}
								</td>
								<td :class="$style.numericColumn">
									{{ row.startsInRange.toLocaleString('en-US') }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p v-else-if="hasHistoricalRows" :class="$style.tableState">
					{{ i18n.baseText('insights.schedule.table.historicalFilteredEmpty') }}
				</p>
				<p v-else-if="isLoading" :class="$style.tableState">
					{{ i18n.baseText('insights.schedule.table.loading') }}
				</p>
				<p v-else :class="$style.tableState">
					{{ i18n.baseText('insights.schedule.table.historicalEmpty') }}
				</p>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	--schedule-chart--height: 156px;

	padding: var(--spacing--xs) var(--spacing--md) var(--spacing--md);
	display: grid;
	gap: var(--spacing--sm);
	background: var(--color--background--light-3);
	border-bottom-left-radius: 6px;
	border-bottom-right-radius: 6px;
}

.controlsBar {
	display: flex;
	justify-content: flex-start;
	align-items: flex-start;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.modeGroup,
.rangeControls {
	display: grid;
	gap: 2px;
}

.labelWithHint {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.controlsLabel {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1.3;
}

.modeSwitch,
.presetButtons {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 2px;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.03);
	width: fit-content;
	max-width: 100%;
	flex-wrap: wrap;
}

.modeButton,
.presetButton {
	appearance: none;
	border: 0;
	background: transparent;
	border-radius: 999px;
	padding: 5px 10px;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1.2;
	cursor: pointer;
	transition:
		background-color 120ms ease,
		color 120ms ease,
		opacity 120ms ease;

	&:disabled {
		cursor: not-allowed;
	}
}

.modeButtonActive,
.presetButtonActive {
	background: var(--color--primary);
	color: var(--color--text--shade-1);
}

.presetButtonDisabled {
	opacity: 0.48;
}

.modeHint,
.rangeValue {
	margin: 0;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: 1.4;
}

.inlineHintButton {
	appearance: none;
	border: 1px solid rgba(255, 255, 255, 0.14);
	background: rgba(255, 255, 255, 0.03);
	color: var(--color--text--tint-1);
	width: 16px;
	height: 16px;
	border-radius: 999px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	line-height: 1;
	cursor: help;
	flex-shrink: 0;
}

.rangeValue {
	color: var(--color--text-base);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
}

.cards,
.contentSections {
	display: grid;
	gap: var(--spacing--md);
}

.cards {
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: var(--spacing--2xs);
}

.card {
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);
	display: grid;
	gap: 2px;
	align-content: start;

	small {
		color: var(--color--text--tint-1);
		font-size: var(--font-size--2xs);
	}

	strong {
		display: block;
		color: var(--color--text-base);
		font-size: 24px;
		line-height: 1.1;
	}

	min-height: 0;
}

.cardMeta {
	color: var(--color--text--tint-1);
	font-size: 10px;
	line-height: 1.15;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cardLabelRow {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;

	small {
		min-width: 0;
		margin: 0;
	}
}

.timelineSection,
.tableSection {
	display: grid;
	gap: var(--spacing--xs);
}

.dayPanels {
	display: grid;
	gap: var(--spacing--xs);
}

.dayPanel {
	display: grid;
	gap: var(--spacing--2xs);
}

.dayPanels[data-multi-day='true'] {
	gap: 6px;

	.dayPanel {
		grid-template-columns: 88px minmax(0, 1fr);
		align-items: start;
		column-gap: var(--spacing--xs);
		row-gap: 0;
	}

	.dayPanelHeader {
		justify-content: flex-start;
		align-items: flex-end;
		flex-direction: column;
		text-align: right;
		align-self: start;
		padding: var(--spacing--3xs) 0 0;
		gap: 2px;

		strong {
			display: block;
			font-size: var(--font-size--xs);
			line-height: 1.3;
		}
	}
}

.dayPanelHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 2px;

	strong {
		color: var(--color--text-base);
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		line-height: 1.25;
	}
}

.dayPanelToggle {
	flex-shrink: 0;
}

.sectionHeading {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.timelineToolbar {
	justify-content: flex-end;
	min-height: 28px;
}

.tableToolbar {
	justify-content: flex-start;
	min-height: 20px;
}

.sectionDescription {
	margin: var(--spacing--4xs) 0 0;
	color: var(--color--text--tint-1);
	line-height: 1.5;
}

.sectionMeta {
	margin: 0;
	color: var(--color--text-base);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1.4;
	white-space: nowrap;
	align-self: center;
	margin-left: auto;
	padding-top: 2px;
	font-variant-numeric: tabular-nums;
}

.sectionActions {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--xs);
	position: relative;
	justify-self: end;
	flex-shrink: 0;
}

.inlineStatus {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.settingsWrapper {
	position: relative;
}

.settingsPanel {
	position: absolute;
	top: calc(100% + var(--spacing--2xs));
	right: 0;
	width: 320px;
	padding: var(--spacing--md);
	border: 1px solid rgba(255, 255, 255, 0.16);
	border-radius: 8px;
	background: rgba(39, 41, 46, 0.98);
	box-shadow: 0 12px 32px rgba(17, 24, 39, 0.28);
	display: grid;
	gap: var(--spacing--md);
	z-index: 2;
}

.settingsHeader {
	display: grid;
	gap: var(--spacing--4xs);

	strong {
		color: var(--color--text-base);
	}

	p {
		margin: 0;
		color: var(--color--text--tint-1);
		font-size: var(--font-size--2xs);
		line-height: 1.5;
	}
}

.settingsSection {
	display: grid;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground-base);

	h5 {
		margin: 0;
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		color: var(--color--text-base);
	}
}

.settingsFieldLabel {
	color: var(--color--text-base);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.settingsFieldGroup {
	display: grid;
	gap: var(--spacing--2xs);
}

.settingsToggleGroup {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	padding: 2px;
	border: 1px solid rgba(255, 255, 255, 0.12);
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.03);
	width: fit-content;
	max-width: 100%;
	flex-wrap: wrap;
}

.settingsToggleButton {
	appearance: none;
	border: 0;
	background: transparent;
	border-radius: 999px;
	padding: 4px 9px;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1.2;
	cursor: pointer;
}

.settingsToggleButtonActive {
	background: var(--color--primary);
	color: var(--color--text--shade-1);
}

.settingsHint {
	margin: 0;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: 1.5;
}

.settingsCheckboxList {
	display: grid;
	gap: var(--spacing--2xs);
}

.errorBanner,
.warningBanner,
.infoBanner,
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

.warningBanner {
	color: var(--color--warning);
	background: rgba(245, 158, 11, 0.08);
	border-color: rgba(245, 158, 11, 0.28);
}

.infoBanner {
	color: var(--color--primary);
	background: rgba(0, 163, 255, 0.08);
	border-color: rgba(0, 163, 255, 0.24);
}

.placeholderCard {
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);
	display: grid;
	gap: var(--spacing--2xs);

	strong {
		color: var(--color--text-base);
	}

	p {
		margin: 0;
		color: var(--color--text--tint-1);
		line-height: 1.45;
	}
}

.timelineWrapper {
	border: var(--border-width) var(--border-style) var(--color--foreground-base);
	border-radius: 6px;
	background: var(--color--background-xlight);
	min-width: 0;
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--xs) 6px;
	overflow: hidden;
}

.chartShell {
	display: grid;
	grid-template-columns: 22px minmax(0, 1fr);
	gap: 4px;
	align-items: start;
}

.chartShellCompact {
	grid-template-columns: minmax(0, 1fr);
}

.chartYAxis {
	position: relative;
	height: var(--schedule-chart--height);
}

.chartYAxisLabel {
	position: absolute;
	right: 1px;
	transform: translateY(50%);
	font-size: 10px;
	line-height: 1;
	color: var(--color--text--tint-1);
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.chartMain {
	display: grid;
	grid-template-rows: var(--schedule-chart--height) auto;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.chartPlot {
	position: relative;
	min-width: 0;
	padding-top: var(--spacing--xs);
	border-left: 1px solid rgba(255, 255, 255, 0.14);
	border-bottom: 1px solid rgba(255, 255, 255, 0.14);
	overflow: hidden;
}

.chartPlotCompact {
	padding-top: 0;
	border-left: 0;
}

.chartGridLine {
	position: absolute;
	left: 0;
	right: 0;
	border-top: 1px solid rgba(255, 255, 255, 0.14);
	pointer-events: none;
}

.chartBars {
	position: absolute;
	inset: 0 1px 0 0;
	display: grid;
	grid-template-columns: repeat(var(--width--schedule-timeline-slot-count), minmax(0, 1fr));
	align-items: end;
	gap: 3px;
	min-width: 0;
}

.chartBarColumn {
	position: relative;
	display: flex;
	align-items: flex-end;
	justify-content: stretch;
	min-width: 0;
	padding-top: var(--spacing--sm);
}

.chartBarColumnCurrent::before {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(to top, rgba(255, 109, 61, 0.18), transparent 70%);
	border-radius: 3px 3px 0 0;
	pointer-events: none;
}

.chartBarColumnCurrent::after {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: -1px;
	border-top: 3px solid var(--color--primary);
	opacity: 0.95;
	pointer-events: none;
}

.chartBar {
	width: 100%;
	border-radius: 3px 3px 2px 2px;
	transition: height 120ms ease-out;
	min-width: 0;
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.chartBarIdle {
	background: rgba(255, 255, 255, 0.24);
}

.chartBarSuccess {
	background: rgba(49, 196, 159, 0.92);
}

.chartBarWarning {
	background: rgba(245, 196, 76, 0.92);
}

.chartBarAlert {
	background: rgba(245, 159, 0, 0.92);
}

.chartBarDanger {
	background: rgba(214, 69, 69, 0.94);
}

.chartBarOverflow {
	background: rgba(139, 92, 246, 0.94);
}

.chartOverflowLabel {
	position: absolute;
	bottom: calc(100% + 2px);
	left: 50%;
	transform: translateX(-50%);
	font-size: 10px;
	line-height: 1;
	color: var(--color--text--tint-1);
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	pointer-events: none;
}

.chartXAxis {
	display: grid;
	grid-template-columns: repeat(var(--width--schedule-timeline-slot-count), minmax(0, 1fr));
	gap: 2px;
	min-width: 0;
	box-sizing: border-box;
}

.chartXAxisLabel {
	font-size: 10px;
	line-height: 1.2;
	color: var(--color--text--tint-1);
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	padding-top: var(--spacing--2xs);
}

.tableWrapper {
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 6px;
	background: var(--color--background-xlight);
	box-shadow: none;
	min-width: 0;
	overflow-x: auto;
	overflow-y: hidden;
	-webkit-overflow-scrolling: touch;

	table {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	thead {
		background: rgba(255, 255, 255, 0.04);
	}

	th,
	td {
		padding: 5px var(--spacing--sm);
		text-align: left;
		vertical-align: middle;
		overflow: hidden;
	}

	th:first-child,
	td:first-child {
		padding-left: var(--spacing--md);
	}

	th:last-child,
	td:last-child {
		padding-right: var(--spacing--md);
	}

	th {
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
	}

	td {
		color: var(--color--text-base);
		line-height: 1.25;
		border-bottom: 0;
		text-overflow: ellipsis;
	}
}

.tableHeaderContent {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}

.tableHeaderLabelGroup {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.tableHeaderLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.columnResizeHandle {
	appearance: none;
	border: 0;
	background: transparent;
	padding: 0;
	margin-right: -6px;
	width: 12px;
	min-width: 12px;
	align-self: stretch;
	position: relative;
	cursor: col-resize;
	flex-shrink: 0;

	&::before {
		content: '';
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 50%;
		border-left: 1px solid rgba(255, 255, 255, 0.16);
		transform: translateX(-50%);
		transition: border-color 120ms ease;
	}

	&:hover::before,
	&:focus-visible::before {
		border-left-color: rgba(255, 255, 255, 0.34);
	}

	&:focus-visible {
		outline: none;
	}
}

.workflowGroupStart td {
	border-top: 1px solid rgba(255, 255, 255, 0.14);
}

.tableWrapper tbody tr:first-child td {
	border-top: 0;
}

.statusColumn {
	white-space: nowrap;
	text-align: center;
}

.workflowColumn {
	text-align: left;
}

.triggerColumn {
	text-align: left;
}

.logicColumn {
	word-break: break-word;
}

.timezoneColumn {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.timezoneValue {
	display: inline-block;
	font-size: 11px;
	line-height: 1.2;
	letter-spacing: 0.01em;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	vertical-align: middle;
}

.timeColumn {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.numericColumn {
	text-align: right;
	font-variant-numeric: tabular-nums;
}

.workflowCell {
	display: grid;
	gap: 1px;
	min-width: 0;
}

.logicCell {
	display: grid;
	gap: 2px;
	min-width: 0;
}

.rangeSummary {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: 1.35;
}

.workflowLink {
	color: var(--color--text-base);
	font-weight: var(--font-weight--bold);
	text-decoration: underline;
	text-underline-offset: 2px;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.workflowPath {
	color: var(--color--text--tint-1);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.statusBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 1px 6px;
	border-radius: 999px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	max-width: 100%;
}

.activeBadge,
.enabledBadge {
	background: rgba(49, 196, 159, 0.12);
	color: var(--color--success);
}

.inactiveBadge,
.disabledBadge {
	background: var(--color--foreground-xlight);
	color: var(--color--text--tint-1);
}

.mixedBadge {
	background: rgba(245, 196, 76, 0.14);
	color: #f4d35e;
}

@media (max-width: 1024px) {
	.panel {
		padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	}

	.controlsBar {
		align-items: stretch;
	}

	.modeGroup,
	.rangeControls {
		width: 100%;
	}

	.settingsPanel {
		width: 280px;
	}

	.chartShell {
		grid-template-columns: 20px minmax(0, 1fr);
	}

	.tableWrapper {
		overflow-x: auto;
		overflow-y: hidden;

		table {
			min-width: 760px;
		}
	}
}

@media (max-width: 768px) {
	.panel {
		--schedule-chart--height: 132px;
	}

	.dayPanels[data-multi-day='true'] {
		.dayPanel {
			grid-template-columns: 1fr;
			gap: var(--spacing--2xs);
		}

		.dayPanelHeader {
			align-items: center;
			justify-content: space-between;
			flex-direction: row;
			text-align: left;
			padding-top: 0;
		}
	}

	.cards {
		grid-template-columns: 1fr;
	}

	.timelineWrapper {
		padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) 4px;
	}

	.sectionMeta {
		width: 100%;
		margin-left: 0;
	}

	.settingsPanel {
		left: 0;
		right: auto;
		width: min(280px, calc(100vw - var(--spacing--lg) * 2));
	}

	.tableWrapper {
		overflow-x: auto;

		th,
		td {
			padding: 6px var(--spacing--xs);
		}

		table {
			min-width: 720px;
		}
	}

	.card {
		padding: var(--spacing--sm);

		strong {
			font-size: 24px;
		}
	}
}
</style>
