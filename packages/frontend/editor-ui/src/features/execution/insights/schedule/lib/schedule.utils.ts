import { type CronExpression, type INode, type TriggerTime } from 'n8n-workflow';
import { DateTime } from 'luxon';
import type {
	ScheduleExecutionRecord,
	ScheduleExecutionStats,
	ScheduleHeatmapCell,
	ScheduleHeatmapCellTrigger,
	ScheduleHistoricalExecution,
	ScheduleHistoricalWorkflowRow,
	ScheduleInterval,
	ScheduleOverviewStats,
	ScheduleTriggerClass,
	ScheduleTriggerDefinition,
	ScheduleTriggerRow,
	ScheduleTriggerSource,
	ScheduleTimezoneSource,
} from './types';

interface ParsedCronField {
	wildcard: boolean;
	values: number[];
}

export interface ParsedCronExpression {
	seconds: ParsedCronField;
	minutes: ParsedCronField;
	hours: ParsedCronField;
	dayOfMonth: ParsedCronField;
	month: ParsedCronField;
	dayOfWeek: ParsedCronField;
}

interface MutableScheduleHeatmapCell {
	slotStart: Date;
	slotEnd: Date;
	activationCount: number;
	triggers: Map<string, ScheduleHeatmapCellTrigger>;
}

interface RawScheduleInterval extends Partial<ScheduleInterval> {
	field?: unknown;
	expression?: unknown;
	cronExpression?: unknown;
	mode?: unknown;
	unit?: unknown;
	value?: unknown;
	hour?: unknown;
	minute?: unknown;
	weekday?: unknown;
	dayOfMonth?: unknown;
}

interface HourScheduleInterval {
	field: 'hours';
	hoursInterval: number;
	triggerAtHour?: number;
	triggerAtMinute?: number;
}

interface ZonedDateTimeParts {
	month: number;
	dayOfMonth: number;
	dayOfWeek: number;
	hour: number;
	minute: number;
}

const MONTH_ALIASES: Record<string, number> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
};

