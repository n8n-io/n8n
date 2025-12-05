import { CronTime } from 'cron';
import type { NextRun } from '../types';

/**
 * Calculate the next N execution times for a cron expression
 */
export function calculateNextRuns(
	expression: string,
	count: number = 5,
	timezone?: string,
): NextRun[] {
	try {
		const nextRuns: NextRun[] = [];

		// Create CronTime object to calculate next runs
		const cronTime = new CronTime(expression, timezone);

		// Use sendAt with count parameter to get multiple next dates
		const nextDates = cronTime.sendAt(count);

		// Convert Luxon DateTime objects to JavaScript Dates
		for (const dateTime of nextDates) {
			const jsDate = dateTime.toJSDate();
			nextRuns.push({
				date: jsDate,
				readable: formatReadableDate(jsDate, timezone),
				timestamp: jsDate.getTime(),
			});
		}

		return nextRuns;
	} catch (error) {
		console.error('Error in calculateNextRuns:', error);
		return [];
	}
}

/**
 * Format date in human-readable format
 */
function formatReadableDate(date: Date, timezone?: string): string {
	try {
		// Use Intl.DateTimeFormat for timezone-aware formatting
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit',
			timeZone: timezone,
			timeZoneName: 'short',
		};

		return new Intl.DateTimeFormat('en-US', options).format(date);
	} catch (error) {
		// Fallback to simple format if timezone formatting fails
		return date.toLocaleString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			second: '2-digit',
		});
	}
}

/**
 * Calculate time until next run
 */
export function getTimeUntilNextRun(expression: string): string {
	try {
		const cronTime = new CronTime(expression);
		const nextDateTime = cronTime.sendAt();

		// Convert Luxon DateTime to JavaScript Date
		const nextRun = nextDateTime.toJSDate();
		const now = Date.now();
		const diff = nextRun.getTime() - now;

		if (diff < 0) {
			return 'Now';
		}

		return formatDuration(diff);
	} catch (error) {
		return 'Invalid expression';
	}
}

/**
 * Format duration in human-readable format
 */
function formatDuration(milliseconds: number): string {
	const seconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days} day${days > 1 ? 's' : ''}`;
	}

	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		if (remainingMinutes > 0) {
			return `${hours} hr ${remainingMinutes} min`;
		}
		return `${hours} hour${hours > 1 ? 's' : ''}`;
	}

	if (minutes > 0) {
		const remainingSeconds = seconds % 60;
		if (remainingSeconds > 0) {
			return `${minutes} min ${remainingSeconds} sec`;
		}
		return `${minutes} minute${minutes > 1 ? 's' : ''}`;
	}

	return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Check if cron expression will execute at reasonable intervals
 * Returns warning if expression runs too frequently or too rarely
 */
export function checkExecutionFrequency(expression: string): {
	isReasonable: boolean;
	warning?: string;
} {
	try {
		const nextRuns = calculateNextRuns(expression, 2);

		if (nextRuns.length < 2) {
			return { isReasonable: true };
		}

		const interval = nextRuns[1].timestamp - nextRuns[0].timestamp;
		const intervalMinutes = interval / 1000 / 60;

		// Too frequent (< 1 minute)
		if (intervalMinutes < 1) {
			return {
				isReasonable: false,
				warning:
					'This schedule runs very frequently (less than once per minute). This may cause performance issues.',
			};
		}

		// Extremely frequent (< 5 minutes)
		if (intervalMinutes < 5) {
			return {
				isReasonable: true,
				warning:
					'This schedule runs frequently. Make sure your workflow can handle this execution rate.',
			};
		}

		return { isReasonable: true };
	} catch (error) {
		return { isReasonable: true };
	}
}

/**
 * Validate that cron expression produces valid next runs
 */
export function validateCronExecutes(expression: string): {
	isValid: boolean;
	error?: string;
} {
	try {
		const cronTime = new CronTime(expression);
		const nextDateTime = cronTime.sendAt();

		// Convert Luxon DateTime to JavaScript Date
		const nextRun = nextDateTime.toJSDate();

		// Check if next run is in the past
		if (nextRun.getTime() < Date.now()) {
			return {
				isValid: false,
				error: 'Invalid cron expression: Next run time is in the past',
			};
		}

		return { isValid: true };
	} catch (error) {
		return {
			isValid: false,
			error: `Invalid cron expression: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

/**
 * Get execution frequency description
 */
export function getExecutionFrequencyDescription(expression: string): string {
	try {
		const nextRuns = calculateNextRuns(expression, 2);

		if (nextRuns.length < 2) {
			return 'Once';
		}

		const interval = nextRuns[1].timestamp - nextRuns[0].timestamp;
		const intervalSeconds = interval / 1000;
		const intervalMinutes = intervalSeconds / 60;
		const intervalHours = intervalMinutes / 60;
		const intervalDays = intervalHours / 24;

		if (intervalDays >= 1) {
			return `Every ${Math.round(intervalDays)} day${Math.round(intervalDays) > 1 ? 's' : ''}`;
		}

		if (intervalHours >= 1) {
			return `Every ${Math.round(intervalHours)} hour${Math.round(intervalHours) > 1 ? 's' : ''}`;
		}

		if (intervalMinutes >= 1) {
			return `Every ${Math.round(intervalMinutes)} minute${Math.round(intervalMinutes) > 1 ? 's' : ''}`;
		}

		return `Every ${Math.round(intervalSeconds)} second${Math.round(intervalSeconds) > 1 ? 's' : ''}`;
	} catch (error) {
		return 'Unknown frequency';
	}
}
