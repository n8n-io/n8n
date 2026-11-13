/**
 * Native lowering of core nodes into workflow code. These nodes become plain
 * code (no step), except Wait and Respond to Webhook, which become `ctx.wait`
 * and `ctx.respond` steps.
 *
 * Each lowering copies the v1 node for the parameters that the comments name.
 * Other parameter values fail the node with a clear reason.
 */
import type { Code } from './code.ts';
import { literal, raw, str, unmarked } from './code.ts';
import type { ConditionOptions, Operand } from './conditions.ts';
import {
	ConditionError,
	filterCode,
	filterOptions,
	ifV1Code,
	v1Compare,
	v1Right,
} from './conditions.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import type { TranslatedValue } from './expression.ts';
import { INDEX, ITEM, isExpression, segments } from './expression.ts';
import { camelIdentifier } from './naming.ts';
import { lowerFallback } from './steps.ts';
import { isRecord, text } from './types.ts';

function flat(code: Code): string {
	if (code.kind === 'raw') return code.text;
	if (code.kind === 'array') return `[${code.items.map(flat).join(', ')}]`;
	return `{ ${code.entries.map(([k, v]) => `${str(k)}: ${flat(v)}`).join(', ')} }`;
}

/** Operand translation for conditions: literal values stay values. */
function operand(c: NodeContext, usage: { item: boolean; index: boolean }): Operand {
	return (value, path) => {
		if (!isExpression(value)) return { code: flat(literal(value)), literal: true, value };
		const t = c.compiled(value, path);
		usage.item ||= t.usage.item;
		usage.index ||= t.usage.index;
		return { code: flat(t.code), literal: false, value };
	};
}

function condition(build: () => string): string {
	try {
		return build();
	} catch (e) {
		if (e instanceof ConditionError) throw new NodeFailure(e.feature, e.message, 'conditions');
		throw e;
	}
}

/** The loop header over the input; with an index when the body needs it. */
function openLoop(c: NodeContext, list: string, index: boolean): void {
	if (index) {
		c.w.open(`for (let ${INDEX} = 0; ${INDEX} < ${list}.length; ${INDEX}++) {`);
		c.w.line(`const ${ITEM} = ${list}[${INDEX}];`);
	} else {
		c.w.open(`for (const ${ITEM} of ${list}) {`);
	}
}

const mapParams = (index: boolean) =>
	index ? `(${ITEM}: Json, ${INDEX}: number)` : `(${ITEM}: Json)`;

export function lowerNoOp(c: NodeContext): void {
	c.w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
}

/** The helpers and the time zone of dateTime conditions (`filterDate`). */
function dateHelpers(c: NodeContext, code: string): void {
	if (!code.includes('filterDate(')) return;
	c.helper('filterDate');
	c.helper('filterDateCompare');
	const zone = c.scope.timezone;
	if (zone && zone !== 'UTC') c.scope.useZone?.(zone);
}

/** If version 2 (filter conditions) and version 1 (typed conditions). */
export function lowerIf(c: NodeContext): void {
	const usage = { item: false, index: false };
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	const code = condition(() =>
		c.version >= 2
			? filterCode(
					p.conditions,
					{
						...filterOptions(p.conditions, opts, p.looseTypeValidation),
						zone: c.scope.timezone,
					},
					operand(c, usage),
					'conditions',
				)
			: ifV1Code(p, operand(c, usage)),
	);
	if (code.includes('asBoolean(')) c.helper('asBoolean');
	if (code.includes('looseBoolean(')) c.helper('looseBoolean');
	if (code.includes('isEmptyValue(')) c.helper('isEmptyValue');
	dateHelpers(c, code);
	const t = c.output(0, 'True');
	const f = c.output(1, 'False');
	c.w.line(`const ${t}: Json[] = [];`);
	c.w.line(`const ${f}: Json[] = [];`);
	openLoop(c, c.input, usage.index);
	c.w.line(`if (${code}) ${t}.push(${ITEM});`);
	c.w.line(`else ${f}.push(${ITEM});`);
	c.w.close();
}

/** Filter version 2 (filter conditions) and version 1 (typed conditions). */
export function lowerFilter(c: NodeContext): void {
	const usage = { item: false, index: false };
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	const code = condition(() =>
		c.version >= 2
			? filterCode(
					p.conditions,
					{
						...filterOptions(p.conditions, opts, p.looseTypeValidation),
						zone: c.scope.timezone,
					},
					operand(c, usage),
					'conditions',
				)
			: ifV1Code(p, operand(c, usage)),
	);
	if (code.includes('asBoolean(')) c.helper('asBoolean');
	if (code.includes('looseBoolean(')) c.helper('looseBoolean');
	if (code.includes('isEmptyValue(')) c.helper('isEmptyValue');
	dateHelpers(c, code);
	// Both versions give the discarded items as a second list (`FilterV1.node.ts` and
	// `FilterV2.node.ts`), and v1 run data has both lists, so the trace has both.
	const kept = c.output(0);
	const discarded = c.output(1, 'Discarded');
	c.w.line(`const ${kept}: Json[] = [];`);
	c.w.line(`const ${discarded}: Json[] = [];`);
	openLoop(c, c.input, usage.index);
	c.w.line(`if (${code}) ${kept}.push(${ITEM});`);
	c.w.line(`else ${discarded}.push(${ITEM});`);
	c.w.close();
}

