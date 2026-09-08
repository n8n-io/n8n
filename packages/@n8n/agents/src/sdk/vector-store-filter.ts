import { z } from 'zod';

import type { FilterCondition, FilterOperator, VectorFilter } from '../types/sdk/vector-store';

const SCALAR_OPERATORS = ['eq', 'ne'] as const satisfies readonly FilterOperator[];
const ARRAY_OPERATORS = ['in', 'nin'] as const satisfies readonly FilterOperator[];

export const FILTER_OPERATORS = [
	...SCALAR_OPERATORS,
	...ARRAY_OPERATORS,
] as const satisfies readonly FilterOperator[];

export type VectorFilterInput = VectorFilter | Record<string, string | number | boolean>;

function isVectorFilter(input: VectorFilterInput): input is VectorFilter {
	return Array.isArray(input.conditions);
}

/** Normalizes the `.search({ filter })` shorthand into a canonical `VectorFilter`. */
export function normalizeFilterInput(input: VectorFilterInput): VectorFilter {
	if (isVectorFilter(input)) {
		return input;
	}
	const conditions: FilterCondition[] = Object.entries(input).map(([key, value]) => ({
		key,
		operator: 'eq',
		value,
	}));
	return { conditions, combineWith: 'and' };
}

/** Validates operator/value pairing per condition; throws rather than silently ignoring a bad filter. */
export function assertValidFilter(filter: VectorFilter): void {
	for (const condition of filter.conditions) {
		assertValidCondition(condition);
	}
}

function assertValidCondition(condition: FilterCondition): void {
	const { key, operator, value } = condition;

	if (!(FILTER_OPERATORS as readonly string[]).includes(operator)) {
		throw new Error(
			`Invalid filter operator "${operator}" for key "${key}". Supported operators: ${FILTER_OPERATORS.join(', ')}`,
		);
	}

	if (operator === 'in' || operator === 'nin') {
		if (!Array.isArray(value) || value.length === 0) {
			throw new Error(
				`Filter operator "${operator}" on key "${key}" requires a non-empty array value.`,
			);
		}
		if (value.some((v) => typeof v !== 'string' && typeof v !== 'number')) {
			throw new Error(
				`Filter operator "${operator}" on key "${key}" requires array elements to be strings or numbers.`,
			);
		}
		return;
	}

	// eq, ne
	if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
		throw new Error(
			`Filter operator "${operator}" on key "${key}" requires a string, number, or boolean value.`,
		);
	}
}

function isNonEmptyArray(arr: string[]): arr is [string, ...string[]] {
	return arr.length > 0;
}

/** Builds the zod schema for the model-facing `filter` tool input, scoped to `keys` (key -> description). */
export function buildFilterInputSchema(keys: Record<string, string>) {
	const keyNames = Object.keys(keys);
	if (!isNonEmptyArray(keyNames)) {
		throw new Error('filterableKeys must contain at least one key');
	}

	const keyDescriptions = keyNames.map((key) => `- ${key}: ${keys[key]}`).join('\n');

	// Discriminated by `operator` so the model-facing schema rejects the same
	// operator/value mismatches the runtime validator does (e.g. an array for
	// "eq", or a scalar for "in"), instead of failing later during search.
	return z
		.array(
			z.discriminatedUnion('operator', [
				z.object({
					key: z.enum(keyNames),
					operator: z.enum(SCALAR_OPERATORS),
					value: z.union([z.string(), z.number(), z.boolean()]),
				}),
				z.object({
					key: z.enum(keyNames),
					operator: z.enum(ARRAY_OPERATORS),
					value: z.array(z.union([z.string(), z.number()])).min(1),
				}),
			]),
		)
		.optional()
		.describe(
			`Optional metadata filter conditions (combined with AND). Filterable keys:\n${keyDescriptions}`,
		);
}
