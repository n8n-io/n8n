import { vi } from 'vitest';
import { screen, render, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia, PiniaVuePlugin } from 'pinia';
import { merge } from 'lodash-es';
import { setupServer } from '@/__tests__/server';
import { i18nInstance } from '@/plugins/i18n';
import { useSettingsStore, useSourceControlStore } from '@/stores';
import SettingsSourceControl from '@/views/SettingsSourceControl.vue';

let pinia: ReturnType<typeof createPinia>;
let server: ReturnType<typeof setupServer>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SettingsSourceControl,
		merge(
			{
				pinia,
				i18n: i18nInstance,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SettingsSourceControl', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		sourceControlStore = useSourceControlStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(false);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('source-control-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('source-control-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(true);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('source-control-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('source-control-content-unlicensed')).not.toBeInTheDocument();
		expect(queryByTestId('source-control-connected-content')).not.toBeInTheDocument();
	});

	it('should render user flow happy path', async () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(true);

		const updatePreferencesSpy = vi.spyOn(sourceControlStore, 'updatePreferences');

		const { container, getByTestId, queryByTestId, getByRole } = renderComponent();

		await waitFor(() => expect(sourceControlStore.preferences.publicKey).not.toEqual(''));

		const connectButton = getByTestId('source-control-connect-button');
		expect(connectButton).toBeDisabled();

		const repoUrlInput = container.querySelector('input[name="repoUrl"]')!;
		const authorName = container.querySelector('input[name="authorName"]')!;
		const authorEmail = container.querySelector('input[name="authorEmail"]')!;

		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, 'git@github');
		await userEvent.tab();
		expect(connectButton).toBeDisabled();

		await userEvent.click(repoUrlInput);
		await userEvent.type(repoUrlInput, '.com:john/n8n-data.git');
		await userEvent.tab();
		expect(connectButton).toBeDisabled();

		await userEvent.click(authorName);
		await userEvent.type(authorName, 'John Doe');
		await userEvent.tab();
		expect(connectButton).toBeDisabled();

		await userEvent.click(authorEmail);
		await userEvent.type(authorEmail, 'john@example.');
		await userEvent.tab();
		expect(connectButton).toBeDisabled();

		await userEvent.click(authorEmail);
		await userEvent.type(authorEmail, 'com');
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

		await waitFor(() => expect(within(branchSelect).getByText('main')).toBeVisible());
		await userEvent.click(within(branchSelect).getByText('main'));

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