/** Switch version 3: rules mode and expression mode. */
export function lowerSwitch(c: NodeContext): void {
	const p = c.parameters;
	if (c.version < 3) {
		lowerSwitchV1(c);
		return;
	}
	const usage = { item: false, index: false };
	const opts = isRecord(p.options) ? p.options : {};
	if (p.mode === 'expression') {
		const count = typeof p.numberOutputs === 'number' ? p.numberOutputs : 4;
		const outs = Array.from({ length: count }, (_, k) => c.output(k, `Output${k}`));
		for (const o of outs) c.w.line(`const ${o}: Json[] = [];`);
		const t = c.compiled(p.output ?? 0, 'output');
		const all = c.local('Outputs');
		c.w.line(`const ${all} = [${outs.join(', ')}];`);
		openLoop(c, c.input, t.usage.index);
		c.w.line(`${all}[${flat(t.code)}].push(${ITEM});`);
		c.w.close();
		return;
	}
	const rules =
		isRecord(p.rules) && Array.isArray(p.rules.values) ? p.rules.values.filter(isRecord) : [];
	const loose: ConditionOptions = filterOptions(undefined, opts, undefined);
	const outs = rules.map((r, k) =>
		c.output(
			k,
			r.renameOutput === true && typeof r.outputKey === 'string'
				? camelIdentifier(r.outputKey).replace(/^./, (x) => x.toUpperCase())
				: `Output${k}`,
		),
	);
	const fallback = opts.fallbackOutput;
	const extra = fallback === 'extra' ? c.output(rules.length, 'Fallback') : null;
	for (const o of extra ? [...outs, extra] : outs) c.w.line(`const ${o}: Json[] = [];`);
	const conds = rules.map((r, k) =>
		condition(() => {
			const o = filterOptions(r.conditions, opts, undefined);
			return filterCode(
				r.conditions,
				{ caseSensitive: o.caseSensitive && loose.caseSensitive, loose: o.loose || loose.loose },
				operand(c, usage),
				`rules.values[${k}].conditions`,
			);
		}),
	);
	if (conds.some((x) => x.includes('asBoolean('))) c.helper('asBoolean');
	if (conds.some((x) => x.includes('looseBoolean('))) c.helper('looseBoolean');
	const fallbackTarget = extra ?? (typeof fallback === 'number' ? outs[fallback] : null);
	openLoop(c, c.input, usage.index);
	if (opts.allMatchingOutputs === true) {
		c.w.line('let matched = false;');
		conds.forEach((cond, k) => {
			c.w.open(`if (${cond}) {`);
			c.w.line(`${outs[k]}.push(${ITEM});`);
			c.w.line('matched = true;');
			c.w.close();
		});
		if (fallbackTarget) c.w.line(`if (!matched) ${fallbackTarget}.push(${ITEM});`);
	} else {
		conds.forEach((cond, k) =>
			c.w.line(`${k === 0 ? '' : 'else '}if (${cond}) ${outs[k]}.push(${ITEM});`),
		);
		if (fallbackTarget) c.w.line(`else ${fallbackTarget}.push(${ITEM});`);
	}
	c.w.close();
}

/** Switch versions 1 and 2: one value compared with each rule; the first match wins. */
function lowerSwitchV1(c: NodeContext): void {
	const p = c.parameters;
	const usage = { item: false, index: false };
	const op = operand(c, usage);
	if (p.mode === 'expression') {
		const count = c.version >= 2 ? Number(p.outputsAmount ?? 4) || 4 : 4;
		const outs = Array.from({ length: count }, (_, k) => c.output(k, `Output${k}`));
		for (const o of outs) c.w.line(`const ${o}: Json[] = [];`);
		const t = c.compiled(p.output ?? 0, 'output');
		const all = c.local('Outputs');
		c.w.line(`const ${all} = [${outs.join(', ')}];`);
		openLoop(c, c.input, t.usage.index);
		c.w.line(`${all}[${flat(t.code)}].push(${ITEM});`);
		c.w.close();
		return;
	}
	const type = text(p.dataType, 'number');
	const rules =
		isRecord(p.rules) && Array.isArray(p.rules.rules) ? p.rules.rules.filter(isRecord) : [];
	// Version 2 routes rule k to output k; version 1 routes it to the output that the rule names.
	const outputOf = (r: Record<string, unknown>, k: number) =>
		c.version >= 2 ? k : Number(r.output ?? 0);
	// v1 has four outputs and fails on a match that names another output.
	const count = c.version >= 2 ? rules.length : 4;
	const outs = Array.from({ length: count }, (_, k) => c.output(k, `Output${k}`));
	for (const o of outs) c.w.line(`const ${o}: Json[] = [];`);
	const conds = rules.map((r, k) =>
		condition(() => {
			const left =
				type === 'dateTime' ? { code: '', literal: true, value: null } : op(p.value1, 'value1');
			const defaultOp = type === 'number' || type === 'string' ? 'equal' : 'equal';
			return v1Compare(
				type,
				text(r.operation, defaultOp),
				left,
				v1Right(op, r.value2, `rules.rules[${k}].value2`),
			);
		}),
	);
	if (conds.some((x) => x.includes('isEmptyValue('))) c.helper('isEmptyValue');
	const fallback = Number(p.fallbackOutput ?? -1);
	openLoop(c, c.input, usage.index);
	const route = (index: number): string => {
		const target = outs[index];
		return target === undefined
			? `throw new Error(${str(`The ouput ${index} is not allowed. It has to be between 0 and ${count - 1}!`)});`
			: `${target}.push(${ITEM});`;
	};
	rules.forEach((r, k) => {
		c.w.line(`${k === 0 ? '' : 'else '}if (${conds[k]}) ${route(outputOf(r, k))}`);
	});
	if (fallback >= 0) c.w.line(`else ${route(fallback)}`);
	c.w.close();
}

