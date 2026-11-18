import type { DocPageProperties, DocPageTrigger, DocScheduleRule } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

const TRIGGER_PRIORITY: Array<DocPageTrigger['type']> = [
	'webhook',
	'form',
	'chat',
	'schedule',
	'event',
];

/** The trigger to show on a card. A higher priority type wins, then the first in the list. */
export function primaryTrigger(properties: DocPageProperties | null): DocPageTrigger | undefined {
	for (const type of TRIGGER_PRIORITY) {
		const trigger = properties?.triggers.find((t) => t.type === type);
		if (trigger) return trigger;
	}
	return undefined;
}

/** The pathname of the URL. Returns the input when it is not a valid URL. */
export function urlPath(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

const pad = (value: number) => String(value).padStart(2, '0');

function weekdayNames(weekdays: number[]): string {
	const format = new Intl.DateTimeFormat(i18n.locale, { weekday: 'short', timeZone: 'UTC' });
	// 7 January 2024 is a Sunday, so day 0 of the rule maps to it.
	return weekdays.map((day) => format.format(Date.UTC(2024, 0, 7 + day))).join(', ');
}

/** Readable text for one schedule rule, for example "Every 2 weeks on Mon, Wed at 09:00". */
export function formatScheduleRule(rule: DocScheduleRule): string {
	if ('cron' in rule) return rule.cron;

	let text = i18n.baseText(`docPages.properties.schedule.${rule.every}`, {
		adjustToNumber: rule.interval,
	});
	if (rule.every === 'weeks' && rule.weekdays?.length) {
		text = i18n.baseText('docPages.properties.schedule.onWeekdays', {
			interpolate: { every: text, days: weekdayNames(rule.weekdays) },
		});
	}
	if (rule.every === 'months' && rule.dayOfMonth !== undefined) {
		text = i18n.baseText('docPages.properties.schedule.onDayOfMonth', {
			interpolate: { every: text, day: rule.dayOfMonth },
		});
	}
	if (rule.every === 'hours' && rule.minute !== undefined) {
		return i18n.baseText('docPages.properties.schedule.atMinute', {
			interpolate: { every: text, minute: rule.minute },
		});
	}
	if (rule.hour !== undefined) {
		return i18n.baseText('docPages.properties.schedule.atTime', {
			interpolate: { every: text, time: `${pad(rule.hour)}:${pad(rule.minute ?? 0)}` },
		});
	}
	return text;
}
