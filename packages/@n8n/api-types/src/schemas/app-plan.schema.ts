import { z } from 'zod';

/**
 * A structured plan of an n8n App. The editor shows it as a wireframe before approval,
 * and the first app version is generated from it. Every component keeps its `id` as
 * `data-plan-id` in the app, so the preview can link built UI back to the plan.
 */

export const APP_PLAN_SHELL_ID = 'shell';

const planIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]{0,39}$/, 'Use lowercase letters, digits and dashes');

export const appPlanComponentKindSchema = z.enum([
	'nav',
	'kpi',
	'table',
	'list',
	'chart',
	'detail',
	'form',
	'filter',
	'button',
	'text',
]);
export type AppPlanComponentKind = z.infer<typeof appPlanComponentKindSchema>;

const appPlanResourceSchema = z.object({
	kind: z.enum(['dataTable', 'workflow', 'agent']),
	name: z.string().trim().min(1).max(128),
	status: z.enum(['new', 'existing']),
	/** Filled in when the resource exists, so the preview can link to it. */
	resourceId: z.string().min(1).max(36).optional(),
});

export const appPlanDataSchema = appPlanResourceSchema.extend({
	fields: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
	/** How the shown value is derived, e.g. "count of drafts where status = pending". */
	aggregation: z.string().trim().min(1).max(200).optional(),
});
export type AppPlanData = z.infer<typeof appPlanDataSchema>;

export const appPlanActionSchema = appPlanResourceSchema.extend({
	kind: z.enum(['workflow', 'agent']),
	/** One line on what happens, e.g. "Publishes the draft and notifies the author". */
	does: z.string().trim().min(1).max(200),
});
export type AppPlanAction = z.infer<typeof appPlanActionSchema>;

export const appPlanComponentStatusSchema = z.enum(['planned', 'building', 'built']);
export type AppPlanComponentStatus = z.infer<typeof appPlanComponentStatusSchema>;

export const appPlanComponentSchema = z.object({
	id: planIdSchema,
	kind: appPlanComponentKindSchema,
	label: z.string().trim().min(1).max(80),
	/** Where the component sits on its screen. Defaults to `main`. */
	region: z.enum(['main', 'aside']).optional(),
	/** Columns of a 12-column grid. Defaults to 12. */
	span: z.number().int().min(1).max(12).optional(),
	/**
	 * Short hints the wireframe draws: table columns, form fields, filter names,
	 * chart series, or one KPI tile per item.
	 */
	items: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
	/** How a chart or filter looks: `line`, `bar` or `pie` charts, `select` or `pills` filters. */
	variant: z.enum(['line', 'bar', 'pie', 'select', 'pills']).optional(),
	data: appPlanDataSchema.optional(),
	action: appPlanActionSchema.optional(),
	/**
	 * A high-fidelity version of this part with sample data, for parts the user
	 * wants to see in detail before the build. Plain HTML and CSS, no scripts.
	 */
	detail: z
		.object({
			html: z.string().min(1).max(20000),
			css: z.string().max(10000).optional(),
			/**
			 * `mid`: the real structure, labels and sample content in neutral grays.
			 * `high`: the finished look with colors and style. Defaults to `mid`.
			 */
			fidelity: z.enum(['mid', 'high']).optional(),
			/**
			 * Other states of the part with the same CSS, e.g. `Empty`, `Loading` or
			 * `Error`. `html` is the main state with data.
			 */
			states: z
				.array(
					z.object({
						name: z.string().trim().min(1).max(24),
						html: z.string().min(1).max(10000),
					}),
				)
				.max(4)
				.optional(),
		})
		.optional(),
	status: appPlanComponentStatusSchema.optional(),
	/** The id of a screen that opens when the user clicks this part, e.g. a row of a list. */
	opens: planIdSchema.optional(),
	/**
	 * The id of another part on the same screen that contains this one, e.g. an
	 * Approve button in the footer of the draft panel.
	 */
	inside: planIdSchema.optional(),
});
export type AppPlanComponent = z.infer<typeof appPlanComponentSchema>;

