import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { FormBlock } from '@n8n/api-types';

import { PageContextFactory } from '../../../runtime/page-context.factory';
import type { AppPageContext } from '../../../runtime/page-context.factory';
import type { BlockRenderContext } from '../../types';
import { formBlockRenderer } from '../form.renderer';

function ctx(query: Record<string, string> = {}): BlockRenderContext {
	return {
		app: { id: 'app-1', name: 'My App', namespace: 'my-app', projectId: 'project-1', theme: null },
		page: { id: 'page-1', route: 'contact', path: '/apps/my-app/contact' },
		actionPageId: 'page-1',
		menu: [],
		params: {},
		query,
		viewer: null,
		baseUrl: 'https://n8n.example.com',
		preview: false,
	};
}

function formBlock(): FormBlock {
	return {
		id: 'block-1',
		type: 'form',
		data: { workflowId: 'wf-1', successMessage: 'Thanks!' },
	};
}

describe('formBlockRenderer', () => {
	it('renders the successMessage instead of the form after a successful submit', async () => {
		const html = await formBlockRenderer.render(
			formBlock(),
			ctx({ _form: 'block-1', _status: 'ok' }),
		);
		expect(html).toContain('Thanks!');
		expect(html).not.toContain('<form');
	});

	it('renders one input per field with no hidden token, and treats hiddenField as a hidden input', async () => {
		const pageContext = mock<AppPageContext>({
			workflows: {
				getForm: async () => ({
					title: 'Contact us',
					fields: [
						{ fieldLabel: 'Email', fieldName: 'email', fieldType: 'email', requiredField: true },
						{
							fieldLabel: 'Source',
							fieldName: 'source',
							fieldType: 'hiddenField',
							defaultValue: 'landing',
						},
					],
				}),
			} as never,
			actionUrl: () => 'https://n8n.example.com/apps/my-app/_actions/page-1/block-1/submit',
		});
		Container.set(PageContextFactory, mock<PageContextFactory>({ build: () => pageContext }));

		const html = await formBlockRenderer.render(formBlock(), ctx());

		expect(html).toContain(
			"<form method='POST' action='https://n8n.example.com/apps/my-app/_actions/page-1/block-1/submit'",
		);
		expect(html).not.toContain("name='_token'");
		expect(html).toContain("type='email'");
		expect(html).toContain("type='hidden' name='source' value='landing'");
	});
});
