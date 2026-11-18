import type { PageOverviewTrigger } from '@n8n/api-types';

import { toTriggerFactText, type Translate } from './triggerFact';

const TEXTS: Record<string, string> = {
	'page.overview.fact.schedule.everyMinute': 'Every minute',
	'page.overview.fact.schedule.minutes': 'Every {count} minutes',
	'page.overview.fact.schedule.everyHour': 'Every hour',
	'page.overview.fact.schedule.hours': 'Every {count} hours',
	'page.overview.fact.schedule.daily': 'Every day at {time}',
	'page.overview.fact.schedule.weekly': 'Every week on {days} at {time}',
	'page.overview.fact.weekday.0': 'Sunday',
	'page.overview.fact.weekday.1': 'Monday',
	'page.overview.fact.weekday.5': 'Friday',
};

const translate: Translate = (key, interpolate = {}) =>
	Object.entries(interpolate).reduce(
		(text, [name, value]) => text.replace(`{${name}}`, value),
		TEXTS[key] ?? key,
	);

const textOf = (trigger: PageOverviewTrigger | undefined) => toTriggerFactText(trigger, translate);

describe('toTriggerFactText', () => {
	it('should show the method and the path of a webhook with one leading slash', () => {
		expect(textOf({ kind: 'webhook', method: 'POST', path: 'acme/orders' })).toBe(
			'POST /acme/orders',
		);
		expect(textOf({ kind: 'webhook', method: 'GET', path: '/orders' })).toBe('GET /orders');
	});

	it.each<[string, PageOverviewTrigger]>([
		['Every day at 02:00', { kind: 'schedule', field: 'days', triggerAtHour: 2 }],
		['Every day at 00:00', { kind: 'schedule', field: 'days' }],
		[
			'Every week on Monday at 08:30',
			{
				kind: 'schedule',
				field: 'weeks',
				triggerAtDay: [1],
				triggerAtHour: 8,
				triggerAtMinute: 30,
			},
		],
		[
			'Every week on Monday, Friday at 08:00',
			{ kind: 'schedule', field: 'weeks', triggerAtDay: [1, 5], triggerAtHour: 8 },
		],
		['Every week on Sunday at 00:00', { kind: 'schedule', field: 'weeks' }],
		['Every 5 minutes', { kind: 'schedule', field: 'minutes' }],
		['Every 15 minutes', { kind: 'schedule', field: 'minutes', minutesInterval: 15 }],
		['Every minute', { kind: 'schedule', field: 'minutes', minutesInterval: 1 }],
		['Every hour', { kind: 'schedule', field: 'hours' }],
		['Every 2 hours', { kind: 'schedule', field: 'hours', hoursInterval: 2 }],
		['0 9 * * 1-5', { kind: 'schedule', field: 'cronExpression', expression: '0 9 * * 1-5' }],
	])('should show "%s"', (text, trigger) => {
		expect(textOf(trigger)).toBe(text);
	});

	it.each<[string, PageOverviewTrigger]>([
		['a unit that it does not know', { kind: 'schedule', field: 'months' }],
		['an hour that does not exist', { kind: 'schedule', field: 'days', triggerAtHour: 24 }],
		['a minute that does not exist', { kind: 'schedule', field: 'days', triggerAtMinute: 60 }],
		['a day that does not exist', { kind: 'schedule', field: 'weeks', triggerAtDay: [7] }],
		['a cron rule without an expression', { kind: 'schedule', field: 'cronExpression' }],
	])('should show nothing for %s', (_case, trigger) => {
		expect(textOf(trigger)).toBeUndefined();
	});

	it('should show the title of a form and the events of an app trigger', () => {
		expect(textOf({ kind: 'form', title: 'Contact us' })).toBe('Contact us');
		expect(textOf({ kind: 'appEvent', events: ['message', 'reaction_added'] })).toBe(
			'message, reaction_added',
		);
	});

	it('should show nothing without a trigger', () => {
		expect(textOf(undefined)).toBeUndefined();
	});
});
