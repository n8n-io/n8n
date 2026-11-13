import { configure, fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentNewTestRunButton from '../components/AgentNewTestRunButton.vue';
import AgentNewTestRunModal from '../components/AgentNewTestRunModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

const global = { stubs: { AgentModal: AgentModalTestStub } };

describe('AgentNewTestRunButton', () => {
	const renderButton = createComponentRenderer(AgentNewTestRunButton, { global });

	it('asks for confirmation before it starts a new test run', async () => {
		const { getByTestId, queryByRole, getByRole, emitted } = renderButton();

		expect(queryByRole('dialog')).not.toBeInTheDocument();
		const button = getByTestId('agent-new-test-run-button');
		expect(button).toHaveTextContent('New test run');

		await fireEvent.click(button);
		const dialog = getByRole('dialog');
		expect(dialog).toHaveTextContent('Start a new test run?');
		expect(dialog).toHaveTextContent("Starts fresh, without this chat's changes.");
		expect(emitted('confirm')).toBeUndefined();

		await fireEvent.click(getByTestId('agent-new-test-run-confirm'));
		expect(emitted('confirm')).toHaveLength(1);
		expect(emitted('cancel')).toBeUndefined();
		expect(queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('closes an open confirmation when it becomes disabled, without resetting', async () => {
		const { getByTestId, queryByRole, getByRole, emitted, rerender } = renderButton();

		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		expect(getByRole('dialog')).toBeInTheDocument();

		await rerender({ disabled: true });
		expect(queryByRole('dialog')).not.toBeInTheDocument();
		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('confirm')).toBeUndefined();
	});

	it('emits cancel and keeps the chat when the user cancels', async () => {
		const { getByTestId, queryByRole, emitted } = renderButton();

		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		await fireEvent.click(getByTestId('agent-modal-cancel'));

		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('confirm')).toBeUndefined();
		expect(queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('treats closing the dialog as cancel', async () => {
		const { getByTestId, emitted } = renderButton();

		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		await fireEvent.click(getByTestId('dialog-close-button'));

		expect(emitted('cancel')).toHaveLength(1);
		expect(emitted('confirm')).toBeUndefined();
	});

	it('starts at once when there is nothing to reset', async () => {
		const { getByTestId, queryByRole, emitted } = renderButton({
			props: { requireConfirmation: false },
		});

		await fireEvent.click(getByTestId('agent-new-test-run-button'));

		expect(queryByRole('dialog')).not.toBeInTheDocument();
		expect(emitted('confirm')).toHaveLength(1);
	});

	it('does nothing while disabled', async () => {
		const { getByTestId, queryByRole, emitted } = renderButton({ props: { disabled: true } });

		const button = getByTestId('agent-new-test-run-button');
		expect(button).toBeDisabled();
		await fireEvent.click(button);

		expect(queryByRole('dialog')).not.toBeInTheDocument();
		expect(emitted('confirm')).toBeUndefined();
	});
});

describe('AgentNewTestRunModal', () => {
	const renderModal = createComponentRenderer(AgentNewTestRunModal, { global });

	it('blocks dismissal and repeat confirmation while busy', async () => {
		const { getByTestId, getByRole, emitted } = renderModal({
			props: { open: true, busy: true },
		});

		expect(getByRole('dialog')).toHaveAttribute('data-busy', 'true');
		expect(getByTestId('agent-modal-cancel')).toBeDisabled();
		await fireEvent.click(getByTestId('agent-new-test-run-confirm'));

		expect(emitted('confirm')).toBeUndefined();
	});

	it('emits update:open and cancel on dismissal', async () => {
		const { getByTestId, emitted } = renderModal({ props: { open: true } });

		await fireEvent.click(getByTestId('agent-modal-cancel'));

		expect(emitted('update:open')).toEqual([[false]]);
		expect(emitted('cancel')).toHaveLength(1);
	});
});
