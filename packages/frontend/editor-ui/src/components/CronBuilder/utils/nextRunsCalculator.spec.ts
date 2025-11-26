import { describe, it, expect } from 'vitest';
import {
	calculateNextRuns,
	getTimeUntilNextRun,
	checkExecutionFrequency,
	validateCronExecutes,
	getExecutionFrequencyDescription,
} from './nextRunsCalculator';

describe('nextRunsCalculator', () => {
	describe('calculateNextRuns', () => {
		it('should calculate next 5 runs for valid cron expression', () => {
			const expression = '0 9 * * 1-5'; // 9 AM weekdays
			const runs = calculateNextRuns(expression, 5);

			expect(runs).toHaveLength(5);
			runs.forEach((run) => {
				expect(run).toHaveProperty('date');
				expect(run).toHaveProperty('readable');
				expect(run).toHaveProperty('timestamp');
				expect(run.date).toBeInstanceOf(Date);
				expect(typeof run.readable).toBe('string');
				expect(typeof run.timestamp).toBe('number');
			});
		});

		it('should return empty array for invalid cron expression', () => {
			const expression = 'invalid cron';
			const runs = calculateNextRuns(expression, 5);

			expect(runs).toEqual([]);
		});

		it('should calculate specified number of runs', () => {
			const expression = '0 12 * * *'; // Daily at noon
			const runs = calculateNextRuns(expression, 3);

			expect(runs).toHaveLength(3);
		});

		it('should respect timezone parameter', () => {
			const expression = '0 0 * * *'; // Midnight
			const runsUTC = calculateNextRuns(expression, 1, 'UTC');
			const runsEST = calculateNextRuns(expression, 1, 'America/New_York');

			expect(runsUTC).toHaveLength(1);
			expect(runsEST).toHaveLength(1);
			// Timestamps should differ due to timezone
			expect(runsUTC[0].timestamp).not.toBe(runsEST[0].timestamp);
		});
	});

	describe('getTimeUntilNextRun', () => {
		it('should return formatted time for valid expression', () => {
			const expression = '0 9 * * 1-5'; // 9 AM weekdays
			const timeUntil = getTimeUntilNextRun(expression);

			expect(typeof timeUntil).toBe('string');
			expect(timeUntil).not.toBe('Invalid expression');
		});

		it('should return "Invalid expression" for invalid cron', () => {
			const expression = 'invalid';
			const timeUntil = getTimeUntilNextRun(expression);

			expect(timeUntil).toBe('Invalid expression');
		});

		it('should format time in human-readable format', () => {
			const expression = '* * * * *'; // Every minute
			const timeUntil = getTimeUntilNextRun(expression);

			// Should be less than 1 minute
			expect(timeUntil).toMatch(/second/);
		});
	});

	describe('checkExecutionFrequency', () => {
		it('should warn for expressions running every minute', () => {
			const expression = '* * * * *'; // Every minute (exactly 1 minute apart)
			const result = checkExecutionFrequency(expression);

			// 1 minute is considered reasonable, but should have a warning since it's < 5 minutes
			expect(result.isReasonable).toBe(true);
			expect(result.warning).toContain('frequently');
		});

		it('should warn for expressions running less than 5 minutes apart', () => {
			const expression = '*/2 * * * *'; // Every 2 minutes
			const result = checkExecutionFrequency(expression);

			expect(result.isReasonable).toBe(true);
			expect(result.warning).toContain('frequently');
		});

		it('should accept reasonable frequencies', () => {
			const expression = '0 9 * * 1-5'; // 9 AM weekdays
			const result = checkExecutionFrequency(expression);

			expect(result.isReasonable).toBe(true);
			expect(result.warning).toBeUndefined();
		});

		it('should handle invalid expressions gracefully', () => {
			const expression = 'invalid';
			const result = checkExecutionFrequency(expression);

			expect(result.isReasonable).toBe(true);
		});
	});

	describe('validateCronExecutes', () => {
		it('should validate correct cron expressions', () => {
			const expression = '0 9 * * 1-5'; // 9 AM weekdays
			const result = validateCronExecutes(expression);

			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject invalid cron expressions', () => {
			const expression = 'invalid cron';
			const result = validateCronExecutes(expression);

			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Invalid cron expression');
		});

		it('should validate various cron formats', () => {
			const expressions = [
				'0 0 * * *', // Daily at midnight
				'0 12 * * 1', // Mondays at noon
				'*/15 * * * *', // Every 15 minutes
				'0 0 1 * *', // First day of month
			];

			expressions.forEach((expr) => {
				const result = validateCronExecutes(expr);
				expect(result.isValid).toBe(true);
			});
		});
	});

	describe('getExecutionFrequencyDescription', () => {
		it('should describe daily schedules', () => {
			const expression = '0 9 * * *'; // Daily at 9 AM
			const description = getExecutionFrequencyDescription(expression);

			expect(description).toContain('day');
		});

		it('should describe hourly schedules', () => {
			const expression = '0 * * * *'; // Every hour
			const description = getExecutionFrequencyDescription(expression);

			expect(description).toContain('hour');
		});

		it('should describe minute schedules', () => {
			const expression = '*/5 * * * *'; // Every 5 minutes
			const description = getExecutionFrequencyDescription(expression);

			expect(description).toContain('minute');
		});

		it('should describe weekly schedules', () => {
			const expression = '0 9 * * 1'; // Mondays at 9 AM
			const description = getExecutionFrequencyDescription(expression);

			expect(description).toMatch(/day/);
		});

		it('should return "Once" for invalid expressions that cannot calculate interval', () => {
			const expression = 'invalid';
			const description = getExecutionFrequencyDescription(expression);

			// When calculateNextRuns fails, the function returns 'Once'
			expect(description).toBe('Once');
		});
	});
});
