import { z } from 'zod';

/**
 * Body of `POST /internal/data-tables/call`: the data plane asks the control
 * plane to run one data table operation for a step it runs. One route carries
 * every operation, keyed by `call.kind`, so the two sides share one contract.
 *
 * The one definition of the body's shape. `DataTableCallRequest` is inferred
 * from it, so the client and the controller cannot disagree.
 *
 * The schemas check structure only. Column names, filter values and row data
 * are passed on unchecked, so the data table service rejects them with the
 * same messages a v1 execution sees.
 */

/** A cell as JSON carries it. A date cell arrives as its ISO string, which the service accepts. */
const cellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const rowSchema = z.record(z.string(), cellValueSchema);

const filterSchema = z.object({
	type: z.enum(['and', 'or']),
	filters: z.array(
		z.object({
			columnName: z.string(),
			condition: z.enum([
				'eq',
				'neq',
				'like',
				'ilike',
				'gt',
				'gte',
				'lt',
				'lte',
				'isEmpty',
				'isNotEmpty',
			]),
			value: cellValueSchema,
		}),
	),
});

const columnDefinitionSchema = z.object({
	name: z.string(),
	type: z.enum(['string', 'number', 'boolean', 'date']),
	index: z.number().int().optional(),
});

/** Operations on the project's data tables as a whole. */
const aggregateCallSchemas = [
	z.object({ kind: z.literal('getProjectId') }),
	z.object({
		kind: z.literal('getManyAndCount'),
		options: z.object({
			// Only what the node filters by. A project filter is not accepted: the
			// control plane pins the project, and the wire must not look otherwise.
			filter: z
				.object({
					id: z.union([z.string(), z.array(z.string())]).optional(),
					name: z.union([z.string(), z.array(z.string())]).optional(),
				})
				.strict()
				.optional(),
			sortBy: z
				.enum([
					'name:asc',
					'name:desc',
					'createdAt:asc',
					'createdAt:desc',
					'updatedAt:asc',
					'updatedAt:desc',
				])
				.optional(),
			take: z.number().int().optional(),
			skip: z.number().int().optional(),
		}),
	}),
	z.object({
		kind: z.literal('createDataTable'),
		options: z.object({ name: z.string(), columns: z.array(columnDefinitionSchema) }),
	}),
	// `deleteDataTableAll` is left out on purpose: no node calls it, and a route
	// that empties a whole project is not worth having for completeness.
] as const;

const dataTableId = z.string().min(1);

/** Operations on one data table. Every one of these names the table. */
const dataTableCallSchemas = [
	z.object({
		kind: z.literal('updateDataTable'),
		dataTableId,
		options: z.object({ name: z.string() }),
	}),
	z.object({ kind: z.literal('deleteDataTable'), dataTableId }),
	z.object({ kind: z.literal('getColumns'), dataTableId }),
	z.object({ kind: z.literal('addColumn'), dataTableId, options: columnDefinitionSchema }),
	z.object({
		kind: z.literal('moveColumn'),
		dataTableId,
		columnId: z.string().min(1),
		options: z.object({ targetIndex: z.number().int() }),
	}),
	z.object({ kind: z.literal('deleteColumn'), dataTableId, columnId: z.string().min(1) }),
	z.object({
		kind: z.literal('getManyRowsAndCount'),
		dataTableId,
		options: z.object({
			filter: filterSchema.optional(),
			sortBy: z.tuple([z.string(), z.enum(['ASC', 'DESC'])]).optional(),
			take: z.number().int().optional(),
			skip: z.number().int().optional(),
		}),
	}),
	z.object({
		kind: z.literal('insertRows'),
		dataTableId,
		rows: z.array(rowSchema),
		returnType: z.enum(['all', 'id', 'count']),
	}),
	z.object({
		kind: z.literal('updateRows'),
		dataTableId,
		options: z.object({ filter: filterSchema, data: rowSchema, dryRun: z.boolean().optional() }),
	}),
	z.object({
		kind: z.literal('upsertRow'),
		dataTableId,
		options: z.object({ filter: filterSchema, data: rowSchema, dryRun: z.boolean().optional() }),
	}),
	z.object({
		kind: z.literal('deleteRows'),
		dataTableId,
		options: z.object({ filter: filterSchema, dryRun: z.boolean().optional() }),
	}),
	z.object({ kind: z.literal('clearRows'), dataTableId }),
] as const;

export const dataTableCallSchema = z.discriminatedUnion('kind', [
	...aggregateCallSchemas,
	...dataTableCallSchemas,
]);

export const dataTableCallRequestSchema = z.object({
	execution: z.object({
		/** An engine execution id. No control plane execution row exists for it. */
		executionId: z.string().min(1),
		/** Decides the project. The control plane resolves it; the data plane cannot choose one. */
		workflowId: z.string().min(1),
	}),
	consumer: z.object({
		/** The node type that runs the operation. Only the data table nodes are allowed. */
		nodeType: z.string().min(1),
	}),
	call: dataTableCallSchema,
});

