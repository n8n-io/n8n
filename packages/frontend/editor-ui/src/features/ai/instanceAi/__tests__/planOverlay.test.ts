import {
	PLAN_OVERLAY_CSS,
	appPlanSchema,
	describePlanComponent,
	planOverlayMain,
	renderWireframeBody,
} from '@n8n/api-types';

const plan = appPlanSchema.parse({
	nav: { id: 'nav', kind: 'nav', label: 'Desk' },
	screens: [
		{
			id: 'home',
			name: 'Home',
			components: [
				{ id: 'drafts', kind: 'table', label: 'Drafts' },
				{ id: 'approve', kind: 'button', label: 'Approve' },
			],
		},
	],
	buildOrder: ['shell', 'nav', 'drafts', 'approve'],
});

const barText = () => document.querySelector('.plan-ov-bar')?.textContent;

/** What the builder does: the real component keeps the plan id, without `wf-block`. */
function build(id: string) {
	const element = document.querySelector(`[data-plan-id="${id}"]`);
	if (id === 'shell') element?.classList.remove('wf-app');
	else element?.classList.remove('wf-block');
}

describe('plan overlay progress', () => {
	it('counts built parts, marks the next block, and reports when all are built', async () => {
		document.body.innerHTML = renderWireframeBody(plan);
		planOverlayMain(describePlanComponent, PLAN_OVERLAY_CSS, { plan, progress: true });
		expect(barText()).toBe('0 of 4 built · Building: Layout and theme');

		build('shell');
		build('nav');
		await vi.waitFor(() => expect(barText()).toBe('2 of 4 built · Building: Drafts'));
		expect(
			document.querySelector('[data-plan-id="drafts"]')?.classList.contains('plan-ov-building'),
		).toBe(true);

		build('drafts');
		build('approve');
		await vi.waitFor(() => expect(barText()).toBe('All 4 parts built'));
		expect(document.querySelector('.plan-ov-building')).toBeNull();
	});
});

describe('plan overlay pages', () => {
	it('opens the page of a part that `opens` names, with the button in the pinned card', () => {
		const pages = appPlanSchema.parse({
			screens: [
				{
					id: 'list',
					name: 'List',
					components: [{ id: 'rows', kind: 'table', label: 'Rows', opens: 'record-body' }],
				},
				{
					id: 'record',
					name: 'Record',
					path: '/rows/:id',
					components: [{ id: 'record-body', kind: 'detail', label: 'Record' }],
				},
			],
		});
		document.body.innerHTML = renderWireframeBody(pages);
		planOverlayMain(describePlanComponent, PLAN_OVERLAY_CSS, { plan: pages });

		document.querySelector<HTMLElement>('[data-plan-id="rows"]')!.click();
		const card = document.querySelector('.plan-ov-tip');
		expect(card?.classList.contains('pinned')).toBe(true);
		expect(card?.textContent).toContain('Record');

		document.querySelector<HTMLElement>('.plan-ov-go')!.click();
		expect(document.querySelector<HTMLElement>('[data-plan-screen="record"]')!.hidden).toBe(false);
		expect(document.querySelector<HTMLElement>('[data-plan-screen="list"]')!.hidden).toBe(true);
	});
});

describe('plan overlay follows the build', () => {
	const send = (data: Record<string, unknown>) =>
		window.dispatchEvent(
			new MessageEvent('message', { data: { source: 'n8n-app-plan', ...data }, source: window }),
		);
	const visible = (id: string) =>
		!document.querySelector<HTMLElement>(`[data-plan-screen="${id}"]`)!.hidden;

	it('shows the page of the part in progress until the user picks a page', () => {
		const plan = appPlanSchema.parse({
			screens: [
				{ id: 'list', name: 'List', components: [{ id: 'rows', kind: 'table', label: 'Rows' }] },
				{
					id: 'record',
					name: 'Record',
					path: '/rows/:id',
					components: [{ id: 'body', kind: 'detail', label: 'Record' }],
				},
			],
		});
		document.body.innerHTML = renderWireframeBody(plan);
		planOverlayMain(describePlanComponent, PLAN_OVERLAY_CSS, { plan, progress: 'parent' });

		send({ type: 'building', planId: 'body' });
		expect(visible('record')).toBe(true);

		send({ type: 'page', pageId: 'list' });
		expect(visible('list')).toBe(true);

		send({ type: 'building', planId: 'body' });
		expect(visible('list')).toBe(true);
	});
});
