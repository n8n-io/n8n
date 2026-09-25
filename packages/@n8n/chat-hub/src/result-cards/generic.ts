import type { ResultCard, ResultCardArchetype } from '@n8n/api-types';

import { formatNumber, humanize, humanizeNodeType, isPlainObject, str, truncate } from './format';
import { inferType } from './profile';
import type { FieldInfo, NodeRunFacts } from './types';

const SCALAR_TYPES = new Set(['string', 'number', 'boolean', 'date', 'email', 'url']);
const TEXT_ONLY_KEYS = new Set(['output', 'text', 'message', 'sendMessage']);

/** Schema limits from `resultCardSchema` (`@n8n/api-types`) that the builders must respect. */
const MAX_COLUMN_NAME = 60;
const MAX_CELL = 120;
const MAX_TARGET = 120;
const MAX_NODE_NAME = 120;
const MAX_LABEL = 60;

/** Output items that are plain objects — `null`, strings and numbers carry no keys and are ignored. */
export function objectItems(facts: NodeRunFacts): Array<Record<string, unknown>> {
	return facts.items.filter(isPlainObject);
}

export function scalarFields(facts: NodeRunFacts): FieldInfo[] {
	return facts.fields.filter((field) => SCALAR_TYPES.has(field.type) && !field.path.includes('.'));
}

export function numericFields(facts: NodeRunFacts): FieldInfo[] {
	return facts.fields.filter((field) => field.type === 'number' && !field.path.includes('.'));
}

export function stringFields(facts: NodeRunFacts): FieldInfo[] {
	return facts.fields.filter(
		(field) => ['string', 'email', 'url'].includes(field.type) && !field.path.includes('.'),
	);
}

export function fieldsOfType(facts: NodeRunFacts, ...types: Array<FieldInfo['type']>): FieldInfo[] {
	return facts.fields.filter((field) => types.includes(field.type) && !field.path.includes('.'));
}

/** Items that are objects worth tabulating: either the output items themselves or the first `array<object>` field. */
export function recordItems(facts: NodeRunFacts): {
	rows: Array<Record<string, unknown>>;
	total: number;
} {
	const items = objectItems(facts);
	if (items.length >= 2) return { rows: items, total: facts.itemCount };
	const arrayField = fieldsOfType(facts, 'array<object>')[0];
	if (items.length === 1 && arrayField) {
		const value = items[0][arrayField.path];
		if (Array.isArray(value)) {
			return {
				rows: value.slice(0, 20).filter(isPlainObject),
				total: value.length,
			};
		}
	}
	return { rows: items, total: facts.itemCount };
}

/**
 * Keys that hold scalar values in at least one row, in first-seen order. These are lookup keys
 * (untruncated); `tableFromRows` shortens them for display. Empty / whitespace-only keys are dropped.
 */
export function candidateColumns(rows: Array<Record<string, unknown>>): string[] {
	const columns: string[] = [];
	for (const row of rows) {
		if (!isPlainObject(row)) continue;
		for (const [key, value] of Object.entries(row)) {
			if (key.trim().length === 0 || columns.includes(key)) continue;
			if (SCALAR_TYPES.has(inferType(value))) columns.push(key);
		}
	}
	return columns;
}

export function tableFromRows(
	rows: Array<Record<string, unknown>>,
	total: number,
	columns: string[],
) {
	const kept = columns.slice(0, 4);
	return {
		columns: kept.map((column) => truncate(column, MAX_COLUMN_NAME)),
		rows: rows
			.filter(isPlainObject)
			.slice(0, 5)
			.map((row) => kept.map((column) => truncate(str(row[column]), MAX_CELL))),
		total,
	};
}

function isTextOnly(items: Array<Record<string, unknown>>): boolean {
	return items.every((item) => Object.keys(item).every((key) => TEXT_ONLY_KEYS.has(key)));
}

/** Deterministic gate. Order = default priority. `keyValue` is always last. */
export function applicableArchetypes(facts: NodeRunFacts): ResultCardArchetype[] {
	const items = objectItems(facts);
	if (items.length === 0 || isTextOnly(items)) return [];
	const archetypes: ResultCardArchetype[] = [];
	const { rows } = recordItems(facts);
	const columns = candidateColumns(rows);
	const sharedScalarCount = scalarFields(facts).filter((field) => field.presence >= 0.6).length;
	if (
		(rows.length >= 2 && (columns.length >= 2 || sharedScalarCount >= 2)) ||
		(items.length === 1 && fieldsOfType(facts, 'array<object>').length > 0)
	) {
		archetypes.push('records');
	}
	if (
		items.length === 1 &&
		(numericFields(facts).length > 0 ||
			fieldsOfType(facts, 'object<number>', 'array<number>').length > 0)
	) {
		archetypes.push('metric');
	}
	if (
		rows.length >= 2 &&
		candidateColumns(rows).some((column) =>
			['string', 'email', 'url'].includes(inferType(rows[0][column])),
		)
	) {
		archetypes.push('list');
	}
	archetypes.push('keyValue');
	return archetypes;
}

export function genericEnvelope(facts: NodeRunFacts) {
	return {
		title: truncate(humanize(facts.nodeName), 80),
		eyebrow: truncate(`${humanizeNodeType(facts.nodeType)} · Output`, 40),
		status: 'info' as const,
		nodeType: facts.nodeType,
		nodeName: truncate(facts.nodeName, MAX_NODE_NAME),
		itemCount: facts.itemCount,
		source: 'mapped' as const,
	};
}

