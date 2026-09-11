import { Container } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { FormBlock } from '@n8n/api-types';

import { FormStepClient, type FormStep } from '../../../runtime/form-steps';
import { PageContextFactory } from '../../../runtime/page-context.factory';
import type { AppPageContext } from '../../../runtime/page-context.factory';
import type { BlockRenderContext } from '../../types';
import { formBlockRenderer } from '../form.renderer';

const ACTION_URL = 'https://n8n.example.com/apps/my-app/_actions/page-1/block-1/submit';

function ctx(query: Record<string, string> = {}): BlockRenderContext {
	return {
		app: {
			id: 'app-1',
			name: 'My App',
			namespace: 'my-app',
			projectId: 'project-1',
			theme: null,
			components: null,
		},
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

const stepQuery = { _form: 'block-1', _exec: 'exec-1', _sig: 'tok-1' };

function usePageContext(getForm: AppPageContext['workflows']['getForm'] = vi.fn()) {
	const pageContext = mock<AppPageContext>({
		workflows: { getForm } as never,
		actionUrl: () => ACTION_URL,
	});
	Container.set(PageContextFactory, mock<PageContextFactory>({ build: () => pageContext }));
}

function useStep(step: FormStep | Error) {
	const fetchPage = vi.fn(async () => {
		if (step instanceof Error) throw step;
		return step;
	});
	Container.set(FormStepClient, mock<FormStepClient>({ fetchPage }));
	return fetchPage;
}

describe('formBlockRenderer', () => {
	beforeEach(() => {
		usePageContext();
	});

	it('renders the successMessage instead of the form after a successful submit', async () => {
		const html = await formBlockRenderer.render(
			formBlock(),
			ctx({ _form: 'block-1', _status: 'ok' }),
		);
		expect(html).toContain('Thanks!');
		expect(html).not.toContain('<form');
	});

	it('renders one input per field with no hidden token, and treats hiddenField as a hidden input', async () => {
		usePageContext(async () => ({
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
		}));

		const html = await formBlockRenderer.render(formBlock(), ctx());

		expect(html).toContain(`<form method='POST' action='${ACTION_URL}'`);
		expect(html).not.toContain("name='_token'");
		expect(html).not.toContain("name='_exec'");
		expect(html).toContain("type='email'");
		expect(html).toContain("type='hidden' name='source' value='landing'");
	});

	describe('step pages of a waiting run', () => {
		it('renders the Form node page with its own field names and the step reference', async () => {
			const fetchPage = useStep({
				kind: 'page',
				formTitle: 'Step 2',
				formDescription: 'More <b>details</b><script>x()</script>',
				buttonLabel: 'Next',
				formFields: [
					{
						id: 'field-0',
						label: 'Name <img src=x onerror=alert(1)>',
						inputRequired: 'form-required',
						isInput: true,
						type: 'text',
					},
					{
						id: 'field-1',
						label: 'Colors',
						inputRequired: '',
						isMultiSelect: true,
						multiSelectOptions: [
							{ id: 'o0', label: 'Red' },
							{ id: 'o1', label: 'Blue' },
						],
					},
					{
						id: 'field-2',
						label: 'Pick one',
						inputRequired: '',
						isMultiSelect: true,
						radioSelect: 'radio',
						multiSelectOptions: [{ id: 'o0', label: 'Yes' }],
					},
					{
						id: 'field-3',
						label: 'Note',
						inputRequired: '',
						isHtml: true,
						html: '<p>Read <b>this</b></p><script>alert(1)</script>',
					},
					{
						id: 'field-4',
						label: 'src',
						inputRequired: '',
						isHidden: true,
						hiddenName: 'src',
						hiddenValue: 'app',
					},
					{ id: 'field-5', label: 'Upload', inputRequired: '', isFileInput: true },
				],
			});

			const html = await formBlockRenderer.render(formBlock(), ctx(stepQuery));

			expect(fetchPage).toHaveBeenCalledWith('exec-1', 'tok-1');
			expect(html).toContain('Step 2');
			expect(html).toContain('More <b>details</b>');
			expect(html).not.toContain('<script');
			expect(html).toContain("name='_exec' value='exec-1'");
			expect(html).toContain("name='_sig' value='tok-1'");
			expect(html).toContain("id='field-0' type='text' name='field-0'");
			expect(html).toContain('required');
			expect(html).toContain('Name &lt;img src&#x3D;x onerror&#x3D;alert(1)&gt;');
			expect(html).not.toContain('<img');
			expect(html).toContain("type='checkbox' name='field-1[]' value='Red'");
			expect(html).toContain("type='checkbox' name='field-1[]' value='Blue'");
			expect(html).toContain("type='radio' name='field-2[]' value='Yes'");
			expect(html).toContain('<p>Read <b>this</b></p>');
			expect(html).toContain("type='hidden' name='field-4' value='app'");
			expect(html).toContain("type='file' disabled");
			expect(html).toContain('>Next</button>');
		});

		it('renders the completion page with the redirect as a link, never as a navigation', async () => {
			useStep({
				kind: 'completion',
				title: 'All done',
				message: 'See <b>you</b><script>alert(1)</script>',
				redirectUrl: 'https://example.com/next',
			});

			const html = await formBlockRenderer.render(formBlock(), ctx(stepQuery));

			expect(html).toContain('All done');
			expect(html).toContain('See <b>you</b>');
			expect(html).not.toContain('<script');
			expect(html).toContain("href='https://example.com/next'");
			expect(html).not.toContain('<form');
			expect(html).not.toContain('location');
		});

		it('renders a processing notice with a refresh link while the run is between pages', async () => {
			useStep({ kind: 'running' });

			const html = await formBlockRenderer.render(formBlock(), ctx(stepQuery));

			expect(html).toContain('Processing');
			expect(html).toContain(
				"href='/apps/my-app/contact?_form&#x3D;block-1&amp;_exec&#x3D;exec-1&amp;_sig&#x3D;tok-1'",
			);
			expect(html).not.toContain('<form');
		});

		it('renders the successMessage when the run finished without a completion page', async () => {
			useStep({ kind: 'finished' });

			const html = await formBlockRenderer.render(formBlock(), ctx(stepQuery));

			expect(html).toContain('Thanks!');
			expect(html).not.toContain('<form');
		});

		it('shows a notice with a start-over link when the step cannot be loaded', async () => {
			useStep(new UserError('This form link is not valid'));
			const html = await formBlockRenderer.render(formBlock(), ctx(stepQuery));
			expect(html).toContain('This form link is not valid');
			expect(html).toContain("href='/apps/my-app/contact'");

			useStep(new OperationalError('The form workflow failed'));
			expect(await formBlockRenderer.render(formBlock(), ctx(stepQuery))).toContain(
				'The form workflow failed',
			);
		});

		it('lets an unexpected failure propagate to the page renderer', async () => {
			useStep(new Error('boom'));
			await expect(formBlockRenderer.render(formBlock(), ctx(stepQuery))).rejects.toThrow('boom');
		});
	});
});
