import { z } from 'zod';

import { dataTableFilterSchema } from './data-table-filter.schema';
import { dataTableColumnNameSchema, dataTableIdSchema } from './data-table.schema';

export const dashboardNameSchema = z.string().trim().min(1).max(128);

export const dashboardIdSchema = z
	.string()
	.max(36)
	.regex(/^[a-zA-Z0-9-]+$/);

export const dashboardSlugSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, digits, and hyphens.');

export const aggregateFunctionSchema = z.enum(['count', 'sum', 'avg', 'min', 'max']);
export type AggregateFunction = z.infer<typeof aggregateFunctionSchema>;

export const aggregateOpSchema = z
	.object({
		fn: aggregateFunctionSchema,
		column: dataTableColumnNameSchema.optional(),
		alias: z
			.string()
			.trim()
			.min(1)
			.max(64)
			.regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
	})
	.refine((op) => op.fn === 'count' || op.column !== undefined, {
		message: 'Aggregate functions other than count() require a column',
	});
export type AggregateOp = z.infer<typeof aggregateOpSchema>;

/**
 * Structured sort directive. Replaces the legacy "col:DIR" string form.
 * Invalid columns are rejected by the aggregate endpoint instead of silently ignored.
 */
export const sortDirectiveSchema = z.object({
	column: dataTableColumnNameSchema,
	direction: z.enum(['ASC', 'DESC']).default('ASC'),
});
export type SortDirective = z.infer<typeof sortDirectiveSchema>;

/** Time-bucket grouping for date columns. */
export const timeBucketSchema = z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']);
export type TimeBucket = z.infer<typeof timeBucketSchema>;

export const groupByDirectiveSchema = z.union([
	dataTableColumnNameSchema,
	z.object({
		column: dataTableColumnNameSchema,
		bucket: timeBucketSchema.optional(),
	}),
]);
export type GroupByDirective = z.infer<typeof groupByDirectiveSchema>;

export const widgetTypeSchema = z.enum(['kpi', 'table', 'chart']);
export type WidgetType = z.infer<typeof widgetTypeSchema>;

export const chartTypeSchema = z.enum(['bar', 'line', 'pie', 'area']);
export type ChartType = z.infer<typeof chartTypeSchema>;

export const widgetIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9-]+$/, 'Widget IDs may contain lowercase letters, digits, and hyphens.');

/**
 * Dashboard action target.
 *
 * Security note: `webhookUrl` is NOT user-writable. It is resolved server-side
 * from `workflowId + webhookNodeId` at execution time and surfaced read-only
 * on response. This prevents SSRF / open POST relay via crafted spec payloads.
 */
export const dashboardActionTargetWriteSchema = z.object({
	type: z.literal('webhook'),
	workflowId: z.string().min(1).max(64),
	/**
	 * The webhook node's stable routing UUID (`node.webhookId` in n8n internals).
	 * Generated once when the node is created and **not** regenerated when the
	 * workflow is re-saved or rebuilt by the AI. Preferred identifier for
	 * action binding because `node.id` gets regenerated on every AI build.
	 */
	webhookId: z.string().min(1).max(64).optional(),
	/**
	 * Legacy fallback. The node's UI `id`, captured by the picker at bind time.
	 * Will drift if the AI builder regenerates node IDs — kept for back-compat.
	 */
	webhookNodeId: z.string().min(1).max(64),
	webhookNodeName: z.string().min(1).max(128).optional(),
});

export const dashboardActionTargetReadSchema = dashboardActionTargetWriteSchema.extend({
	/** Read-only: resolved at execution time, exposed for display only. */
	webhookUrl: z.string().url().optional(),
});

/** Custom payload template — string values may reference `{{row.<col>}}`. */
export const customPayloadTemplateSchema = z
	.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
	.optional();

export const dashboardActionSchema = z
	.object({
		slug: dashboardSlugSchema,
		label: z.string().trim().min(1).max(64),
		confirm: z.string().trim().min(1).max(256).optional(),
		target: dashboardActionTargetReadSchema,
		payloadShape: z.enum(['row', 'rows', 'custom']).default('row'),
		customPayloadTemplate: customPayloadTemplateSchema,
	})
	.refine((a) => a.payloadShape !== 'custom' || a.customPayloadTemplate !== undefined, {
		message: 'payloadShape="custom" requires a customPayloadTemplate',
	});
