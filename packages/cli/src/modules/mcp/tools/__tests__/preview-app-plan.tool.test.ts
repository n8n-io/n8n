import { createPreviewAppPlanTool } from '../preview-app-plan.tool';

describe('preview_app_plan', () => {
	it('returns the wireframe document of the plan', async () => {
		const tool = createPreviewAppPlanTool();
		const result = await tool.handler(
			{
				name: 'Desk',
				theme: 'light',
				plan: {
					nav: { id: 'nav', kind: 'nav', label: 'Desk' },
					screens: [
						{
							id: 'home',
							name: 'Home',
							components: [{ id: 'drafts', kind: 'table', label: 'Drafts' }],
						},
					],
				},
			},
			// The handler does not use the request context.
			{} as never,
		);

		expect(result.structuredContent).toMatchObject({ componentCount: 2 });
		const { html } = result.structuredContent as { html: string };
		expect(html).toContain('data-plan-id="drafts"');
		expect(html).toContain('wf-theme-light');
	});
});
