import { formStepJsonSchema } from '../form-json';

describe('formStepJsonSchema', () => {
	it('accepts a Form node page and keeps the field shapes the renderer branches on', () => {
		const result = formStepJsonSchema.parse({
			kind: 'page',
			formTitle: 'Step 2',
			formDescription: 'Tell us more',
			buttonLabel: 'Next',
			formFields: [
				{
					id: 'field-0',
					label: 'Name',
					inputRequired: 'form-required',
					isInput: true,
					type: 'text',
					defaultValue: '',
				},
				{
					id: 'field-1',
					label: 'Color',
					isMultiSelect: true,
					multiSelectOptions: [{ id: 'o0', label: 'Red' }],
				},
				{ id: 'field-2', label: 'Note', isHtml: true, html: '<b>hi</b>' },
				{ id: 'field-3', label: 'src', isHidden: true, hiddenName: 'src', hiddenValue: 'app' },
			],
		});

		expect(result.kind).toBe('page');
		if (result.kind !== 'page') return;
		expect(result.formFields).toHaveLength(4);
		expect(result.formFields[1].multiSelectOptions).toEqual([{ id: 'o0', label: 'Red' }]);
		expect(result.formFields[3].hiddenValue).toBe('app');
	});

	it('accepts a completion and drops an unsafe redirect target', () => {
		const result = formStepJsonSchema.parse({
			kind: 'completion',
			title: 'Done',
			message: 'Thanks',
			redirectUrl: 'https://example.com/next',
		});
		expect(result).toMatchObject({
			kind: 'completion',
			title: 'Done',
			redirectUrl: 'https://example.com/next',
		});

		expect(
			formStepJsonSchema.safeParse({
				kind: 'completion',
				title: 'Done',
				message: '',
				redirectUrl: 'not a url',
			}).success,
		).toBe(false);
	});

	it('turns a non-scalar default value into an empty string instead of failing the page', () => {
		const result = formStepJsonSchema.parse({
			kind: 'page',
			formTitle: 'x',
			formFields: [{ id: 'field-0', label: 'a', defaultValue: { nested: true } }],
		});
		if (result.kind !== 'page') throw new Error('expected a page');
		expect(result.formFields[0].defaultValue).toBe('');
	});

	it('rejects an unknown kind and a field without an id', () => {
		expect(formStepJsonSchema.safeParse({ kind: 'other' }).success).toBe(false);
		expect(
			formStepJsonSchema.safeParse({ kind: 'page', formTitle: 'x', formFields: [{ label: 'a' }] })
				.success,
		).toBe(false);
	});
});