interface Field {
	name: string;
	type: string;
	value: unknown;
	path: string;
}

/**
 * The value code of one Set field, with the type rule of the Set node. A failed conversion throws
 * with the item index, or with `ignoreErrors` the value stays as it is (v1 option).
 */
function fieldValue(
	c: NodeContext,
	f: Field,
	usage: { item: boolean; index: boolean },
	ignoreErrors: boolean,
): string {
	if (!isExpression(f.value)) {
		const v = f.value;
		switch (f.type) {
			case 'number':
				return v === '' || v === null || v === undefined ? 'null' : flat(literal(Number(v)));
			case 'boolean':
				return String(v === true || v === 'true');
			case 'array':
			case 'object':
				if (typeof v === 'string') {
					try {
						return flat(literal(JSON.parse(v)));
					} catch {
						// n8n parses the text itself (it repairs some JSON, else it fails at run
						// time), so the node runs in the host.
						throw new NodeFailure(
							'expression',
							`The field "${f.name}" is not valid JSON; n8n reads it in the host.`,
							f.path,
						);
					}
				}
				return flat(literal(v));
			case 'raw':
				return flat(literal(v));
			default:
				return flat(
					literal(
						v === null || v === undefined
							? null
							: typeof v === 'object'
								? JSON.stringify(v)
								: text(v),
					),
				);
		}
	}
	const t: TranslatedValue = c.compiled(f.value, f.path);
	usage.item ||= t.usage.item;
	usage.index ||= t.usage.index;
	const code = flat(t.code);
	// v1 names the item index at the end of the message of a failed conversion.
	const args = `${str(text(f.name, ''))}, ${INDEX}${ignoreErrors ? ', true' : ''}`;
	switch (f.type) {
		case 'number':
			c.helper('asNumber');
			usage.index = true;
			return `asNumber(${code}, ${args})`;
		case 'boolean':
			c.helper('asBoolean');
			usage.index = true;
			return `asBoolean(${code}, ${args})`;
		case 'array':
		case 'object':
			c.helper('asJson');
			usage.index = true;
			return `asJson(${code}, ${str(f.type === 'array' ? 'array' : 'object')}, ${args})`;
		case 'string':
			if (unmarked(code).startsWith('`')) return code;
			c.helper('asString');
			return `asString(${code})`;
		default:
			return code;
	}
}

function splitList(value: unknown): string[] {
	return typeof value === 'string'
		? value
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s !== '')
		: Array.isArray(value)
			? value.map(String)
			: [];
}

