/**
 * Consolidated dashboards tool — list, get, preview-spec, create, update, delete.
 *
 * `preview-spec` returns the spec the AI would persist without saving — used to
 * render a non-interactive preview in the chat UI before the user approves.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

export const DASHBOARDS_TOOL_ID = 'dashboards';

const aggregateOpSchema = z.object({
	fn: z.enum(['count', 'sum', 'avg', 'min', 'max']),
	column: z.string().optional(),
	alias: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'alias must be a snake_case identifier'),
});

const sortDirectiveSchema = z.object({
	column: z.string(),
	direction: z.enum(['ASC', 'DESC']).default('ASC'),
});

const groupByDirectiveSchema = z.union([
	z.string(),
	z.object({
		column: z.string(),
		bucket: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional(),
	}),
]);

const widgetIdSchema = z
	.string()
	.regex(
		/^[a-z0-9-]+$/,
		'Widget IDs: lowercase letters, digits, and hyphens. Use stable deterministic ids like "kpi-open-tickets" — NOT random.',
	);

const widgetBaseSchema = {
	id: widgetIdSchema,
	title: z.string(),
	gridRow: z.number().int().positive(),
	gridCol: z.number().int().positive(),
	rowSpan: z.number().int().min(1).max(12).default(1),
	colSpan: z.number().int().min(1).max(12).default(4),
	dataSource: z.object({
		dataTableId: z.string(),
		filter: z.unknown().optional(),
		sort: z.array(sortDirectiveSchema).max(4).optional(),
	}),
	refreshIntervalSec: z.number().int().min(5).max(3600).optional(),
};

const kpiFormatSchema = z.object({
	kind: z.enum(['number', 'currency', 'percent', 'duration', 'bytes']),
	currency: z
		.string()
		.length(3)
		.optional()
		.describe('ISO-4217 code, required when kind="currency".'),
	locale: z.string().optional(),
	precision: z.number().int().min(0).max(8).optional(),
	suffix: z.string().optional(),
});

const kpiWidgetSchema = z.object({
	...widgetBaseSchema,
	type: z.literal('kpi'),
	aggregate: aggregateOpSchema,
	format: kpiFormatSchema.optional(),
	/**
	 * Show a delta indicator (↑ 12%, ↓ 3%) comparing the current value to a
	 * previous period. Enable for KPIs where trend matters (revenue, signups,
	 * errors). Skip for static counts (total users, all-time downloads).
	 */
	compareToPrevious: z.boolean().optional(),
});

const chartWidgetSchema = z.object({
	...widgetBaseSchema,
	type: z.literal('chart'),
	chartType: z.enum(['bar', 'line', 'pie', 'area']),
	xAxis: z.string().describe('Must appear in groupBy[].'),
	yAxis: z.array(aggregateOpSchema).min(1).max(8),
	groupBy: z.array(groupByDirectiveSchema).max(4).optional(),
});

const inputHintSchema = z.object({
	kind: z.enum([
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
	]),
	options: z.array(z.object({ value: z.string(), label: z.string().optional() })).optional(),
	validation: z
		.object({
			required: z.boolean().optional(),
			minLength: z.number().int().optional(),
			maxLength: z.number().int().optional(),
			min: z.number().optional(),
			max: z.number().optional(),
			pattern: z.string().optional(),
		})
		.optional(),
	placeholder: z.string().optional(),
	helpText: z.string().optional(),
});

const actionSchema = z.object({
	slug: z.string().regex(/^[a-z0-9-]+$/),
	label: z.string(),
	confirm: z
		.string()
		.optional()
		.describe(
			'Confirmation modal text. ALWAYS set for destructive actions (delete, cancel, refund).',
		),
	target: z.object({
		type: z.literal('webhook'),
		// `webhookUrl` is intentionally NOT user-writable — the server resolves it
		// at execution time from `workflowId + (webhookId | webhookNodeId)`.
		workflowId: z.string().min(1),
		/**
		 * Stable routing UUID from `node.webhookId` (n8n internals). Survives
		 * AI builder regeneration of `node.id`. ALWAYS include when you know it.
		 */
		webhookId: z.string().min(1).optional(),
		webhookNodeId: z.string().min(1),
		/** Stable name from `node.name`. Used as a fallback when ids drift. */
		webhookNodeName: z.string().optional(),
	}),
	payloadShape: z.enum(['row', 'rows', 'custom']).default('row'),
	customPayloadTemplate: z
		.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
		.optional()
		.describe(
			'Required when payloadShape="custom". String values may reference {{row.<col>}} placeholders.',
		),
});

