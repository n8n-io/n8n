import type { CronSimpleConfig, CronAdvancedConfig } from '../types';

/**
 * Parse cron expression into simple mode configuration
 * Returns null if expression is too complex for simple mode
 */
export function parseToSimpleMode(expression: string): CronSimpleConfig | null {
	const trimmed = expression.trim();
	const parts = trimmed.split(/\s+/);

	// Handle both 5-field and 6-field cron
	const hasSeconds = parts.length === 6;
	const minuteIdx = hasSeconds ? 1 : 0;
	const hourIdx = hasSeconds ? 2 : 1;
	const dayOfMonthIdx = hasSeconds ? 3 : 2;
	const monthIdx = hasSeconds ? 4 : 3;
	const dayOfWeekIdx = hasSeconds ? 5 : 4;

	const minute = parts[minuteIdx];
	const hour = parts[hourIdx];
	const dayOfMonth = parts[dayOfMonthIdx];
	const month = parts[monthIdx];
	const dayOfWeek = parts[dayOfWeekIdx];

	// Every minute: * * * * *
	if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
		return { frequency: 'minute' };
	}

	// Hourly: [minute] * * * *
	if (
		isSimpleNumber(minute) &&
		hour === '*' &&
		dayOfMonth === '*' &&
		month === '*' &&
		dayOfWeek === '*'
	) {
		return {
			frequency: 'hourly',
			minute: parseInt(minute, 10),
		};
	}

	// Daily: [minute] [hour] * * *
	if (
		isSimpleNumber(minute) &&
		isSimpleNumber(hour) &&
		dayOfMonth === '*' &&
		month === '*' &&
		dayOfWeek === '*'
	) {
		return {
			frequency: 'daily',
			minute: parseInt(minute, 10),
			hour: parseInt(hour, 10),
		};
	}

	// Weekly: [minute] [hour] * * [days]
	if (
		isSimpleNumber(minute) &&
		isSimpleNumber(hour) &&
		dayOfMonth === '*' &&
		month === '*' &&
		dayOfWeek !== '*'
	) {
		const days = parseDaysList(dayOfWeek);
		if (days) {
			return {
				frequency: 'weekly',
				minute: parseInt(minute, 10),
				hour: parseInt(hour, 10),
				dayOfWeek: days,
			};
		}
	}

	// Monthly: [minute] [hour] [day] * *
	if (
		isSimpleNumber(minute) &&
		isSimpleNumber(hour) &&
		isSimpleNumber(dayOfMonth) &&
		month === '*' &&
		dayOfWeek === '*'
	) {
		return {
			frequency: 'monthly',
			minute: parseInt(minute, 10),
			hour: parseInt(hour, 10),
			dayOfMonth: parseInt(dayOfMonth, 10),
		};
	}

	// Too complex for simple mode
	return null;
}

/**
 * Parse cron expression into advanced mode configuration
 */
export function parseToAdvancedMode(expression: string): CronAdvancedConfig {
	const trimmed = expression.trim();
	const parts = trimmed.split(/\s+/);

	// Handle both 5-field and 6-field cron
	const hasSeconds = parts.length === 6;
	const minuteIdx = hasSeconds ? 1 : 0;
	const hourIdx = hasSeconds ? 2 : 1;
	const dayOfMonthIdx = hasSeconds ? 3 : 2;
	const monthIdx = hasSeconds ? 4 : 3;
	const dayOfWeekIdx = hasSeconds ? 5 : 4;

	return {
		minutes: parseFieldToArray(parts[minuteIdx], 0, 59),
		hours: parseFieldToArray(parts[hourIdx], 0, 23),
		daysOfMonth: parseFieldToArray(parts[dayOfMonthIdx], 1, 31),
		months: parseFieldToArray(parts[monthIdx], 1, 12),
		daysOfWeek: parseFieldToArray(parts[dayOfWeekIdx], 0, 6),
	};
}

/**
 * Parse a cron field (minute, hour, etc.) into array of numbers
 */
