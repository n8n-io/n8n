import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import AgentNewTestRunButton from '../components/AgentNewTestRunButton.vue';
import AgentNewTestRunModal from '../components/AgentNewTestRunModal.vue';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

const global = { stubs: { AgentModal: AgentModalTestStub } };

type ResetMode = 'async' | 'sync' | 'early-return';

/**
 * Owns `busy` like a real caller. `async` keeps it set until `finish` is clicked, `sync`
 * sets and clears it in the same tick, and `early-return` never touches it.
 */
const ResetHost = defineComponent({
	props: {
		mode: { type: String as () => ResetMode, required: true },
		requireConfirmation: { type: Boolean, default: true },
	},
	emits: ['confirm'],
	setup(props, { emit }) {
		const busy = ref(false);
		function onConfirm() {
			emit('confirm');
			if (props.mode === 'early-return') return;
			busy.value = true;
			if (props.mode === 'sync') busy.value = false;
		}
		return () =>
			h('div', [
				h(AgentNewTestRunButton, {
					busy: busy.value,
					requireConfirmation: props.requireConfirmation,
					onConfirm,
				}),
				h('button', { 'data-testid': 'finish', onClick: () => (busy.value = false) }),
			]);
	},
});

describe('AgentNewTestRunButton', () => {
	const renderButton = createComponentRenderer(AgentNewTestRunButton, {
		global,
		props: { busy: false },
	});

	const renderHost = createComponentRenderer(ResetHost, { global });

	it('asks for confirmation before it starts a new test run', async () => {
		const { getByTestId, queryByRole, getByRole, emitted } = renderHost({
			props: { mode: 'async' },
		});

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
		expect(getByRole('dialog')).toHaveAttribute('data-busy', 'true');
		await fireEvent.click(getByTestId('agent-new-test-run-confirm'));
		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		expect(emitted('confirm')).toHaveLength(1);

		expect(getByRole('dialog')).toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-modal-cancel'));
		expect(getByRole('dialog')).toBeInTheDocument();
		await fireEvent.click(getByTestId('finish'));
		expect(queryByRole('dialog')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		await fireEvent.click(getByTestId('agent-new-test-run-confirm'));
		expect(emitted('confirm')).toHaveLength(2);
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
		const { getByTestId, queryByRole, emitted } = renderHost({
			props: { mode: 'async', requireConfirmation: false },
		});

		await fireEvent.click(getByTestId('agent-new-test-run-button'));

		expect(queryByRole('dialog')).not.toBeInTheDocument();
		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		expect(emitted('confirm')).toHaveLength(1);
		await fireEvent.click(getByTestId('finish'));
		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		expect(emitted('confirm')).toHaveLength(2);
	});

	it.each([true, false])(
		'does not stay stuck when the caller resets in the same tick (confirmation: %s)',
		async (requireConfirmation) => {
			const { getByTestId, queryByRole, emitted } = renderHost({
				props: { mode: 'sync', requireConfirmation },
			});

			await fireEvent.click(getByTestId('agent-new-test-run-button'));
			if (requireConfirmation) {
				await fireEvent.click(getByTestId('agent-new-test-run-confirm'));
			}
			expect(emitted('confirm')).toHaveLength(1);
			await waitFor(() => expect(getByTestId('agent-new-test-run-button')).toBeEnabled());
			expect(queryByRole('dialog')).not.toBeInTheDocument();
		},
	);

	it('does not stay stuck when the caller returns without setting busy', async () => {
		const { getByTestId, queryByRole, emitted } = renderHost({
			props: { mode: 'early-return' },
		});

		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		await fireEvent.click(getByTestId('agent-new-test-run-confirm'));
		expect(emitted('confirm')).toHaveLength(1);
		const button = getByTestId('agent-new-test-run-button');
		await waitFor(() => expect(button).toBeEnabled());
		expect(queryByRole('dialog')).not.toBeInTheDocument();
		await fireEvent.click(button);
		await fireEvent.click(getByTestId('agent-new-test-run-confirm'));
		expect(emitted('confirm')).toHaveLength(2);
	});

	it('does nothing when the caller already has a reset in progress', async () => {
		const { getByTestId, queryByRole, emitted } = renderButton({ props: { busy: true } });
		expect(getByTestId('agent-new-test-run-button')).toBeDisabled();
		await fireEvent.click(getByTestId('agent-new-test-run-button'));
		expect(queryByRole('dialog')).not.toBeInTheDocument();
		expect(emitted('confirm')).toBeUndefined();
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
