import { vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore, useSourceControlStore } from '@/stores';
import SettingsSourceControl from '@/views/SettingsSourceControl.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/constants';
import { nextTick } from 'vue';

let pinia: ReturnType<typeof createPinia>;
let server: ReturnType<typeof setupServer>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;

const renderComponent = createComponentRenderer(SettingsSourceControl);

describe('SettingsSourceControl', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		sourceControlStore = useSourceControlStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = false;
		await nextTick();

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
		});

		expect(queryByTestId('source-control-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('source-control-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		await nextTick();

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
		});

		expect(getByTestId('source-control-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('source-control-content-unlicensed')).not.toBeInTheDocument();
		expect(queryByTestId('source-control-connected-content')).not.toBeInTheDocument();
	});

	it('should render user flow happy path', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.SourceControl] = true;
		await nextTick();

		const updatePreferencesSpy = vi.spyOn(sourceControlStore, 'updatePreferences');

		const { html, container, getByTestId, getByText, queryByTestId, getByRole } = renderComponent({
			pinia,
			global: {
				stubs: ['teleport'],
			},
		});

		await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

		const connectButton = getByTestId('source-control-connect-button');
		expect(connectButton).toBeDisabled();

		const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;

		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, 'git@github');
		await userEvent.tab();
		expect(connectButton).toBeDisabled();

		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, '.com:john/n8n-data.git');
		await userEvent.tab();

		await waitFor(() => expect(connectButton).toBeEnabled());
		expect(queryByTestId('source-control-save-settings-button')).not.toBeInTheDocument();

		await userEvent.click(connectButton);
		await waitFor(() => expect(getByTestId('source-control-connected-content')).toBeVisible());

		const saveSettingsButton = getByTestId('source-control-save-settings-button');
		expect(saveSettingsButton).toBeInTheDocument();
		expect(saveSettingsButton).toBeDisabled();

		const branchSelect = getByTestId('source-control-branch-select');
		await userEvent.click(within(branchSelect).getByRole('textbox'));

		await waitFor(() => expect(getByText('main')).toBeVisible());
		await userEvent.click(getByText('main'));

		await waitFor(() => expect(saveSettingsButton).toBeEnabled());
		await userEvent.click(saveSettingsButton);

		expect(updatePreferencesSpy).toHaveBeenCalledWith({
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#1d6acb',
		});
		await waitFor(() => expect(screen.getByText('Settings successfully saved')).toBeVisible());

		await userEvent.click(getByTestId('source-control-disconnect-button'));
		const disconnectDialog = getByRole('dialog');
		await waitFor(() => expect(disconnectDialog).toBeVisible());

		await userEvent.click(within(disconnectDialog).getAllByRole('button')[1]);
		await waitFor(() => expect(disconnectDialog).not.toBeVisible());
		await waitFor(() =>
			expect(queryByTestId('source-control-connected-content')).not.toBeInTheDocument(),
		);
	}, 10000);
});
