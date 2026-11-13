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
