/**
 * Date & Time version 2 as code, for the calls that need no date parser: "Get Current Date",
 * and the operations on a date that an expression gives as a Luxon DateTime (`$now`,
 * `$today`, `DateTime.…`). The v1 node uses such a value as it is. A date that is text goes
 * through the date parser of v1 (moment.js): those calls stay with the node compiler or the
 * fallback host (`lowerFallback`).
 *
 * Each value is one Luxon expression that the expression translator checks and rewrites
 * (`code-native/luxon-expression.ts`), so the code is the code of the same expression in a
 * Set node.
 */
import { formatSupported } from './code-native/luxon-expression.ts';
import { str } from './code.ts';
import type { NodeContext } from './context.ts';
import { INDEX, ITEM, segments } from './expression.ts';
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

/** The parts of a Date & Time node that has a native form, or null. */
function plan(node: N8nNode): { expression: string; name: string; keep: boolean } | null {
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
	return expression === null ? null : { expression, name, keep };
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
	const path = c.parameters.magnitude !== undefined ? 'magnitude' : 'date';
	const t = c.compiled(`={{ ${parts.expression} }}`, path);
	const value = c.print(t.code);
	const fields = parts.keep ? `...${ITEM}, ` : '';
	const params = t.usage.index ? `(${ITEM}: Json, ${INDEX}: number)` : `(${ITEM}: Json)`;
	c.w.line(
		`const ${c.output(0)}: Json[] = ${c.input}.map(${params} => ({ ${fields}${str(parts.name)}: ${value} }));`,
	);
}
