import {
	PLAN_OVERLAY_CSS,
	appPlanSchema,
	describePlanComponent,
	planOverlayMain,
	renderWireframeBody,
} from '@n8n/api-types';

// Its own file: each overlay keeps its listeners on the document.
describe('plan overlay page links in a routed app', () => {
	it('opens the page with the app router once the wireframe sections are gone', () => {
		const pages = appPlanSchema.parse({
			screens: [
				{
					id: 'list',
					name: 'List',
					components: [{ id: 'rows', kind: 'table', label: 'Rows', opens: 'record' }],
				},
				{
					id: 'record',
					name: 'Record',
					path: '/rows/:id',
					components: [{ id: 'body', kind: 'detail', label: 'Record' }],
				},
			],
		});
		document.body.innerHTML = renderWireframeBody(pages);
		// The shell step moved each page into a route component: no sections, the router shows the list.
		document
			.querySelectorAll('[data-plan-screen]')
			.forEach((section) => section.replaceWith(...section.children));
		document.querySelector('[data-plan-id="body"]')!.remove();
		const navigated = vi.fn();
		window.addEventListener('popstate', navigated);
		planOverlayMain(describePlanComponent, PLAN_OVERLAY_CSS, { plan: pages });

		document.querySelector<HTMLElement>('[data-plan-id="rows"]')!.click();
		document.querySelector<HTMLElement>('.plan-ov-go')!.click();

		expect(window.location.pathname).toBe('/rows/sample');
		expect(navigated).toHaveBeenCalled();
		window.removeEventListener('popstate', navigated);
		window.history.pushState({}, '', '/');
	});
});
