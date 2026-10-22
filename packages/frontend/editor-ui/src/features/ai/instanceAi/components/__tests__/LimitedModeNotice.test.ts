import { beforeEach, describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import LimitedModeNotice from '../LimitedModeNotice.vue';

const renderComponent = createComponentRenderer(LimitedModeNotice, {
	global: {
		stubs: { RouterLink: { template: '<a><slot /></a>' } },
	},
});

describe('LimitedModeNotice', () => {
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let instanceAiSettingsStore: MockedStore<typeof useInstanceAiSettingsStore>;

	beforeEach(() => {
		createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		instanceAiSettingsStore = mockedStore(useInstanceAiSettingsStore);
		mockedStore(useUsersStore).currentUserId = 'user-1';
		localStorage.clear();
	});

	it('is hidden while data sharing is on', () => {
		settingsStore.isAiDataSharingEnabled = true;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-limited-mode-notice')).not.toBeInTheDocument();
	});

	it('shows a settings link to users who can manage AI usage', () => {
		settingsStore.isAiDataSharingEnabled = false;
		instanceAiSettingsStore.canManageAiUsage = true;

		const { getByTestId, queryByText } = renderComponent();

		expect(getByTestId('instance-ai-limited-mode-notice')).toBeInTheDocument();
		expect(getByTestId('instance-ai-limited-mode-settings-link')).toBeInTheDocument();
		expect(queryByText('Ask an instance owner or admin to turn it on.')).not.toBeInTheDocument();
	});

	it('asks other users to contact an admin', () => {
		settingsStore.isAiDataSharingEnabled = false;
		instanceAiSettingsStore.canManageAiUsage = false;

		const { getByTestId, getByText, queryByTestId } = renderComponent();

		expect(getByTestId('instance-ai-limited-mode-notice')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-limited-mode-settings-link')).not.toBeInTheDocument();
		expect(getByText('Ask an instance owner or admin to turn it on.')).toBeInTheDocument();
	});

	it('hides the notice after the user dismisses it', async () => {
		settingsStore.isAiDataSharingEnabled = false;

		const { getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-limited-mode-dismiss'));

		expect(queryByTestId('instance-ai-limited-mode-notice')).not.toBeInTheDocument();
		expect(localStorage.getItem('N8N_INSTANCE_AI_LIMITED_MODE_DISMISSED:user-1')).toBe('true');
	});

	it('stays hidden on the next render after a dismissal', () => {
		settingsStore.isAiDataSharingEnabled = false;
		localStorage.setItem('N8N_INSTANCE_AI_LIMITED_MODE_DISMISSED:user-1', 'true');

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-limited-mode-notice')).not.toBeInTheDocument();
	});
});
