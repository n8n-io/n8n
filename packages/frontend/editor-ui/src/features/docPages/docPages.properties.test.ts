import type { DocPageTrigger, DocScheduleRule } from '@n8n/api-types';
import { formatScheduleRule, primaryTrigger, urlPath } from './docPages.properties';

const base = { nodeName: 'n', nodeType: 't', typeVersion: 1 };
const event: DocPageTrigger = { ...base, nodeName: 'event', type: 'event' };
const schedule: DocPageTrigger = { ...base, type: 'schedule', rules: [] };
const chat: DocPageTrigger = { ...base, type: 'chat', url: null };
const webhookA: DocPageTrigger = {
	...base,
	nodeName: 'a',
	type: 'webhook',
	methods: ['GET'],
	url: 'https://x.io/webhook/a',
	auth: 'none',
};
const webhookB: DocPageTrigger = { ...webhookA, nodeName: 'b' };

describe('primaryTrigger', () => {
	it('returns undefined without properties or triggers', () => {
		expect(primaryTrigger(null)).toBeUndefined();
		expect(primaryTrigger({ triggers: [], agent: null })).toBeUndefined();
	});

	it('picks the type with the highest priority, then the first in the list', () => {
		expect(
			primaryTrigger({ triggers: [event, schedule, webhookA, webhookB, chat], agent: null }),
		).toBe(webhookA);
		expect(primaryTrigger({ triggers: [event, schedule, chat], agent: null })).toBe(chat);
		expect(primaryTrigger({ triggers: [event, schedule], agent: null })).toBe(schedule);
	});
});

describe('urlPath', () => {
	it('returns the pathname of a valid URL', () => {
		expect(urlPath('https://x.io/webhook/abc?x=1')).toBe('/webhook/abc');
	});

	it('returns the input for an invalid URL', () => {
		expect(urlPath('not a url')).toBe('not a url');
	});
});

describe('formatScheduleRule', () => {
	it.each<[DocScheduleRule, string]>([
		[{ every: 'seconds', interval: 1 }, 'Every second'],
		[{ every: 'minutes', interval: 5 }, 'Every 5 minutes'],
		[{ every: 'hours', interval: 2, minute: 15 }, 'Every 2 hours at minute 15'],
		[{ every: 'days', interval: 1, hour: 8, minute: 15 }, 'Every day at 08:15'],
		[
			{ every: 'weeks', interval: 2, weekdays: [1, 3], hour: 9, minute: 0 },
			'Every 2 weeks on Mon, Wed at 09:00',
		],
		[
			{ every: 'months', interval: 1, dayOfMonth: 1, hour: 0, minute: 0 },
			'Every month on day 1 at 00:00',
		],
		[{ cron: '0 */5 * * *' }, '0 */5 * * *'],
	])('formats %j', (rule, expected) => {
		expect(formatScheduleRule(rule)).toBe(expected);
	});
});