/**
 * Bars under a metric. Negative entries are kept (they are real data) but only non-negative
 * values contribute to the total, and every `share` is clamped into the schema's `[0, 1]`.
 * Non-finite numbers are dropped: JSON cannot carry them and `z.number()` rejects `NaN`.
 */
export function breakdownFromValue(
	value: unknown,
): Array<{ label: string; value: number; share?: number }> | undefined {
	if (!isPlainObject(value)) return undefined;
	const entries = Object.entries(value).filter(
		(entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]),
	);
	if (entries.length === 0) return undefined;
	const sum = entries.reduce((acc, [, n]) => (n > 0 ? acc + n : acc), 0);
	return entries
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([label, n]) => ({
			label: truncate(label, MAX_LABEL),
			value: n,
			share: sum > 0 ? Math.min(1, Math.max(0, Math.round((n / sum) * 100) / 100)) : 0,
		}));
}

/** Field paths chosen by Jev. The literal `'none'` is a sentinel meaning "leave this slot empty". */
export interface GenericSlots {
	valuePath?: string;
	labelPath?: string;
	breakdownPath?: string;
	trendPath?: string;
	listTitlePath?: string;
	listSubtitlePath?: string;
	listMetaPath?: string;
	columns?: string[];
}

export function buildGenericCard(
	facts: NodeRunFacts,
	archetype: ResultCardArchetype,
	slots: GenericSlots = {},
): ResultCard | null {
	const envelope = genericEnvelope(facts);
	const first = objectItems(facts)[0] ?? {};

	switch (archetype) {
		case 'records': {
			const { rows, total } = recordItems(facts);
			const columns = slots.columns ?? candidateColumns(rows);
			if (columns.length === 0) return null;
			return {
				type: 'records',
				...envelope,
				target: truncate(humanize(facts.nodeName), MAX_TARGET),
				operation: 'read',
				...tableFromRows(rows, total, columns),
			};
		}
		case 'metric': {
			const numbers = numericFields(facts);
			const valueField: FieldInfo | undefined =
				(slots.valuePath ? numbers.find((f) => f.path === slots.valuePath) : undefined) ??
				numbers[0];
			const objectNumber = fieldsOfType(facts, 'object<number>')[0];
			if (!valueField && !objectNumber) return null;
			const rawValue = valueField ? first[valueField.path] : undefined;
			const numeric = typeof rawValue === 'number' ? rawValue : Number(str(rawValue));
			const label = truncate(
				slots.labelPath?.startsWith('field:')
					? str(first[slots.labelPath.slice('field:'.length)])
					: humanize(valueField?.path ?? objectNumber.path),
				MAX_LABEL,
			);
			const breakdownPath = slots.breakdownPath ?? objectNumber?.path;
			const trendPath = slots.trendPath ?? fieldsOfType(facts, 'array<number>')[0]?.path;
			const breakdown =
				breakdownPath && breakdownPath !== 'none'
					? breakdownFromValue(first[breakdownPath])
					: undefined;
			const trend =
				trendPath && trendPath !== 'none' && Array.isArray(first[trendPath])
					? (first[trendPath] as number[]).slice(-30)
					: undefined;
			const value = valueField
				? formatNumber(Number.isFinite(numeric) ? numeric : 0)
				: formatNumber(breakdown?.reduce((acc, row) => acc + row.value, 0) ?? 0);
			return {
				type: 'metric',
				...envelope,
				value: truncate(value, 24),
				label: label || 'Value',
				breakdown,
				trend,
			};
		}
		case 'list': {
			const { rows, total } = recordItems(facts);
			const columns = candidateColumns(rows);
			const titleColumn =
				slots.listTitlePath ??
				columns.find((column) => ['string', 'email', 'url'].includes(inferType(rows[0]?.[column])));
			if (!titleColumn) return null;
			const subtitleColumn =
				slots.listSubtitlePath ??
				columns.find(
					(column) => column !== titleColumn && inferType(rows[0]?.[column]) === 'string',
				);
			const metaColumn =
				slots.listMetaPath ??
				columns.find(
					(column) =>
						column !== titleColumn && ['number', 'date'].includes(inferType(rows[0]?.[column])),
				);
			const items = rows.slice(0, 5).map((row) => ({
				title: truncate(str(row[titleColumn]), 120) || '—',
				subtitle:
					subtitleColumn && subtitleColumn !== 'none'
						? truncate(str(row[subtitleColumn]), 160) || undefined
						: undefined,
				meta:
					metaColumn && metaColumn !== 'none'
						? truncate(str(row[metaColumn]), 40) || undefined
						: undefined,
				href:
					typeof row[titleColumn] === 'string' && str(row[titleColumn]).startsWith('https://')
						? str(row[titleColumn])
						: undefined,
			}));
			return { type: 'list', ...envelope, items, total };
		}
		case 'keyValue': {
			const pairs = scalarFields(facts)
				.slice(0, 6)
				.map((field) => ({
					key: truncate(humanize(field.path), 60),
					value: truncate(str(first[field.path]), 200),
				}))
				.filter((pair) => pair.value.length > 0);
			if (pairs.length === 0) return null;
			return { type: 'keyValue', ...envelope, pairs };
		}
		default:
			return null;
	}
}
