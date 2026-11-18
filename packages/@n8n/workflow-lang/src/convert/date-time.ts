/**
 * Date & Time version 2 as code: "Get Current Date", and the operations on a date.
 *
 * - A date that an expression gives as a Luxon DateTime (`$now`, `$today`, `DateTime.…`):
 *   the v1 node uses such a value as it is. Each value is one Luxon expression that the
 *   expression translator checks and rewrites (`code-native/luxon-expression.ts`), so the
 *   code is the code of the same expression in a Set node.
 * - A date that is text or a number (fixed text, a text template, or a value of the data of
 *   an item): the v1 node reads it with its own rules (`parseDate`), which
 *   `date-time-helpers.ts` copies. A value without an exact form hands the node over to the
 *   fallback host at run time, so the node has a fallback-host form after its code.
 *
 * Each other call stays with the node compiler or the fallback host (`lowerFallback`).
 */
import ts from 'typescript';

import { isKnownTimezone } from '../compiler/triggers.ts';
import { formatSupported } from './code-native/luxon-expression.ts';
import { str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { INDEX, ITEM, segments } from './expression.ts';
import { localTimeIsUtc } from './node-identity.ts';
import { emitWithHostForm, hostFormOf, lowerFallback } from './steps.ts';
import type { N8nNode } from './types.ts';
import { isRecord } from './types.ts';

const UNITS = [
	'years',
	'quarters',
	'months',
	'weeks',
	'days',
	'hours',
	'minutes',
	'seconds',
	'milliseconds',
];
const ROUND_UNITS = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];
const PARTS = ['year', 'month', 'day', 'hour', 'minute', 'second'];

const OUTPUT_NAMES: Record<string, string> = {
	getCurrentDate: 'currentDate',
	addToDate: 'newDate',
	subtractFromDate: 'newDate',
	formatDate: 'formattedDate',
	roundDate: 'roundedDate',
	extractDate: 'datePart',
};

/** The body of a value that is one `{{ }}` expression, or null. */
function body(value: unknown): string | null {
	if (typeof value !== 'string' || !value.startsWith('=')) return null;
	const parts = segments(value.slice(1));
	if (parts.length !== 1 || parts[0].expression === undefined) return null;
	return parts[0].expression;
}