const WEEKDAY_ALIASES: Record<string, number> = {
	sun: 0,
	mon: 1,
	tue: 2,
	wed: 3,
	thu: 4,
	fri: 5,
	sat: 6,
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SCHEDULE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.scheduleTrigger';
export const CRON_TRIGGER_NODE_TYPE = 'n8n-nodes-base.cron';
export const INTERVAL_TRIGGER_NODE_TYPE = 'n8n-nodes-base.interval';
export const SUPPORTED_SCHEDULE_NODE_TYPES = [
	SCHEDULE_TRIGGER_NODE_TYPE,
	CRON_TRIGGER_NODE_TYPE,
	INTERVAL_TRIGGER_NODE_TYPE,
] as const;

const DEFAULT_SCHEDULE_TRIGGER_INTERVAL: ScheduleInterval = {
	field: 'days',
	daysInterval: 1,
	triggerAtHour: 0,
	triggerAtMinute: 0,
};

const normalizeStep = (value: number): string => (value === 1 ? '*' : `*/${value}`);

const padTimePart = (value = 0) => `${value}`.padStart(2, '0');

const formatTime = (hour = 0, minute = 0) => `${padTimePart(hour)}:${padTimePart(minute)}`;

const pluralize = (value: number, singular: string, plural = `${singular}s`) =>
	value === 1 ? singular : plural;

const normalizeWeekday = (value: number) => (value === 7 ? 0 : value);

const parseCronValue = (
	rawValue: string,
	min: number,
	max: number,
	aliases?: Record<string, number>,
): number => {
	const normalized = rawValue.toLowerCase();
	const aliasValue = aliases?.[normalized];
	const parsedValue = aliasValue ?? Number.parseInt(normalized, 10);

	if (Number.isNaN(parsedValue)) {
		throw new Error(`Unsupported cron token: ${rawValue}`);
	}

	const value = aliases === WEEKDAY_ALIASES ? normalizeWeekday(parsedValue) : parsedValue;
	if (value < min || value > max) {
		throw new Error(`Cron value out of range: ${rawValue}`);
	}

	return value;
};

const parseCronField = (
	field: string,
	min: number,
	max: number,
	aliases?: Record<string, number>,
): ParsedCronField => {
	const normalizedField = field.trim().toLowerCase();
	if (normalizedField === '*') {
		return { wildcard: true, values: [] };
	}

	const values = new Set<number>();

	for (const segment of normalizedField.split(',')) {
		const [rangePart, stepPart] = segment.split('/');
		const step = stepPart ? Number.parseInt(stepPart, 10) : 1;
		if (Number.isNaN(step) || step < 1) {
			throw new Error(`Invalid cron step: ${segment}`);
		}

		const isWildcardRange = rangePart === '*';
		const [rawStart, rawEnd] = isWildcardRange ? [String(min), String(max)] : rangePart.split('-');
		const start = parseCronValue(rawStart, min, max, aliases);
		const end = rawEnd ? parseCronValue(rawEnd, min, max, aliases) : start;

		if (start > end) {
			throw new Error(`Unsupported descending cron range: ${segment}`);
		}

		for (let value = start; value <= end; value += step) {
			values.add(aliases === WEEKDAY_ALIASES ? normalizeWeekday(value) : value);
		}
	}

	return { wildcard: false, values: [...values].sort((left, right) => left - right) };
};

const normalizeCronExpression = (expression: string): string[] => {
	const parts = expression.trim().split(/\s+/);
	if (parts.length === 5) {
		return ['0', ...parts];
	}

	if (parts.length !== 6) {
		throw new Error(`Unsupported cron expression: ${expression}`);
	}

	return parts;
};

const isValidTimeZone = (value: string) => DateTime.now().setZone(value).isValid;

const normalizeWorkflowTimezone = (value: unknown, instanceTimezone: string) => {
	if (typeof value === 'string') {
		const trimmedValue = value.trim();
		if (trimmedValue !== '' && trimmedValue !== 'DEFAULT' && isValidTimeZone(trimmedValue)) {
			return {
				effectiveTimezone: trimmedValue,
				timezoneSource: 'workflow' as ScheduleTimezoneSource,
			};
		}
	}

	return {
		effectiveTimezone: isValidTimeZone(instanceTimezone) ? instanceTimezone : 'UTC',
		timezoneSource: 'instance' as ScheduleTimezoneSource,
	};
};

const getZonedDateTimeParts = (date: Date, timeZone: string): ZonedDateTimeParts => {
	const zonedDateTime = DateTime.fromJSDate(date, { zone: timeZone });

	return {
		month: zonedDateTime.month,
		dayOfMonth: zonedDateTime.day,
		dayOfWeek: normalizeWeekday(zonedDateTime.weekday % 7),
		hour: zonedDateTime.hour,
		minute: zonedDateTime.minute,
	};
};

const hasMatchingValue = (field: ParsedCronField, value: number) =>
	field.wildcard || field.values.includes(value);

const getMatchingSecondsInWindow = (
	field: ParsedCronField,
	secondStart: number,
	secondEndExclusive: number,
) => {
	if (secondStart >= secondEndExclusive) {
		return [];
	}

	if (field.wildcard) {
		return Array.from(
			{ length: secondEndExclusive - secondStart },
			(_, index) => secondStart + index,
		);
	}

	return field.values.filter((value) => value >= secondStart && value < secondEndExclusive);
};

const hasMatchingSecondInWindow = (
	field: ParsedCronField,
	secondStart: number,
	secondEndExclusive: number,
) => getMatchingSecondsInWindow(field, secondStart, secondEndExclusive).length > 0;

const matchesCalendarDay = (cron: ParsedCronExpression, dateParts: ZonedDateTimeParts) => {
	const dayOfMonthMatches = hasMatchingValue(cron.dayOfMonth, dateParts.dayOfMonth);
	const dayOfWeekMatches = hasMatchingValue(cron.dayOfWeek, dateParts.dayOfWeek);

	if (!cron.dayOfMonth.wildcard && !cron.dayOfWeek.wildcard) {
		return dayOfMonthMatches || dayOfWeekMatches;
	}

	if (!cron.dayOfMonth.wildcard) {
		return dayOfMonthMatches;
	}

	if (!cron.dayOfWeek.wildcard) {
		return dayOfWeekMatches;
	}

	return true;
};

const matchesMinute = (cron: ParsedCronExpression, dateParts: ZonedDateTimeParts) => {
	if (!hasMatchingValue(cron.month, dateParts.month)) {
		return false;
	}

	if (!matchesCalendarDay(cron, dateParts)) {
		return false;
	}

	if (!hasMatchingValue(cron.hours, dateParts.hour)) {
		return false;
	}

	return hasMatchingValue(cron.minutes, dateParts.minute);
};

const hasIntervalField = (value: unknown): value is ScheduleInterval['field'] =>
	typeof value === 'string' &&
	['cronExpression', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months'].includes(value);

const normalizeOptionalInteger = (value: unknown, min = 0) => {
	const parsed =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim() !== ''
				? Number.parseInt(value, 10)
				: Number.NaN;

	if (!Number.isFinite(parsed) || parsed < min) {
		return null;
	}

	return parsed;
};

const normalizeInteger = (value: unknown, fallback: number, min = 0) => {
	const parsed =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim() !== ''
				? Number.parseInt(value, 10)
				: Number.NaN;

	if (!Number.isFinite(parsed) || parsed < min) {
		return fallback;
	}

	return parsed;
};

const inferScheduleIntervalField = (
	interval: RawScheduleInterval,
): ScheduleInterval['field'] | undefined => {
	if (typeof interval.expression === 'string' || typeof interval.cronExpression === 'string') {
		return 'cronExpression';
	}

	if (normalizeOptionalInteger(interval.secondsInterval, 1) !== null) {
		return 'seconds';
	}

	if (normalizeOptionalInteger(interval.minutesInterval, 1) !== null) {
		return 'minutes';
	}

	if (normalizeOptionalInteger(interval.hoursInterval, 1) !== null) {
		return 'hours';
	}

	if (normalizeOptionalInteger(interval.daysInterval, 1) !== null) {
		return 'days';
	}

	if (
		normalizeOptionalInteger(interval.weeksInterval, 1) !== null ||
		interval.triggerAtDay !== undefined ||
		interval.weekday !== undefined
	) {
		return 'weeks';
	}

	if (
		normalizeOptionalInteger(interval.monthsInterval, 1) !== null ||
		interval.triggerAtDayOfMonth !== undefined ||
		interval.dayOfMonth !== undefined
	) {
		return 'months';
	}

	if (
		interval.triggerAtHour !== undefined ||
		interval.hour !== undefined ||
		interval.triggerAtMinute !== undefined ||
		interval.minute !== undefined
	) {
		return 'days';
	}

	return undefined;
};

const normalizeWeekdays = (value: unknown) => {
	if (!Array.isArray(value)) {
		return [0];
	}

	const weekdays = [
		...new Set(
			value
				.map((weekday) => normalizeWeekday(normalizeInteger(weekday, Number.NaN)))
				.filter((weekday) => Number.isFinite(weekday)),
		),
	].sort((left, right) => left - right);

	return weekdays.length > 0 ? weekdays : [0];
};

const normalizeLegacyScheduleTriggerInterval = (
	interval: RawScheduleInterval,
): ScheduleInterval | null => {
	if (typeof interval.mode !== 'string') {
		return null;
	}

	switch (interval.mode) {
		case 'custom': {
			const expressionSource =
				typeof interval.expression === 'string'
					? interval.expression
					: typeof interval.cronExpression === 'string'
						? interval.cronExpression
						: '';
			const expression = expressionSource.trim();

			return expression
				? { field: 'cronExpression', expression: expression as CronExpression }
				: null;
		}
		case 'everyMinute':
			return { field: 'minutes', minutesInterval: 1 };
		case 'everyHour':
			return {
				field: 'hours',
				hoursInterval: 1,
				triggerAtMinute: normalizeInteger(interval.minute, 0, 0),
			};
		case 'everyX':
			if (interval.unit === 'minutes') {
				return {
					field: 'minutes',
					minutesInterval: normalizeInteger(interval.value, 1, 1),
				};
			}

			if (interval.unit === 'hours') {
				return {
					field: 'hours',
					hoursInterval: normalizeInteger(interval.value, 1, 1),
					triggerAtMinute: 0,
				};
			}

			return null;
		case 'everyDay':
			return {
				field: 'days',
				daysInterval: 1,
				triggerAtHour: normalizeInteger(interval.hour, 0, 0),
				triggerAtMinute: normalizeInteger(interval.minute, 0, 0),
			};
		case 'everyWeek':
			return {
				field: 'weeks',
				weeksInterval: 1,
				triggerAtDay: normalizeWeekdays([interval.weekday]),
				triggerAtHour: normalizeInteger(interval.hour, 0, 0),
				triggerAtMinute: normalizeInteger(interval.minute, 0, 0),
			};
		case 'everyMonth':
			return {
				field: 'months',
				monthsInterval: 1,
				triggerAtDayOfMonth: normalizeInteger(interval.dayOfMonth, 1, 1),
				triggerAtHour: normalizeInteger(interval.hour, 0, 0),
				triggerAtMinute: normalizeInteger(interval.minute, 0, 0),
			};
		default:
			return null;
	}
};

const normalizeScheduleTriggerInterval = (value: unknown): ScheduleInterval | null => {
	if (typeof value !== 'object' || value === null) {
		return null;
	}

	const interval = value as RawScheduleInterval;
	if (!hasIntervalField(interval.field)) {
		const legacyInterval = normalizeLegacyScheduleTriggerInterval(interval);
		if (legacyInterval) {
			return legacyInterval;
		}
	}

	const field = hasIntervalField(interval.field)
		? interval.field
		: inferScheduleIntervalField(interval);

	if (!field) {
		return { ...DEFAULT_SCHEDULE_TRIGGER_INTERVAL };
	}

	switch (field) {
		case 'cronExpression': {
			const expressionSource =
				typeof interval.expression === 'string'
					? interval.expression
					: typeof interval.cronExpression === 'string'
						? interval.cronExpression
						: '';
			const expression = expressionSource.trim();
			return expression ? { field, expression: expression as CronExpression } : null;
		}
		case 'seconds':
			return {
				field,
				secondsInterval: normalizeInteger(interval.secondsInterval, 30, 1),
			};
		case 'minutes':
			return {
				field,
				minutesInterval: normalizeInteger(interval.minutesInterval, 5, 1),
			};
		case 'hours': {
			const triggerAtHour = normalizeOptionalInteger(interval.triggerAtHour ?? interval.hour, 0);
			const triggerAtMinute = normalizeInteger(interval.triggerAtMinute ?? interval.minute, 0, 0);
			const fallbackHoursInterval = triggerAtHour !== null ? 24 : 1;

			return {
				field,
				hoursInterval: normalizeInteger(interval.hoursInterval, fallbackHoursInterval, 1),
				triggerAtMinute,
				...(triggerAtHour !== null ? { triggerAtHour } : {}),
			};
		}
		case 'days':
			return {
				field,
				daysInterval: normalizeInteger(interval.daysInterval, 1, 1),
				triggerAtHour: normalizeInteger(interval.triggerAtHour ?? interval.hour, 0, 0),
				triggerAtMinute: normalizeInteger(interval.triggerAtMinute ?? interval.minute, 0, 0),
			};
		case 'weeks': {
			const triggerAtDay =
				Array.isArray(interval.triggerAtDay) || interval.triggerAtDay !== undefined
					? normalizeWeekdays(
							Array.isArray(interval.triggerAtDay)
								? interval.triggerAtDay
								: [interval.triggerAtDay],
						)
					: normalizeWeekdays(interval.weekday !== undefined ? [interval.weekday] : undefined);

			return {
				field,
				weeksInterval: normalizeInteger(interval.weeksInterval, 1, 1),
				triggerAtDay,
				triggerAtHour: normalizeInteger(interval.triggerAtHour ?? interval.hour, 0, 0),
				triggerAtMinute: normalizeInteger(interval.triggerAtMinute ?? interval.minute, 0, 0),
			};
		}
		case 'months':
			return {
				field,
				monthsInterval: normalizeInteger(interval.monthsInterval, 1, 1),
				triggerAtDayOfMonth: normalizeInteger(
					interval.triggerAtDayOfMonth ?? interval.dayOfMonth,
					1,
					1,
				),
				triggerAtHour: normalizeInteger(interval.triggerAtHour ?? interval.hour, 0, 0),
				triggerAtMinute: normalizeInteger(interval.triggerAtMinute ?? interval.minute, 0, 0),
			};
	}
};

const isNodeArray = (
	value: unknown,
): value is Array<Pick<INode, 'id' | 'type' | 'parameters' | 'name' | 'disabled'>> =>
	Array.isArray(value);

const getNodeTriggerSource = (nodeType: string): ScheduleTriggerSource => {
	if (nodeType === SCHEDULE_TRIGGER_NODE_TYPE) {
		return 'scheduleTrigger';
	}

	if (nodeType === CRON_TRIGGER_NODE_TYPE) {
		return 'cron';
	}

	if (nodeType === INTERVAL_TRIGGER_NODE_TYPE) {
		return 'interval';
	}

	return 'unknown';
};

const triggerTimeToScheduleInterval = (triggerTime: TriggerTime): ScheduleInterval => {
	if (triggerTime.mode === 'custom') {
		return {
			field: 'cronExpression',
			expression: triggerTime.cronExpression.trim() as CronExpression,
		};
	}

	if (triggerTime.mode === 'everyMinute') {
		return { field: 'minutes', minutesInterval: 1 };
	}

	if (triggerTime.mode === 'everyX' && triggerTime.unit === 'minutes') {
		return { field: 'minutes', minutesInterval: triggerTime.value };
	}

	if (triggerTime.mode === 'everyHour') {
		return {
			field: 'hours',
			hoursInterval: 1,
			triggerAtMinute: triggerTime.minute,
		};
	}

	if (triggerTime.mode === 'everyX' && triggerTime.unit === 'hours') {
		return {
			field: 'hours',
			hoursInterval: triggerTime.value,
			triggerAtMinute: 0,
		};
	}

	if (triggerTime.mode === 'everyDay') {
		return {
			field: 'days',
			daysInterval: 1,
			triggerAtHour: triggerTime.hour,
			triggerAtMinute: triggerTime.minute,
		};
	}

	if (triggerTime.mode === 'everyWeek') {
		return {
			field: 'weeks',
			weeksInterval: 1,
			triggerAtDay: [triggerTime.weekday],
			triggerAtHour: triggerTime.hour,
			triggerAtMinute: triggerTime.minute,
		};
	}

	return {
		field: 'months',
		monthsInterval: 1,
		triggerAtDayOfMonth: triggerTime.dayOfMonth,
		triggerAtHour: triggerTime.hour,
		triggerAtMinute: triggerTime.minute,
	};
};

const listCronExpressionHitsWithParsed = (
	cron: ParsedCronExpression,
	windowStart: Date,
	windowEnd: Date,
	timeZone = 'UTC',
) => {
	if (windowEnd.getTime() <= windowStart.getTime()) {
		return [];
	}

	const hits: Date[] = [];
	const current = new Date(windowStart.getTime());
	current.setUTCSeconds(0, 0);

	while (current.getTime() < windowEnd.getTime()) {
		if (matchesMinute(cron, getZonedDateTimeParts(current, timeZone))) {
			const minuteStartMs = current.getTime();
			const minuteEndMs = minuteStartMs + 60_000;
			const candidateStartMs = Math.max(windowStart.getTime(), minuteStartMs);
			const candidateEndMs = Math.min(windowEnd.getTime(), minuteEndMs);
			const secondStart = Math.ceil((candidateStartMs - minuteStartMs) / 1000);
			const secondEndExclusive = Math.ceil((candidateEndMs - minuteStartMs) / 1000);

			for (const second of getMatchingSecondsInWindow(
				cron.seconds,
				secondStart,
				secondEndExclusive,
			)) {
				hits.push(new Date(minuteStartMs + second * 1000));
			}
		}

		current.setUTCMinutes(current.getUTCMinutes() + 1, 0, 0);
	}

	return hits;
};

const createEmptyScheduleHeatmapCells = (
	start: Date,
	end: Date,
	slotMinutes: number,
): MutableScheduleHeatmapCell[] => {
	if (slotMinutes < 1) {
		throw new Error('slotMinutes must be greater than 0');
	}

	if (end.getTime() <= start.getTime()) {
		return [];
	}

	const slotDurationMs = slotMinutes * 60_000;
	const slotCount = Math.ceil((end.getTime() - start.getTime()) / slotDurationMs);

	return Array.from({ length: slotCount }, (_, index) => {
		const slotStartMs = start.getTime() + index * slotDurationMs;
		const slotEndMs = Math.min(slotStartMs + slotDurationMs, end.getTime());

		return {
			slotStart: new Date(slotStartMs),
			slotEnd: new Date(slotEndMs),
			activationCount: 0,
			triggers: new Map<string, ScheduleHeatmapCellTrigger>(),
		};
	});
};

const serializeScheduleHeatmapCells = (
	mutableCells: MutableScheduleHeatmapCell[],
): ScheduleHeatmapCell[] =>
	mutableCells.map((cell) => ({
		slotStart: cell.slotStart.toISOString(),
		slotEnd: cell.slotEnd.toISOString(),
		activationCount: cell.activationCount,
		triggerCount: cell.triggers.size,
		triggers: [...cell.triggers.values()].sort(
			(left, right) =>
				right.activationCount - left.activationCount ||
				left.workflowName.localeCompare(right.workflowName) ||
				left.triggerName.localeCompare(right.triggerName),
		),
	}));

export const parseCronExpression = (expression: string): ParsedCronExpression => {
	const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] =
		normalizeCronExpression(expression);

	return {
		seconds: parseCronField(seconds, 0, 59),
		minutes: parseCronField(minutes, 0, 59),
		hours: parseCronField(hours, 0, 23),
		dayOfMonth: parseCronField(dayOfMonth, 1, 31),
		month: parseCronField(month, 1, 12, MONTH_ALIASES),
		dayOfWeek: parseCronField(dayOfWeek, 0, 6, WEEKDAY_ALIASES),
	};
};

export const extractScheduleIntervalsFromNode = (
	node: Pick<INode, 'type' | 'parameters'>,
): ScheduleInterval[] => {
	if (node.type === SCHEDULE_TRIGGER_NODE_TYPE) {
		const maybeIntervals = (node.parameters as { rule?: { interval?: unknown } } | undefined)?.rule
			?.interval;
		const normalizedIntervals = Array.isArray(maybeIntervals)
			? maybeIntervals
			: maybeIntervals && typeof maybeIntervals === 'object'
				? [maybeIntervals]
				: [];

		if (normalizedIntervals.length === 0) {
			return [{ ...DEFAULT_SCHEDULE_TRIGGER_INTERVAL }];
		}

		return normalizedIntervals
			.map((interval) => normalizeScheduleTriggerInterval(interval))
			.filter((interval): interval is ScheduleInterval => interval !== null);
	}

	if (node.type === CRON_TRIGGER_NODE_TYPE) {
		const triggerTimes =
			(node.parameters as { triggerTimes?: { item?: TriggerTime[] } } | undefined)?.triggerTimes
				?.item ?? [];

		return triggerTimes.map((triggerTime) => triggerTimeToScheduleInterval(triggerTime));
	}

	if (node.type === INTERVAL_TRIGGER_NODE_TYPE) {
		const parameters = node.parameters as
			| {
					interval?: number;
					unit?: 'seconds' | 'minutes' | 'hours';
			  }
			| undefined;
		const interval = parameters?.interval;
		const unit = parameters?.unit;

		if (!interval || !unit) {
			return [];
		}

		if (unit === 'seconds') {
			return [{ field: 'seconds', secondsInterval: interval }];
		}

		if (unit === 'minutes') {
			return [{ field: 'minutes', minutesInterval: interval }];
		}

		return [{ field: 'hours', hoursInterval: interval }];
	}

	return [];
};

export const buildScheduleTriggerDefinitions = (
	workflows: Array<{
		id: string;
		name: string;
		active?: boolean;
		homeProject?: { name: string } | null;
		settings?: { timezone?: string };
		nodes?: unknown;
	}>,
	options: { instanceTimezone: string },
): ScheduleTriggerDefinition[] =>
	workflows
		.flatMap((workflow) => {
			const nodes = isNodeArray(workflow.nodes) ? workflow.nodes : [];
			const { effectiveTimezone, timezoneSource } = normalizeWorkflowTimezone(
				workflow.settings?.timezone,
				options.instanceTimezone,
			);

			return nodes.flatMap((node, nodeIndex) => {
				const intervals = extractScheduleIntervalsFromNode(node);
				if (intervals.length === 0) {
					return [];
				}

				const baseTriggerName = node.name?.trim() || `Trigger ${nodeIndex + 1}`;
				const triggerSource = getNodeTriggerSource(node.type);
				const nodeIdentifier =
					typeof node.id === 'string' && node.id.trim() !== '' ? node.id : `${nodeIndex}`;

				return intervals.map((interval, intervalIndex) => ({
					triggerId: `${workflow.id}:${nodeIdentifier}:${intervalIndex}`,
					workflowId: workflow.id,
					workflowName: workflow.name,
					triggerName:
						intervals.length > 1 ? `${baseTriggerName} ${intervalIndex + 1}` : baseTriggerName,
					projectName: workflow.homeProject?.name ?? null,
					workflowActive: workflow.active ?? false,
					triggerActive: node.disabled !== true,
					triggerSource,
					effectiveTimezone,
					timezoneSource,
					interval,
				}));
			});
		})
		.sort((left, right) => {
			return (
				left.workflowName.localeCompare(right.workflowName) ||
				left.triggerName.localeCompare(right.triggerName)
			);
		});

export const toScheduleCronExpression = (interval: ScheduleInterval): CronExpression => {
	if (interval.field === 'cronExpression') {
		return interval.expression;
	}

	if (interval.field === 'seconds') {
		return `*/${interval.secondsInterval} * * * * *` as CronExpression;
	}

	if (interval.field === 'minutes') {
		return `0 ${normalizeStep(interval.minutesInterval)} * * * *` as CronExpression;
	}

	const minute = interval.triggerAtMinute ?? 0;
	if (interval.field === 'hours') {
		if (interval.triggerAtHour !== undefined && interval.hoursInterval % 24 === 0) {
			return `0 ${minute} ${interval.triggerAtHour} * * *` as CronExpression;
		}

		return `0 ${minute} ${normalizeStep(interval.hoursInterval)} * * *` as CronExpression;
	}

	const hour = interval.triggerAtHour ?? 0;
	if (interval.field === 'days') {
		return `0 ${minute} ${hour} * * *` as CronExpression;
	}

	if (interval.field === 'weeks') {
		const days = interval.triggerAtDay.length > 0 ? interval.triggerAtDay.join(',') : '*';
		return `0 ${minute} ${hour} * * ${days}` as CronExpression;
	}

	const dayOfMonth = interval.triggerAtDayOfMonth ?? 1;
	return `0 ${minute} ${hour} ${dayOfMonth} ${normalizeStep(interval.monthsInterval)} *` as CronExpression;
};

export const getScheduleTriggerClass = (interval: ScheduleInterval): ScheduleTriggerClass => {
	if (interval.field === 'cronExpression') {
		return 'custom-cron';
	}

	if (interval.field === 'seconds' || interval.field === 'minutes' || interval.field === 'hours') {
		return 'fixed-interval';
	}

	return 'calendar';
};

export const describeScheduleInterval = (interval: ScheduleInterval): string => {
	if (interval.field === 'cronExpression') {
		return `Custom cron (${interval.expression})`;
	}

	if (interval.field === 'seconds') {
		return `Every ${interval.secondsInterval} ${pluralize(interval.secondsInterval, 'second')}`;
	}

	if (interval.field === 'minutes') {
		return `Every ${interval.minutesInterval} ${pluralize(interval.minutesInterval, 'minute')}`;
	}

	if (interval.field === 'hours') {
		const triggerAtHour =
			'triggerAtHour' in interval && typeof interval.triggerAtHour === 'number'
				? interval.triggerAtHour
				: null;

		if (triggerAtHour !== null) {
			if (interval.hoursInterval % 24 === 0) {
				const daysInterval = interval.hoursInterval / 24;
				return `Every ${daysInterval} ${pluralize(daysInterval, 'day')} at ${formatTime(triggerAtHour, interval.triggerAtMinute)}`;
			}

			return `Every ${interval.hoursInterval} ${pluralize(interval.hoursInterval, 'hour')} starting at ${formatTime(triggerAtHour, interval.triggerAtMinute)}`;
		}

		return `Every ${interval.hoursInterval} ${pluralize(interval.hoursInterval, 'hour')} at minute ${padTimePart(interval.triggerAtMinute)}`;
	}

	if (interval.field === 'days') {
		return `Every ${interval.daysInterval} ${pluralize(interval.daysInterval, 'day')} at ${formatTime(interval.triggerAtHour, interval.triggerAtMinute)}`;
	}

	if (interval.field === 'weeks') {
		const days = interval.triggerAtDay.length
			? interval.triggerAtDay.map((day) => WEEKDAY_LABELS[normalizeWeekday(day)]).join(', ')
			: 'every day';
		return `Every ${interval.weeksInterval} ${pluralize(interval.weeksInterval, 'week')} on ${days} at ${formatTime(interval.triggerAtHour, interval.triggerAtMinute)}`;
	}

	return `Every ${interval.monthsInterval} ${pluralize(interval.monthsInterval, 'month')} on day ${interval.triggerAtDayOfMonth ?? 1} at ${formatTime(interval.triggerAtHour, interval.triggerAtMinute)}`;
};

const listHourIntervalHits = (
	interval: HourScheduleInterval,
	windowStart: Date,
	windowEnd: Date,
	timeZone = 'UTC',
) => {
	if (windowEnd.getTime() <= windowStart.getTime()) {
		return [];
	}

	const hits: Date[] = [];
	const anchorHour = typeof interval.triggerAtHour === 'number' ? interval.triggerAtHour : 0;
	const anchorMinute = interval.triggerAtMinute ?? 0;
	let current = DateTime.fromJSDate(windowStart, { zone: timeZone }).startOf('day').set({
		hour: anchorHour,
		minute: anchorMinute,
		second: 0,
		millisecond: 0,
	});

	while (current.toUTC().toMillis() > windowStart.getTime()) {
		current = current.minus({ hours: interval.hoursInterval });
	}

	while (current.toUTC().toMillis() < windowStart.getTime()) {
		current = current.plus({ hours: interval.hoursInterval });
	}

	while (current.toUTC().toMillis() < windowEnd.getTime()) {
		hits.push(current.toUTC().toJSDate());
		current = current.plus({ hours: interval.hoursInterval });
	}

	return hits;
};

const listScheduleIntervalHits = (
	interval: ScheduleInterval,
	windowStart: Date,
	windowEnd: Date,
	timeZone = 'UTC',
) => {
	if (interval.field === 'hours') {
		return listHourIntervalHits(interval as HourScheduleInterval, windowStart, windowEnd, timeZone);
	}

	const cronExpression = toScheduleCronExpression(interval);
	return listCronExpressionHitsWithParsed(
		parseCronExpression(cronExpression),
		windowStart,
		windowEnd,
		timeZone,
	);
};

export const buildScheduleOverview = (
	triggers: ScheduleTriggerDefinition[],
	heatmapCells: ScheduleHeatmapCell[],
): ScheduleOverviewStats => {
	const scheduledActivations = heatmapCells.reduce(
		(total, cell) => total + cell.activationCount,
		0,
	);
	const busiestSlotActivations = heatmapCells.reduce(
		(maximum, cell) => Math.max(maximum, cell.activationCount),
		0,
	);

	return {
		trackedWorkflows: new Set(triggers.map((trigger) => trigger.workflowId)).size,
		scheduledActivations,
		busiestSlotActivations,
	};
};

export const buildScheduleTimelineData = (
	triggers: ScheduleTriggerDefinition[],
	options: { start: Date; end: Date; slotMinutes: number; upcomingFrom?: Date },
): { heatmapCells: ScheduleHeatmapCell[]; rows: ScheduleTriggerRow[] } => {
	const mutableCells = createEmptyScheduleHeatmapCells(
		options.start,
		options.end,
		options.slotMinutes,
	);
	const upcomingThresholdMs = options.upcomingFrom?.getTime() ?? Number.NEGATIVE_INFINITY;

	const rows: ScheduleTriggerRow[] = triggers.map((trigger: ScheduleTriggerDefinition) => {
		const triggerLogic = describeScheduleInterval(trigger.interval);
		const workflowActive = Boolean(trigger.workflowActive);
		const triggerActive = Boolean(trigger.triggerActive);
		const isTriggerEffective = workflowActive && triggerActive;

		if (!isTriggerEffective) {
			return {
				triggerId: trigger.triggerId,
				workflowId: trigger.workflowId,
				workflowName: trigger.workflowName,
				triggerName: trigger.triggerName,
				projectName: trigger.projectName,
				workflowActive,
				triggerActive,
				triggerLogic,
				triggerSource: trigger.triggerSource,
				effectiveTimezone: trigger.effectiveTimezone,
				timezoneSource: trigger.timezoneSource,
				cronExpression: toScheduleCronExpression(trigger.interval),
				nextActivation: null,
				firstActivationInRange: null,
				lastActivationInRange: null,
				activationsInRange: 0,
			};
		}

		const cronExpression = toScheduleCronExpression(trigger.interval);
		let activationsInRange = 0;
		let nextActivation: string | null = null;
		let firstActivationInRange: string | null = null;
		let lastActivationInRange: string | null = null;

		for (const cell of mutableCells) {
			const activationTimes = listScheduleIntervalHits(
				trigger.interval,
				cell.slotStart,
				cell.slotEnd,
				trigger.effectiveTimezone,
			);
			if (activationTimes.length === 0) {
				continue;
			}

			const firstHitInCell = activationTimes[0]?.toISOString() ?? null;
			const lastHitInCell = activationTimes[activationTimes.length - 1]?.toISOString() ?? null;
			const hitCount = activationTimes.length;
			activationsInRange += hitCount;

			if (firstActivationInRange === null) {
				firstActivationInRange = firstHitInCell;
			}

			if (lastHitInCell !== null) {
				lastActivationInRange = lastHitInCell;
			}

			if (nextActivation === null) {
				const nextHit = activationTimes.find(
					(activationTime) => activationTime.getTime() >= upcomingThresholdMs,
				);
				if (nextHit) {
					nextActivation = nextHit.toISOString();
				}
			}

			cell.activationCount += hitCount;

			const existingTrigger = cell.triggers.get(trigger.triggerId) ?? {
				triggerId: trigger.triggerId,
				workflowId: trigger.workflowId,
				workflowName: trigger.workflowName,
				triggerName: trigger.triggerName,
				activationCount: 0,
			};

			existingTrigger.activationCount += hitCount;
			cell.triggers.set(trigger.triggerId, existingTrigger);
		}

		return {
			triggerId: trigger.triggerId,
			workflowId: trigger.workflowId,
			workflowName: trigger.workflowName,
			triggerName: trigger.triggerName,
			projectName: trigger.projectName,
			workflowActive,
			triggerActive,
			triggerLogic,
			triggerSource: trigger.triggerSource,
			effectiveTimezone: trigger.effectiveTimezone,
			timezoneSource: trigger.timezoneSource,
			cronExpression,
			nextActivation,
			firstActivationInRange,
			lastActivationInRange,
			activationsInRange,
		};
	});

	return {
		heatmapCells: serializeScheduleHeatmapCells(mutableCells),
		rows,
	};
};

export const buildScheduleHistoricalTimelineData = (
	executions: ScheduleHistoricalExecution[],
	options: { start: Date; end: Date; slotMinutes: number; triggerName?: string },
): ScheduleHeatmapCell[] => {
	const mutableCells = createEmptyScheduleHeatmapCells(
		options.start,
		options.end,
		options.slotMinutes,
	);

	if (mutableCells.length === 0) {
		return [];
	}

	const slotDurationMs = options.slotMinutes * 60_000;
	const timelineStartMs = options.start.getTime();
	const timelineEndMs = options.end.getTime();

	for (const execution of executions) {
		const startedAt = new Date(execution.startedAt);
		const startedAtMs = startedAt.getTime();

		if (
			!Number.isFinite(startedAtMs) ||
			startedAtMs < timelineStartMs ||
			startedAtMs >= timelineEndMs
		) {
			continue;
		}

		const slotIndex = Math.floor((startedAtMs - timelineStartMs) / slotDurationMs);
		if (slotIndex < 0 || slotIndex >= mutableCells.length) {
			continue;
		}

		const cell = mutableCells[slotIndex];
		cell.activationCount += 1;

		const triggerId = `historical:${execution.workflowId}`;
		const existingTrigger = cell.triggers.get(triggerId) ?? {
			triggerId,
			workflowId: execution.workflowId,
			workflowName: execution.workflowName,
			triggerName: options.triggerName ?? 'Historical actuals',
			activationCount: 0,
		};

		existingTrigger.activationCount += 1;
		cell.triggers.set(triggerId, existingTrigger);
	}

	return serializeScheduleHeatmapCells(mutableCells);
};

export const mergeScheduleTimelineActuals = (
	predictedCells: ScheduleHeatmapCell[],
	actualCells: ScheduleHeatmapCell[],
	actualThrough: Date,
): ScheduleHeatmapCell[] => {
	const actualBySlotStart = new Map(actualCells.map((cell) => [cell.slotStart, cell]));

	return predictedCells.map((predictedCell) => {
		if (new Date(predictedCell.slotEnd).getTime() > actualThrough.getTime()) {
			return predictedCell;
		}

		return (
			actualBySlotStart.get(predictedCell.slotStart) ?? {
				...predictedCell,
				activationCount: 0,
				triggerCount: 0,
				triggers: [],
			}
		);
	});
};

export const buildScheduleHistoricalWorkflowRows = (
	triggers: ScheduleTriggerDefinition[],
	executions: ScheduleHistoricalExecution[],
): ScheduleHistoricalWorkflowRow[] => {
	const rowsByWorkflowId = new Map<string, ScheduleHistoricalWorkflowRow>();

	for (const trigger of triggers) {
		const existingRow = rowsByWorkflowId.get(trigger.workflowId) ?? {
			workflowId: trigger.workflowId,
			workflowName: trigger.workflowName,
			projectName: trigger.projectName,
			workflowActive: trigger.workflowActive,
			triggerStatus: 'disabled' as const,
			startsInRange: 0,
			firstStartedAt: null,
			lastStartedAt: null,
			enabledTriggerCount: 0,
			disabledTriggerCount: 0,
		};

		existingRow.workflowActive = trigger.workflowActive;
		existingRow.projectName = existingRow.projectName ?? trigger.projectName;

		if (trigger.triggerActive) {
			existingRow.enabledTriggerCount += 1;
		} else {
			existingRow.disabledTriggerCount += 1;
		}

		rowsByWorkflowId.set(trigger.workflowId, existingRow);
	}

	for (const execution of executions) {
		const existingRow = rowsByWorkflowId.get(execution.workflowId);
		if (!existingRow) {
			continue;
		}

		const startedAt = new Date(execution.startedAt);
		const startedAtIso = Number.isFinite(startedAt.getTime()) ? startedAt.toISOString() : null;
		if (!startedAtIso) {
			continue;
		}

		existingRow.startsInRange += 1;
		if (!existingRow.firstStartedAt || startedAtIso < existingRow.firstStartedAt) {
			existingRow.firstStartedAt = startedAtIso;
		}
		if (!existingRow.lastStartedAt || startedAtIso > existingRow.lastStartedAt) {
			existingRow.lastStartedAt = startedAtIso;
		}
	}

	return [...rowsByWorkflowId.values()]
		.map((row) => ({
			...row,
			triggerStatus:
				row.enabledTriggerCount > 0 && row.disabledTriggerCount > 0
					? 'mixed'
					: row.enabledTriggerCount > 0
						? 'enabled'
						: 'disabled',
		}))
		.sort(
			(left, right) =>
				right.startsInRange - left.startsInRange ||
				Number(right.workflowActive) - Number(left.workflowActive) ||
				left.workflowName.localeCompare(right.workflowName),
		);
};

export const buildScheduleDayPanelsFromTimelineCells = (
	dayWindows: Array<{ id: string; label: string; start?: Date; end?: Date }>,
	heatmapCells: ScheduleHeatmapCell[],
	daySlotCount?: number,
): ScheduleDayPanel[] => {
	if (
		dayWindows.some((dayWindow) => dayWindow.start !== undefined || dayWindow.end !== undefined) &&
		dayWindows.some((dayWindow) => dayWindow.start === undefined || dayWindow.end === undefined)
	) {
		throw new Error('dayWindows must either all define start/end or all use positional slicing');
	}

	if (
		dayWindows.every((dayWindow) => dayWindow.start === undefined && dayWindow.end === undefined) &&
		(daySlotCount === undefined || daySlotCount < 1)
	) {
		throw new Error('daySlotCount must be greater than 0 when day windows do not define start/end');
	}

	return dayWindows.map((dayWindow, index) => ({
		id: dayWindow.id,
		label: dayWindow.label,
		heatmapCells:
			dayWindow.start !== undefined && dayWindow.end !== undefined
				? heatmapCells.filter((cell) => {
						const slotStartMs = new Date(cell.slotStart).getTime();
						return (
							slotStartMs >= dayWindow.start.getTime() && slotStartMs < dayWindow.end.getTime()
						);
					})
				: heatmapCells.slice(index * (daySlotCount ?? 0), (index + 1) * (daySlotCount ?? 0)),
	}));
};

export const buildScheduleHeatmapCells = (
	triggers: ScheduleTriggerDefinition[],
	options: { start: Date; end: Date; slotMinutes: number; upcomingFrom?: Date },
): ScheduleHeatmapCell[] => buildScheduleTimelineData(triggers, options).heatmapCells;

export const buildScheduleTriggerRows = (
	triggers: ScheduleTriggerDefinition[],
	options: { start: Date; end: Date; slotMinutes: number; upcomingFrom?: Date },
): ScheduleTriggerRow[] => buildScheduleTimelineData(triggers, options).rows;

export const cronExpressionHitsWindow = (
	expression: string,
	windowStart: Date,
	windowEnd: Date,
	timeZone = 'UTC',
) => {
	if (windowEnd.getTime() <= windowStart.getTime()) {
		return false;
	}

	const cron = parseCronExpression(expression);
	const current = new Date(windowStart.getTime());
	current.setUTCSeconds(0, 0);

	while (current.getTime() < windowEnd.getTime()) {
		if (matchesMinute(cron, getZonedDateTimeParts(current, timeZone))) {
			const minuteStartMs = current.getTime();
			const minuteEndMs = minuteStartMs + 60_000;
			const candidateStartMs = Math.max(windowStart.getTime(), minuteStartMs);
			const candidateEndMs = Math.min(windowEnd.getTime(), minuteEndMs);
			const secondStart = Math.ceil((candidateStartMs - minuteStartMs) / 1000);
			const secondEndExclusive = Math.ceil((candidateEndMs - minuteStartMs) / 1000);

			if (hasMatchingSecondInWindow(cron.seconds, secondStart, secondEndExclusive)) {
				return true;
			}
		}

		current.setUTCMinutes(current.getUTCMinutes() + 1, 0, 0);
	}

	return false;
};

export const calculateExecutionStats = (
	executions: ScheduleExecutionRecord[],
): ScheduleExecutionStats => {
	const totalRuns = executions.length;
	const successRuns = executions.filter((execution) => execution.status === 'success').length;
	const failedRuns = executions.filter((execution) => execution.status === 'error').length;
	const runTimes = executions
		.map((execution) => execution.runTimeMs)
		.filter((runTimeMs): runTimeMs is number => typeof runTimeMs === 'number');

	const averageRunTimeMs =
		runTimes.length > 0
			? runTimes.reduce((total, runTimeMs) => total + runTimeMs, 0) / runTimes.length
			: null;

	return {
		totalRuns,
		successRuns,
		failedRuns,
		successRate: totalRuns > 0 ? Math.round((successRuns / totalRuns) * 10_000) / 100 : 0,
		averageRunTimeMs,
	};
};
