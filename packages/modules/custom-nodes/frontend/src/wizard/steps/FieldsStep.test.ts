import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import { createInput } from '../draftMapping';
import type { EditableInput, WizardIssue } from '../wizard.types';
import FieldsStep from './FieldsStep.vue';

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const { N8nSelect2Stub } = await import('../../__tests__/designSystemStubs');
	return { ...actual, N8nSelect2: N8nSelect2Stub };
});

const renderStep = createComponentRenderer(FieldsStep);

const setup = (inputs: EditableInput[], issues: WizardIssue[] = []) =>
	renderStep({ props: { inputs, issues } });

const lastInputs = (emitted: Record<string, unknown[]>): EditableInput[] => {
	const events = emitted['update:inputs'];
	const [inputs] = events[events.length - 1] as [EditableInput[]];
	return inputs;
};

describe('FieldsStep', () => {
	it('shows a text when there are no fields and adds one', async () => {
		const { getByTestId, emitted } = setup([]);

		expect(getByTestId('custom-action-wizard-fields-empty')).toBeInTheDocument();
		await userEvent.click(getByTestId('custom-action-wizard-field-add'));

		expect(lastInputs(emitted())).toEqual([expect.objectContaining({ target: 'body', name: '' })]);
	});

	it('emits a changed field', async () => {
		const input = createInput({ name: 'title', displayName: 'Title', key: 'title' });
		const { getByTestId, emitted } = setup([input]);

		await userEvent.type(getByTestId('custom-action-wizard-field-display-name'), 's');
		expect(lastInputs(emitted())[0]).toEqual(expect.objectContaining({ displayName: 'Titles' }));

		await userEvent.selectOptions(getByTestId('custom-action-wizard-field-type'), 'options');
		expect(lastInputs(emitted())[0]).toEqual(expect.objectContaining({ type: 'options' }));

		await userEvent.selectOptions(getByTestId('custom-action-wizard-field-target'), 'query');
		expect(lastInputs(emitted())[0]).toEqual(expect.objectContaining({ target: 'query' }));

		await userEvent.click(getByTestId('custom-action-wizard-field-required'));
		expect(lastInputs(emitted())[0]).toEqual(expect.objectContaining({ required: true }));
	});

	it('removes a field', async () => {
		const first = createInput({ name: 'a', key: 'a' });
		const second = createInput({ name: 'b', key: 'b' });
		const { getAllByTestId, emitted } = setup([first, second]);

		await userEvent.click(getAllByTestId('custom-action-wizard-field-remove')[0]);

		expect(lastInputs(emitted())).toEqual([second]);
	});

	it('keeps the name, key and target of a URL field fixed', () => {
		const { getByTestId } = setup([
			createInput({ name: 'id', key: 'id', target: 'url', required: true }),
		]);

		expect(getByTestId('custom-action-wizard-field-name')).toBeDisabled();
		expect(getByTestId('custom-action-wizard-field-key')).toBeDisabled();
		expect(getByTestId('custom-action-wizard-field-target')).toBeDisabled();
		expect(getByTestId('custom-action-wizard-field')).toHaveTextContent(
			'This field comes from the URL.',
		);
	});

	it('shows the issues of each field at the field', () => {
		const { getAllByTestId } = setup(
			[createInput({ name: 'a', key: 'a' }), createInput({ name: 'resource', key: 'b' })],
			[{ path: 'inputs[1].name', code: 'reserved_input_name', message: 'Reserved name' }],
		);

		const fields = getAllByTestId('custom-action-wizard-field');
		expect(fields[0]).not.toHaveTextContent('Reserved name');
		expect(fields[1]).toHaveTextContent('Reserved name');
	});

	it('shows a boolean default as a choice', async () => {
		const { getByTestId, emitted } = setup([
			createInput({ name: 'flag', key: 'flag', type: 'boolean' }),
		]);

		await userEvent.selectOptions(
			getByTestId('custom-action-wizard-field-default-boolean'),
			'true',
		);

		expect(lastInputs(emitted())[0]).toEqual(expect.objectContaining({ defaultText: 'true' }));
	});
});