/** The body of an expression that starts as a Luxon DateTime, or null. */
function dateBody(value: unknown): string | null {
	const text = body(value);
	return text !== null && /^\s*\(*\s*(\$now|\$today|DateTime\s*\.)/.test(text) ? text : null;
}

const fixedText = (value: unknown): value is string =>
	typeof value === 'string' && !value.startsWith('=');

/**
 * The Luxon expression of the value that the node writes, or null when the call has no
 * native form. `zone` is the time zone of the workflow.
 */
function valueExpression(p: Record<string, unknown>, operation: string): string | null {
	const options = isRecord(p.options) ? p.options : {};
	if (operation === 'getCurrentDate') {
		const includeTime = p.includeTime ?? true;
		if (typeof includeTime !== 'boolean') return null;
		const zone = options.timezone ?? '';
		if (!fixedText(zone)) return null;
		const now = zone === '' ? 'DateTime.now()' : `DateTime.now().setZone(${JSON.stringify(zone)})`;
		return includeTime ? `${now}.toString()` : `${now}.startOf('day').toString()`;
	}
	if (operation === 'addToDate' || operation === 'subtractFromDate') {
		const date = dateBody(p.magnitude);
		const unit = p.timeUnit ?? 'days';
		const duration = p.duration ?? 0;
		const amount =
			typeof duration === 'number'
				? String(duration)
				: body(duration) === null
					? null
					: `(${body(duration)})`;
		if (date === null || typeof unit !== 'string' || !UNITS.includes(unit) || amount === null) {
			return null;
		}
		const method = operation === 'addToDate' ? 'plus' : 'minus';
		return `(${date}).${method}({ ${unit}: ${amount} }).toString()`;
	}
	if (operation === 'formatDate') {
		const date = dateBody(p.date);
		const chosen = p.format ?? 'MM/dd/yyyy';
		const format = chosen === 'custom' ? p.customFormat : chosen;
		if (date === null || !fixedText(format) || !formatSupported(format)) return null;
		// `fromFormat` reads text. The option `timezone` changes the zone of text only.
		if (options.fromFormat !== undefined) return null;
		return `(${date}).toFormat(${JSON.stringify(format)})`;
	}
	if (operation === 'roundDate') {
		const date = dateBody(p.date);
		const mode = p.mode ?? 'roundDown';
		if (date === null) return null;
		if (mode === 'roundDown') {
			const unit = p.toNearest ?? 'month';
			if (typeof unit !== 'string' || !ROUND_UNITS.includes(unit)) return null;
			return `(${date}).startOf(${JSON.stringify(unit)}).toString()`;
		}
		if (mode === 'roundUp') {
			const unit = p.to ?? 'month';
			if (unit !== 'month') return null;
			return `(${date}).plus({ months: 1 }).startOf('month').toString()`;
		}
		return null;
	}
	if (operation === 'extractDate') {
		const date = dateBody(p.date);
		const part = p.part ?? 'month';
		if (date === null || typeof part !== 'string' || !PARTS.includes(part)) return null;
		return `(${date}).${part}`;
	}
	return null;
}

/** The members that each object, text, list, number and boolean has: their value is no data. */
const INHERITED = [
	Object.prototype,
	String.prototype,
	Array.prototype,
	Number.prototype,
	Boolean.prototype,
];
const inherited = (key: string) => key !== 'length' && INHERITED.some((proto) => key in proto);
/** The JSON of an item is an object: it has the members of each object only. */
const inheritedOfItem = (key: string) => key in Object.prototype;

/** The item of a node, of which `.json` is data. */
const ITEM_OF = [
	/^\$\(\s*(['"])(?:(?!\1)[^\\])*\1\s*\)\.(item|first\(\)|last\(\))$/,
	/^\$input\.(item|first\(\)|last\(\))$/,
	/^\$node(\.[A-Za-z_]\w*|\[(['"])(?:(?!\2)[^\\])*\2\])$/,
];

/**
 * True when the expression reads one value of the data of an item (`$json.a.b`,
 * `$('Node').item.json["a"][0]`). Such a value is JSON: it is no DateTime and no Date.
 */
function isDataPath(text: string): boolean {
	const sf = ts.createSourceFile('e.ts', `(${text});`, ts.ScriptTarget.ES2022, true);
	const statement = sf.statements[0];
	if (sf.statements.length !== 1 || !ts.isExpressionStatement(statement)) return false;
	/** True for the JSON of an item: `$json`, or `.json` of the item of a node. */
	const isItemJson = (node: ts.Expression): boolean => {
		let inner = node;
		while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
		if (ts.isIdentifier(inner)) return inner.text === '$json';
		if (!ts.isPropertyAccessExpression(inner) || inner.name.text !== 'json') return false;
		const base = inner.expression.getText(sf);
		return ITEM_OF.some((form) => form.test(base));
	};
	let e = statement.expression;
	for (;;) {
		while (ts.isParenthesizedExpression(e)) e = e.expression;
		if (isItemJson(e)) return true;
		let key: string | undefined;
		if (ts.isPropertyAccessExpression(e)) {
			if (!ts.isIdentifier(e.name)) return false;
			key = e.name.text;
		} else if (ts.isElementAccessExpression(e)) {
			const argument = e.argumentExpression;
			if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
				key = argument.text;
			} else if (!ts.isNumericLiteral(argument)) return false;
		} else return false;
		// A key of a value below the item can be a member of text or of a list.
		const member = isItemJson(e.expression) ? inheritedOfItem : inherited;
		if (key !== undefined && member(key)) return false;
		e = e.expression;
	}
}

/**
 * True for a date that is text or a number for certain: a fixed value, a text template, or
 * one value of the data of an item.
 */
function plainDate(value: unknown): boolean {
	if (typeof value === 'number') return true;
	if (typeof value !== 'string') return false;
	if (!value.startsWith('=')) return true;
	const parts = segments(value.slice(1));
	if (parts.length !== 1) return true;
	return parts[0].expression === undefined || isDataPath(parts[0].expression);
}

/** True when the format has the token `z`, the name of the time zone. */
function namesZone(fmt: string): boolean {
	let k = 0;
	while (k < fmt.length) {
		const ch = fmt.charAt(k);
		if (ch === "'") {
			const end = fmt.indexOf("'", k + 1);
			k = end < 0 ? fmt.length : end + 1;
			continue;
		}
		let n = 1;
		while (fmt.charAt(k + n) === ch) n++;
		if (ch === 'z' && n === 1) return true;
		k += n;
	}
	return false;
}

/** The parts of the code of a value. */
interface TextParts {
	/** The code of the DateTime of the date (`dateTimeOfValue`). */
	of: string;
	/** The code of the date. */
	date: string;
	/** The code of the zone that v1 gives to the date. */
	zone: string;
	/** The code of "local time of n8n is UTC". */
	local: string;
	/** The code of the default zone of the Luxon helpers. */
	dz: string;
	/** The code of the amount of "add" and "subtract". */
	amount: string;
}

/** The plan of a call on a date that is text or a number. */
interface TextPlan {
	path: 'date' | 'magnitude';
	/** True when v1 gives the workflow time zone to the date. */
	zoned: boolean;
	/** The amount of "add" and "subtract" that an expression gives. */
	amount?: unknown;
	helpers: string[];
	code(parts: TextParts): string;
}

/** The plan of a call on a date that is text or a number, or null when it has no native form. */
function textPlan(p: Record<string, unknown>, operation: string): TextPlan | null {
	const options = isRecord(p.options) ? p.options : {};
	if (operation === 'addToDate' || operation === 'subtractFromDate') {
		const unit = p.timeUnit ?? 'days';
		const duration = p.duration ?? 0;
		const fixed = typeof duration === 'number';
		if (!plainDate(p.magnitude) || typeof unit !== 'string' || !UNITS.includes(unit)) return null;
		if (!fixed && body(duration) === null) return null;
		const method = operation === 'addToDate' ? 'plus' : 'minus';
		return {
			path: 'magnitude',
			zoned: true,
			amount: fixed ? undefined : duration,
			helpers: ['luxText', 'luxCall', 'dateTimeInZone', ...(fixed ? [] : ['dateTimeAmount'])],
			code: (x) =>
				`luxText(dateTimeInZone(luxCall(${x.of}, ${str(method)}, [{ ${unit}: ${fixed ? String(duration) : `dateTimeAmount(${x.amount})`} }], ${x.dz})))`,
		};
	}
	if (operation === 'formatDate') {
		const chosen = p.format ?? 'MM/dd/yyyy';
		const format = chosen === 'custom' ? p.customFormat : chosen;
		const zoned = options.timezone ?? false;
		const from = options.fromFormat;
		if (!plainDate(p.date) || !fixedText(format) || !formatSupported(format)) return null;
		// `fromFormat` reads the text with a format of Luxon.
		if (typeof zoned !== 'boolean' || (from !== undefined && from !== '')) return null;
		// Without a zone the date is in `Etc/UTC` or `Etc/GMT-<hours>`: the helper keeps the
		// offset only, not the name.
		if (!zoned && namesZone(format)) return null;
		return {
			path: 'date',
			zoned,
			helpers: ['dateTimeFormatted'],
			code: (x) => `dateTimeFormatted(${x.date}, ${x.zone}, ${x.local}, ${str(format)})`,
		};
	}
	if (operation === 'roundDate') {
		const mode = p.mode ?? 'roundDown';
		if (!plainDate(p.date)) return null;
		if (mode === 'roundDown') {
			const unit = p.toNearest ?? 'month';
			if (typeof unit !== 'string' || !ROUND_UNITS.includes(unit)) return null;
			return {
				path: 'date',
				zoned: true,
				helpers: ['luxText', 'luxStartOf', 'dateTimeInZone'],
				code: (x) => `luxText(dateTimeInZone(luxStartOf(${x.of}, ${str(unit)})))`,
			};
		}
		if (mode === 'roundUp' && (p.to ?? 'month') === 'month') {
			return {
				path: 'date',
				zoned: true,
				helpers: ['luxText', 'luxStartOf', 'luxCall', 'dateTimeInZone'],
				code: (x) =>
					`luxText(dateTimeInZone(luxStartOf(luxCall(${x.of}, "plus", [{ months: 1 }], ${x.dz}), 'month')))`,
			};
		}
		return null;
	}
	if (operation === 'extractDate') {
		const part = p.part ?? 'month';
		if (!plainDate(p.date) || typeof part !== 'string' || !PARTS.includes(part)) return null;
		return {
			path: 'date',
			zoned: true,
			helpers: ['luxGet'],
			code: (x) => `luxGet(${x.of}, ${str(part)})`,
		};
	}
	return null;
}

interface Plan {
	/** The Luxon expression of the value, for a date that is a DateTime. */
	expression?: string;
	/** The plan of the value, for a date that is text or a number. */
	text?: TextPlan;
	name: string;
	keep: boolean;
}

/** The parts of a Date & Time node that has a native form, or null. */
function plan(node: N8nNode): Plan | null {
	const p = node.parameters ?? {};
	if ((node.typeVersion ?? 1) < 2) return null;
	// Under "continue on fail" the v1 node gives an error item for a failed item.
	if (node.continueOnFail || (node.onError !== undefined && node.onError !== 'stopWorkflow')) {
		return null;
	}
	const operation = p.operation ?? 'getCurrentDate';
	if (typeof operation !== 'string') return null;
	const options = isRecord(p.options) ? p.options : {};
	const keep = options.includeInputFields ?? false;
	const name = p.outputFieldName ?? OUTPUT_NAMES[operation];
	if (typeof keep !== 'boolean' || !fixedText(name)) return null;
	const expression = valueExpression(p, operation);
	if (expression !== null) return { expression, name, keep };
	const text = textPlan(p, operation);
	return text === null ? null : { text, name, keep };
}

/**
 * The zone of the Luxon helpers for the workflow time zone, or null when the zone has no
 * native form. Luxon reads some names as a fixed offset (`utc`, `gmt`, `utc+2`).
 */
function workflowZone(c: NodeContext): string | null {
	const zone = c.scope.timezone;
	if (zone === undefined) return null;
	if (zone === 'UTC') return zone;
	const lower = zone.toLowerCase();
	if (['utc', 'gmt', 'z', 'local', 'system', 'default'].includes(lower)) return null;
	if (lower.startsWith('utc') || !isKnownTimezone(zone)) return null;
	c.scope.useZone?.(zone);
	return zone;
}

/**
 * A date that is text or a number: the code of `parseDate` of v1, and after it the
 * fallback-host form of the node for a value without an exact form.
 */
function lowerTextDate(c: NodeContext, text: TextPlan, name: string, keep: boolean): void {
	const zone = text.zoned ? workflowZone(c) : '';
	let date;
	let amount;
	try {
		date = c.compiled(c.parameters[text.path], text.path);
		amount = text.amount === undefined ? undefined : c.compiled(text.amount, 'duration');
	} catch (error) {
		if (!(error instanceof NodeFailure)) throw error;
		date = undefined;
	}
	const hostForm = zone === null || date === undefined ? null : hostFormOf(c);
	if (zone === null || date === undefined || hostForm === null) {
		lowerFallback(c);
		return;
	}
	for (const helper of text.helpers) c.helper(helper);
	if (text.helpers.some((helper) => helper !== 'dateTimeFormatted')) c.helper('dateTimeOfValue');
	const dateCode = c.print(date.code);
	const local = String(localTimeIsUtc('process'));
	const value = text.code({
		of: `dateTimeOfValue(${dateCode}, ${str(zone)}, ${local})`,
		date: dateCode,
		zone: str(zone),
		local,
		dz: str(c.scope.timezone ?? 'UTC'),
		amount: amount === undefined ? '' : c.print(amount.code),
	});
	const fields = keep ? `...${ITEM}, ` : '';
	const params =
		date.usage.index || amount?.usage.index
			? `(${ITEM}: Json, ${INDEX}: number)`
			: `(${ITEM}: Json)`;
	emitWithHostForm(
		c,
		false,
		(to) => {
			to.w.line(
				`const ${to.output(0)}: Json[] = ${to.input}.map(${params} => ({ ${fields}${str(name)}: ${value} }));`,
			);
		},
		hostForm,
	);
}

/** True when the Date & Time node has a native form (`lowerDateTime`). */
export function isNativeDateTime(node: N8nNode): boolean {
	return plan(node) !== null;
}

/**
 * Date & Time version 2: one output item for each input item, with the value in the output
 * field. With "Include Input Fields" the item keeps its fields and its binary data.
 */
export function lowerDateTime(c: NodeContext): void {
	const parts = plan(c.node);
	// `lowererOf` gives this lowering only to a node with a plan.
	if (parts === null) throw new Error('The Date & Time node has no native form.');
	if (parts.expression === undefined) {
		if (parts.text) lowerTextDate(c, parts.text, parts.name, parts.keep);
		return;
	}
	const path = c.parameters.magnitude !== undefined ? 'magnitude' : 'date';
	const t = c.compiled(`={{ ${parts.expression} }}`, path);
	const value = c.print(t.code);
	const fields = parts.keep ? `...${ITEM}, ` : '';
	const params = t.usage.index ? `(${ITEM}: Json, ${INDEX}: number)` : `(${ITEM}: Json)`;
	c.w.line(
		`const ${c.output(0)}: Json[] = ${c.input}.map(${params} => ({ ${fields}${str(parts.name)}: ${value} }));`,
	);
}
