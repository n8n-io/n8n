import type { CronExpression } from 'n8n-workflow';

export type ScheduleTriggerSource = 'scheduleTrigger' | 'cron' | 'interval' | 'mixed' | 'unknown';
export type ScheduleTriggerClass = 'custom-cron' | 'fixed-interval' | 'calendar';

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
	cronExpression: CronExpression | null;
	startTime: string | null;
	nextActivation: string | null;
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
