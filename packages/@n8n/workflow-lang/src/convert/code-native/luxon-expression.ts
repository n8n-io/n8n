/**
 * Luxon in parameter expressions: rewrites `$now`, `$today`, `DateTime.*`
 * and the DateTime and Duration methods on them to the Luxon helpers of
 * `luxon-helpers.ts`, which native Code nodes use too.
 *
 * The pass follows the kind of each value: a DateTime (`dt`), a Duration
 * (`dur`) or another value. It rewrites a method or a getter only on a value
 * that it knows is a DateTime or a Duration. A DateTime or a Duration that
 * goes to any other place stops the pass, so the expression runs in the
 * fallback host. The clock is `ctx.now()`, the batch clock: a replay gives the
 * same value. The default zone is the workflow time zone, as in v1.
 */
import ts from 'typescript';

import { isKnownTimezone } from '../../compiler/triggers.ts';

type Kind = 'dt' | 'dur' | null;

interface Out {
	code: string;
	kind: Kind;
}

export type LuxonRewrite =
	| { ok: true; code: string; zones: string[] }
	| { ok: false; feature: string; message: string };

/** Luxon helpers that the rewritten code calls directly. */
export const LUXON_ENTRY_HELPERS = [
	'luxOf',
	'luxStartOf',
	'luxFromISO',
	'luxStatic',
	'luxCall',
	'luxGet',
	'luxText',
	'luxNum',
];

const USES_LUXON = /\$now\b|\$today\b|\bDateTime\b/;

/** DateTime methods, and true when the method gives a DateTime. */
const DT_METHODS = new Map<string, boolean>([
	['toFormat', false],
	['toISO', false],
	['toISODate', false],
	['toISOTime', false],
	['toMillis', false],
	['toSeconds', false],
	['toUnixInteger', false],
	['valueOf', false],
	['equals', false],
	['diff', false],
	['plus', true],
	['minus', true],
	['startOf', true],
	['endOf', true],
	['set', true],
	['toUTC', true],
	['toLocal', true],
	['setZone', true],
]);

const DT_GETTERS = new Set([
	'year',
	'month',
	'day',
	'hour',
	'minute',
	'second',
	'millisecond',
	'weekday',
	'isValid',
	'invalidReason',
	'zoneName',
	'offset',
	'daysInMonth',
	'ordinal',
	'quarter',
]);

const DUR_UNITS = [
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

const NUMERIC_OPERATORS = new Set<ts.SyntaxKind>([
	ts.SyntaxKind.LessThanToken,
	ts.SyntaxKind.LessThanEqualsToken,
	ts.SyntaxKind.GreaterThanToken,
	ts.SyntaxKind.GreaterThanEqualsToken,
	ts.SyntaxKind.MinusToken,
]);

const DUR_METHODS = new Set(['as', 'toMillis', 'toObject', 'get', 'valueOf']);

const STATICS = new Set([
	'now',
	'fromISO',
	'fromMillis',
	'fromSeconds',
	'fromJSDate',
	'fromObject',
	'utc',
]);

/** The tokens of `luxFormat`. */
const FORMAT_TOKENS = new Set(
	'yyyy yy y yyyyyy M MM MMM MMMM MMMMM L LL LLL LLLL LLLLL d dd H HH h hh m mm s ss S SSS a c ccc cccc ccccc E EEE EEEE EEEEE o ooo Z ZZ ZZZ z x X q qq'.split(
		' ',
	),
);

export function formatSupported(fmt: string): boolean {
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
		if (/[A-Za-z]/.test(ch) && !FORMAT_TOKENS.has(fmt.slice(k, k + n))) return false;
		k += n;
	}
	return true;
}

/** Text of a string literal, or null. */
function constText(e: ts.Expression): string | null {
	let x = e;
	while (ts.isParenthesizedExpression(x)) x = x.expression;
	return ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) ? x.text : null;
}

/** The plural Duration unit of `u` (Luxon `normalizeUnit`), or null. */
function durUnit(u: string): string | null {
	const lower = u.toLowerCase();
	return DUR_UNITS.find((n) => n === lower || n === `${lower}s`) ?? null;
}

class Stop extends Error {
	readonly feature: string;

	constructor(feature: string, message: string) {
		super(message);
		this.feature = feature;
	}
}

/**
 * Rewrites the Luxon forms of one translated expression body. `timezone` is
 * the workflow time zone. The code must parse as one expression.
 */
