import type { CronTemplate } from '../types';

/**
 * Pre-defined cron expression templates for common scheduling patterns
 */
export const CRON_TEMPLATES: CronTemplate[] = [
	// Common patterns
	{
		id: 'every-minute',
		name: 'Every minute',
		description: 'Runs every minute',
		expression: '* * * * *',
		category: 'common',
	},
	{
		id: 'every-5-minutes',
		name: 'Every 5 minutes',
		description: 'Runs every 5 minutes',
		expression: '*/5 * * * *',
		category: 'common',
	},
	{
		id: 'every-15-minutes',
		name: 'Every 15 minutes',
		description: 'Runs every 15 minutes',
		expression: '*/15 * * * *',
		category: 'common',
	},
	{
		id: 'every-30-minutes',
		name: 'Every 30 minutes',
		description: 'Runs every 30 minutes',
		expression: '*/30 * * * *',
		category: 'common',
	},
	{
		id: 'every-hour',
		name: 'Every hour',
		description: 'Runs at the start of every hour',
		expression: '0 * * * *',
		category: 'common',
	},
	{
		id: 'every-2-hours',
		name: 'Every 2 hours',
		description: 'Runs every 2 hours',
		expression: '0 */2 * * *',
		category: 'common',
	},
	{
		id: 'every-day-midnight',
		name: 'Every day at midnight',
		description: 'Runs once daily at 00:00',
		expression: '0 0 * * *',
		category: 'common',
	},
	{
		id: 'every-day-noon',
		name: 'Every day at noon',
		description: 'Runs once daily at 12:00',
		expression: '0 12 * * *',
		category: 'common',
	},

	// Business hours patterns
	{
		id: 'weekdays-9am',
		name: 'Every weekday at 9 AM',
		description: 'Monday to Friday at 9:00',
		expression: '0 9 * * 1-5',
		category: 'business',
	},
	{
		id: 'weekdays-6pm',
		name: 'Every weekday at 6 PM',
		description: 'Monday to Friday at 18:00',
		expression: '0 18 * * 1-5',
		category: 'business',
	},
	{
		id: 'business-hours-start',
		name: 'Business hours start',
		description: 'Monday to Friday at 8:00 AM',
		expression: '0 8 * * 1-5',
		category: 'business',
	},
	{
		id: 'business-hours-end',
		name: 'Business hours end',
		description: 'Monday to Friday at 5:00 PM',
		expression: '0 17 * * 1-5',
		category: 'business',
	},

	// Weekly patterns
	{
		id: 'every-monday-9am',
		name: 'Every Monday at 9 AM',
		description: 'Once per week on Monday at 9:00',
		expression: '0 9 * * 1',
		category: 'common',
	},
	{
		id: 'every-friday-5pm',
		name: 'Every Friday at 5 PM',
		description: 'Once per week on Friday at 17:00',
		expression: '0 17 * * 5',
		category: 'common',
	},
	{
		id: 'weekend-start',
		name: 'Weekend start (Saturday 12 AM)',
		description: 'Saturday at midnight',
		expression: '0 0 * * 6',
		category: 'common',
	},
	{
		id: 'weekend-end',
		name: 'Weekend end (Sunday 11 PM)',
		description: 'Sunday at 11:00 PM',
		expression: '0 23 * * 0',
		category: 'common',
	},

	// Monthly patterns
	{
		id: 'first-of-month',
		name: 'First day of month',
		description: '1st day of every month at midnight',
		expression: '0 0 1 * *',
		category: 'common',
	},
	{
		id: 'late-in-month',
		name: 'Late in month (28th)',
		description: '28th day of every month at midnight (safe for all months)',
		expression: '0 0 28 * *',
		category: 'common',
	},
	{
		id: 'mid-month',
		name: 'Mid-month (15th)',
		description: '15th day of every month at noon',
		expression: '0 12 15 * *',
		category: 'common',
	},

	// Development patterns
	{
		id: 'every-weekday-morning',
		name: 'Weekday mornings',
		description: 'Every hour from 8 AM to 5 PM on weekdays',
		expression: '0 8-17 * * 1-5',
		category: 'development',
	},
	{
		id: 'nightly-build',
		name: 'Nightly build (2 AM)',
		description: 'Every day at 2:00 AM',
		expression: '0 2 * * *',
		category: 'development',
	},
	{
		id: 'weekly-backup',
		name: 'Weekly backup (Sunday 3 AM)',
		description: 'Every Sunday at 3:00 AM',
		expression: '0 3 * * 0',
		category: 'development',
	},
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: CronTemplate['category']): CronTemplate[] {
	return CRON_TEMPLATES.filter((template) => template.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): CronTemplate | undefined {
	return CRON_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): CronTemplate['category'][] {
	return ['common', 'business', 'development', 'custom'];
}