function parseFieldToArray(field: string, min: number, max: number): number[] {
	if (field === '*') {
		return []; // Empty array means "all values"
	}

	const values = new Set<number>();

	// Handle step values (*/5, 0-30/5)
	if (field.includes('/')) {
		const [range, stepStr] = field.split('/');
		const step = parseInt(stepStr, 10);

		if (range === '*') {
			for (let i = min; i <= max; i += step) {
				values.add(i);
			}
		} else if (range.includes('-')) {
			const [startStr, endStr] = range.split('-');
			const start = parseInt(startStr, 10);
			const end = parseInt(endStr, 10);
			for (let i = start; i <= end; i += step) {
				values.add(i);
			}
		}
		return Array.from(values).sort((a, b) => a - b);
	}

	// Handle ranges (1-5)
	if (field.includes('-') && !field.includes(',')) {
		const [startStr, endStr] = field.split('-');
		const start = parseInt(startStr, 10);
		const end = parseInt(endStr, 10);
		for (let i = start; i <= end; i++) {
			values.add(i);
		}
		return Array.from(values).sort((a, b) => a - b);
	}

	// Handle lists (1,2,3,4,5)
	if (field.includes(',')) {
		const parts = field.split(',');
		for (const part of parts) {
			if (part.includes('-')) {
				const [startStr, endStr] = part.split('-');
				const start = parseInt(startStr, 10);
				const end = parseInt(endStr, 10);
				for (let i = start; i <= end; i++) {
					values.add(i);
				}
			} else {
				const num = parseInt(part.trim(), 10);
				if (!isNaN(num)) {
					values.add(num);
				}
			}
		}
		return Array.from(values).sort((a, b) => a - b);
	}

	// Single number
	const num = parseInt(field, 10);
	if (!isNaN(num)) {
		return [num];
	}

	return [];
}

/**
 * Check if a string is a simple number
 */
function isSimpleNumber(value: string): boolean {
	return /^\d+$/.test(value);
}

/**
 * Parse days list from cron field
 * Examples: "1,2,3", "1-5", "0,6"
 */
function parseDaysList(days: string): number[] | null {
	if (days === '*') {
		return null;
	}

	const result = parseFieldToArray(days, 0, 6);
	return result.length > 0 ? result : null;
}

/**
 * Detect which mode (simple or advanced) is best for a cron expression
 */
export function detectBestMode(expression: string): 'simple' | 'advanced' {
	const simpleConfig = parseToSimpleMode(expression);
	return simpleConfig ? 'simple' : 'advanced';
}

/**
 * Get human-readable description of cron expression
 */
export function getHumanReadableDescription(expression: string): string {
	const simpleConfig = parseToSimpleMode(expression);

	if (simpleConfig) {
		switch (simpleConfig.frequency) {
			case 'minute':
				return 'Every minute';

			case 'hourly':
				return `Every hour at minute ${simpleConfig.minute || 0}`;

			case 'daily':
				return `Every day at ${formatTime(simpleConfig.hour || 0, simpleConfig.minute || 0)}`;

			case 'weekly': {
				const dayNames = (simpleConfig.dayOfWeek || []).map((d) => getDayName(d));
				const daysStr = dayNames.length > 0 ? dayNames.join(', ') : 'every day';
				return `Every week on ${daysStr} at ${formatTime(
					simpleConfig.hour || 0,
					simpleConfig.minute || 0,
				)}`;
			}

			case 'monthly':
				return `Every month on day ${simpleConfig.dayOfMonth || 1} at ${formatTime(
					simpleConfig.hour || 0,
					simpleConfig.minute || 0,
				)}`;
		}
	}

	// For advanced mode, return the expression itself
	return `Cron: ${expression}`;
}

/**
 * Format time in 12-hour format
 */
function formatTime(hour: number, minute: number): string {
	const period = hour >= 12 ? 'PM' : 'AM';
	const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
	const minuteStr = minute.toString().padStart(2, '0');
	return `${hour12}:${minuteStr} ${period}`;
}

/**
 * Get day name from day number
 */
function getDayName(day: number): string {
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return days[day] || `Day ${day}`;
}
