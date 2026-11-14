import {
	PLAN_OVERLAY_CSS,
	appPlanSchema,
	describePlanComponent,
	planOverlayMain,
	renderWireframeBody,
} from '@n8n/api-types';

// One overlay per file: each overlay keeps its listeners on the shared document.
const plan = appPlanSchema.parse({
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
});

const card = () => document.querySelector('.plan-ov-tip');
const key = (target: Element, name: string) =>
	target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));

describe('plan overlay keyboard', () => {
	it('opens, pins, enters and closes the card from the keyboard', () => {
		document.body.innerHTML = renderWireframeBody(plan);
		planOverlayMain(describePlanComponent, PLAN_OVERLAY_CSS, { plan, selectable: true });
		const drafts = document.querySelector<HTMLElement>('[data-plan-id="drafts"]')!;
		const approve = document.querySelector<HTMLElement>('[data-plan-id="approve"]')!;
		expect(drafts.getAttribute('tabindex')).toBe('0');
		expect(drafts.getAttribute('role')).toBe('button');
		expect(drafts.getAttribute('aria-label')).toBe('Drafts');

		// Focus shows the card, like hover.
		drafts.focus();
		expect(card()?.textContent).toContain('Drafts');
		expect(drafts.getAttribute('aria-describedby')).toBe('plan-ov-tip');

		// Enter pins it as a dialog and moves focus to its first button.
		key(drafts, 'Enter');
		expect(card()?.classList.contains('pinned')).toBe(true);
		expect(card()?.getAttribute('role')).toBe('dialog');
		expect(card()?.contains(document.activeElement)).toBe(true);

		// Escape closes it and returns focus to the part, without opening it again.
		key(document.activeElement!, 'Escape');
		expect(card()).toBeNull();
		expect(document.activeElement).toBe(drafts);

		// A pinned card closes when focus moves on, and the next part shows its own card.
		drafts.click();
		expect(document.querySelector('.plan-ov-tip.pinned')).not.toBeNull();
		approve.focus();
		expect(document.querySelector('.plan-ov-tip.pinned')).toBeNull();
		expect(card()?.textContent).toContain('Approve');
	});
});
