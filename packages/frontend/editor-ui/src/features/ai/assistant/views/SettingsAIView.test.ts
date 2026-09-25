import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import SettingsAIView from './SettingsAIView.vue';

const { showMessage, showError } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

const renderComponent = createComponentRenderer(SettingsAIView);

const dataValuesCheckbox = { name: 'Send actual data values' };

describe('SettingsAIView', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isCloudDeployment = false;
	});

	it('disables the checkbox and hides the notice while data sharing is on', () => {
		settingsStore.isAiDataSharingEnabled = true;

		const { getByRole, queryByTestId } = renderComponent();

		const checkbox = getByRole('checkbox', dataValuesCheckbox);
		expect(checkbox).toBeChecked();
		expect(checkbox).toBeDisabled();
		expect(queryByTestId('ai-data-sharing-deprecation-notice')).not.toBeInTheDocument();
	});

	it('enables the checkbox and shows the notice with the env var sentence while data sharing is off', () => {
		settingsStore.isAiDataSharingEnabled = false;

		const { getByRole, getByTestId } = renderComponent();

		const checkbox = getByRole('checkbox', dataValuesCheckbox);
		expect(checkbox).not.toBeChecked();
		expect(checkbox).toBeEnabled();
		expect(getByTestId('ai-data-sharing-deprecation-notice')).toHaveTextContent(
			'N8N_AI_ALLOW_SENDING_PARAMETER_VALUES',
		);
	});

	it('omits the env var sentence on Cloud', () => {
		settingsStore.isAiDataSharingEnabled = false;
		settingsStore.isCloudDeployment = true;

		const { getByTestId } = renderComponent();

		const notice = getByTestId('ai-data-sharing-deprecation-notice');
		expect(notice).toBeInTheDocument();
		expect(notice).not.toHaveTextContent('N8N_AI_ALLOW_SENDING_PARAMETER_VALUES');
	});

	it('turns data sharing on and shows a success toast', async () => {
		settingsStore.isAiDataSharingEnabled = false;
		settingsStore.updateAiDataSharingSettings.mockResolvedValue(undefined);

		const { getByRole } = renderComponent();
		await userEvent.click(getByRole('checkbox', dataValuesCheckbox));

		expect(settingsStore.updateAiDataSharingSettings).toHaveBeenCalledWith(true);
		await waitFor(() =>
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })),
		);
		expect(showError).not.toHaveBeenCalled();
	});

	it('shows an error toast when the update fails', async () => {
		const error = new Error('Request failed');
		settingsStore.isAiDataSharingEnabled = false;
		settingsStore.updateAiDataSharingSettings.mockRejectedValue(error);

		const { getByRole } = renderComponent();
		await userEvent.click(getByRole('checkbox', dataValuesCheckbox));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(error, 'There was a problem updating AI settings'),
		);
		expect(showMessage).not.toHaveBeenCalled();
	});
});