/** Edit Fields (Set) version 3 (manual and JSON modes), and Set versions 1 and 2. */
export function lowerSet(c: NodeContext): void {
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	const usage = { item: false, index: false };
	let include: string;
	let fields: Field[] = [];
	let rawJson: string | null = null;
	const dot = opts.dotNotation !== false;
	// The option is on the manual mode of version 3 and later (raw mode has no conversion).
	const ignoreErrors = c.version >= 3 && opts.ignoreConversionErrors === true;
	if (c.version >= 3) {
		if (p.duplicateItem === true)
			c.info('set', 'v1 duplicates items only in manual runs; the option has no effect.');
		include =
			c.version >= 3.3
				? p.includeOtherFields === true
					? text(p.include, 'all')
					: 'none'
				: text(p.include, 'all');
		if (p.mode === 'raw') {
			const jsonOutput = p.jsonOutput ?? '{}';
			if (typeof jsonOutput !== 'string')
				throw new NodeFailure('set', 'The JSON output is not text.', 'jsonOutput');
			rawJson = jsonOutput;
		} else if (c.version >= 3.3) {
			const list =
				isRecord(p.assignments) && Array.isArray(p.assignments.assignments)
					? p.assignments.assignments
					: [];
			fields = list.filter(isRecord).map((a, k) => ({
				name: text(a.name, ''),
				type: text(a.type, 'string'),
				value: a.value,
				path: `assignments.assignments[${k}].value`,
			}));
			if (fields.some((f) => f.type === 'binary')) {
				// A binary field moves binary data between items: the v1 node runs in the host,
				// which has n8n's binary data (in memory or in the binary data store).
				c.info('fallback-binary', 'The node sets a binary field, so it runs in the fallback host.');
				lowerFallback(c);
				return;
			}
		} else {
			const list = isRecord(p.fields) && Array.isArray(p.fields.values) ? p.fields.values : [];
			fields = list.filter(isRecord).map((f, k) => {
				const type = text(f.type, 'stringValue');
				return {
					name: text(f.name, ''),
					type: type.replace(/Value$/, ''),
					value: f[type],
					path: `fields.values[${k}].${type}`,
				};
			});
		}
	} else {
		include = p.keepOnlySet === true ? 'none' : 'all';
		const values = isRecord(p.values) ? p.values : {};
		for (const type of ['boolean', 'number', 'string']) {
			const list = values[type];
			if (!Array.isArray(list)) continue;
			list.filter(isRecord).forEach((f, k) =>
				fields.push({
					name: text(f.name, 'propertyName'),
					type: 'raw',
					value: f.value ?? (type === 'boolean' ? false : type === 'number' ? 0 : ''),
					path: `values.${type}[${k}].value`,
				}),
			);
		}
	}

	const out = c.output(0);
	const w = c.w;
	// A field name that is an expression (`=Body`, `={{ … }}`) gets its text for each item.
	const computedNames = new Map<number, string>();
	fields.forEach((f, k) => {
		if (!f.name.startsWith('=')) return;
		const t = c.compiled(f.name, f.path.replace(/\.[^.]*$/, '.name'));
		usage.item ||= t.usage.item;
		usage.index ||= t.usage.index;
		c.helper('toText');
		computedNames.set(k, `toText(${flat(t.code)})`);
	});
	const values = fields.map((f) => [f.name, fieldValue(c, f, usage, ignoreErrors)] as const);
	let rawCode: string | null = null;
	if (rawJson !== null) {
		if (!rawJson.startsWith('=')) {
			try {
				rawCode = flat(literal(JSON.parse(rawJson)));
			} catch {
				throw new NodeFailure(
					'expression',
					'The JSON output is not valid JSON; n8n reads it in the host.',
					'jsonOutput',
				);
			}
		} else {
			// v1 parses with `repairJSON` (trailing commas and the like). JSON that only parses
			// repaired runs in the host, where n8n repairs it.
			const probe = rawJson.replace(/^=+/, '').replace(/\{\{[\s\S]*?\}\}/g, '0');
			try {
				JSON.parse(probe);
			} catch {
				throw new NodeFailure(
					'expression',
					'The JSON output parses only when repaired.',
					'jsonOutput',
				);
			}
			// v1 puts the text of each value into the JSON text, then parses it.
			// v1 (`resolveRawData`) evaluates each part alone: a part that throws a TypeError
			// is undefined, which `String` writes as "undefined".
			c.helper('toText');
			c.helper('orUndefined');
			c.helper('parseRawJson');
			const t = c.compiled(rawJson.replace(/^=+/, '='), 'jsonOutput', {
				templatePart: (code) => `toText(${code.replace(/^orNull\(/, 'orUndefined(')})`,
			});
			usage.item ||= t.usage.item;
			usage.index ||= t.usage.index;
			const text = flat(t.code);
			const parts = segments(rawJson.replace(/^=+/, ''));
			const pure = parts.length === 1 && parts[0].expression !== undefined;
			// v1 parses with `repairJSON`: a bare `undefined` (from a part outside quotes) becomes null.
			rawCode = `parseRawJson(${pure ? `toText(orUndefined(() => ${text}))` : text})`;
		}
	}
	const dotted = values.some(([name]) => dot && (name.includes('.') || name.includes('[')));
	const needsBlock =
		include === 'selected' ||
		include === 'except' ||
		dotted ||
		rawCode !== null ||
		computedNames.size > 0;
	// v1 catches a failed item and continues with the error as its item (`continueOnFail`).
	// The error output is not handled here, so the node fails under `continueErrorOutput`.
	const continues =
		c.node.onError === 'continueRegularOutput' ||
		(c.node.onError === undefined && c.node.continueOnFail === true);
	const params = mapParams(usage.index);
	if (!needsBlock && !continues) {
		const entries: Array<[string, Code]> = values.map(([name, code]) => [name, raw(code)]);
		const obj: Code = { kind: 'object', entries };
		if (include === 'all') {
			const prefix = `const ${out}: Json[] = ${c.input}.map(${params} => (`;
			const all: Code = { kind: 'object', entries: [['...', raw(ITEM)], ...entries] };
			w.block(`${prefix}${c.print(all, prefix)}));`);
		} else {
			w.block(
				`const ${out}: Json[] = ${c.input}.map(${params} => (${c.print(obj, `const ${out}: Json[] = ${c.input}.map(${params} => (`)}));`,
			);
		}
		return;
	}
	w.open(`const ${out}: Json[] = ${c.input}.map(${params} => {`);
	if (continues) w.open('try {');
	switch (include) {
		case 'all':
			c.helper('copyJson');
			w.line(`const item: Json = copyJson(${ITEM});`);
			break;
		case 'none':
			w.line('const item: Json = {};');
			break;
		case 'selected': {
			c.helper('getPath');
			w.line('const item: Json = {};');
			for (const key of splitList(p.includeFields)) {
				const target = dot && key.includes('.') ? (key.split('.').pop() ?? key) : key;
				w.line(
					`item[${str(target)}] = ${dot ? `getPath(${ITEM}, ${str(key)})` : `${ITEM}[${str(key)}]`};`,
				);
			}
			break;
		}
		case 'except': {
			c.helper('copyJson');
			w.line(`const item: Json = copyJson(${ITEM});`);
			for (const key of splitList(p.excludeFields)) {
				if (dot) {
					c.helper('unsetPath');
					w.line(`unsetPath(item, ${str(key)});`);
				} else {
					w.line(`delete item[${str(key)}];`);
				}
			}
			break;
		}
		default:
			throw new NodeFailure('set', `The include option "${include}" is not known.`, 'include');
	}
	for (const [k, [name, code]] of values.entries()) {
		const computed = computedNames.get(k);
		if (computed !== undefined) {
			// v1 sets the field with lodash `set` (dot notation) or as one key.
			if (dot) c.helper('setPath');
			w.line(dot ? `setPath(item, ${computed}, ${code});` : `item[${computed}] = ${code};`);
		} else if (dot && (name.includes('.') || name.includes('['))) {
			c.helper('setPath');
			w.line(`setPath(item, ${str(name)}, ${code});`);
		} else {
			w.line(`item[${str(name)}] = ${code};`);
		}
	}
	if (rawCode !== null) {
		c.helper('assignFields');
		w.line(`assignFields(item, ${rawCode}, ${String(dot)});`);
	}
	w.line('return item;');
	if (continues) {
		w.depth--;
		w.open('} catch (error) {');
		w.line('return { error: error.message };');
		w.close();
	}
	w.close('});');
}

/** Merge versions 2 and 3: append, combine (by fields, by position, all combinations), choose branch. */
export function lowerMerge(c: NodeContext): void {
	const p = c.parameters;
	const out = c.output(0);
	const n = c.version >= 3 ? Number(p.numberInputs ?? 2) || 2 : 2;
	const inputs = Array.from({ length: n }, (_, k) => c.inputs[k] ?? '[]');
	const mode = text(p.mode, 'append');
	const opts = isRecord(p.options) ? p.options : {};
	const clash =
		isRecord(opts.clashHandling) && isRecord(opts.clashHandling.values)
			? opts.clashHandling.values
			: {};
	if (clash.overrideEmpty === true) {
		throw new NodeFailure(
			'merge',
			'The clash option "override empty" is not supported.',
			'options.clashHandling',
		);
	}
	const deep = clash.mergeMode !== 'shallowMerge';
	const resolveClash =
		typeof clash.resolveClash === 'string' && clash.resolveClash !== ''
			? clash.resolveClash
			: undefined;
	if (mode === 'append') {
		c.w.line(`const ${out}: Json[] = [${inputs.map((x) => `...${x}`).join(', ')}];`);
		return;
	}
	if (mode === 'chooseBranch') {
		if ((p.chooseBranchMode ?? 'waitForAll') !== 'waitForAll') {
			throw new NodeFailure(
				'merge',
				'Only the "wait for all inputs" branch mode is supported.',
				'chooseBranchMode',
			);
		}
		// v1 waits only for the inputs that have a connection.
		const connected = inputs.filter((_, k) => c.inputs[k] !== undefined);
		const all =
			connected.length > 0 ? connected.map((x) => `${x}.length > 0`).join(' && ') : 'true';
		const output = p.output ?? 'specifiedInput';
		const chosen =
			output === 'empty' ? '[{}]' : (inputs[Number(p.useDataOfInput ?? 1) - 1] ?? inputs[0]);
		if (c.version < 3 && output !== 'empty') {
			const v2 = p.output === 'input2' ? inputs[1] : inputs[0];
			c.notRunWhen?.(`!(${all})`);
			c.w.line(`const ${out}: Json[] = ${all} ? ${v2} : [];`);
			return;
		}
		// v1 runs this mode only when every input has items (`requiredInputs`); else the
		// node does not run.
		c.notRunWhen?.(`!(${all})`);
		c.w.line(`const ${out}: Json[] = ${all} ? ${chosen} : [];`);
		return;
	}
	const combineBy =
		c.version >= 3
			? text(p.combineBy, 'combineByFields')
			: text(p.combinationMode, 'mergeByFields');
	if (mode !== 'combine') {
		throw new NodeFailure('merge-mode', `The Merge mode "${mode}" is not supported.`, 'mode');
	}
	if (combineBy === 'combineByPosition' || combineBy === 'mergeByPosition') {
		c.helper('mergeByPosition');
		const preferred = resolveClash?.startsWith('preferInput')
			? Number(resolveClash.replace('preferInput', '')) - 1
			: n - 1;
		c.w.line(
			`const ${out}: Json[] = mergeByPosition([${inputs.join(', ')}], ${preferred}, ${String(resolveClash === 'addSuffix')}, ${String(deep)}, ${String(opts.includeUnpaired === true)});`,
		);
		return;
	}
	if (combineBy === 'combineAll' || combineBy === 'multiplex') {
		c.helper('allCombinations');
		c.w.line(
			`const ${out}: Json[] = allCombinations(${inputs[0]}, ${inputs[1]}, ${str(resolveClash ?? 'preferLast')}, ${String(deep)});`,
		);
		return;
	}
	if (combineBy !== 'combineByFields' && combineBy !== 'mergeByFields') {
		throw new NodeFailure(
			'merge-mode',
			`The Merge combine mode "${combineBy}" is not supported.`,
			'combineBy',
		);
	}
	if (opts.fuzzyCompare === true) {
		throw new NodeFailure('merge', 'Fuzzy compare is not supported.', 'options.fuzzyCompare');
	}
	let fields: string[][];
	if (p.advanced === true || c.version < 3) {
		const values =
			isRecord(p.mergeByFields) && Array.isArray(p.mergeByFields.values)
				? p.mergeByFields.values
				: [];
		fields = values.filter(isRecord).map((v) => [text(v.field1, ''), text(v.field2, '')]);
	} else {
		fields = splitList(p.fieldsToMatchString).map((f) => [f, f]);
	}
	if (
		fields.length === 0 ||
		fields.some(([a, b]) => a === '' || b === '' || a.startsWith('=') || b.startsWith('='))
	) {
		throw new NodeFailure(
			'merge',
			'The fields to match are missing or are expressions.',
			'fieldsToMatchString',
		);
	}
	c.helper('mergeByFields');
	if (c.version >= 3) {
		// v1 stops (no output at all) when the input that it keeps or enriches is empty.
		const join = text(p.joinMode, 'keepMatches');
		const [a, b] = [`${inputs[0]}.length === 0`, `${inputs[1]}.length === 0`];
		const none =
			join === 'keepMatches'
				? `(${a} || ${b})`
				: join === 'enrichInput1'
					? a
					: join === 'enrichInput2'
						? b
						: undefined;
		if (none !== undefined) c.noOutputWhen?.(none);
	}
	const options: Record<string, unknown> = {
		joinMode: p.joinMode ?? 'keepMatches',
		outputDataFrom: p.outputDataFrom ?? 'both',
		dotNotation: opts.disableDotNotation !== true,
		firstMatchOnly: opts.multipleMatches === 'first',
		deep,
	};
	if (resolveClash !== undefined) options.resolveClash = resolveClash;
	c.w.block(
		`const ${out}: Json[] = mergeByFields(${inputs[0]}, ${inputs[1]}, ${flat(literal(fields))}, ${c.print(literal(options), `const ${out}: Json[] = mergeByFields(${inputs[0]}, ${inputs[1]}, ${flat(literal(fields))}, `)});`,
	);
}

export function lowerLimit(c: NodeContext): void {
	const p = c.parameters;
	const max = typeof p.maxItems === 'number' ? p.maxItems : 1;
	const code =
		p.keep === 'lastItems'
			? `${c.input}.slice(Math.max(${c.input}.length - ${max}, 0))`
			: `${c.input}.slice(0, ${max})`;
	c.w.line(`const ${c.output(0)}: Json[] = ${code};`);
}

export function lowerSort(c: NodeContext): void {
	const p = c.parameters;
	const out = c.output(0);
	const opts = isRecord(p.options) ? p.options : {};
	const type = p.type ?? 'simple';
	if (type === 'random') {
		c.helper('shuffle');
		c.w.line(`const ${out}: Json[] = shuffle(${c.input}, ${c.input}.map(() => ctx.random()));`);
		return;
	}
	if (type === 'code') {
		const code = typeof p.code === 'string' ? p.code : '';
		c.w.open(`const ${out}: Json[] = ${c.input}`);
		c.w.line('.map((json: Json) => ({ json }))');
		c.w.open('.sort((a: Json, b: Json) => {');
		c.w.line(code);
		c.w.close('})');
		c.w.line('.map((item: Json) => item.json);');
		c.w.depth--;
		return;
	}
	const list =
		isRecord(p.sortFieldsUi) && Array.isArray(p.sortFieldsUi.sortField)
			? p.sortFieldsUi.sortField
			: [];
	const fields = list
		.filter(isRecord)
		.map((f) => [text(f.fieldName, ''), f.order === 'descending' ? -1 : 1]);
	if (fields.length === 0) throw new NodeFailure('sort', 'No sort field is set.', 'sortFieldsUi');
	c.helper('sortItems');
	c.w.line(
		`const ${out}: Json[] = sortItems(${c.input}, ${flat(literal(fields))}, ${String(opts.disableDotNotation !== true)});`,
	);
}

export function lowerSplitOut(c: NodeContext): void {
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	if (typeof p.fieldToSplitOut === 'string' && p.fieldToSplitOut.startsWith('=')) {
		throw new NodeFailure(
			'split-out',
			'The field to split out is an expression.',
			'fieldToSplitOut',
		);
	}
	const fields = splitList(p.fieldToSplitOut).map((f) => f.replace(/^\$json\./, ''));
	if (fields.includes('$binary'))
		throw new NodeFailure('binary', 'Binary data is not supported.', 'fieldToSplitOut');
	const destinations = splitList(opts.destinationFieldName);
	c.helper('splitOut');
	c.w.line(
		`const ${c.output(0)}: Json[] = splitOut(${c.input}, ${flat(literal(fields))}, ${flat(literal(destinations))}, ${str(text(p.include, 'noOtherFields'))}, ${flat(literal(splitList(p.fieldsToInclude)))}, ${String(opts.disableDotNotation !== true)});`,
	);
}

export function lowerAggregate(c: NodeContext): void {
	const p = c.parameters;
	const out = c.output(0);
	const opts = isRecord(p.options) ? p.options : {};
	if (opts.includeBinaries === true)
		throw new NodeFailure('binary', 'Binary data is not supported.', 'options.includeBinaries');
	// v1 does not run the node without input items.
	if ((p.aggregate ?? 'aggregateIndividualFields') === 'aggregateIndividualFields') {
		const list =
			isRecord(p.fieldsToAggregate) && Array.isArray(p.fieldsToAggregate.fieldToAggregate)
				? p.fieldsToAggregate.fieldToAggregate
				: [];
		const dot = opts.disableDotNotation !== true;
		const specs = list.filter(isRecord).map((f) => {
			const field = text(f.fieldToAggregate, '');
			const short = dot && field.includes('.') ? (field.split('.').pop() ?? field) : field;
			const output =
				f.renameField === true && typeof f.outputFieldName === 'string' && f.outputFieldName !== ''
					? f.outputFieldName
					: short;
			return [field, output];
		});
		if (specs.length === 0 || specs.some(([f]) => f === '' || f.startsWith('='))) {
			throw new NodeFailure(
				'aggregate',
				'The fields to aggregate are missing or are expressions.',
				'fieldsToAggregate',
			);
		}
		c.helper('aggregateFields');
		c.w.line(
			`const ${out}: Json[] = ${c.input}.length > 0 ? [aggregateFields(${c.input}, ${flat(literal(specs))}, ${String(dot)}, ${String(opts.mergeLists === true)}, ${String(opts.keepMissing === true)})] : [];`,
		);
		return;
	}
	const destination = text(p.destinationFieldName, 'data');
	const include = p.include ?? 'allFields';
	let list = c.input;
	if (include === 'specifiedFields' || include === 'allFieldsExcept') {
		c.helper('pickFields');
		const inc = include === 'specifiedFields' ? splitList(p.fieldsToInclude) : [];
		const exc = include === 'allFieldsExcept' ? splitList(p.fieldsToExclude) : [];
		list = `pickFields(${c.input}, ${flat(literal(inc))}, ${flat(literal(exc))})`;
	}
	c.w.line(
		`const ${out}: Json[] = ${c.input}.length > 0 ? [{ ${JSON.stringify(destination)}: ${list} }] : [];`,
	);
}

export function lowerRemoveDuplicates(c: NodeContext): void {
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	if (
		c.version >= 2 &&
		(p.operation ?? 'removeDuplicateInputItems') !== 'removeDuplicateInputItems'
	) {
		throw new NodeFailure(
			'remove-duplicates',
			'Removing items seen in earlier executions needs state that the workflow language does not have.',
			'operation',
		);
	}
	if (opts.removeOtherFields === true) {
		throw new NodeFailure(
			'remove-duplicates',
			'The option "remove other fields" is not supported.',
			'options.removeOtherFields',
		);
	}
	const compare = text(p.compare, 'allFields');
	const fields =
		compare === 'selectedFields'
			? splitList(p.fieldsToCompare)
			: compare === 'allFieldsExcept'
				? splitList(p.fieldsToExclude)
				: [];
	c.helper('removeDuplicates');
	const call = `removeDuplicates(${c.input}, ${str(compare)}, ${flat(literal(fields))}, ${String(opts.disableDotNotation !== true)})`;
	const continues =
		c.node.onError === 'continueRegularOutput' ||
		c.node.onError === 'continueErrorOutput' ||
		(c.node.onError === undefined && c.node.continueOnFail === true);
	if (!continues) {
		c.w.line(`const ${c.output(0)}: Json[] = ${call};`);
		return;
	}
	// When the node fails and continues: version 2 gives one item with the error
	// message (v1 `normalizeNodeErrors`). Version 1 has no handler, so v1 passes
	// the input items through.
	const out = c.output(0);
	c.w.line(`let ${out}: Json[] = [];`);
	c.w.open('try {');
	c.w.line(`${out} = ${call};`);
	c.w.depth--;
	c.w.open('} catch (error) {');
	c.w.line(`${out} = ${c.version >= 2 ? '[{ error: error.message }]' : c.input};`);
	c.w.close();
}

const UNIT_MS: Record<string, number> = {
	seconds: 1000,
	minutes: 60_000,
	hours: 3_600_000,
	days: 86_400_000,
};

export function lowerWait(c: NodeContext): void {
	const p = c.parameters;
	const resume = p.resume ?? 'timeInterval';
	const out = c.output(0);
	const w = c.w;
	if (resume === 'timeInterval') {
		const unit = text(p.unit, 'hours');
		const ms = UNIT_MS[unit];
		if (ms === undefined)
			throw new NodeFailure('wait', `The wait unit "${unit}" is not known.`, 'unit');
		const amount = c.compiled(p.amount ?? 1, 'amount');
		if (amount.usage.item || amount.usage.index) {
			throw new NodeFailure(
				'wait',
				'The wait time depends on the item; v1 reads it from the first item only.',
				'amount',
			);
		}
		w.open(`if (${c.input}.length > 0) {`);
		w.line(
			`await ctx.wait({ name: ${str(c.node.name)}, duration: ${flat(amount.code)} * ${ms} });`,
		);
		w.close();
	} else if (resume === 'specificTime') {
		const at = typeof p.dateTime === 'string' ? Date.parse(p.dateTime) : Number.NaN;
		if (Number.isNaN(at) || isExpression(p.dateTime)) {
			throw new NodeFailure(
				'wait',
				'Only a fixed date and time is supported for "wait until".',
				'dateTime',
			);
		}
		c.warn('wait', 'The wait time is read as UTC when it has no time zone.', 'dateTime');
		w.open(`if (${c.input}.length > 0) {`);
		w.line(`await ctx.wait({ name: ${str(c.node.name)}, until: ${at} });`);
		w.close();
	} else {
		throw new NodeFailure(
			'wait-resume',
			`Waiting for "${text(resume)}" is not supported.`,
			'resume',
		);
	}
	w.line(`const ${out}: Json[] = ${c.input};`);
}

export function lowerRespond(c: NodeContext): void {
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	const w = c.w;
	const respondWith = text(p.respondWith, 'firstIncomingItem');
	const fields: Array<[string, Code]> = [['name', raw(str(c.node.name))]];
	let usesItem = false;
	let usesIndex = false;
	const value = (v: unknown, path: string): string => {
		const t = c.compiled(v, path);
		usesItem ||= t.usage.item;
		usesIndex ||= t.usage.index;
		return flat(t.code);
	};
	if (opts.responseCode !== undefined) {
		// v1 takes a code in a string too ("404").
		const code = opts.responseCode;
		fields.push([
			'status',
			raw(
				typeof code === 'string' && /^\s*\d+\s*$/.test(code)
					? String(Number(code))
					: typeof code === 'number'
						? String(code)
						: `Number(${value(code, 'options.responseCode')})`,
			),
		]);
	}
	let body: string;
	let binaryCode: string | null = null;
	switch (respondWith) {
		case 'firstIncomingItem':
			body = `${c.input}[0]`;
			break;
		case 'allIncomingItems':
			body = c.input;
			break;
		case 'json': {
			const rb = p.responseBody ?? '';
			if (rb === '') {
				// v1 sends no body for an empty field.
				body = 'undefined';
			} else if (typeof rb === 'string' && !rb.startsWith('=')) {
				try {
					body = flat(literal(JSON.parse(rb)));
				} catch {
					// v1 fails when the node runs, not before.
					body = `((): Json => { throw new Error(${str("Invalid JSON in 'Response Body' field")}); })()`;
				}
			} else {
				c.helper('jsonValue');
				body = `jsonValue(${value(rb, 'responseBody')})`;
			}
			break;
		}
		case 'text':
			body = value(p.responseBody ?? '', 'responseBody');
			break;
		case 'noData':
			body = "''";
			break;
		case 'redirect':
			body = "''";
			if (opts.responseCode === undefined) fields.push(['status', raw('307')]);
			break;
		case 'binary': {
			// The file of the first item, in the `$binary` form of the fallback host.
			usesItem = true;
			binaryCode =
				p.responseDataSource === 'set'
					? `(${ITEM}.$binary ?? {})[${value(p.inputFieldName ?? 'data', 'inputFieldName')}]`
					: `Object.values(${ITEM}.$binary ?? {})[0]`;
			body = 'null';
			break;
		}
		default:
			// v1 fails when the node runs, with this message.
			c.w.line(
				`if (${c.input}.length > 0) throw new Error(${str(`The Response Data option "${respondWith}" is not supported!`)});`,
			);
			c.w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
			return;
	}
	if (typeof opts.responseKey === 'string' && opts.responseKey !== '') {
		body = `{ ${JSON.stringify(opts.responseKey)}: ${body} }`;
	}
	fields.push(['body', raw(body)]);
	const binaryVar = binaryCode === null ? null : c.local('File');
	if (binaryVar !== null) {
		fields.push([
			'binary',
			raw(
				`{ data: ${binaryVar}.data, mimeType: ${binaryVar}.mimeType, fileName: ${binaryVar}.fileName }`,
			),
		]);
	}
	const headerList =
		isRecord(opts.responseHeaders) && Array.isArray(opts.responseHeaders.entries)
			? opts.responseHeaders.entries.filter(isRecord)
			: [];
	const headers: Array<[string, Code]> = headerList.map((h, k) => [
		text(h.name, ''),
		raw(value(h.value ?? '', `options.responseHeaders.entries[${k}].value`)),
	]);
	if (respondWith === 'redirect')
		headers.push(['location', raw(value(p.redirectURL ?? '', 'redirectURL'))]);
	if (headers.length > 0) fields.push(['headers', { kind: 'object', entries: headers }]);
	// Version 1.3, and 1.4 or later with `enableResponseOutput`, give the response on a second output.
	const version = c.node.typeVersion ?? 1;
	const responseOutput =
		version === 1.3 || (version >= 1.4 && p.enableResponseOutput === true) ? c.output(1) : null;
	if (responseOutput !== null) w.line(`let ${responseOutput}: Json[] = [];`);
	w.open(`if (${c.input}.length > 0) {`);
	// v1 evaluates the response parameters for the first item.
	if (usesItem) w.line(`const ${ITEM} = ${c.input}[0];`);
	if (usesIndex) w.line(`const ${INDEX} = 0;`);
	if (binaryVar !== null) {
		w.line(`const ${binaryVar}: Json = ${binaryCode};`);
		w.line(
			`if (!${binaryVar}) throw new Error('No binary data exists on the first item to respond with');`,
		);
	}
	const call: Code = { kind: 'object', entries: fields };
	if (responseOutput === null) {
		w.block(`await ctx.respond(${c.print(call, 'await ctx.respond(')});`);
		w.close();
		w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
		return;
	}
	// ctx.respond takes an object literal, so each value goes in a local that the output reads too.
	const values = new Map<string, string>();
	const literalFields = fields.map(([key, code]): [string, Code] => {
		if (key === 'name') return [key, code];
		const v = c.local(`Response${key.charAt(0).toUpperCase()}${key.slice(1)}`);
		w.block(`const ${v}: Json = ${c.print(code, `const ${v}: Json = `)};`);
		values.set(key, v);
		return [key, raw(v)];
	});
	const response: Array<[string, Code]> = [];
	// v1 has no body for these responses.
	const sentBody = values.get('body');
	if (sentBody !== undefined && respondWith !== 'noData' && respondWith !== 'redirect')
		response.push(['body', raw(sentBody)]);
	const sentHeaders = values.get('headers');
	response.push([
		'headers',
		{
			kind: 'object',
			entries:
				sentHeaders === undefined
					? []
					: headers.map(([name]): [string, Code] => [
							name.toLowerCase(),
							raw(`${sentHeaders}[${str(name)}]`),
						]),
		},
	]);
	const status = values.get('status');
	response.push(['statusCode', raw(status ?? '200')]);
	const literalCall: Code = { kind: 'object', entries: literalFields };
	w.block(`await ctx.respond(${c.print(literalCall, 'await ctx.respond(')});`);
	const item: Code = {
		kind: 'object',
		entries: [['response', { kind: 'object', entries: response }]],
	};
	w.block(`${responseOutput} = [${c.print(item, `${responseOutput} = [`)}];`);
	w.close();
	w.line(`const ${c.output(0)}: Json[] = ${c.input};`);
}

export function lowerStopAndError(c: NodeContext): void {
	const p = c.parameters;
	let message: string;
	if (p.errorType === 'errorObject') {
		const t = c.compiled(p.errorObject ?? '{}', 'errorObject');
		message = `JSON.stringify(${flat(t.code)})`;
	} else {
		message = flat(c.compiled(p.errorMessage ?? '', 'errorMessage').code);
	}
	c.w.open(`if (${c.input}.length > 0) {`);
	if (message.includes(ITEM)) c.w.line(`const ${ITEM} = ${c.input}[0];`);
	c.w.line(`throw new Error(${message});`);
	c.w.close();
	c.w.line(`const ${c.output(0)}: Json[] = [];`);
}
