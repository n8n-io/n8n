import { beforeEach, describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ModelTrainingNotice from '../ModelTrainingNotice.vue';

const renderComponent = createComponentRenderer(ModelTrainingNotice, {
	global: {
		stubs: { RouterLink: { template: '<a><slot /></a>' } },
	},
});

describe('ModelTrainingNotice', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let instanceAiSettingsStore: MockedStore<typeof useInstanceAiSettingsStore>;

	beforeEach(() => {
		createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		instanceAiSettingsStore = mockedStore(useInstanceAiSettingsStore);
		mockedStore(useUsersStore).currentUserId = 'user-1';
		settingsStore.settings.ai = { allowSendingParameterValues: true, allowModelTraining: true };
		instanceAiSettingsStore.isModelTrainingOptOutAvailable = true;
		instanceAiSettingsStore.canManageAiUsage = true;
		localStorage.clear();
	});

	it('shows the notice with a settings link', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-model-training-notice')).toHaveTextContent(
			"Anonymized patterns from chats help train n8n's LLMs. Opt out any time in settings.",
		);
		expect(getByTestId('instance-ai-model-training-notice-settings-link')).toBeInTheDocument();
	});

	it('is hidden from users who cannot change the setting', () => {
		instanceAiSettingsStore.canManageAiUsage = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-model-training-notice')).toBeNull();
	});

	it('is hidden while the opt-out is unavailable', () => {
		instanceAiSettingsStore.isModelTrainingOptOutAvailable = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-model-training-notice')).toBeNull();
	});

	it('is hidden once the instance opted out', () => {
		settingsStore.settings.ai.allowModelTraining = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-model-training-notice')).toBeNull();
	});

	it('stays hidden after the user dismisses it', async () => {
		const { getByTestId, queryByTestId, unmount } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-model-training-notice-dismiss'));
		expect(queryByTestId('instance-ai-model-training-notice')).toBeNull();

		unmount();
		expect(renderComponent().queryByTestId('instance-ai-model-training-notice')).toBeNull();
	});
});
