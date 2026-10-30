import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ApprovalModeSelector from '../ApprovalModeSelector.vue';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const renderComponent = createComponentRenderer(ApprovalModeSelector);

function setup(state: { approvalMode: 'manual' | 'auto'; approvalModesAvailable: boolean }) {
	const pinia = createTestingPinia();
	const store = mockedStore(useInstanceAiSettingsStore);
	store.approvalMode = state.approvalMode;
	store.approvalModesAvailable = state.approvalModesAvailable;
	store.setApprovalMode.mockResolvedValue(true);
	return { pinia, store };
}

describe('ApprovalModeSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders nothing while approval modes are not available', () => {
		const { pinia } = setup({ approvalMode: 'manual', approvalModesAvailable: false });

		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('instance-ai-approval-mode-selector')).not.toBeInTheDocument();
	});

	it('asks for the preferences again when it mounts after a failed load', () => {
		const { pinia, store } = setup({ approvalMode: 'manual', approvalModesAvailable: false });

		renderComponent({ pinia });

		expect(store.fetchPreferencesAfterFailure).toHaveBeenCalledTimes(1);
	});

	it('shows the current mode on a button that names the setting', () => {
		const { pinia } = setup({ approvalMode: 'auto', approvalModesAvailable: true });

		const { getByRole } = renderComponent({ pinia });

		expect(getByRole('button', { name: 'Approval mode: Auto' })).toHaveTextContent('Auto');
	});

	it('marks the current mode in the menu', async () => {
		const { pinia } = setup({ approvalMode: 'manual', approvalModesAvailable: true });
		const { getByRole } = renderComponent({ pinia });

		await userEvent.click(getByRole('button', { name: /Approval mode/ }));

		expect(getByRole('menuitemcheckbox', { name: /Manual/ })).toHaveAttribute(
			'aria-checked',
			'true',
		);
		expect(getByRole('menuitemcheckbox', { name: /Auto/ })).toHaveAttribute(
			'aria-checked',
			'false',
		);
	});

	it('saves a new mode and tracks the change', async () => {
		const { pinia, store } = setup({ approvalMode: 'manual', approvalModesAvailable: true });
		const { getByRole } = renderComponent({ pinia, props: { threadId: 'thread-1' } });

		await userEvent.click(getByRole('button', { name: /Approval mode/ }));
		await userEvent.click(getByRole('menuitemcheckbox', { name: /Auto/ }));

		await waitFor(() => expect(store.setApprovalMode).toHaveBeenCalledWith('auto'));
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_MODE_CHANGED, {
			mode: 'auto',
			previous_mode: 'manual',
			thread_id: 'thread-1',
		});
	});

	it('picks a mode with the keyboard', async () => {
		const { pinia, store } = setup({ approvalMode: 'manual', approvalModesAvailable: true });
		const { getByRole } = renderComponent({ pinia });

		getByRole('button', { name: /Approval mode/ }).focus();
		await userEvent.keyboard('{Enter}');
		await waitFor(() => expect(getByRole('menuitemcheckbox', { name: /Manual/ })).toBeVisible());
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Enter}');

		await waitFor(() => expect(store.setApprovalMode).toHaveBeenCalledWith('auto'));
	});

	it('does not track a change that failed to save', async () => {
		const { pinia, store } = setup({ approvalMode: 'manual', approvalModesAvailable: true });
		store.setApprovalMode.mockResolvedValue(false);
		const { getByRole } = renderComponent({ pinia });

		await userEvent.click(getByRole('button', { name: /Approval mode/ }));
		await userEvent.click(getByRole('menuitemcheckbox', { name: /Auto/ }));

		await waitFor(() => expect(store.setApprovalMode).toHaveBeenCalledWith('auto'));
		expect(track).not.toHaveBeenCalled();
	});
});
