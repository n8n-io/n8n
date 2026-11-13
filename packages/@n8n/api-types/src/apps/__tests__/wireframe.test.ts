import { appPlanSchema, listPlanComponents } from '../../schemas/app-plan.schema';
import { appBlueprintSchema } from '../../schemas/instance-ai.schema';
import {
	renderDetailModule,
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

	it('renders the detail in a shadow root instead of the sketch, marked as sample data', () => {
		const html = renderWireframeBody(detailed);
		expect(html).toContain('<template shadowrootmode="open">');
		expect(html).toContain('<b>12</b>');
		expect(html).toContain('Sample data');
		expect(html).not.toContain('wf-kpi-value');
	});

	it('strips scripts, event handlers and javascript URLs from the detail', () => {
		const clean = sanitizeDetailHtml(detailed.screens[0].components[0].detail!.html);
		expect(clean).not.toMatch(/script|onclick|javascript:/i);
		expect(clean).toContain('<b>12</b>');
	});

	it('keeps the detail out of Vue templates and ships it as a module', () => {
		const vue = renderWireframeBody(detailed, { vue: true });
		expect(vue).not.toContain('<b>12</b>');
		expect(vue).toContain('class="wf-block wf-hifi');

		const module = renderDetailModule(detailed);
		expect(module).toContain('"kpi-pending"');
		expect(module).toContain('attachShadow');
		expect(module).not.toMatch(/<script|<\/style><script/i);
	});

	it('marks the part as detailed in the hover info', () => {
		expect(describePlanComponent(detailed.screens[0].components[0], {}).detailed).toBe(true);
	});
});

describe('pages', () => {
	const pages = appPlanSchema.parse({
		nav: { id: 'nav', kind: 'nav', label: 'Desk' },
		screens: [
			{
				id: 'queue',
				name: 'Queue',
				path: '/',
				components: [{ id: 'drafts', kind: 'table', label: 'Drafts', opens: 'draft' }],
			},
			{
				id: 'draft',
				name: 'Draft',
				path: '/drafts/:id',
				components: [{ id: 'body', kind: 'detail', label: 'Draft' }],
			},
		],
	});

	it('leaves pages with a parameter out of the nav and links back from them', () => {
		const html = renderWireframeBody(pages);
		const nav = html.slice(
			html.indexOf('wf-nav-items'),
			html.indexOf('</div>', html.indexOf('wf-nav-items')),
		);
		expect(nav).toContain('Queue');
		expect(nav).not.toContain('>Draft<');
		expect(html).toContain('class="wf-back" data-plan-screen-link="queue"');
		expect(html).toContain('/drafts/:id');
	});

	it('marks the part that opens a page', () => {
		expect(renderWireframeBody(pages)).toContain('data-plan-opens="draft"');
	});

	it('lists every page with its path in the document', () => {
		const doc = renderWireframeDocument(pages);
		expect(doc).toContain('class="wf-pages"');
		expect(doc).toContain('<code>/drafts/:id</code>');
	});

	it('rejects a path that is not a URL path', () => {
		expect(
			appPlanSchema.safeParse({
				screens: [
					{
						id: 'a',
						name: 'A',
						path: 'drafts',
						components: [{ id: 'x', kind: 'text', label: 'X' }],
					},
				],
			}).success,
		).toBe(false);
	});
});

describe('rows, columns and nesting', () => {
	const laidOut = appPlanSchema.parse({
		screens: [
			{
				id: 'desk',
				name: 'Desk',
				components: [
					{ id: 'kpis', kind: 'kpi', label: 'Today', items: ['Waiting'] },
					{ id: 'drafts', kind: 'table', label: 'Drafts' },
					{ id: 'panel', kind: 'detail', label: 'Selected draft' },
					{ id: 'approve', kind: 'button', label: 'Approve', inside: 'panel' },
					{ id: 'forgotten', kind: 'text', label: 'Footer note' },
				],
				rows: [
					{ columns: [{ parts: ['kpis'] }] },
					{
						columns: [
							{ width: 2, parts: ['drafts'] },
							{ width: 1, parts: ['panel'] },
						],
					},
				],
			},
		],
	});
	const html = renderWireframeBody(laidOut);

	it('renders each row as a grid with the column widths', () => {
		expect(html).toContain('grid-template-columns: 2fr 1fr');
		expect(html.indexOf('data-plan-id="kpis"')).toBeLessThan(html.indexOf('data-plan-id="drafts"'));
	});

	it('puts a part inside its container', () => {
		const panel = html.indexOf('data-plan-id="panel"');
		const inside = html.indexOf('class="wf-inside"', panel);
		expect(inside).toBeGreaterThan(panel);
		expect(html.indexOf('data-plan-id="approve"')).toBeGreaterThan(inside);
		expect(html.match(/data-plan-id="approve"/g)).toHaveLength(1);
	});

	it('still shows parts that the rows leave out', () => {
		expect(html).toContain('data-plan-id="forgotten"');
	});

	it('rejects rows with unknown parts and nesting two levels deep', () => {
		const screen = laidOut.screens[0];
		expect(
			appPlanSchema.safeParse({
				screens: [{ ...screen, rows: [{ columns: [{ parts: ['nope'] }] }] }],
			}).success,
		).toBe(false);
		expect(
			appPlanSchema.safeParse({
				screens: [
					{
						...screen,
						components: [
							...screen.components,
							{ id: 'deep', kind: 'button', label: 'Deep', inside: 'approve' },
						],
					},
				],
			}).success,
		).toBe(false);
	});
});

describe('detail fidelity and states', () => {
	const part = (detail: Record<string, unknown>) =>
		appPlanSchema.parse({
			screens: [
				{
					id: 'home',
					name: 'Home',
					components: [{ id: 'drafts', kind: 'table', label: 'Drafts', detail }],
				},
			],
		});

	it('keeps mid fidelity in grays and lets high fidelity show colors', () => {
		expect(renderWireframeBody(part({ html: '<p>Row</p>' }))).toContain('filter:grayscale(1)');
		expect(renderWireframeBody(part({ html: '<p>Row</p>', fidelity: 'high' }))).not.toContain(
			'grayscale',
		);
	});

	it('renders each state behind a CSS-only switcher', () => {
		const html = renderWireframeBody(
			part({
				html: '<p>Row</p>',
				states: [
					{ name: 'Empty', html: '<p>No drafts yet</p>' },
					{ name: 'Error', html: '<p onclick="x()">Could not load</p>' },
				],
			}),
		);
		expect(html).toContain('<label for="wf-s1">Empty</label>');
		expect(html).toContain('class="wf-state wf-s2"');
		expect(html).toContain('No drafts yet');
		expect(html).not.toContain('onclick');
		expect(html).not.toContain('<script');
	});
});

describe('opens', () => {
	const screens = (opens: string) => [
		{ id: 'list', name: 'List', components: [{ id: 'rows', kind: 'table', label: 'Rows', opens }] },
		{
			id: 'record',
			name: 'Record',
			path: '/rows/:id',
			components: [{ id: 'record-body', kind: 'detail', label: 'Record' }],
		},
	];

	it('accepts a screen id or a part on another screen', () => {
		expect(appPlanSchema.safeParse({ screens: screens('record') }).success).toBe(true);
		expect(appPlanSchema.safeParse({ screens: screens('record-body') }).success).toBe(true);
	});

	it('rejects an id that is neither', () => {
		expect(appPlanSchema.safeParse({ screens: screens('nowhere') }).success).toBe(false);
	});
});