const tableWidgetSchema = z.object({
	...widgetBaseSchema,
	type: z.literal('table'),
	columns: z.array(
		z.object({
			key: z.string(),
			label: z.string(),
			format: z.string().optional(),
			inputHint: inputHintSchema.optional(),
		}),
	),
	pageSize: z.number().int().min(5).max(200).default(25),
	rowActions: z.array(actionSchema).optional(),
});

const widgetSchema = z.discriminatedUnion('type', [
	kpiWidgetSchema,
	chartWidgetSchema,
	tableWidgetSchema,
]);

const viewSchema = z.object({
	id: z.string(),
	name: z.string(),
	/**
	 * Optional Lucide icon name shown next to the tab label. Use sparingly —
	 * only when the view has a distinctive concept (chart for "Reports",
	 * grid-2x2 for "Overview", clipboard-list for "Tasks", users for "Team").
	 */
	icon: z.string().optional(),
	widgets: z.array(widgetSchema).max(64),
});

/**
 * Dashboard-wide filter control. Renders above the views as a horizontal bar.
 * The bound `column` is automatically AND-ed into every widget that reads
 * from `dataTableId`.
 */
const globalFilterSchema = z.object({
	id: z.string(),
	label: z.string().min(1).max(64),
	column: z.string(),
	dataTableId: z.string(),
	control: z.enum(['select', 'date-range', 'text']).default('select'),
});

const specSchema = z.object({
	version: z.literal(1),
	views: z.array(viewSchema).min(1).max(16),
	globalFilters: z
		.array(globalFilterSchema)
		.max(16)
		.optional()
		.describe(
			'Dashboard-wide filter bar. Each filter applies to every widget reading from the same dataTableId. ' +
				'Use for "filter by status / date range / search" requirements that affect all widgets.',
		),
	actions: z.array(actionSchema).max(32).optional(),
});

const listAction = z.object({
	action: z.literal('list').describe('List dashboards in a project'),
	projectId: z.string().optional(),
});

const getAction = z.object({
	action: z.literal('get').describe('Get a dashboard by id'),
	dashboardId: z.string(),
	projectId: z.string().optional(),
});

const previewSpecAction = z.object({
	action: z
		.literal('preview-spec')
		.describe('Validate a proposed dashboard spec without saving. Returns the parsed spec.'),
	name: z.string(),
	description: z.string().optional(),
	spec: specSchema,
});

const createAction = z.object({
	action: z.literal('create').describe('Create a new dashboard from a validated spec'),
	name: z.string(),
	description: z.string().optional(),
	spec: specSchema,
	tags: z.array(z.string()).optional(),
	projectId: z.string().optional(),
});

const updateAction = z.object({
	action: z.literal('update').describe('Update a dashboard'),
	dashboardId: z.string(),
	projectId: z.string().optional(),
	patch: z
		.object({
			name: z.string().optional(),
			description: z.string().nullable().optional(),
			spec: specSchema.optional(),
			tags: z.array(z.string()).optional(),
			archived: z.boolean().optional(),
		})
		.refine((p) => Object.keys(p).length > 0, { message: 'patch must include at least one field' }),
});

const deleteAction = z.object({
	action: z.literal('delete').describe('Delete a dashboard'),
	dashboardId: z.string(),
	projectId: z.string().optional(),
});

const allActions = [
	listAction,
	getAction,
	previewSpecAction,
	createAction,
	updateAction,
	deleteAction,
] as const;

type Input = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

