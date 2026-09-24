import { z } from 'zod';

// Mirrors the Data Table node's `get` parameters (nodes-base DataTable/common/selectMany.ts,
// actions/row/get.operation.ts); absent keys mean the node defaults.
const ROWS_LIMIT_DEFAULT = 50;

const conditionSchema = z.object({
	keyName: z.string().min(1),
	condition: z.string().default('eq'),
	keyValue: z.unknown().optional(),
});

const readParametersSchema = z.object({
	resource: z.string().default('row'),
	operation: z.string().default('insert'),
	matchType: z.enum(['anyCondition', 'allConditions']).default('anyCondition'),
	filters: z
		.object({ conditions: z.array(conditionSchema).default([]) })
		.default({ conditions: [] }),
	returnAll: z.boolean().default(false),
	limit: z.number().int().positive().default(ROWS_LIMIT_DEFAULT),
});

export type DataTableReadCondition = z.infer<typeof conditionSchema>;

export interface DataTableReadParameters {
	matchType: 'anyCondition' | 'allConditions';
	conditions: DataTableReadCondition[];
	returnAll: boolean;
	limit: number;
}

/** The filter, match type and limit of a Data Table `get` node; undefined for any other node. */
export function readDataTableReadParameters(node: {
	type: string;
	parameters?: unknown;
}): DataTableReadParameters | undefined {
	if (node.type !== 'n8n-nodes-base.dataTable') return undefined;
	const parsed = readParametersSchema.safeParse(node.parameters ?? {});
	if (!parsed.success || parsed.data.resource !== 'row' || parsed.data.operation !== 'get') {
		return undefined;
	}
	const { matchType, filters, returnAll, limit } = parsed.data;
	return { matchType, conditions: filters.conditions, returnAll, limit };
}

export function describeDataTableRead(read: DataTableReadParameters): string {
	const joiner = read.matchType === 'allConditions' ? ' AND ' : ' OR ';
	const filter =
		read.conditions.length === 0
			? 'no filter (every row)'
			: read.conditions
					.map(
						(c) =>
							`\`${c.keyName}\` ${c.condition}${c.keyValue === undefined ? '' : ` ${JSON.stringify(c.keyValue)}`}`,
					)
					.join(joiner);
	return `${filter}${read.returnAll ? '' : `; at most ${String(read.limit)} row(s)`}`;
}