export type DashboardAction = z.infer<typeof dashboardActionSchema>;

export const inputHintKindSchema = z.enum([
	'text',
	'textarea',
	'select',
	'email',
	'url',
	'number',
	'date',
	'boolean',
	'color',
	'file',
	'rich-text',
]);
export type InputHintKind = z.infer<typeof inputHintKindSchema>;

export const inputHintSchema = z
	.object({
		kind: inputHintKindSchema,
		options: z
			.array(
				z.object({
					value: z.string().min(1).max(256),
					label: z.string().min(1).max(256).optional(),
				}),
			)
			.optional(),
		validation: z
			.object({
				required: z.boolean().optional(),
				minLength: z.number().int().min(0).optional(),
				maxLength: z.number().int().min(1).optional(),
				min: z.number().optional(),
				max: z.number().optional(),
				pattern: z.string().optional(),
			})
			.optional(),
		placeholder: z.string().max(256).optional(),
		helpText: z.string().max(512).optional(),
	})
	.refine((h) => h.kind !== 'select' || (h.options && h.options.length > 0), {
		message: 'kind="select" requires a non-empty options[] array',
	});
export type InputHint = z.infer<typeof inputHintSchema>;

/** Rich KPI display format. Covers number, currency, percent, duration, bytes. */
export const kpiFormatSchema = z.object({
	kind: z.enum(['number', 'currency', 'percent', 'duration', 'bytes']),
	currency: z
		.string()
		.length(3)
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe('ISO-4217 currency code, e.g. USD. Required when kind="currency".'),
	locale: z.string().min(2).max(35).optional(),
	precision: z.number().int().min(0).max(8).optional(),
	suffix: z.string().max(16).optional(),
});
export type KpiFormat = z.infer<typeof kpiFormatSchema>;

const widgetBaseSchema = z.object({
	id: widgetIdSchema,
	type: widgetTypeSchema,
	title: z.string().trim().min(1).max(128),
	gridRow: z.number().int().min(1).max(48),
	gridCol: z.number().int().min(1).max(12),
	rowSpan: z.number().int().min(1).max(12).default(1),
	colSpan: z.number().int().min(1).max(12).default(3),
	dataSource: z.object({
		dataTableId: dataTableIdSchema,
		filter: dataTableFilterSchema.optional(),
		sort: z.array(sortDirectiveSchema).max(4).optional(),
	}),
	refreshIntervalSec: z
		.number()
		.int()
		.min(5)
		.max(3600)
		.optional()
		.describe('Auto-refresh interval. Omit to disable.'),
});

export const kpiWidgetSchema = widgetBaseSchema.extend({
	type: z.literal('kpi'),
	aggregate: aggregateOpSchema,
	format: kpiFormatSchema.optional(),
	compareToPrevious: z.boolean().optional(),
});
export type KpiWidget = z.infer<typeof kpiWidgetSchema>;

export const chartWidgetSchema = widgetBaseSchema.extend({
	type: z.literal('chart'),
	chartType: chartTypeSchema,
	xAxis: dataTableColumnNameSchema,
	yAxis: z.array(aggregateOpSchema).min(1).max(8),
	groupBy: z.array(groupByDirectiveSchema).max(4).optional(),
});
export type ChartWidget = z.infer<typeof chartWidgetSchema>;

/** Returns true if chart `xAxis` is present in `groupBy[]` (or no groupBy is set). */
function chartXAxisInGroupBy(c: ChartWidget): boolean {
	if (!c.groupBy || c.groupBy.length === 0) return true;
	const columns = c.groupBy.map((g) => (typeof g === 'string' ? g : g.column));
	return columns.includes(c.xAxis);
}

export const tableWidgetSchema = widgetBaseSchema.extend({
	type: z.literal('table'),
	columns: z.array(
		z.object({
			key: z.string().min(1).max(64),
			label: z.string().min(1).max(128),
			format: z.string().max(64).optional(),
			inputHint: inputHintSchema.optional(),
		}),
	),
	pageSize: z.number().int().min(5).max(200).default(25),
	rowActions: z.array(dashboardActionSchema).optional(),
});
export type TableWidget = z.infer<typeof tableWidgetSchema>;

