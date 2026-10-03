import { t, UserError } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';
import { setPath, pathOf } from '../path';

const CALENDAR = ['years', 'quarters', 'months'] as const;
const FIXED = ['weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'] as const;
type Unit = (typeof CALENDAR)[number] | (typeof FIXED)[number];

const MS: Readonly<Record<(typeof FIXED)[number], number>> = {
	weeks: 604_800_000,
	days: 86_400_000,
	hours: 3_600_000,
	minutes: 60_000,
	seconds: 1000,
	milliseconds: 1,
};

const iso = () => t.str().hint('ISO 8601, e.g. 2026-09-01T10:00:00Z');
const step = {
	amount: t.num().hint('A whole number for years, quarters, and months'),
	unit: t.oneOf(...CALENDAR, ...FIXED),
};
const ROUND_UNITS = [
	'year',
	'quarter',
	'month',
	'week',
	'day',
	'hour',
	'minute',
	'second',
] as const;
type RoundUnit = (typeof ROUND_UNITS)[number];

function millisOf(date: string): number {
	const millis = Date.parse(date);
	if (Number.isNaN(millis)) throw new UserError(`"${date}" is not an ISO 8601 date`);
	return millis;
}

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/** Calendar units keep the day of month and clamp it to the last day, as Luxon does. */
function plus(millis: number, amount: number, unit: Unit): number {
	if (unit === 'years' || unit === 'quarters' || unit === 'months') {
		if (!Number.isInteger(amount))
			throw new UserError(`The amount of ${unit} must be a whole number, not ${amount}`);
		const months = amount * (unit === 'years' ? 12 : unit === 'quarters' ? 3 : 1);
		const date = new Date(millis);
		const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
		const [year, month] = [Math.floor(total / 12), ((total % 12) + 12) % 12];
		const day = Math.min(date.getUTCDate(), daysIn(year, month));
		return (
			Date.UTC(year, month, day) +
			(millis - Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
		);
	}
	return millis + amount * MS[unit];
}

/** The start of the unit in UTC. A week starts on Monday, as in ISO 8601. */
function startOf(millis: number, unit: RoundUnit): number {
	const date = new Date(millis);
	const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
	switch (unit) {
		case 'year':
			return Date.UTC(year, 0, 1);
		case 'quarter':
			return Date.UTC(year, month - (month % 3), 1);
		case 'month':
			return Date.UTC(year, month, 1);
		case 'week':
			return Date.UTC(year, month, day - ((date.getUTCDay() + 6) % 7));
		case 'day':
			return Date.UTC(year, month, day);
		case 'hour':
			return millis - (millis % MS.hours);
		case 'minute':
			return millis - (millis % MS.minutes);
		case 'second':
			return millis - (millis % MS.seconds);
	}
}

/** The ISO 8601 week number: the week with the year's first Thursday is week 1. */
function isoWeek(millis: number): number {
	const date = new Date(startOf(millis, 'day'));
	const thursday = date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * MS.days;
	const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
	return Math.floor((thursday - yearStart) / MS.weeks) + 1;
}

const PARTS = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'] as const;

function partOf(millis: number, part: (typeof PARTS)[number]): number {
	const date = new Date(millis);
	const parts = {
		year: () => date.getUTCFullYear(),
		month: () => date.getUTCMonth() + 1,
		week: () => isoWeek(millis),
		day: () => date.getUTCDate(),
		hour: () => date.getUTCHours(),
		minute: () => date.getUTCMinutes(),
		second: () => date.getUTCSeconds(),
	};
	return parts[part]();
}

export const dateTime = itemsNode.action('dateTime', {
	action: 'Calculate a date',
	summary: 'Add to, subtract from, round, compare, or read a part of a date, in UTC.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: {
		date: iso(),
		operation: t.variant('op', {
			add: step,
			subtract: step,
			round: { direction: t.oneOf('down', 'up'), unit: t.oneOf(...ROUND_UNITS) },
			between: { until: iso(), unit: t.oneOf(...FIXED) },
			extract: { part: t.oneOf(...PARTS) },
		}),
		outputField: t.str().with({ minLength: 1 }).default('newDate'),
		keepInput: t.bool().default(false).hint('Keep the input fields beside the output field'),
	},
	output: t.json(),
	async run({ input, item }) {
		const { operation } = input;
		const millis = millisOf(input.date);
		const result = (() => {
			switch (operation.op) {
				case 'add':
				case 'subtract': {
					const sign = operation.op === 'add' ? 1 : -1;
					return new Date(plus(millis, sign * operation.amount, operation.unit)).toISOString();
				}
				case 'round': {
					const { unit } = operation;
					const start = operation.direction === 'down' ? millis : plus(millis, 1, `${unit}s`);
					return new Date(startOf(start, unit)).toISOString();
				}
				case 'between':
					return (millisOf(operation.until) - millis) / MS[operation.unit];
				case 'extract':
					return partOf(millis, operation.part);
			}
		})();
		const base = input.keepInput ? item.json : {};
		return await Promise.resolve(setPath(base, pathOf(input.outputField), result));
	},
});
