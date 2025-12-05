/**
 * Types for Visual Cron Builder Component
 */

export type CronBuilderMode = 'simple' | 'advanced' | 'custom';

export interface CronSimpleConfig {
	frequency: 'minute' | 'hourly' | 'daily' | 'weekly' | 'monthly';
	minute?: number; // 0-59
	hour?: number; // 0-23
	dayOfWeek?: number[]; // 0-6 (0 = Sunday)
	dayOfMonth?: number; // 1-31
	monthInterval?: number; // For monthly schedules
}

export interface CronAdvancedConfig {
	minutes: number[]; // 0-59, empty = *
	hours: number[]; // 0-23, empty = *
	daysOfMonth: number[]; // 1-31, empty = *
	months: number[]; // 1-12, empty = *
	daysOfWeek: number[]; // 0-6, empty = *
}

export interface CronTemplate {
	id: string;
	name: string;
	description: string;
	expression: string;
	category: 'common' | 'development' | 'business' | 'custom';
}

export interface NextRun {
	date: Date;
	readable: string;
	timestamp: number;
}

export interface CronValidation {
	isValid: boolean;
	error?: string;
	warning?: string;
}

export interface CronBuilderState {
	mode: CronBuilderMode;
	expression: string;
	simpleConfig: CronSimpleConfig;
	advancedConfig: CronAdvancedConfig;
	selectedTemplate?: string;
}