export type DataTableCall = z.infer<typeof dataTableCallSchema>;
export type DataTableCallKind = DataTableCall['kind'];
export type DataTableCallRequest = z.infer<typeof dataTableCallRequestSchema>;

/**
 * Success response of `POST /internal/data-tables/call`. `data` is the return
 * value of the operation as JSON carries it: a `Date` in a row is its ISO
 * string on this side. The data plane parses it with the result schema of the
 * call's kind, below.
 */
export interface DataTableCallResponse {
	data: unknown;
}

/**
 * A `Date` as the control plane serialised it, revived. Only the fields whose
 * proxy type promises a `Date` use this: the table and row timestamps. A date
 * cell stays the ISO string JSON made of it, which its cell type allows, so no
 * column lookup is needed to read a row.
 */
const serialisedDate = z
	.string()
	.datetime({ offset: true })
	.transform((value) => new Date(value));

const columnResultSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['string', 'number', 'boolean', 'date']),
	index: z.number(),
	dataTableId: z.string(),
});

const dataTableResultSchema = z.object({
	id: z.string(),
	name: z.string(),
	columns: z.array(columnResultSchema),
	createdAt: serialisedDate,
	updatedAt: serialisedDate,
	projectId: z.string(),
});

const rowResultSchema = z
	.object({ id: z.number(), createdAt: serialisedDate, updatedAt: serialisedDate })
	.catchall(cellValueSchema);

/** A dry run reports rows before and after, and a row that does not exist yet has no id. */
const rowWithStateResultSchema = z
	.object({
		id: z.number().nullable(),
		createdAt: serialisedDate.nullable(),
		updatedAt: serialisedDate.nullable(),
		dryRunState: z.enum(['before', 'after']),
	})
	.catchall(cellValueSchema);

const rowsOrRowsWithStateResultSchema = z.union([
	z.array(rowResultSchema),
	z.array(rowWithStateResultSchema),
]);

/** What `data` holds for each kind of call. The data plane parses the result with these. */
export const dataTableCallResultSchemas = {
	getProjectId: z.string(),
	getManyAndCount: z.object({ count: z.number(), data: z.array(dataTableResultSchema) }),
	createDataTable: dataTableResultSchema,
	updateDataTable: z.boolean(),
	deleteDataTable: z.boolean(),
	getColumns: z.array(columnResultSchema),
	addColumn: columnResultSchema,
	moveColumn: z.boolean(),
	deleteColumn: z.boolean(),
	getManyRowsAndCount: z.object({ count: z.number(), data: z.array(rowResultSchema) }),
	insertRows: z.union([
		z.array(rowResultSchema),
		z.array(z.object({ id: z.number() })),
		z.object({ success: z.literal(true), insertedRows: z.number() }),
	]),
	updateRows: rowsOrRowsWithStateResultSchema,
	upsertRow: rowsOrRowsWithStateResultSchema,
	deleteRows: z.array(rowResultSchema),
	clearRows: z.object({ deletedCount: z.number() }),
} satisfies Record<DataTableCallKind, z.ZodTypeAny>;

export type DataTableCallResult<K extends DataTableCallKind> = z.infer<
	(typeof dataTableCallResultSchemas)[K]
>;

/**
 * Which v1 error the data plane raises for a refused call, so the node and the
 * execution see what they see on v1.
 * - `node-operation`: a `NodeOperationError` for the node, with the same text
 *   the v1 proxy uses when the table is missing or the module is off.
 * - `user`: a `UserError` with the service's own message, such as a
 *   validation failure or a name conflict.
 */
export type DataTableCallErrorKind = 'node-operation' | 'user';

/** Error response of `POST /internal/data-tables/call` for a refused call. */
export interface DataTableCallErrorResponse {
	error: {
		kind: DataTableCallErrorKind;
		message: string;
		description?: string;
	};
}

export type DataTableCallOutcome = DataTableCallResponse | DataTableCallErrorResponse;

/** Narrows a parsed response body. The client trusts nothing else about it. */
export function isDataTableCallResponse(body: unknown): body is DataTableCallResponse {
	return typeof body === 'object' && body !== null && 'data' in body;
}

/** Narrows a parsed error body. Any other 4xx is treated as a transport failure. */
export function isDataTableCallErrorResponse(body: unknown): body is DataTableCallErrorResponse {
	if (typeof body !== 'object' || body === null || !('error' in body)) return false;
	const { error } = body;
	if (typeof error !== 'object' || error === null) return false;
	if (!('kind' in error) || !('message' in error)) return false;
	return (
		(error.kind === 'node-operation' || error.kind === 'user') && typeof error.message === 'string'
	);
}
