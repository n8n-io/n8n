import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentEvalCaseEditor from '../components/AgentEvalCaseEditor.vue';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const renderComponent = createComponentRenderer(AgentEvalCaseEditor, {
	props: { input: 'Plan a trip', whatToCheck: 'Asks for dates' },
});

describe('AgentEvalCaseEditor', () => {
	it('seeds both fields from its props', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('agent-evals-case-input')).toHaveValue('Plan a trip');
		expect(getByTestId('agent-evals-case-check')).toHaveValue('Asks for dates');
	});

	it('emits the edited values, trimmed', async () => {
		const { getByTestId, emitted } = renderComponent();

		const input = getByTestId('agent-evals-case-input');
		await userEvent.clear(input);
		await userEvent.type(input, '  Book a hotel  ');
		await userEvent.click(getByTestId('agent-evals-case-save'));

		expect(emitted('save')).toEqual([[{ input: 'Book a hotel', whatToCheck: 'Asks for dates' }]]);
	});

	it('cannot save a blank request', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.clear(getByTestId('agent-evals-case-input'));

		expect(getByTestId('agent-evals-case-save')).toBeDisabled();
	});

	it('treats a whitespace-only check as blank', async () => {
		const { getByTestId } = renderComponent();

		const check = getByTestId('agent-evals-case-check');
		await userEvent.clear(check);
		await userEvent.type(check, '   ');

		expect(getByTestId('agent-evals-case-save')).toBeDisabled();
	});

	it('requires only the request when the dataset maps no check column', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { whatToCheck: '', requestOnly: true },
		});

		expect(queryByTestId('agent-evals-case-check')).not.toBeInTheDocument();
		expect(getByTestId('agent-evals-case-save')).toBeEnabled();
	});

	it('emits cancel and never save when cancelled', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('agent-evals-case-cancel'));

		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('save')).toBeUndefined();
	});

	it('emits cancel on Escape', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.type(getByTestId('agent-evals-case-input'), '{Escape}');

		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('save')).toBeUndefined();
	});

	it('offers no removal for a draft that was never persisted', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId('agent-evals-case-remove')).not.toBeInTheDocument();
	});

	it('emits remove for a persisted case', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { removable: true } });

		await userEvent.click(getByTestId('agent-evals-case-remove'));

		expect(emitted('remove')).toHaveLength(1);
	});

	// Escape has to honour the same guard as the Cancel button, or the editor closes
	// over a write that is still in flight.
	it('ignores Escape while a save is pending', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { saving: true } });

		await userEvent.type(getByTestId('agent-evals-case-input'), '{Escape}');

		expect(emitted('cancel')).toBeUndefined();
	});

	it('ignores Escape while a removal is pending', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { removable: true, removing: true },
		});

		await userEvent.type(getByTestId('agent-evals-case-input'), '{Escape}');

		expect(emitted('cancel')).toBeUndefined();
	});

	it('locks the fields and both actions while saving', () => {
		const { getByTestId } = renderComponent({ props: { removable: true, saving: true } });

		expect(getByTestId('agent-evals-case-save')).toBeDisabled();
		expect(getByTestId('agent-evals-case-cancel')).toBeDisabled();
		expect(getByTestId('agent-evals-case-remove')).toBeDisabled();
	});
});