export function rewriteLuxon(code: string, timezone: string): LuxonRewrite {
	if (!USES_LUXON.test(code)) return { ok: true, code, zones: [] };
	const text = `(${code})`;
	const sf = ts.createSourceFile('e.ts', text, ts.ScriptTarget.ES2022, true);
	const zones = new Set<string>();
	const dz = JSON.stringify(timezone);
	if (timezone !== 'UTC') {
		if (!isKnownTimezone(timezone)) {
			return {
				ok: false,
				feature: 'Luxon zone',
				message: 'The workflow time zone is not in the zone table.',
			};
		}
		zones.add(timezone);
	}
	const stop = (feature: string, message: string): never => {
		throw new Stop(feature, message);
	};

	/** A zone of a literal argument; it stops on a computed or unknown zone. */
	const zoneArg = (e: ts.Expression): void => {
		const z = constText(e);
		if (z === null) stop('Luxon zone', 'A computed zone has no native form.');
		const name = z ?? '';
		const lower = name.toLowerCase();
		if (
			['local', 'system', 'default', 'utc', 'gmt', 'z'].includes(lower) ||
			/^utc[+-]\d{1,2}(:\d{2})?$/i.test(name)
		) {
			return;
		}
		if (!isKnownTimezone(name)) stop('Luxon zone', 'The zone is not in the zone table.');
		zones.add(name);
	};

	/** Absent options or a literal `{ zone, setZone }` object. */
	const options = (e: ts.Expression | undefined): void => {
		if (e === undefined) return;
		if (!ts.isObjectLiteralExpression(e)) stop('Luxon options', 'Computed options.');
		for (const p of (e as ts.ObjectLiteralExpression).properties) {
			if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) {
				stop('Luxon options', 'Computed options.');
			} else if (p.name.text === 'zone') zoneArg(p.initializer);
			else if (p.name.text !== 'setZone') stop('Luxon options', `The option ${p.name.text}.`);
		}
	};

	/** The node with its children rewritten; a DateTime or Duration child stops. */
	const splice = (n: ts.Node, allow: (c: ts.Node) => boolean = () => false): string => {
		let out = '';
		let at = n.getStart(sf);
		ts.forEachChild(n, (c) => {
			const o = emit(c);
			if (o.kind !== null && !allow(c)) {
				stop('Luxon value', 'A DateTime or a Duration as a value has no native form.');
			}
			out += text.slice(at, c.getStart(sf)) + o.code;
			at = c.getEnd();
		});
		return out + text.slice(at, n.getEnd());
	};

	const args = (call: ts.CallExpression, allow = false): string[] =>
		call.arguments.map((a) => {
			if (ts.isSpreadElement(a)) stop('Luxon arguments', 'Spread arguments.');
			const o = emit(a);
			if (o.kind !== null && !allow) {
				stop('Luxon value', 'A DateTime or a Duration as a value has no native form.');
			}
			return o.code;
		});

	const now = `luxOf(ctx.now(), ${dz})`;

	const staticCall = (call: ts.CallExpression, name: string): Out => {
		const a = call.arguments;
		if (!STATICS.has(name)) stop('Luxon DateTime', `\`DateTime.${name}\` has no native form.`);
		if (name === 'now') {
			if (a.length > 0) stop('Luxon DateTime', 'DateTime.now with arguments.');
			return { code: now, kind: 'dt' };
		}
		if (name === 'utc') {
			return { code: `luxStatic("utc", [${args(call).join(', ')}], ctx.now(), ${dz})`, kind: 'dt' };
		}
		if (a.length < 1 || a.length > 2) stop('Luxon DateTime', `DateTime.${name} arguments.`);
		options(a[1]);
		const list = args(call);
		if (name === 'fromISO') {
			return {
				code: `luxFromISO(${list[0]}, ${list[1] ?? 'undefined'}, ctx.now(), ${dz})`,
				kind: 'dt',
			};
		}
		return {
			code: `luxStatic(${JSON.stringify(name)}, [${list.join(', ')}], ctx.now(), ${dz})`,
			kind: 'dt',
		};
	};

	const dtMethod = (call: ts.CallExpression, recv: string, name: string): Out => {
		const a = call.arguments;
		if (name === 'toFormat') {
			const fmt = a.length === 1 ? constText(a[0]) : null;
			if (fmt === null || !formatSupported(fmt)) {
				stop('Luxon toFormat', 'A computed format, options or a token without a native form.');
			}
		}
		if (name === 'setZone') {
			if (a.length !== 1) stop('Luxon setZone', '`setZone` with options.');
			zoneArg(a[0]);
		}
		if (name === 'diff') {
			if (a.length < 1 || a.length > 2) stop('Luxon diff', '`diff` with options.');
			const u = a[1];
			if (u !== undefined) {
				const items = ts.isArrayLiteralExpression(u) ? [...u.elements] : [u];
				for (const item of items) {
					const t = constText(item);
					if (t === null || durUnit(t) === null) stop('Luxon diff', 'A computed or unknown unit.');
				}
			}
		}
		const list = args(call, name === 'diff' || name === 'equals');
		const code = `luxCall(${recv}, ${JSON.stringify(name)}, [${list.join(', ')}], ${dz})`;
		return { code, kind: DT_METHODS.get(name) ? 'dt' : name === 'diff' ? 'dur' : null };
	};

	const emit = (n: ts.Node): Out => {
		if (ts.isIdentifier(n)) {
			const p = n.parent;
			const named =
				(ts.isPropertyAccessExpression(p) && p.name === n) ||
				(ts.isPropertyAssignment(p) && p.name === n);
			if (named) return { code: n.text, kind: null };
			if (n.text === '$now' || n.text === '$today' || n.text === 'DateTime') {
				if (ts.isShorthandPropertyAssignment(p)) stop('Luxon value', 'A shorthand property.');
				if (n.text === '$now') return { code: now, kind: 'dt' };
				if (n.text === '$today') return { code: `luxStartOf(${now}, 'day')`, kind: 'dt' };
				stop('Luxon DateTime', '`DateTime` other than its static methods has no native form.');
			}
			return { code: n.text, kind: null };
		}
		if (ts.isParenthesizedExpression(n)) {
			const o = emit(n.expression);
			return { code: `(${o.code})`, kind: o.kind };
		}
		if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
			const callee = n.expression;
			const name = callee.name.text;
			if (ts.isIdentifier(callee.expression) && callee.expression.text === 'DateTime') {
				return staticCall(n, name);
			}
			const r = emit(callee.expression);
			if (r.kind !== null && (callee.questionDotToken || n.questionDotToken)) {
				stop('optional chain', 'A Luxon method in an optional chain has no native form.');
			}
			if (r.kind === 'dt') {
				if (name === 'toString') return { code: `luxText(${r.code})`, kind: null };
				// n8n's expression extension `format(fmt)` of a DateTime is `toFormat(fmt)`.
				if (name === 'format') return dtMethod(n, r.code, 'toFormat');
				if (!DT_METHODS.has(name))
					stop(`Luxon ${name}`, `\`DateTime.${name}\` has no native form.`);
				return dtMethod(n, r.code, name);
			}
			if (r.kind === 'dur') {
				if (!DUR_METHODS.has(name))
					stop(`Luxon ${name}`, `\`Duration.${name}\` has no native form.`);
				if (name === 'as' || name === 'get') {
					const t = n.arguments.length === 1 ? constText(n.arguments[0]) : null;
					if (t === null || durUnit(t) === null)
						stop('Luxon Duration', 'A computed or unknown unit.');
				}
				const list = args(n);
				return {
					code: `luxCall(${r.code}, ${JSON.stringify(name)}, [${list.join(', ')}], ${dz})`,
					kind: null,
				};
			}
			// Another receiver: keep the call, with its parts rewritten.
			const list = args(n);
			const head = text.slice(callee.expression.getEnd(), n.arguments.pos);
			const tail = text.slice(n.arguments.end, n.getEnd());
			return { code: `${r.code}${head}${list.join(', ')}${tail}`, kind: null };
		}
		if (ts.isPropertyAccessExpression(n)) {
			const r = emit(n.expression);
			if (r.kind === null) {
				return { code: r.code + text.slice(n.expression.getEnd(), n.getEnd()), kind: null };
			}
			if (n.questionDotToken) stop('optional chain', 'A Luxon getter in an optional chain.');
			const name = n.name.text;
			const known = r.kind === 'dt' ? DT_GETTERS.has(name) : DUR_UNITS.includes(name);
			if (!known) stop(`Luxon ${name}`, `The property \`${name}\` has no native form.`);
			return { code: `luxGet(${r.code}, ${JSON.stringify(name)})`, kind: null };
		}
		// Comparisons and differences use the time value (`valueOf`).
		if (ts.isBinaryExpression(n) && NUMERIC_OPERATORS.has(n.operatorToken.kind)) {
			const side = (e: ts.Expression): string => {
				const o = emit(e);
				if (o.kind === 'dur') stop('Luxon value', 'A Duration in a comparison.');
				return o.kind === 'dt' ? `luxNum(${o.code})` : o.code;
			};
			const left = side(n.left);
			const op = text.slice(n.left.getEnd(), n.right.getStart(sf));
			return { code: `${left}${op}${side(n.right)}`, kind: null };
		}
		return { code: splice(n), kind: null };
	};

	try {
		const root = sf.statements[0];
		if (!root || !ts.isExpressionStatement(root)) {
			return { ok: false, feature: 'syntax', message: 'The body is not one expression.' };
		}
		const out = emit(root.expression);
		if (out.kind !== null) {
			return {
				ok: false,
				feature: 'Luxon value',
				message: 'An expression that gives a DateTime or a Duration has no native form.',
			};
		}
		return { ok: true, code: out.code.slice(1, -1), zones: [...zones] };
	} catch (e) {
		if (e instanceof Stop) return { ok: false, feature: e.feature, message: e.message };
		throw e;
	}
}