export const appPlanScreenSchema = z.object({
	id: planIdSchema,
	name: z.string().trim().min(1).max(60),
	/**
	 * The URL path of the screen, e.g. `/` or `/drafts/:id`. A screen with a `:param`
	 * shows one record: the nav leaves it out, and a part that `opens` it leads there.
	 */
	path: z
		.string()
		.regex(/^\/[a-z0-9\-/:]*$/, 'Use a path like /drafts/:id')
		.max(80)
		.optional(),
	components: z.array(appPlanComponentSchema).min(1).max(30),
	/**
	 * The layout of the screen, top to bottom: rows of columns with relative widths,
	 * like a CSS grid. Each column stacks the parts it lists. Parts with `inside` are
	 * placed in their container, not here.
	 */
	rows: z
		.array(
			z.object({
				columns: z
					.array(
						z.object({
							/** Relative width, e.g. 2 and 1 for a 2:1 split. Defaults to 1. */
							width: z.number().int().min(1).max(12).optional(),
							parts: z.array(planIdSchema).min(1).max(12),
						}),
					)
					.min(1)
					.max(4),
			}),
		)
		.max(12)
		.optional(),
});
export type AppPlanScreen = z.infer<typeof appPlanScreenSchema>;

export const appPlanSchema = z
	.object({
		layout: z.enum(['topbar', 'sidebar']).optional(),
		/** The nav lists the screens. Omit it for a single-screen app without a nav. */
		nav: appPlanComponentSchema.extend({ kind: z.literal('nav') }).optional(),
		screens: z.array(appPlanScreenSchema).min(1).max(8),
		/** The build steps from the outside in: `shell` first, then component ids. */
		buildOrder: z.array(planIdSchema).max(60).optional(),
	})
	.superRefine((plan, ctx) => {
		const ids = new Set<string>([APP_PLAN_SHELL_ID]);
		const add = (id: string, path: Array<string | number>) => {
			if (ids.has(id)) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate plan id "${id}"`, path });
			}
			ids.add(id);
		};
		if (plan.nav) add(plan.nav.id, ['nav', 'id']);
		plan.screens.forEach((screen, s) =>
			screen.components.forEach((c, i) => add(c.id, ['screens', s, 'components', i, 'id'])),
		);
		const screenIds = new Set(plan.screens.map((screen) => screen.id));
		const partIds = new Set(plan.screens.flatMap((screen) => screen.components.map((c) => c.id)));
		plan.screens.forEach((screen, s) => {
			const local = new Map(screen.components.map((c) => [c.id, c]));
			screen.rows?.forEach((row, r) =>
				row.columns.forEach((column, c) =>
					column.parts.forEach((id, p) => {
						if (!local.has(id)) {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: `Unknown part "${id}" in the rows of screen "${screen.id}"`,
								path: ['screens', s, 'rows', r, 'columns', c, 'parts', p],
							});
						}
					}),
				),
			);
			screen.components.forEach((component, i) => {
				if (component.opens && !screenIds.has(component.opens) && !partIds.has(component.opens)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `"opens" of "${component.id}" must name a screen id, e.g. "${plan.screens.at(-1)?.id}"`,
						path: ['screens', s, 'components', i, 'opens'],
					});
				}
				if (!component.inside) return;
				const parent = local.get(component.inside);
				if (!parent || parent.inside || parent.id === component.id) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `"inside" of "${component.id}" must name a top-level part on the same screen`,
						path: ['screens', s, 'components', i, 'inside'],
					});
				}
			});
		});
		plan.buildOrder?.forEach((id, i) => {
			if (!ids.has(id)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Unknown plan id "${id}" in buildOrder`,
					path: ['buildOrder', i],
				});
			}
		});
	});
export type AppPlan = z.infer<typeof appPlanSchema>;

/** All components of a plan, nav first, in screen order. */
export function listPlanComponents(plan: AppPlan): AppPlanComponent[] {
	return [...(plan.nav ? [plan.nav] : []), ...plan.screens.flatMap((s) => s.components)];
}
