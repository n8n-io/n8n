/**
 * Native lowering of the Summarize node for the proven parameter forms.
 * Each form that the lowering does not prove throws `NodeFailure`, and the
 * driver runs the node in the fallback host.
 */
import type { Code } from './code.ts';
import { literal, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { isRecord, text } from './types.ts';

function flat(code: Code): string {
	if (code.kind === 'raw') return code.text;
	if (code.kind === 'array') return `[${code.items.map(flat).join(', ')}]`;
	return `{ ${code.entries.map(([k, v]) => `${str(k)}: ${flat(v)}`).join(', ')} }`;
}

/** The output name of a Summarize aggregation, as `normalizeFieldName` of the v1 node gives it. */
function normalizeName(raw: string): string {
	let out = '';
	for (let k = 0; k < raw.length; k++) {
		const ch = raw[k];
		if (ch === ']' || ch === '[' || ch === '"') continue;
		out += ch === ' ' || ch === '.' ? '_' : ch;
	}
	return out;
}

function summarizeName(aggregation: string, field: string): string {
	const prefixes: Record<string, string> = {
		append: 'appended_',
		average: 'average_',
		concatenate: 'concatenated_',
		count: 'count_',
		countUnique: 'unique_count_',
		max: 'max_',
		min: 'min_',
		sum: 'sum_',
	};
	return normalizeName(`${prefixes[aggregation] ?? `${aggregation}_`}${field}`);
}

const SUMMARIZE_AGGREGATIONS = new Set([
	'append',
	'average',
	'concatenate',
	'count',
	'countUnique',
	'max',
	'min',
	'sum',
]);

export function lowerSummarize(c: NodeContext): void {
	const p = c.parameters;
	const opts = isRecord(p.options) ? p.options : {};
	const values =
		isRecord(p.fieldsToSummarize) && Array.isArray(p.fieldsToSummarize.values)
			? p.fieldsToSummarize.values
			: [];
	const fields = values.filter(isRecord).map((f) => {
		const aggregation = text(f.aggregation, 'count');
		const field = text(f.field, '');
		if (field.startsWith('=')) {
			throw new NodeFailure('expression', 'A field to summarize is an expression.', 'fieldsToSummarize');
		}
		if (!SUMMARIZE_AGGREGATIONS.has(aggregation)) {
			throw new NodeFailure(
				'summarize-aggregation',
				`The aggregation "${aggregation}" is not proven.`,
				'fieldsToSummarize',
			);
		}
		return {
			aggregation,
			field,
			includeEmpty: f.includeEmpty === true,
			separateBy: text(f.separateBy, ','),
			customSeparator: text(f.customSeparator, ''),
			out: summarizeName(aggregation, field),
		};
	});
	if (fields.length === 0 || fields.every((f) => f.field === '')) {
		throw new NodeFailure(
			'summarize-empty',
			'The fields to summarize are missing, so the node runs in the fallback host.',
			'fieldsToSummarize',
		);
	}
	const splitList = text(p.fieldsToSplitBy, '')
		.split(',')
		.map((f) => f.trim())
		.filter((f) => f !== '');
	if (splitList.some((f) => f.startsWith('='))) {
		throw new NodeFailure('expression', 'A field to split by is an expression.', 'fieldsToSplitBy');
	}
	const splits = splitList.map((field) => ({ field, out: normalizeName(field) }));
	const outputFormat = text(opts.outputFormat, 'separateItems');
	if (outputFormat !== 'separateItems' && outputFormat !== 'singleItem') {
		throw new NodeFailure(
			'summarize-format',
			`The output format "${outputFormat}" is not proven.`,
			'options.outputFormat',
		);
	}
	const dot = opts.disableDotNotation !== true;
	const skipEmpty = opts.skipEmptySplitFields === true;
	const single = outputFormat === 'singleItem';
	// v1.1 never throws on a missing field; version 1 throws unless it is told to continue.
	const checkMissing = c.version === 1 && opts.continueIfFieldNotFound !== true;
	const out = c.output(0);
	const w = c.w;
	c.helper('summarize');
	w.line(
		`const ${out}: Json[] = summarize(${c.input}, ${flat(literal(fields))}, ${flat(literal(splits))}, ${String(dot)}, ${String(c.version === 1)}, ${String(skipEmpty)}, ${String(single)}, ${String(checkMissing)});`,
	);
}