export function createDashboardsTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return createTool({
		id: DASHBOARDS_TOOL_ID,
		description:
			'PREFERRED for any user request involving "dashboard", "KPI view", "metrics page", ' +
			'"data visualization", or "report" backed by an n8n Data Table. ' +
			'Manages native n8n dashboards (list, get, preview-spec, create, update, delete). ' +
			'\n\n' +
			'## Spec structure (v2)\n' +
			'A spec has `views: [{ id, name, widgets }]` — multiple tabs. ALWAYS include at least one view ' +
			'(default name "Overview"). Split into multiple views when the user asks for tabs, when the ' +
			'dashboard has more than 8 widgets, or when widgets group naturally (e.g. "Pipeline" vs "Reports").\n' +
			'\n' +
			'## Stable widget IDs (CRITICAL)\n' +
			'Use **deterministic, human-readable** widget ids like `"kpi-open-tickets"`, `"chart-revenue-by-month"`, ' +
			'`"table-open-tickets"`. NEVER use nanoid / random / uuid — the UI keys components by id, so randomized ' +
			'ids break user state (selection, pagination) every time the spec is regenerated.\n' +
			'\n' +
			'## KPI format (rich)\n' +
			'Use `format: { kind: "number" | "currency" | "percent" | "duration" | "bytes", currency?, locale?, precision?, suffix? }`. ' +
			'For currency, always pass an ISO-4217 code (USD, EUR, ...). For ratios use `kind: "percent"` only when ' +
			'values are already 0–1 (the renderer multiplies ×100).\n' +
			'\n' +
			'## Time-series charts\n' +
			'For "X over time" charts use a date column with `groupBy: [{ column: "created_at", bucket: "month" }]` ' +
			'(buckets: hour/day/week/month/quarter/year). The chart x-axis MUST appear in groupBy — set ' +
			'`xAxis: "created_at"` to match.\n' +
			'\n' +
			'## Sort\n' +
			'`dataSource.sort` is an array of `{ column, direction }`. References must be a real column or an ' +
			'aggregate alias from `yAxis[].alias`. Unknown columns are rejected with an error.\n' +
			'\n' +
			'## Cardinality cap\n' +
			'The aggregate endpoint hard-caps `groupBy` cardinality at 5000 distinct keys. Do NOT group by ' +
			'high-cardinality columns (e.g. ids, emails). Pick a low-cardinality dimension (status, region, ' +
			'category, bucketed date).\n' +
			'\n' +
			'## Input hints on Table columns — APPLY AGGRESSIVELY\n' +
			'Every Table column SHOULD carry an `inputHint` whenever the column has a constrained ' +
			'shape. **Plain string columns with no inputHint render as a single-line text input**, ' +
			'which is rarely what the user wants. Audit every column and set an inputHint when one ' +
			'of the patterns below matches.\n' +
			'\n' +
			'### Column-name → inputHint cookbook (apply on every dashboard)\n' +
			'When the data-table column name (case-insensitive) matches a pattern, set the matching hint:\n' +
			'\n' +
			'| Column name pattern | inputHint |\n' +
			'|---|---|\n' +
			'| `status`, `state`, `stage`, `phase`, `step` | `{ kind: "select", options: [...inferred] }` |\n' +
			'| `priority`, `severity`, `urgency` | `{ kind: "select", options: [{value:"low"},{value:"medium"},{value:"high"},{value:"urgent"}] }` |\n' +
			'| `type`, `kind`, `category`, `role`, `tier`, `plan`, `level` | `{ kind: "select", options: [...inferred] }` |\n' +
			'| ends in `_email` or named `email` | `{ kind: "email", validation: { required: true } }` |\n' +
			'| ends in `_url`, `_link`, named `url`/`link`/`website`/`homepage` | `{ kind: "url" }` |\n' +
			'| `notes`, `description`, `comment`, `comments`, `bio`, `summary`, `body`, `content`, `message` | `{ kind: "textarea" }` |\n' +
			'| `color`, `colour`, ends in `_color` | `{ kind: "color" }` |\n' +
			'| `password`, `secret`, `token`, `api_key` | NEVER include in a Table widget |\n' +
			'\n' +
			'### Inferring select options\n' +
			'When you set `kind: "select"`, **always include `options`**. Steps:\n' +
			'1. Call `data-tables.query` on the table with a small `limit` to see existing values. ' +
			'   Distinct values become your options.\n' +
			"2. If the table is empty / new, use the user's domain context:\n" +
			'   - "tickets" → open / in_progress / waiting / resolved / closed\n' +
			'   - "deals" → lead / qualified / proposal / negotiation / won / lost\n' +
			'   - "orders" → pending / processing / shipped / delivered / cancelled\n' +
			'   - "tasks" → todo / doing / done / blocked\n' +
			'   - "leads" → new / contacted / qualified / unqualified\n' +
			'   - "subscriptions" → active / paused / cancelled / past_due\n' +
			'3. If you genuinely cannot infer, call `ask-user` rather than fall back to plain text.\n' +
			'\n' +
			'### Validation\n' +
			'Set `validation.required: true` on columns that obviously must not be empty (name, ' +
			'email, primary identifier). For money/count columns set `validation.min: 0`. For email/url ' +
			'the kind itself enforces format.\n' +
			'\n' +
			'### Examples (copy these patterns verbatim)\n' +
			'```\n' +
			'{ "key": "status", "label": "Status",\n' +
			'  "inputHint": { "kind": "select",\n' +
			'    "options": [\n' +
			'      { "value": "open" },\n' +
			'      { "value": "in_progress", "label": "In progress" },\n' +
			'      { "value": "resolved" },\n' +
			'      { "value": "closed" }\n' +
			'    ],\n' +
			'    "validation": { "required": true } } }\n' +
			'\n' +
			'{ "key": "customer_email", "label": "Customer",\n' +
			'  "inputHint": { "kind": "email", "validation": { "required": true } } }\n' +
			'\n' +
			'{ "key": "notes", "label": "Internal notes",\n' +
			'  "inputHint": { "kind": "textarea", "placeholder": "Visible to your team only" } }\n' +
			'```\n' +
			'`kind: "select"` REQUIRES a non-empty `options[]` (server rejects otherwise). ' +
			'Plain-text-input fallback is your **last resort**, not your default.\n' +
			'\n' +
			'## Advanced capabilities — USE THESE\n' +
			'\n' +
			'### Global filters (dashboard-wide filter bar)\n' +
			'`spec.globalFilters[]` (up to 16) renders an interactive filter bar above all views. ' +
			'Each filter is bound to a column and AND-ed into every widget that reads from the same ' +
			'`dataTableId`. Use whenever the user wants "filter by status / date range / search across all widgets".\n' +
			'\n' +
			'- `control: "select"` — dropdown populated from the column\'s distinct values. Use for low-cardinality enums (status, priority, region).\n' +
			'- `control: "date-range"` — date picker. Use when the column is a date and the user wants to scope all widgets to a period.\n' +
			'- `control: "text"` — free-text search, applied as a `like` filter.\n' +
			'\n' +
			'Example:\n' +
			'```\n' +
			'"globalFilters": [\n' +
			'  { "id": "filter-status", "label": "Status", "column": "status",\n' +
			'    "dataTableId": "tk_orders", "control": "select" },\n' +
			'  { "id": "filter-date", "label": "Date range", "column": "created_at",\n' +
			'    "dataTableId": "tk_orders", "control": "date-range" }\n' +
			']\n' +
			'```\n' +
			'\n' +
			'### Auto-refresh per widget\n' +
			'`widget.refreshIntervalSec` (5–3600s) polls and re-renders the widget at the interval. ' +
			'Use when the user says "live", "real-time", "monitor", "watch", "auto-refresh", "ops dashboard". ' +
			'Recommended: 15–30s for KPIs/charts, 30–60s for tables. Omit on slow-changing data to ' +
			'avoid unnecessary database load.\n' +
			'\n' +
			'### KPI trend indicators\n' +
			'`kpiWidget.compareToPrevious: true` displays an up/down delta arrow with percentage. ' +
			'Use for KPIs where trend matters — revenue, signups, errors, conversion rate. SKIP for ' +
			'static counts (total users, lifetime sales).\n' +
			'\n' +
			'### Multi-series charts\n' +
			'`chartWidget.yAxis[]` accepts up to 8 aggregate ops. Each produces a separate series. ' +
			'Use to overlay related metrics on one chart: revenue vs cost, opens vs clicks, sent vs ' +
			'delivered vs bounced.\n' +
			'\n' +
			'```\n' +
			'"chartType": "line", "xAxis": "created_at",\n' +
			'"yAxis": [\n' +
			'  { "fn": "sum", "column": "revenue", "alias": "revenue_total" },\n' +
			'  { "fn": "sum", "column": "cost",    "alias": "cost_total" },\n' +
			'  { "fn": "sum", "column": "profit",  "alias": "profit_total" }\n' +
			'],\n' +
			'"groupBy": [{ "column": "created_at", "bucket": "month" }]\n' +
			'```\n' +
			'\n' +
			'### Grouped / stacked charts\n' +
			'`chart.groupBy[]` accepts up to 4 directives. Multiple groupBy columns produce stacked / ' +
			'grouped bars. Use for "tickets per week, broken down by priority" — `groupBy: [{column: ' +
			'"created_at", bucket: "week"}, "priority"]`.\n' +
			'\n' +
			'### Tab icons\n' +
			'`view.icon` accepts a Lucide icon name. Use sparingly — only when a tab has a distinctive ' +
			'concept. Recommended icons:\n' +
			'- `"grid-2x2"` for "Overview"\n' +
			'- `"clipboard-list"` for tasks/checklist tabs\n' +
			'- `"users"` for team/people tabs\n' +
			'- `"chart-column-decreasing"` for reports/analytics tabs\n' +
			'- `"sliders-horizontal"` for settings/config tabs\n' +
			'- `"circle-alert"` for alerts/errors tabs\n' +
			'\n' +
			'### Table cell formatting\n' +
			'`tableWidget.columns[].format` is a display-format string (separate from `inputHint` which ' +
			'controls editing). Examples:\n' +
			'- `"currency:USD"` — render `12345.67` as `$12,345.67`\n' +
			'- `"percent"` — render `0.84` as `84%`\n' +
			'- `"date:short"` / `"date:medium"` / `"date:long"`\n' +
			'- `"datetime"`\n' +
			'- `"number:0"` — integer\n' +
			'- `"number:2"` — 2 decimal places\n' +
			'Use whenever a column displays raw numbers or ISO dates that need user-friendly formatting.\n' +
			'\n' +
			'### Dashboard-wide actions\n' +
			'`spec.actions[]` (up to 32) renders as buttons in the dashboard header (alongside the title). ' +
			'Use for page-level operations that don\'t need a row context: "Send daily digest", "Refresh ' +
			'data", "Export PDF", "Trigger reconciliation".\n' +
			'Pair with `payloadShape: "custom"` and `customPayloadTemplate` when the workflow expects a ' +
			"specific shape that's not row-derived. Example:\n" +
			'```\n' +
			'{ "slug": "send-digest", "label": "Send daily digest",\n' +
			'  "confirm": "Post today\'s summary to #ops?",\n' +
			'  "target": { "type": "webhook", "workflowId": "wf_x", "webhookNodeId": "n_y", "webhookNodeName": "Webhook" },\n' +
			'  "payloadShape": "custom",\n' +
			'  "customPayloadTemplate": { "trigger": "manual", "source": "dashboard", "fired_by": "user" } }\n' +
			'```\n' +
			'\n' +
			'### Rich row-action confirmations\n' +
			'ALWAYS set `confirm` on destructive actions (delete, cancel, refund, ban, mark-as-spam). ' +
			'Phrase it as a question matching what the user is about to do — *"Cancel this order and ' +
			'notify the customer?"* — not generic *"Are you sure?"*.\n' +
			'\n' +
			'### Custom payload templates\n' +
			'When `payloadShape: "custom"`, `customPayloadTemplate` is required and must be an object. ' +
			'String values can reference `{{row.<col>}}` and get interpolated server-side at fire time. ' +
			'Example — a "Mark won" action that posts a precisely-shaped payload to Slack via your webhook:\n' +
			'```\n' +
			'"customPayloadTemplate": {\n' +
			'  "deal_id": "{{row.id}}",\n' +
			'  "amount":  "{{row.amount}}",\n' +
			'  "channel": "#wins",\n' +
			'  "text":    "🎉 Deal {{row.name}} won at ${{row.amount}}"\n' +
			'}\n' +
			'```\n' +
			'\n' +
			'### Validation patterns beyond required\n' +
			'`inputHint.validation` supports:\n' +
			'- `minLength` / `maxLength` for strings (use on identifiers, names, slugs)\n' +
			'- `min` / `max` for numbers (use on amounts, quantities, scores)\n' +
			'- `pattern` — custom regex (use for invoice numbers like `^INV-\\d{6}$`, phone numbers, SKUs)\n' +
			'- `inputHint.helpText` — small explainer text under the field. Use for non-obvious constraints.\n' +
			'\n' +
			'## Schema limits (the server will reject specs that exceed these)\n' +
			'- Max 16 views per dashboard\n' +
			'- Max 64 widgets per view\n' +
			'- Max 8 series (`yAxis[]`) per chart\n' +
			'- Max 4 `groupBy[]` per chart\n' +
			'- Max 4 `sort[]` per widget\n' +
			'- Max 32 dashboard-level actions\n' +
			'- Max 16 global filters\n' +
			'- Max pageSize 200 on tables (default 25, recommended 25–50)\n' +
			'- KPI precision 0–8 decimal places\n' +
			'- refreshIntervalSec 5–3600\n' +
			'\n' +
			'## Common dashboard recipes — start here when in doubt\n' +
			'\n' +
			'### Recipe 1 — Operational dashboard (live counts, action buttons)\n' +
			'Trigger: user says "monitor", "live", "ops", "support queue", "incidents".\n' +
			'```\n' +
			'{\n' +
			'  "version": 1,\n' +
			'  "globalFilters": [\n' +
			'    { "id": "f-status", "label": "Status", "column": "status", "dataTableId": "tk_x", "control": "select" }\n' +
			'  ],\n' +
			'  "views": [{\n' +
			'    "id": "live", "name": "Live", "icon": "circle-alert",\n' +
			'    "widgets": [\n' +
			'      { "id": "kpi-open",   "type": "kpi", "title": "Open",   "gridRow":1,"gridCol":1, "colSpan":3,\n' +
			'        "refreshIntervalSec": 15,\n' +
			'        "dataSource": {"dataTableId":"tk_x","filter":{"type":"and","filters":[{"columnName":"status","condition":"eq","value":"open"}]}},\n' +
			'        "aggregate": {"fn":"count","alias":"open_total"},\n' +
			'        "compareToPrevious": true },\n' +
			'      { "id": "kpi-overdue","type":"kpi","title":"Overdue", "gridRow":1,"gridCol":4, "colSpan":3,\n' +
			'        "refreshIntervalSec": 15,\n' +
			'        "dataSource":{"dataTableId":"tk_x"},\n' +
			'        "aggregate":{"fn":"count","alias":"overdue_total"}, "compareToPrevious": true },\n' +
			'      { "id": "table-queue","type":"table","title":"Queue","gridRow":2,"gridCol":1,"colSpan":12,"rowSpan":4,\n' +
			'        "refreshIntervalSec": 30,\n' +
			'        "pageSize": 25,\n' +
			'        "dataSource":{"dataTableId":"tk_x","sort":[{"column":"created_at","direction":"DESC"}]},\n' +
			'        "columns":[ /* with inputHints */ ],\n' +
			'        "rowActions":[\n' +
			'          { "slug":"resolve","label":"Resolve","confirm":"Mark resolved?",\n' +
			'            "target":{"type":"webhook","workflowId":"wf_r","webhookNodeId":"n_r","webhookNodeName":"Webhook"} }\n' +
			'        ] }\n' +
			'    ]\n' +
			'  }]\n' +
			'}\n' +
			'```\n' +
			'\n' +
			'### Recipe 2 — Analytics dashboard (trends + breakdowns)\n' +
			'Trigger: user says "analytics", "report", "trends", "weekly review", "executive summary".\n' +
			'Key features: time-bucketed multi-series chart, breakdown chart, detail table.\n' +
			'```\n' +
			'"widgets": [\n' +
			'  { "id":"kpi-revenue","type":"kpi","title":"Revenue (MTD)", "colSpan":3,\n' +
			'    "format":{"kind":"currency","currency":"USD"},\n' +
			'    "compareToPrevious": true, "aggregate":{"fn":"sum","column":"amount","alias":"rev"} /* ... */ },\n' +
			'  { "id":"kpi-orders","type":"kpi","title":"Orders","colSpan":3, "compareToPrevious": true, /* ... */ },\n' +
			'  { "id":"kpi-aov","type":"kpi","title":"AOV","colSpan":3,\n' +
			'    "format":{"kind":"currency","currency":"USD"},\n' +
			'    "aggregate":{"fn":"avg","column":"amount","alias":"aov"} /* ... */ },\n' +
			'  { "id":"kpi-conversion","type":"kpi","title":"Conversion","colSpan":3,\n' +
			'    "format":{"kind":"percent","precision":1}, "compareToPrevious": true /* ... */ },\n' +
			'  { "id":"chart-trends","type":"chart","title":"Revenue vs cost by month",\n' +
			'    "chartType":"line","colSpan":12,\n' +
			'    "xAxis":"created_at",\n' +
			'    "yAxis":[\n' +
			'      {"fn":"sum","column":"revenue","alias":"rev"},\n' +
			'      {"fn":"sum","column":"cost",   "alias":"cost"}\n' +
			'    ],\n' +
			'    "groupBy":[{"column":"created_at","bucket":"month"}] /* ... */ }\n' +
			']\n' +
			'```\n' +
			'\n' +
			'### Recipe 3 — CRUD admin panel (filterable table + row CRUD)\n' +
			'Trigger: user says "admin", "manage X", "edit records", "CRM contacts", "user management".\n' +
			'Key features: dominant table, global filter bar, rich inputHints on every column, row actions.\n' +
			'```\n' +
			'{\n' +
			'  "version": 1,\n' +
			'  "globalFilters":[\n' +
			'    {"id":"f-status","label":"Status","column":"status","dataTableId":"tk_c","control":"select"},\n' +
			'    {"id":"f-search","label":"Search","column":"name",  "dataTableId":"tk_c","control":"text"}\n' +
			'  ],\n' +
			'  "views":[{\n' +
			'    "id":"all","name":"All","icon":"users",\n' +
			'    "widgets":[{\n' +
			'      "id":"table-records","type":"table","title":"Records",\n' +
			'      "gridRow":1,"gridCol":1,"colSpan":12,"rowSpan":8,"pageSize":50,\n' +
			'      "dataSource":{"dataTableId":"tk_c","sort":[{"column":"updated_at","direction":"DESC"}]},\n' +
			'      "columns":[\n' +
			'        {"key":"name","label":"Name","inputHint":{"kind":"text","validation":{"required":true}}},\n' +
			'        {"key":"email","label":"Email","inputHint":{"kind":"email","validation":{"required":true}}},\n' +
			'        {"key":"status","label":"Status","inputHint":{"kind":"select","options":[/* ... */]}},\n' +
			'        {"key":"notes","label":"Notes","inputHint":{"kind":"textarea"}}\n' +
			'      ]\n' +
			'    }]\n' +
			'  }]\n' +
			'}\n' +
			'```\n' +
			'\n' +
			'### Recipe 4 — Workflow monitor (execution counts + recent runs + retry)\n' +
			'Trigger: user wants to monitor a specific workflow or set of workflows that record into a data table.\n' +
			'Key features: error-rate KPI with `compareToPrevious`, duration trend, recent-runs table with a "Retry" row action.\n' +
			'```\n' +
			'"widgets":[\n' +
			'  {"id":"kpi-success","type":"kpi","title":"Success rate", "colSpan":3,\n' +
			'    "format":{"kind":"percent","precision":1},\n' +
			'    "compareToPrevious":true,\n' +
			'    "refreshIntervalSec":30 /* ... */ },\n' +
			'  {"id":"kpi-duration","type":"kpi","title":"Avg duration", "colSpan":3,\n' +
			'    "format":{"kind":"duration","precision":1},\n' +
			'    "aggregate":{"fn":"avg","column":"duration_ms","alias":"avg_ms"} /* ... */ },\n' +
			'  {"id":"chart-runs","type":"chart","title":"Runs by hour","chartType":"bar","colSpan":12,\n' +
			'    "xAxis":"started_at",\n' +
			'    "yAxis":[{"fn":"count","alias":"runs"}],\n' +
			'    "groupBy":[{"column":"started_at","bucket":"hour"}] /* ... */ },\n' +
			'  {"id":"table-recent","type":"table","title":"Recent runs","colSpan":12,"pageSize":25,\n' +
			'    "refreshIntervalSec":15,\n' +
			'    "rowActions":[\n' +
			'      {"slug":"retry","label":"Retry","confirm":"Re-run this execution?",\n' +
			'       "target":{"type":"webhook","workflowId":"wf_x","webhookNodeId":"n_retry","webhookNodeName":"Retry trigger"},\n' +
			'       "payloadShape":"custom",\n' +
			'       "customPayloadTemplate":{"execution_id":"{{row.id}}","reason":"manual retry from dashboard"}}\n' +
			'    ] /* ... */ }\n' +
			']\n' +
			'```\n' +
			'\n' +
			'## View layout — balance widgets per tab\n' +
			'The dashboard grid is 12 columns wide. To keep tab-switching visually stable (no jumps ' +
			'in page height or "half-empty" tabs), follow these rules per view:\n' +
			'\n' +
			'- **First row of every view**: KPI widgets summing to **exactly 12 columns** (e.g. 4×3, 3×4, 2×6, 1×12). Never leave an empty trailing column.\n' +
			'- **Subsequent rows**: each row sums to 12 columns. Allowed pairings: `12`, `8+4`, `6+6`, `4+4+4`, `3+3+3+3`.\n' +
			'- **Avoid tiny views**: a view with one KPI looks abandoned next to a packed view. ' +
			'  If you only have one KPI, either span it `colSpan: 12` or add 2–3 more KPIs/charts to fill the row.\n' +
			'- **Roughly similar widget count per view**: try to keep all views within ±2 widgets of each other. ' +
			'  If you have 12 widgets total and 3 tabs, target 4 widgets per tab — not 8/3/1.\n' +
			'- **Table widgets** should always be `colSpan: 12` (full width). They look bad cramped.\n' +
			'- **Charts** look best at `colSpan: 6` (two per row) or `colSpan: 12` (hero chart).\n' +
			'- **KPIs** look best at `colSpan: 3` (four per row) or `colSpan: 4` (three per row).\n' +
			'\n' +
			"Examples of well-balanced view layouts (each line is a row's widget colSpans):\n" +
			'```\n' +
			'Overview tab:\n' +
			'  [3, 3, 3, 3]   ← four KPIs\n' +
			'  [6, 6]         ← two charts\n' +
			'  [12]           ← one table\n' +
			'\n' +
			'Pipeline tab:\n' +
			'  [4, 4, 4]      ← three KPIs\n' +
			'  [12]           ← one full-width chart\n' +
			'  [12]           ← one table\n' +
			'```\n' +
			'\n' +
			'## Action binding (server-resolved URLs — no SSRF)\n' +
			'1. Call `workflows.list` first to find a candidate workflow with a webhook-style trigger ' +
			'   (n8n-nodes-base.webhook, formTrigger, mcpTrigger).\n' +
			'2. For the chosen workflow, set `target = { type: "webhook", workflowId, webhookNodeId }`. ' +
			'   Do NOT include `webhookUrl` — the server resolves it at execution time from those two ids. ' +
			'   The schema REJECTS user-supplied `webhookUrl` (SSRF protection).\n' +
			'3. If no matching workflow exists, OMIT the action and tell the user they can wire it via the ' +
			'   UI picker after the dashboard is created.\n' +
			'4. For `payloadShape: "custom"`, you MUST also provide `customPayloadTemplate` whose string ' +
			'   values can reference `{{row.<col>}}`.\n' +
			'\n' +
			'## Uniqueness invariants (enforced)\n' +
			'- `view.id` unique across views[]\n' +
			'- widget `id` globally unique across every view\n' +
			'- top-level `actions[].slug` unique\n' +
			'\n' +
			'## Flow\n' +
			'data-tables.list/.schema (inspect tables) → workflows.list (if actions needed) → ' +
			'preview-spec → user approves → create.',
		inputSchema,
		execute: async (input: Input) => {
			if (!context.dashboardService) {
				return { error: 'Dashboard service is not available on this instance.' };
			}
			const svc = context.dashboardService;
			switch (input.action) {
				case 'list':
					return { dashboards: await svc.list({ projectId: input.projectId }) };
				case 'get':
					return { dashboard: await svc.get(input.dashboardId, { projectId: input.projectId }) };
				case 'preview-spec': {
					const widgetCount = input.spec.views.reduce((sum, v) => sum + v.widgets.length, 0);
					return {
						preview: {
							name: input.name,
							description: input.description,
							spec: input.spec,
							viewCount: input.spec.views.length,
							widgetCount,
						},
					};
				}
				case 'create': {
					const dashboard = await svc.create(input.name, input.spec, {
						projectId: input.projectId,
						description: input.description,
						tags: input.tags,
					});
					return { dashboard };
				}
				case 'update': {
					const dashboard = await svc.update(input.dashboardId, input.patch, {
						projectId: input.projectId,
					});
					return { dashboard };
				}
				case 'delete': {
					await svc.delete(input.dashboardId, { projectId: input.projectId });
					return { ok: true };
				}
			}
		},
	});
}
