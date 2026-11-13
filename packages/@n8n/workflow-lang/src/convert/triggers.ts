/**
 * Trigger nodes → `webhook(...)` and `schedule(...)` triggers, and the item
 * that the trigger node gives to the rest of the workflow.
 *
 * A trigger without an equivalent (manual, form, app triggers) becomes a
 * stand-in webhook. Its item is the request body, so a caller can post the
 * event that the original trigger would give.
 */
import type { Code } from './code.ts';
import { literal, raw, str } from './code.ts';
import { camelIdentifier } from './naming.ts';
import type { ConvertDiagnostic, N8nNode } from './types.ts';
import { isRecord, text } from './types.ts';

export interface TriggerPlan {
	/** SDK function names to import. */
	imports: string[];
	/** Code of each trigger in `triggers: [...]`. */
	triggers: string[];
	/** Code of the item list of the trigger node. */
	items: string;
	/** Type argument of `webhook<...>` when the trigger is a webhook. */
	native: boolean;
	/** Helpers that the item code calls. */
	helpers?: string[];
	/** IANA time zones that the item code reads (META `zones`). */
	zones?: string[];
}

/**
 * The text of a parameter that is fixed: plain text, or an `=` value without
 * a `{{ }}` part (n8n gives the text after `=`). Null for other values.
 */
function fixedText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	if (!value.startsWith('=')) return value;
	return value.includes('{{') ? null : value.slice(1);
}

/** n8n's default time zone (`GENERIC_TIMEZONE`), for a workflow without `settings.timezone`. */
export const DEFAULT_TIMEZONE = 'America/New_York';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

const TRIGGER_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.start',
	'n8n-nodes-base.formTrigger',
	'n8n-nodes-base.errorTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.n8nTrigger',
	'n8n-nodes-base.workflowTrigger',
	'n8n-nodes-base.emailReadImap',
	'n8n-nodes-base.rssFeedReadTrigger',
]);

export function isTriggerType(type: string): boolean {
	return TRIGGER_TYPES.has(type) || /trigger$/i.test(type);
}

function slug(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'workflow'
	);
}

const call = (fn: string, options: Code) => `${fn}(${flatCode(options)})`;

