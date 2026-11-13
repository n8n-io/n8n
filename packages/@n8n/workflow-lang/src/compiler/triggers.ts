/**
 * Validates and normalises the `triggers` of a workflow definition
 * (`webhook(...)` and `schedule(...)`). See spec section 1.4.
 */
import ts from 'typescript';

import { getProperty, skipOuter } from './analysis.ts';
import { SDK_FILE } from './program.ts';
import type { Diagnostic } from './validate.ts';
import { makeDiagnostic } from './validate.ts';

type Literal = string | number | boolean | null | Literal[] | { [key: string]: Literal };

const NOT_LITERAL = Symbol('not literal');

/** Reads a JSON literal. It returns NOT_LITERAL for variables and expressions. */
function readLiteral(expr: ts.Expression): Literal | typeof NOT_LITERAL {
	const e = skipOuter(expr);
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
	if (ts.isNumericLiteral(e)) return Number(e.text);
	if (
		ts.isPrefixUnaryExpression(e) &&
		e.operator === ts.SyntaxKind.MinusToken &&
		ts.isNumericLiteral(e.operand)
	) {
		return -Number(e.operand.text);
	}
	if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (e.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (e.kind === ts.SyntaxKind.NullKeyword) return null;
	if (ts.isArrayLiteralExpression(e)) {
		const out: Literal[] = [];
		for (const x of e.elements) {
			const v = readLiteral(x);
			if (v === NOT_LITERAL) return NOT_LITERAL;
			out.push(v);
		}
		return out;
	}
	if (ts.isObjectLiteralExpression(e)) {
		const out: { [key: string]: Literal } = {};
		for (const p of e.properties) {
			if (!ts.isPropertyAssignment(p)) return NOT_LITERAL;
			if (!ts.isIdentifier(p.name) && !ts.isStringLiteral(p.name)) return NOT_LITERAL;
			const v = readLiteral(p.initializer);
			if (v === NOT_LITERAL) return NOT_LITERAL;
			out[p.name.text] = v;
		}
		return out;
	}
	return NOT_LITERAL;
}

function isPlainObject(v: unknown): v is { [key: string]: Literal } {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// Cron, as the `cron` npm package v4.4.0 parses it (CronTime._parse).

const CRON_PRESETS: Readonly<Record<string, string>> = {
	'@yearly': '0 0 0 1 1 *',
	'@monthly': '0 0 0 1 * *',
	'@weekly': '0 0 0 * * 0',
	'@daily': '0 0 0 * * *',
	'@hourly': '0 0 * * * *',
	'@minutely': '0 * * * * *',
	'@secondly': '* * * * * *',
	'@weekdays': '0 0 0 * * 1-5',
	'@weekends': '0 0 0 * * 0,6',
};

const CRON_ALIASES: Readonly<Record<string, number>> = {
	jan: 1,
	feb: 2,
	mar: 3,
	apr: 4,
	may: 5,
	jun: 6,
	jul: 7,
	aug: 8,
	sep: 9,
	oct: 10,
	nov: 11,
	dec: 12,
	sun: 0,
	mon: 1,
	tue: 2,
	wed: 3,
	thu: 4,
	fri: 5,
	sat: 6,
};

const CRON_FIELDS: ReadonlyArray<{ name: string; low: number; high: number }> = [
	{ name: 'second', low: 0, high: 59 },
	{ name: 'minute', low: 0, high: 59 },
	{ name: 'hour', low: 0, high: 23 },
	{ name: 'dayOfMonth', low: 1, high: 31 },
	{ name: 'month', low: 1, high: 12 },
	{ name: 'dayOfWeek', low: 0, high: 7 },
];

/** The longest length of each month (February has 29 days in a leap year). */
const MONTH_DAYS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** The allowed values of each cron field, in the order second..dayOfWeek. */
export type CronFields = Array<Set<number>>;

export class CronSyntaxError extends Error {}

function parseCronField(value: string, field: { name: string; low: number; high: number }) {
	const { name, low, high } = field;
	const out = new Set<number>();
	for (const item of value.split(',')) {
		const star = item.indexOf('*');
		if (star > 0) {
			throw new CronSyntaxError(`Field ${name} (${item}) has a "*" that is not at the start.`);
		}
	}
	for (const range of value.replace(/\*/g, `${low}-${high}`).split(',')) {
		const m = /^(\d+)(?:-(\d+))?(?:\/(\d+))?$/.exec(range);
		if (!m) throw new CronSyntaxError(`Field ${name} (${range}) cannot be parsed.`);
		const lower = parseInt(m[1], 10);
		const upperGiven = m[2] !== undefined ? parseInt(m[2], 10) : undefined;
		const step = m[3] !== undefined ? parseInt(m[3], 10) : 1;
		if (step === 0) throw new CronSyntaxError(`Field ${name} has a step of zero.`);
		if (upperGiven !== undefined && lower > upperGiven) {
			throw new CronSyntaxError(
				`Field ${name} has a range ${lower}-${upperGiven} with lower > upper.`,
			);
		}
		if (lower < low || (upperGiven ?? lower) > high) {
			throw new CronSyntaxError(`Field ${name} value (${range}) is out of range ${low}-${high}.`);
		}
		// `N/S` without an upper bound runs to the end of the range, as in the cron package.
		const upper = upperGiven ?? (m[3] !== undefined ? high : lower);
		for (let v = lower; v <= upper; v += step) out.add(v);
	}
	if (name === 'dayOfWeek' && out.has(7)) {
		out.delete(7);
		out.add(0);
	}
	return out;
}

/** Parses a cron expression. It throws CronSyntaxError with the reason. */
export function parseCron(expression: string): CronFields {
	let source = expression.toLowerCase();
	source = CRON_PRESETS[source] ?? source;
	source = source.replace(/[a-z]{1,3}/g, (alias) => {
		const n = CRON_ALIASES[alias];
		if (n === undefined) throw new CronSyntaxError(`Unknown name "${alias}".`);
		return String(n);
	});
	const units = source.trim().split(/\s+/);
	if (units.length < 5) throw new CronSyntaxError('Too few fields. Give 5 or 6 fields.');
	if (units.length > 6) throw new CronSyntaxError('Too many fields. Give 5 or 6 fields.');
	if (units.length === 5) units.unshift('0');
	const fields = CRON_FIELDS.map((f, i) => parseCronField(units[i], f));
	const [, , , dom, month, dow] = fields;
	// When day of week is not restricted, only day of month selects the day.
	if (dow.size === 7 && dom.size !== 31) {
		const longest = Math.max(...[...month].map((m) => MONTH_DAYS[m]));
		if (Math.min(...dom) > longest) {
			throw new CronSyntaxError(
				'The expression never fires: no allowed month has the allowed day of month.',
			);
		}
	}
	return fields;
}

// ---------------------------------------------------------------------------
// every, as n8n's Schedule Trigger validates it (validateInterval).

const UNIT_RANGE: Readonly<Record<string, [number, number]>> = {
	seconds: [1, 59],
	minutes: [1, 59],
	hours: [1, 23],
	days: [1, 31],
	weeks: [1, Number.MAX_SAFE_INTEGER],
	months: [1, Number.MAX_SAFE_INTEGER],
};

const EVERY_KEYS = ['unit', 'value', 'atHour', 'atMinute', 'onWeekdays', 'onDayOfMonth'];

const OPTIONAL_KEY_UNITS: Readonly<Record<string, readonly string[]>> = {
	atHour: ['days', 'weeks', 'months'],
	atMinute: ['hours', 'days', 'weeks', 'months'],
	onWeekdays: ['weeks'],
	onDayOfMonth: ['months'],
};

const isInt = (v: unknown, min: number, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Returns an error message, or null when `every` is valid. */
export function checkEvery(every: Literal): string | null {
	if (!isPlainObject(every)) return '`every` must be an object.';
	for (const key of Object.keys(every)) {
		if (!EVERY_KEYS.includes(key)) return `Unknown key "${key}" in \`every\`.`;
	}
	const { unit, value } = every;
	if (typeof unit !== 'string' || !(unit in UNIT_RANGE)) {
		return `Unknown unit ${JSON.stringify(unit)}. Use one of ${Object.keys(UNIT_RANGE).join(', ')}.`;
	}
	const [min, max] = UNIT_RANGE[unit];
	if (!isInt(value, min, max)) {
		const range = max === Number.MAX_SAFE_INTEGER ? `>= ${min}` : `${min}-${max}`;
		return `\`value\` for ${unit} must be an integer ${range}.`;
	}
	for (const [key, units] of Object.entries(OPTIONAL_KEY_UNITS)) {
		if (key in every && !units.includes(unit)) {
			return `\`${key}\` is not allowed for unit ${unit}. It is allowed for ${units.join(', ')}.`;
		}
	}
	if ('atHour' in every && !isInt(every.atHour, 0, 23)) return '`atHour` must be an integer 0-23.';
	if ('atMinute' in every && !isInt(every.atMinute, 0, 59)) {
		return '`atMinute` must be an integer 0-59.';
	}
	if ('onWeekdays' in every) {
		const days = every.onWeekdays;
		if (!Array.isArray(days) || !days.every((d) => isInt(d, 0, 6))) {
			return '`onWeekdays` must be an array of integers 0 (Sunday) to 6.';
		}
	}
	if ('onDayOfMonth' in every && !isInt(every.onDayOfMonth, 1, 31)) {
		return '`onDayOfMonth` must be an integer 1-31.';
	}
	return null;
}

// ---------------------------------------------------------------------------
// Time zones

let zones: Set<string> | undefined;

export function isKnownTimezone(tz: string): boolean {
	if (!zones) {
		// The package lib is ES2021, which does not declare Intl.supportedValuesOf.
		const supportedValuesOf: unknown = Reflect.get(Intl, 'supportedValuesOf');
		const list: unknown =
			typeof supportedValuesOf === 'function' ? supportedValuesOf.call(Intl, 'timeZone') : [];
		const names = Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
		zones = new Set(['UTC', ...names]);
	}
	if (zones.has(tz)) return true;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// META output

/** The normalised META entry of a `schedule({...})` options literal. */
export function scheduleMeta(options: ts.Expression | undefined): Record<string, unknown> {
	const opts = options ? readLiteral(options) : {};
	const o = isPlainObject(opts) ? opts : {};
	const out: Record<string, unknown> = { kind: 'schedule' };
	if (o.cron !== undefined) out.cron = o.cron;
	if (isPlainObject(o.every)) {
		const every: Record<string, unknown> = { unit: o.every.unit, value: o.every.value };
		for (const key of ['atHour', 'atMinute', 'onWeekdays', 'onDayOfMonth']) {
			if (key in o.every) every[key] = o.every[key];
		}
		out.every = every;
	}
	out.timezone = typeof o.timezone === 'string' ? o.timezone : 'UTC';
	if (o.poll === true) out.poll = true;
	return out;
}

// ---------------------------------------------------------------------------
// Validation

const TRIGGER_FUNCTIONS = new Set(['webhook', 'schedule']);

/** True when the callee resolves to `webhook` or `schedule` of the SDK. */
function sdkTriggerName(checker: ts.TypeChecker, callee: ts.Expression): string | null {
	if (!ts.isIdentifier(callee) || !TRIGGER_FUNCTIONS.has(callee.text)) return null;
	let symbol = checker.getSymbolAtLocation(callee);
	if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
	const fromSdk = (symbol?.declarations ?? []).some((d) => d.getSourceFile().fileName === SDK_FILE);
	return fromSdk ? callee.text : null;
}

/** Validates the `triggers` property of a `workflow({...})` options literal. */
export function validateTriggers(
	checker: ts.TypeChecker,
	options: ts.ObjectLiteralExpression,
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const triggers = getProperty(options, 'triggers')?.initializer;
	if (!triggers) return out;
	const arr = skipOuter(triggers);
	if (!ts.isArrayLiteralExpression(arr)) {
		out.push(
			makeDiagnostic(
				triggers,
				'WL050',
				'`triggers` must be an array literal of trigger calls.',
				"triggers: [webhook({ path: 'x' })]",
			),
		);
		return out;
	}
	for (const element of arr.elements) {
		out.push(...validateTrigger(checker, element));
	}
	return out;
}

function validateTrigger(checker: ts.TypeChecker, element: ts.Expression): Diagnostic[] {
	const e = skipOuter(element);
	const name = ts.isCallExpression(e) ? sdkTriggerName(checker, e.expression) : null;
	const arg = ts.isCallExpression(e) && e.arguments.length === 1 ? e.arguments[0] : undefined;
	const options = arg ? skipOuter(arg) : undefined;
	if (!name || !options || !ts.isObjectLiteralExpression(options)) {
		return [
			makeDiagnostic(
				element,
				'WL050',
				'A trigger must be a call of `webhook(...)` or `schedule(...)` with one object literal.',
				"webhook({ path: 'x' }) or schedule({ cron: '0 * * * *' })",
			),
		];
	}
	const value = readLiteral(options);
	if (!isPlainObject(value)) {
		const bad =
			options.properties.find(
				(p) => !ts.isPropertyAssignment(p) || readLiteral(p.initializer) === NOT_LITERAL,
			) ?? options;
		return [
			makeDiagnostic(
				bad,
				'WL050',
				'Trigger options must be literals. Variables and expressions are not allowed.',
				'Write the value as a string, number, boolean, array or object literal.',
			),
		];
	}
	return name === 'schedule' ? validateSchedule(options, value) : [];
}

function validateSchedule(
	options: ts.ObjectLiteralExpression,
	value: { [key: string]: Literal },
): Diagnostic[] {
	const out: Diagnostic[] = [];
	const at = (key: string): ts.Node => getProperty(options, key) ?? options;
	for (const key of Object.keys(value)) {
		if (key !== 'cron' && key !== 'every' && key !== 'timezone' && key !== 'poll') {
			out.push(
				makeDiagnostic(
					at(key),
					'WL050',
					`Unknown schedule option "${key}".`,
					'Use only cron, every, timezone and poll.',
				),
			);
		}
	}
	const hasCron = 'cron' in value;
	const hasEvery = 'every' in value;
	if (hasCron === hasEvery) {
		out.push(
			makeDiagnostic(
				options,
				'WL051',
				'`schedule` needs exactly one of `cron` and `every`.',
				hasCron
					? 'Remove `cron` or `every`.'
					: "schedule({ every: { unit: 'hours', value: 1 } }) or schedule({ cron: '0 * * * *' })",
			),
		);
	} else if (hasCron) {
		const cron = value.cron;
		let reason: string | null = null;
		if (typeof cron !== 'string') {
			reason = '`cron` must be a string.';
		} else {
			try {
				parseCron(cron);
			} catch (error) {
				if (!(error instanceof CronSyntaxError)) throw error;
				reason = error.message;
			}
		}
		if (reason !== null) {
			out.push(
				makeDiagnostic(
					getProperty(options, 'cron')?.initializer ?? options,
					'WL052',
					`Invalid cron expression: ${reason}`,
					"Use 5 or 6 fields, for example '0 9 * * mon-fri'.",
				),
			);
		}
	} else {
		const reason = checkEvery(value.every);
		if (reason !== null) {
			out.push(
				makeDiagnostic(
					getProperty(options, 'every')?.initializer ?? options,
					'WL053',
					`Invalid \`every\`: ${reason}`,
					"every: { unit: 'hours', value: 1, atMinute: 0 }",
				),
			);
		}
	}
	if ('timezone' in value) {
		const tz = value.timezone;
		if (typeof tz !== 'string' || !isKnownTimezone(tz)) {
			out.push(
				makeDiagnostic(
					getProperty(options, 'timezone')?.initializer ?? options,
					'WL054',
					`Unknown time zone ${JSON.stringify(tz)}.`,
					"Use an IANA time zone name, for example 'Europe/Berlin', or 'UTC'.",
				),
			);
		}
	}
	return out;
}