export const widgetSchema = z.discriminatedUnion('type', [
	kpiWidgetSchema,
	chartWidgetSchema,
	tableWidgetSchema,
]);
export type DashboardWidget = z.infer<typeof widgetSchema>;

export const globalFilterSchema = z.object({
	id: widgetIdSchema,
	label: z.string().trim().min(1).max(64),
	column: dataTableColumnNameSchema,
	dataTableId: dataTableIdSchema,
	control: z.enum(['select', 'date-range', 'text']).default('select'),
});
export type DashboardGlobalFilter = z.infer<typeof globalFilterSchema>;

export const dashboardViewIdSchema = z.string().trim().min(1).max(64);

export const dashboardViewSchema = z.object({
	id: dashboardViewIdSchema,
	name: z.string().trim().min(1).max(128),
	icon: z.string().trim().min(1).max(64).optional(),
	widgets: z.array(widgetSchema).max(64),
});
export type DashboardView = z.infer<typeof dashboardViewSchema>;

/**
 * Dashboard spec — v2 with views[].
 *
 * Legacy specs with top-level flat `widgets[]` are accepted for backward
 * compatibility on READ but are rejected on WRITE. Server-side migrator
 * normalizes both shapes in `DashboardRepository.findFullById`.
 *
 * Uniqueness invariants enforced by `.refine()`:
 *  - `view.id` is unique across views[]
 *  - widget.id is globally unique across every view's widgets[]
 *  - top-level `actions[].slug` is unique
 */
export const dashboardSpecSchema = z
	.object({
		version: z.literal(1),
		views: z.array(dashboardViewSchema).min(1).max(16),
		globalFilters: z.array(globalFilterSchema).max(16).optional(),
		actions: z.array(dashboardActionSchema).max(32).optional(),
	})
	.superRefine((spec, ctx) => {
		const viewIds = new Set<string>();
		const widgetIds = new Set<string>();
		for (const view of spec.views) {
			if (viewIds.has(view.id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate view id: ${view.id}`,
					path: ['views'],
				});
			}
			viewIds.add(view.id);
			for (const widget of view.widgets) {
				if (widgetIds.has(widget.id)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Duplicate widget id across views: ${widget.id}`,
						path: ['views', view.id, 'widgets'],
					});
				}
				widgetIds.add(widget.id);
			}
		}
		const actionSlugs = new Set<string>();
		for (const action of spec.actions ?? []) {
			if (actionSlugs.has(action.slug)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate top-level action slug: ${action.slug}`,
					path: ['actions'],
				});
			}
			actionSlugs.add(action.slug);
		}
		for (const view of spec.views) {
			for (const widget of view.widgets) {
				if (widget.type === 'chart' && !chartXAxisInGroupBy(widget)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Chart widget "${widget.id}": xAxis "${widget.xAxis}" must appear in groupBy[].`,
						path: ['views', view.id, 'widgets', widget.id],
					});
				}
			}
		}
	});
export type DashboardSpec = z.infer<typeof dashboardSpecSchema>;

/**
 * Read-side spec — accepts legacy flat `widgets[]` so the server can migrate
 * old rows on the fly. Write-side validation (POST/PATCH bodies) uses the
 * strict `dashboardSpecSchema` above.
 */
export const dashboardSpecReadSchema = z.union([
	dashboardSpecSchema,
	z.object({
		version: z.literal(1),
		widgets: z.array(widgetSchema).max(64),
		globalFilters: z.array(globalFilterSchema).max(16).optional(),
		actions: z.array(dashboardActionSchema).max(32).optional(),
	}),
]);

export const dashboardSchema = z.object({
	id: dashboardIdSchema,
	name: dashboardNameSchema,
	description: z.string().max(2048).optional().nullable(),
	projectId: z.string(),
	spec: dashboardSpecSchema,
	tags: z.array(z.string().trim().min(1).max(64)).optional(),
	archived: z.boolean(),
	version: z.number().int().min(1).default(1),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

/** A broken column or table reference detected during read-side validation. */
export const brokenRefSchema = z.object({
	kind: z.enum(['column', 'data-table']),
	widgetId: z.string(),
	dataTableId: z.string(),
	column: z.string().optional(),
	message: z.string(),
});
export type BrokenRef = z.infer<typeof brokenRefSchema>;
