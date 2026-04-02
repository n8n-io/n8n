import type { CronExpression } from 'n8n-workflow';

export type ScheduleTriggerSource = 'scheduleTrigger' | 'cron' | 'interval' | 'mixed' | 'unknown';
export type ScheduleTriggerClass = 'custom-cron' | 'fixed-interval' | 'calendar';
export type ScheduleRangeMode = 'n8n' | 'custom';
export type ScheduleCustomWindowPreset = 'today' | 'nextSevenDays' | 'todayPlusMinusThree';
export type ScheduleCustomTimeMode = 'calculated' | 'realTime';
export type ScheduleWorkflowTriggerStatus = 'enabled' | 'disabled' | 'mixed';
export type ScheduleTimezoneSource = 'workflow' | 'instance';

export type ScheduleInterval =
	| {
			field: 'cronExpression';
			expression: CronExpression;
	  }
	| {
			field: 'seconds';
			secondsInterval: number;
	  }
	| {
			field: 'minutes';
			minutesInterval: number;
	  }
	| {
			field: 'hours';
			hoursInterval: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'days';
			daysInterval: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'weeks';
			weeksInterval: number;
			triggerAtDay: number[];
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  }
	| {
			field: 'months';
			monthsInterval: number;
			triggerAtDayOfMonth?: number;
			triggerAtHour?: number;
			triggerAtMinute?: number;
	  };

export interface ScheduleOverviewStats {
	trackedWorkflows: number;
	scheduledActivations: number;
	busiestSlotActivations: number;
}

export interface ScheduleTriggerDefinition {
	triggerId: string;
	workflowId: string;
	workflowName: string;
	triggerName: string;
	projectName: string | null;
	workflowActive: boolean;
	triggerActive: boolean;
	triggerSource: ScheduleTriggerSource;
	effectiveTimezone: string;
	timezoneSource: ScheduleTimezoneSource;
	interval: ScheduleInterval;
}

export interface ScheduleTriggerRow {
	triggerId: string;
	workflowId: string;
	workflowName: string;
	triggerName: string;
	projectName: string | null;
	workflowActive: boolean;
	triggerActive: boolean;
	triggerLogic: string;
	triggerSource: ScheduleTriggerSource;
	effectiveTimezone: string;
	timezoneSource: ScheduleTimezoneSource;
	cronExpression: CronExpression | null;
	nextActivation: string | null;
	firstActivationInRange: string | null;
	lastActivationInRange: string | null;
	activationsInRange: number;
}

export interface ScheduleHeatmapCellTrigger {
	triggerId: string;
	workflowId: string;
	workflowName: string;
	triggerName: string;
	activationCount: number;
}

export interface ScheduleHeatmapCell {
	slotStart: string;
	slotEnd: string;
	activationCount: number;
	triggerCount: number;
	triggers: ScheduleHeatmapCellTrigger[];
}

export interface ScheduleHistoricalExecution {
	executionId: string;
	workflowId: string;
	workflowName: string;
	startedAt: Date | string;
}

export interface ScheduleDayPanel {
	id: string;
	label: string;
	heatmapCells: ScheduleHeatmapCell[];
}

export interface ScheduleExecutionLoadState {
	isPartial: boolean;
	loadedExecutionCount: number;
	maxExecutionCount: number;
}

export interface ScheduleHistoricalWorkflowRow {
	workflowId: string;
	workflowName: string;
	projectName: string | null;
	workflowActive: boolean;
	triggerStatus: ScheduleWorkflowTriggerStatus;
	startsInRange: number;
	firstStartedAt: string | null;
	lastStartedAt: string | null;
	enabledTriggerCount: number;
	disabledTriggerCount: number;
}

export interface ScheduleExecutionRecord {
	status: 'success' | 'error' | 'running' | 'unknown';
	runTimeMs?: number | null;
}

export interface ScheduleExecutionStats {
	totalRuns: number;
	successRuns: number;
	failedRuns: number;
	successRate: number;
	averageRunTimeMs: number | null;
}
