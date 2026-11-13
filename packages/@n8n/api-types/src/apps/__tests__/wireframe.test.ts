import { appPlanSchema, listPlanComponents } from '../../schemas/app-plan.schema';
import { appBlueprintSchema } from '../../schemas/instance-ai.schema';
import {
	collectDetailCss,
	describePlanComponent,
	sanitizeDetailHtml,
	planOverlayScript,
	renderWireframeBody,
	renderWireframeDocument,
} from '../wireframe';
import { reviewDeskPlan } from './review-desk.plan';

const plan = appPlanSchema.parse(reviewDeskPlan);
const byId = (id: string) => listPlanComponents(plan).find((c) => c.id === id)!;

describe('appPlanSchema', () => {
	it('parses the review desk plan', () => {
		expect(listPlanComponents(plan)).toHaveLength(8);
	});

	it('rejects an unknown component kind', () => {
		const bad = structuredClone(reviewDeskPlan);
		(bad.screens[0].components[0] as { kind: string }).kind = 'carousel';
		expect(appPlanSchema.safeParse(bad).success).toBe(false);
	});

	it('rejects duplicate ids and unknown ids in buildOrder', () => {
		const dup = structuredClone(reviewDeskPlan);
		dup.screens[0].components[1].id = 'kpi-pending';
		expect(appPlanSchema.safeParse(dup).success).toBe(false);

		const unknown = { ...structuredClone(reviewDeskPlan), buildOrder: ['shell', 'nope'] };
		expect(appPlanSchema.safeParse(unknown).success).toBe(false);
	});

	it('keeps the plan on a parsed blueprint', () => {
		const blueprint = appBlueprintSchema.parse({
			name: 'Review desk',
			namespace: 'review-desk',
			visibility: 'project',
			description: 'Review AI drafts before they are published',
			theme: 'light',
			plan: reviewDeskPlan,
		});
		expect(blueprint.plan?.screens[0].components).toHaveLength(7);
	});
});

describe('describePlanComponent', () => {
	it('describes where the data of a block comes from', () => {
		const info = describePlanComponent(byId('kpi-pending'), {});
		expect(info.lines).toEqual([
			'Data from data table "Drafts" (new)',
			'Shows: count of drafts where status = pending',
		]);
		expect(info.status).toBe('planned');
	});

	it('lists the fields of a data block', () => {
		expect(describePlanComponent(byId('drafts'), {}).lines).toContain(
			'Fields: title, channel, createdAt, status',
		);
	});

	it('describes the workflow an action runs and what it does', () => {
		const info = describePlanComponent(byId('approve'), {});
		expect(info.lines).toEqual([
			'Runs workflow "Publish draft" (new)',
			'Marks the draft approved and publishes it to its channel',
		]);
	});

	it('links to the resource once it exists', () => {
		const approve = { ...byId('approve') };
		approve.action = { ...approve.action!, resourceId: 'wf1', status: 'existing' };
		expect(describePlanComponent(approve, { editorUrl: 'http://n8n.test/' }).link).toEqual({
			label: 'Open Publish draft',
			href: 'http://n8n.test/workflow/wf1',
		});

		const drafts = { ...byId('drafts') };
		drafts.data = { ...drafts.data!, resourceId: 'dt1' };
		expect(
			describePlanComponent(drafts, { editorUrl: 'http://n8n.test', projectId: 'p1' }).link?.href,
		).toBe('http://n8n.test/projects/p1/datatables/dt1');
	});
});

describe('renderWireframeBody', () => {
	it('marks the shell and every component with its plan id', () => {
		const html = renderWireframeBody(plan);
		const ids = [...html.matchAll(/data-plan-id="([^"]+)"/g)].map((m) => m[1]);
		expect(ids.sort()).toEqual(['shell', ...listPlanComponents(plan).map((c) => c.id)].sort());
	});

	it('escapes labels, including Vue interpolation', () => {
		const html = renderWireframeBody({
			...plan,
			screens: [
				{
					...plan.screens[0],
					components: [{ ...byId('drafts'), label: '<b>{{ x }}</b>' }],
				},
			],
		});
		expect(html).not.toContain('<b>');
		expect(html).not.toContain('{{');
	});

	it('adds v-pre to each block for Vue templates', () => {
		const html = renderWireframeBody(plan, { vue: true });
		expect(html.match(/ v-pre>/g)).toHaveLength(listPlanComponents(plan).length);
	});
});

describe('planOverlayScript', () => {
	it('is valid JavaScript', () => {
		const script = planOverlayScript({ plan, progress: true });
		expect(() => new Function(script)).not.toThrow();
	});

	it('does not let plan text close the script tag', () => {
		const doc = renderWireframeDocument({
			...plan,
			screens: [{ ...plan.screens[0], name: '</script><script>alert(1)' }],
		});
		expect(doc.match(/<\/script>/g)).toHaveLength(1);
	});
});

describe('detailed parts', () => {
	const detailed = {
		...plan,
		screens: [
			{
				...plan.screens[0],
				components: [
					{
						...byId('kpi-pending'),
						detail: {
							html: '<div class="card" onclick="steal()"><b>12</b><script>alert(1)</script><a href="javascript:x()">x</a></div>',
							css: '.card { color: red; }</style><script>',
						},
					},
				],
			},
		],
	};

	it('renders the detail HTML instead of the sketch, marked as sample data', () => {
		const html = renderWireframeBody(detailed);
		expect(html).toContain('wf-hifi');
		expect(html).toContain('<b>12</b>');
		expect(html).not.toContain('wf-kpi-value');
	});

	it('strips scripts, event handlers and javascript URLs from the detail', () => {
		const clean = sanitizeDetailHtml(detailed.screens[0].components[0].detail!.html);
		expect(clean).not.toMatch(/script|onclick|javascript:/i);
		expect(clean).toContain('<b>12</b>');
	});

	it('scopes the detail CSS to its part', () => {
		const css = collectDetailCss(detailed);
		expect(css).toContain('@scope ([data-plan-id="kpi-pending"] .wf-hifi-body)');
		expect(css).not.toMatch(/<\/?style/i);
	});

	it('leaves the CSS out of Vue templates', () => {
		expect(renderWireframeBody(detailed, { vue: true })).not.toContain('<style>');
	});

	it('marks the part as detailed in the hover info', () => {
		expect(describePlanComponent(detailed.screens[0].components[0], {}).detailed).toBe(true);
	});
});
