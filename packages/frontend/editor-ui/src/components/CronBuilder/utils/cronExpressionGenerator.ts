import type { CronSimpleConfig, CronAdvancedConfig, CronValidation } from '../types';

/**
 * Generate cron expression from simple mode configuration
 */
export function generateFromSimpleMode(config: CronSimpleConfig): string {
	const {
		frequency,
		minute = 0,
		hour = 0,
		dayOfWeek = [],
		dayOfMonth = 1,
		monthInterval = 1,
	} = config;

	switch (frequency) {
		case 'minute':
			// Every minute
			return '* * * * *';

		case 'hourly':
			// Every hour at specified minute
			return `${minute} * * * *`;

		case 'daily':
			// Every day at specified hour and minute
			return `${minute} ${hour} * * *`;

		case 'weekly':
			// Specific days of week at specified hour and minute
			const days = dayOfWeek.length > 0 ? dayOfWeek.sort().join(',') : '*';
			return `${minute} ${hour} * * ${days}`;

		case 'monthly':
			// Specific day of month at specified hour and minute
			const monthField = monthInterval > 1 ? `*/${monthInterval}` : '*';
			return `${minute} ${hour} ${dayOfMonth} ${monthField} *`;

		default:
			return '* * * * *';
	}
}

/**
 * Generate cron expression from advanced mode configuration
 */
export function generateFromAdvancedMode(config: CronAdvancedConfig): string {
	const { minutes = [], hours = [], daysOfMonth = [], months = [], daysOfWeek = [] } = config;

	// Convert arrays to cron field strings
	const minuteStr = arrayToCronField(minutes, 0, 59);
	const hourStr = arrayToCronField(hours, 0, 23);
	const dayOfMonthStr = arrayToCronField(daysOfMonth, 1, 31);
	const monthStr = arrayToCronField(months, 1, 12);
	const dayOfWeekStr = arrayToCronField(daysOfWeek, 0, 6);

	return `${minuteStr} ${hourStr} ${dayOfMonthStr} ${monthStr} ${dayOfWeekStr}`;
}

/**
 * Convert array of numbers to cron field string
 * Examples:
 *   [1, 2, 3] => "1,2,3"
 *   [] => "*"
 *   [0, 10, 20, 30, 40, 50] => "star/10" (if it is a regular interval)
 */
function arrayToCronField(values: number[], min: number, max: number): string {
	if (values.length === 0) {
		return '*';
	}

	// Sort values
	const sorted = [...values].sort((a, b) => a - b);

	// Check if it's a regular interval (e.g., */5, */10, */15)
	if (sorted.length > 2) {
		const interval = sorted[1] - sorted[0];
		const isRegularInterval = sorted.every((val, idx) => {
			if (idx === 0) return true;
			return val - sorted[idx - 1] === interval;
		});

		if (isRegularInterval && sorted[0] === min) {
			// Check if it covers the full range
			const expectedCount = Math.floor((max - min) / interval) + 1;
			if (sorted.length === expectedCount) {
				return `*/${interval}`;
			}
		}
	}

	// Check for consecutive ranges
	const ranges = findConsecutiveRanges(sorted);
	if (ranges.length === 1 && ranges[0].length > 2) {
		const [start, end] = [ranges[0][0], ranges[0][ranges[0].length - 1]];
		return `${start}-${end}`;
	}

	// Multiple ranges or mixed
	const rangeStrings = ranges.map((range) => {
		if (range.length === 1) {
			return range[0].toString();
		} else if (range.length === 2) {
			return `${range[0]},${range[1]}`;
		} else {
			return `${range[0]}-${range[range.length - 1]}`;
		}
	});

	return rangeStrings.join(',');
}

/**
 * Find consecutive number ranges in sorted array
 * Example: [1,2,3,5,6,8] => [[1,2,3], [5,6], [8]]
 */
function findConsecutiveRanges(sorted: number[]): number[][] {
	if (sorted.length === 0) return [];

	const ranges: number[][] = [];
	let currentRange: number[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === currentRange[currentRange.length - 1] + 1) {
			currentRange.push(sorted[i]);
		} else {
			ranges.push(currentRange);
			currentRange = [sorted[i]];
		}
	}
	ranges.push(currentRange);

	return ranges;
}

/**
 * Validate cron expression format
 */
export function validateCronExpression(expression: string): CronValidation {
	if (!expression || expression.trim() === '') {
		return {
			isValid: false,
			error: 'Cron expression cannot be empty',
		};
	}

	const trimmed = expression.trim();
	const parts = trimmed.split(/\s+/);

	// Standard cron has 5 fields: minute hour day month weekday
	// Some implementations support 6 fields with seconds
	if (parts.length !== 5 && parts.length !== 6) {
		return {
			isValid: false,
			error: `Invalid cron expression format. Expected 5 or 6 fields, got ${parts.length}`,
		};
	}

	// Validate each field
	const fieldValidations = [
		{ name: 'minute', min: 0, max: 59, index: parts.length === 6 ? 1 : 0 },
		{ name: 'hour', min: 0, max: 23, index: parts.length === 6 ? 2 : 1 },
		{ name: 'day', min: 1, max: 31, index: parts.length === 6 ? 3 : 2 },
		{ name: 'month', min: 1, max: 12, index: parts.length === 6 ? 4 : 3 },
		{ name: 'weekday', min: 0, max: 6, index: parts.length === 6 ? 5 : 4 },
	];

	if (parts.length === 6) {
		fieldValidations.unshift({ name: 'second', min: 0, max: 59, index: 0 });
	}

	for (const field of fieldValidations) {
		const value = parts[field.index];
		const validation = validateCronField(value, field.min, field.max);
		if (!validation.isValid) {
			return {
				isValid: false,
				error: `Invalid ${field.name} field: ${validation.error}`,
			};
		}
	}

	return { isValid: true };
}

/**
 * Validate a single cron field
 */
function validateCronField(value: string, min: number, max: number): CronValidation {
	// Allow wildcards
	if (value === '*') {
		return { isValid: true };
	}

	// Allow step values (*/5, 0-30/5)
	if (value.includes('/')) {
		const [range, step] = value.split('/');
		const stepNum = parseInt(step, 10);
		if (isNaN(stepNum) || stepNum < 1) {
			return { isValid: false, error: 'Invalid step value' };
		}
		if (range !== '*') {
			return validateCronField(range, min, max);
		}
		return { isValid: true };
	}

	// Allow ranges (1-5)
	if (value.includes('-')) {
		const [start, end] = value.split('-').map((v) => parseInt(v, 10));
		if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
			return { isValid: false, error: 'Invalid range' };
		}
		return { isValid: true };
	}

	// Allow lists (1,2,3,4,5)
	if (value.includes(',')) {
		const values = value.split(',');
		for (const v of values) {
			const validation = validateCronField(v.trim(), min, max);
			if (!validation.isValid) {
				return validation;
			}
		}
		return { isValid: true };
	}

	// Single number
	const num = parseInt(value, 10);
	if (isNaN(num) || num < min || num > max) {
		return { isValid: false, error: `Value must be between ${min} and ${max}` };
	}

	return { isValid: true };
}

/**
 * Normalize cron expression (add seconds field if missing)
 */
export function normalizeCronExpression(expression: string): string {
	const trimmed = expression.trim();
	const parts = trimmed.split(/\s+/);

	// If 5 fields, add random seconds at the beginning
	if (parts.length === 5) {
		const randomSecond = Math.floor(Math.random() * 60);
		return `${randomSecond} ${trimmed}`;
	}

	return trimmed;
}
