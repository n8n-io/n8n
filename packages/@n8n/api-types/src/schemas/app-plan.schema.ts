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
	status: appPlanComponentStatusSchema.optional(),
});
export type AppPlanComponent = z.infer<typeof appPlanComponentSchema>;

export const appPlanScreenSchema = z.object({
	id: planIdSchema,
	name: z.string().trim().min(1).max(60),
	components: z.array(appPlanComponentSchema).min(1).max(30),
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