function flatCode(code: Code): string {
	if (code.kind === 'raw') return code.text;
	if (code.kind === 'array') return `[${code.items.map(flatCode).join(', ')}]`;
	if (code.entries.length === 0) return '{}';
	return `{ ${code.entries.map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : str(k)}: ${flatCode(v)}`).join(', ')} }`;
}

/**
 * An interval as a whole number in the range that the compiled schedule takes.
 * v1 builds a cron expression from the value: 0 or no value gives no recurrence filter
 * (every slot of the cron), so it counts as 1 here.
 */
function wholeInRange(value: unknown, fallback: number, max: number): number {
	const n = num(value, fallback);
	if (!Number.isFinite(n) || n < 1) return 1;
	return Math.min(Math.round(n), max);
}

/**
 * The `everyX` trigger time of the Cron node (n8n-workflow `toCronExpression`): `*\/n`
 * in the minute or hour field. A step of the whole field or more fires at 0 only.
 */
function everyXOptions(item: Record<string, unknown>): Array<[string, Code]> {
	const unit = text(item.unit, 'hours');
	const value = num(item.value, 2);
	if (unit === 'minutes' && Number.isInteger(value) && value >= 60) {
		return [['cron', raw(str('0 * * * *'))]];
	}
	if (unit === 'hours' && Number.isInteger(value) && value >= 24) {
		return [['cron', raw(str('0 0 * * *'))]];
	}
	return [
		['every', literal({ unit, value: wholeInRange(value, 2, unit === 'minutes' ? 59 : 23) })],
	];
}

function num(value: unknown, fallback: number): number {
	const fixed = typeof value === 'string' ? fixedText(value) : null;
	const n = typeof value === 'number' ? value : Number(fixed ?? value);
	return Number.isFinite(n) ? n : fallback;
}

function scheduleOf(rule: Record<string, unknown>, timezone: Code | null): Code | string {
	// A fixed `=` value is the text after `=`, as n8n reads it (`=weeks`).
	const field = fixedText(rule.field) ?? text(rule.field, 'days');
	const entries: Array<[string, Code]> = [];
	if (field === 'cronExpression') {
		const cron = fixedText(rule.expression);
		if (cron === null) return 'The cron expression is missing or is an expression.';
		entries.push(['cron', raw(str(cron.trim()))]);
	} else {
		const every: Record<string, unknown> = { unit: field };
		switch (field) {
			case 'seconds':
			case 'minutes': {
				const value =
					field === 'seconds' ? num(rule.secondsInterval, 30) : num(rule.minutesInterval, 5);
				// The compiled schedule takes a whole number from 1 to 59, so the value is rounded
				// into that range. A manual run, as the tests do, does not use the interval.
				every.value = Math.min(Math.max(Math.round(value), 1), 59);
				break;
			}
			case 'hours': {
				const hours = num(rule.hoursInterval, 1);
				const minute = num(rule.triggerAtMinute, 0);
				if (hours > 23 && Number.isInteger(hours)) {
					// Before version 1.3 n8n accepts 24 hours and more: its cron `*/24` (`*/n`) in the
					// hour field fires at hour 0 only (`toCronExpression`).
					entries.push(['cron', raw(str(`${minute} 0 * * *`))]);
					if (timezone) entries.push(['timezone', timezone]);
					return { kind: 'object', entries };
				}
				every.value = wholeInRange(hours, 1, 23);
				every.atMinute = minute;
				break;
			}
			case 'days':
				every.value = wholeInRange(rule.daysInterval, 1, 31);
				every.atHour = num(rule.triggerAtHour, 0);
				every.atMinute = num(rule.triggerAtMinute, 0);
				break;
			case 'weeks':
				every.value = wholeInRange(rule.weeksInterval, 1, Number.MAX_SAFE_INTEGER);
				every.atHour = num(rule.triggerAtHour, 0);
				every.atMinute = num(rule.triggerAtMinute, 0);
				every.onWeekdays = Array.isArray(rule.triggerAtDay)
					? rule.triggerAtDay.map((d) => num(d, 0))
					: [0];
				break;
			case 'months':
				every.value = wholeInRange(rule.monthsInterval, 1, Number.MAX_SAFE_INTEGER);
				every.atHour = num(rule.triggerAtHour, 0);
				every.atMinute = num(rule.triggerAtMinute, 0);
				every.onDayOfMonth = num(rule.triggerAtDayOfMonth, 1);
				break;
			default:
				return `The schedule interval "${field}" is not known.`;
		}
		entries.push(['every', literal(every)]);
	}
	if (timezone) entries.push(['timezone', timezone]);
	return { kind: 'object', entries };
}

function cronOf(item: Record<string, unknown>): string | null {
	const minute = num(item.minute, 0);
	const hour = num(item.hour, 14);
	switch (item.mode ?? 'everyDay') {
		case 'everyMinute':
			return '* * * * *';
		case 'everyHour':
			return `${minute} * * * *`;
		case 'everyDay':
			return `${minute} ${hour} * * *`;
		case 'everyWeek':
			return `${minute} ${hour} * * ${num(item.weekday, 1)}`;
		case 'everyMonth':
			return `${minute} ${hour} ${num(item.dayOfMonth, 1)} * *`;
		case 'custom':
			return fixedText(item.cronExpression)?.trim() ?? null;
		default:
			return null;
	}
}

/**
 * The schedules of a polling trigger (spec 9.8): its `pollTimes` as the Cron
 * node reads its trigger times, each with `poll: true`. Null when a time is
 * not known or there is none.
 */
export function pollSchedules(node: N8nNode, timezone: string | undefined): string[] | null {
	const p = node.parameters ?? {};
	const list =
		isRecord(p.pollTimes) && Array.isArray(p.pollTimes.item)
			? p.pollTimes.item.filter(isRecord)
			: [];
	const extra: Array<[string, Code]> = [];
	if (timezone) extra.push(['timezone', raw(str(timezone))]);
	extra.push(['poll', raw('true')]);
	const triggers: string[] = [];
	for (const item of list) {
		if (item.mode === 'everyX') {
			triggers.push(
				call('schedule', {
					kind: 'object',
					entries: [...everyXOptions(item), ...extra],
				}),
			);
			continue;
		}
		const cron = cronOf(item);
		if (cron === null) return null;
		triggers.push(
			call('schedule', { kind: 'object', entries: [['cron', raw(str(cron))], ...extra] }),
		);
	}
	return triggers.length > 0 ? triggers : null;
}

export function planTrigger(
	node: N8nNode,
	workflowName: string,
	timezone: string | undefined,
	diag: (d: Omit<ConvertDiagnostic, 'node'>) => void,
	scheduleItem: 'native' | 'v1' = 'native',
): TriggerPlan {
	const p = node.parameters ?? {};
	const tz = timezone ? raw(str(timezone)) : null;
	const tzEntry: Array<[string, Code]> = tz ? [['timezone', tz]] : [];
	const standIn = (why: string): TriggerPlan => {
		diag({
			severity: 'warning',
			code: 'unsupported-trigger',
			message: `${why} The converter puts a webhook in its place; the request body is the trigger item.`,
		});
		return {
			imports: ['webhook'],
			triggers: [`webhook<Json>({ path: ${str(slug(workflowName))}, method: 'POST' })`],
			items: '[trigger.body ?? {}]',
			native: false,
		};
	};
	switch (node.type) {
		case 'n8n-nodes-base.webhook': {
			if (p.multipleMethods === true) {
				diag({
					severity: 'warning',
					code: 'webhook',
					message: 'The webhook accepts one method only: the first one.',
				});
			}
			const methodValue = Array.isArray(p.httpMethod) ? p.httpMethod[0] : p.httpMethod;
			const method = typeof methodValue === 'string' ? methodValue.toUpperCase() : 'GET';
			const path = typeof p.path === 'string' && p.path !== '' ? p.path : slug(workflowName);
			const entries: Array<[string, Code]> = [['path', raw(str(path))]];
			if (METHODS.includes(method)) entries.push(['method', raw(str(method))]);
			else
				diag({
					severity: 'warning',
					code: 'webhook',
					message: `The method ${method} is not supported; the webhook uses the default.`,
				});
			const mode = p.responseMode ?? 'onReceived';
			const respond =
				mode === 'lastNode' ? 'lastNode' : mode === 'responseNode' ? 'respondNode' : 'immediately';
			if (mode === 'streaming') {
				diag({
					severity: 'warning',
					code: 'webhook',
					message: 'Streaming responses are not supported; the webhook responds at once.',
				});
			}
			entries.push(['respond', raw(str(respond))]);
			if (typeof node.webhookId === 'string' && node.webhookId !== '') {
				entries.push(['webhookId', raw(str(node.webhookId))]);
			}
			const opts = isRecord(p.options) ? p.options : {};
			// The runtime reads these options when it parses the request (spec section 8.5).
			if (typeof opts.binaryPropertyName === 'string' && opts.binaryPropertyName !== '') {
				entries.push(['binaryPropertyName', raw(str(opts.binaryPropertyName))]);
			}
			if (opts.rawBody === true) entries.push(['rawBody', raw('true')]);
			if (opts.binaryData === true) entries.push(['binaryData', raw('true')]);
			return {
				imports: ['webhook'],
				triggers: [call('webhook<Json>', { kind: 'object', entries })],
				items:
					'[{ headers: trigger.headers, params: trigger.params ?? {}, query: trigger.query, body: trigger.body, ...(trigger.$binary === undefined ? {} : { $binary: trigger.$binary }) }]',
				native: true,
			};
		}
		case 'n8n-nodes-base.scheduleTrigger': {
			const rule =
				isRecord(p.rule) && Array.isArray(p.rule.interval)
					? p.rule.interval.filter(isRecord)
					: [{}];
			const triggers: string[] = [];
			for (const r of rule.length > 0 ? rule : [{}]) {
				const s = scheduleOf(r, tz);
				if (typeof s === 'string') return standIn(s);
				triggers.push(call('schedule', s));
			}
			if (scheduleItem === 'v1') {
				// The item of the v1 node: date fields in the time zone (helper `scheduleItem`).
				const zone = timezone ?? DEFAULT_TIMEZONE;
				return {
					imports: ['schedule'],
					triggers,
					items: `[scheduleItem(trigger.scheduledAt, ${str(zone)})]`,
					native: true,
					helpers: ['scheduleItem'],
					zones: zone === 'UTC' ? [] : [zone],
				};
			}
			diag({
				severity: 'info',
				code: 'schedule-item',
				message:
					'The trigger item has `scheduledAt` (milliseconds) in place of the date fields of the v1 Schedule Trigger.',
			});
			return {
				imports: ['schedule'],
				triggers,
				items: '[{ scheduledAt: trigger.scheduledAt }]',
				native: true,
			};
		}
		case 'n8n-nodes-base.cron': {
			const list =
				isRecord(p.triggerTimes) && Array.isArray(p.triggerTimes.item)
					? p.triggerTimes.item.filter(isRecord)
					: [];
			const triggers: string[] = [];
			for (const item of list) {
				if (item.mode === 'everyX') {
					triggers.push(
						call('schedule', {
							kind: 'object',
							entries: [...everyXOptions(item), ...tzEntry],
						}),
					);
					continue;
				}
				const cron = cronOf(item);
				if (cron === null) return standIn(`The Cron mode "${String(item.mode)}" is not known.`);
				triggers.push(
					call('schedule', { kind: 'object', entries: [['cron', raw(str(cron))], ...tzEntry] }),
				);
			}
			if (triggers.length === 0) return standIn('The Cron node has no trigger times.');
			return {
				imports: ['schedule'],
				triggers,
				// The v1 Cron node gives one empty item.
				items: scheduleItem === 'v1' ? '[{}]' : '[{ scheduledAt: trigger.scheduledAt }]',
				native: true,
			};
		}
		case 'n8n-nodes-base.interval': {
			const unit = text(p.unit, 'seconds');
			const triggers = [
				call('schedule', {
					kind: 'object',
					entries: [['every', literal({ unit, value: num(p.interval, 1) })]],
				}),
			];
			return {
				imports: ['schedule'],
				triggers,
				// The v1 Interval node gives one empty item.
				items: scheduleItem === 'v1' ? '[{}]' : '[{ scheduledAt: trigger.scheduledAt }]',
				native: true,
			};
		}
		case 'n8n-nodes-base.manualTrigger':
		case 'n8n-nodes-base.start':
			return standIn('The manual trigger has no equivalent.');
		default:
			return standIn(`The trigger ${node.type} has no equivalent.`);
	}
}

export function triggerVariable(node: N8nNode): string {
	return camelIdentifier(node.name, 'trigger');
}
