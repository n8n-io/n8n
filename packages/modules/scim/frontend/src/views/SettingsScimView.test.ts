import type { ScimConfigResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';

import SettingsScimView from './SettingsScimView.vue';
import { useScimStore } from '../scim.store';

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const telemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@n8n/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

const routerPush = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: () => ({ push: routerPush }),
	};
});

type ApiMock = (...args: unknown[]) => Promise<unknown>;

const getScimConfigMock = vi.fn<ApiMock>();
const updateScimConfigMock = vi.fn<ApiMock>();
const generateScimTokenMock = vi.fn<ApiMock>();
const revokeScimTokenMock = vi.fn<ApiMock>();
const fetchScimTransferTargetsMock = vi.fn<ApiMock>();

vi.mock('../scim.api', () => ({
	getScimConfig: async (...args: unknown[]) => await getScimConfigMock(...args),
	updateScimConfig: async (...args: unknown[]) => await updateScimConfigMock(...args),
	generateScimToken: async (...args: unknown[]) => await generateScimTokenMock(...args),
	revokeScimToken: async (...args: unknown[]) => await revokeScimTokenMock(...args),
	fetchScimTransferTargets: async (...args: unknown[]) =>
		await fetchScimTransferTargetsMock(...args),
}));

const makeConfig = (overrides: Partial<ScimConfigResponse> = {}): ScimConfigResponse => ({
	enabled: false,
	hasToken: false,
	tokenHint: null,
	baseUrl: 'https://n8n.example.com/scim/v2',
	token: null,
	lastAuthFailure: null,
	status: 'waiting',
	provisionedCount: 0,
	deactivatedCount: 0,
	onDelete: 'disable',
	dataAction: 'transfer',
	transferTarget: null,
	...overrides,
});

const enabledConfig = (overrides: Partial<ScimConfigResponse> = {}) =>
	makeConfig({
		enabled: true,
		hasToken: true,
		tokenHint: '3f2a',
		token: {
			createdAt: '2026-06-12T10:00:00.000Z',
			createdBy: { id: 'u1', firstName: 'Jan', lastName: 'Kowalski' },
			lastUsedAt: null,
		},
		...overrides,
	});

const renderView = (options: { sso?: boolean } = {}) => {
	const pinia = createTestingPinia({ stubActions: false });
	const settingsStore = useSettingsStore(pinia);
	settingsStore.settings.sso = {
		managedByEnv: false,
		saml: { loginLabel: '', loginEnabled: options.sso ?? true },
		oidc: { loginEnabled: false, loginUrl: '', callbackUrl: '' },
		ldap: { loginLabel: '', loginEnabled: false },
	};
	settingsStore.settings.activeModules = ['scim'];
	settingsStore.moduleSettings = {
		scim: { scimEnabled: false, hasToken: false, available: true, optInSource: 'config' },
	};
	const getSettings = vi.spyOn(settingsStore, 'getSettings').mockResolvedValue(undefined);
	const scimStore = useScimStore(pinia);
	return {
		pinia,
		settingsStore,
		scimStore,
		getSettings,
		...createComponentRenderer(SettingsScimView, { pinia })(),
	};
};

describe('SettingsScimView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// `clearAllMocks` keeps queued `mockResolvedValueOnce` values; a reset drops them.
		for (const mock of [
			getScimConfigMock,
			updateScimConfigMock,
			generateScimTokenMock,
			revokeScimTokenMock,
			fetchScimTransferTargetsMock,
		]) {
			mock.mockReset();
		}
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
			configurable: true,
		});
		fetchScimTransferTargetsMock.mockResolvedValue({
			people: { total: 0, count: 0, items: [] },
			projects: { total: 0, count: 0, items: [] },
		});
	});

	describe('needs-SSO state', () => {
		it('shows the needs-SSO state without an enable action and sends the admin to the SSO settings', async () => {
			getScimConfigMock.mockResolvedValue(makeConfig());
			const { getSettings, findByTestId, queryByTestId } = renderView({ sso: false });

			const emptyState = await findByTestId('scim-needs-sso');
			expect(getSettings).toHaveBeenCalledTimes(1);
			expect(queryByTestId('scim-off')).not.toBeInTheDocument();
			expect(within(emptyState).queryByText('Enable SCIM provisioning')).not.toBeInTheDocument();

			await userEvent.click(within(emptyState).getByText('Set up single sign-on'));

			expect(routerPush).toHaveBeenCalledWith({ name: 'SSoSettings' });
			expect(telemetryTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.SCIM.SCIM_SET_UP_SSO_CLICKED, {});
			expect(telemetryTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.SCIM.SCIM_SETTINGS_VIEWED, {
				opt_in_source: 'config',
				status: 'needs_sso',
				error_cause: undefined,
			});
		});
	});

	describe('off state', () => {
		it('enables SCIM and generates a token when none is kept', async () => {
			getScimConfigMock.mockResolvedValueOnce(makeConfig()).mockResolvedValueOnce(enabledConfig());
			updateScimConfigMock.mockResolvedValue({ enabled: true });
			generateScimTokenMock.mockResolvedValue({ token: 'fresh-token', baseUrl: '' });
			const { findByTestId } = renderView();

			const emptyState = await findByTestId('scim-off');
			await userEvent.click(within(emptyState).getByText('Enable SCIM provisioning'));

			await findByTestId('scim-connection-section');
			expect(updateScimConfigMock).toHaveBeenCalledTimes(1);
			expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), { enabled: true });
			expect(generateScimTokenMock).toHaveBeenCalledTimes(1);
			expect(showMessage).not.toHaveBeenCalled();
			expect(screen.getByTestId('scim-token-copy-now')).toBeInTheDocument();
		});

		it('reuses a kept token when enabling', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(makeConfig({ hasToken: true, tokenHint: '3f2a' }))
				.mockResolvedValueOnce(enabledConfig());
			updateScimConfigMock.mockResolvedValue({ enabled: true });
			const { findByTestId } = renderView();

			await userEvent.click(
				within(await findByTestId('scim-off')).getByText('Enable SCIM provisioning'),
			);

			await findByTestId('scim-connection-section');
			expect(generateScimTokenMock).not.toHaveBeenCalled();
		});

		it('keeps the off state and shows an error toast when enabling fails', async () => {
			getScimConfigMock.mockResolvedValue(makeConfig());
			updateScimConfigMock.mockRejectedValue(new Error('SSO is off'));
			const { findByTestId, queryByTestId } = renderView();

			await userEvent.click(
				within(await findByTestId('scim-off')).getByText('Enable SCIM provisioning'),
			);

			await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
			expect(queryByTestId('scim-off')).toBeInTheDocument();
			expect(queryByTestId('scim-connection-section')).not.toBeInTheDocument();
		});
	});

	describe('enabled state', () => {
		it('shows the waiting state with a warning dot and polls until the status changes', async () => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			getScimConfigMock
				.mockResolvedValueOnce(enabledConfig({ status: 'waiting' }))
				.mockResolvedValueOnce(
					enabledConfig({
						status: 'connected',
						provisionedCount: 42,
						token: {
							createdAt: '2026-06-12T10:00:00.000Z',
							createdBy: null,
							lastUsedAt: new Date().toISOString(),
						},
					}),
				);
			const { findByTestId, scimStore } = renderView();

			await findByTestId('scim-callout-waiting');
			expect(screen.getByTestId('scim-status-row')).toHaveTextContent('No requests yet');
			expect(getScimConfigMock).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5_000);

			await findByTestId('scim-callout-connected');
			expect(scimStore.connectedCallout).toBe(true);
			expect(screen.getByTestId('scim-status-row')).toHaveTextContent('42 people provisioned');

			const callsAfterConnect = getScimConfigMock.mock.calls.length;
			await vi.advanceTimersByTimeAsync(10_000);
			expect(getScimConfigMock).toHaveBeenCalledTimes(callsAfterConnect);

			await userEvent.click(screen.getByTestId('scim-callout-dismiss'));
			expect(screen.queryByTestId('scim-callout-connected')).not.toBeInTheDocument();
			vi.useRealTimers();
		});

		it('shows the error state with the cause and the rotate and docs actions', async () => {
			getScimConfigMock.mockResolvedValue(
				enabledConfig({
					status: 'error',
					lastAuthFailure: { at: new Date().toISOString(), reason: 'superseded_token' },
				}),
			);
			const { findByTestId } = renderView();

			const callout = await findByTestId('scim-callout-error');
			expect(callout).toHaveTextContent('Requests still use the token rotated on Jun 12, 2026');
			expect(screen.getByTestId('scim-status-row')).toHaveTextContent('Rejecting requests');
			expect(telemetryTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.SCIM.SCIM_SETTINGS_VIEWED, {
				opt_in_source: 'config',
				status: 'error',
				error_cause: 'superseded_token',
			});

			await userEvent.click(screen.getByTestId('scim-callout-docs'));
			expect(telemetryTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.SCIM.SCIM_HELP_LINK_CLICKED, {
				link: 'docs',
				status: 'error',
				source: 'scim_page',
			});

			await userEvent.click(screen.getByTestId('scim-callout-rotate'));
			expect(await screen.findByRole('dialog', { name: 'Rotate the token?' })).toBeInTheDocument();
		});

		it('shows the no-token state and generates a token from the callout', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(makeConfig({ enabled: true, hasToken: false }))
				.mockResolvedValueOnce(enabledConfig());
			generateScimTokenMock.mockResolvedValue({ token: 'fresh-token', baseUrl: '' });
			const { findByTestId } = renderView();

			await findByTestId('scim-callout-no_token');
			expect(screen.getByTestId('scim-status-row')).toHaveTextContent('No token');
			expect(screen.getByTestId('scim-token-generate')).toBeInTheDocument();

			await userEvent.click(screen.getByTestId('scim-callout-generate'));

			await waitFor(() => expect(generateScimTokenMock).toHaveBeenCalledTimes(1));
			expect(await findByTestId('scim-token-copy-now')).toBeInTheDocument();
		});

		it('masks the token with its last four characters and marks the field as redacted', async () => {
			getScimConfigMock.mockResolvedValue(enabledConfig());
			const { findByTestId } = renderView();

			const row = await findByTestId('scim-token-row');
			const textbox = within(row).getByRole('textbox');
			expect(textbox).toHaveValue('••••••••3f2a');
			expect(textbox.closest('.ph-no-capture')).not.toBeNull();
			expect(row).toHaveTextContent('Created Jun 12, 2026 by Jan Kowalski · not used yet');
			expect(within(row).queryByTestId('scim-token-copy-now')).not.toBeInTheDocument();
		});

		it('copies the base URL and tracks it', async () => {
			getScimConfigMock.mockResolvedValue(enabledConfig());
			const { findByTestId } = renderView();

			const row = await findByTestId('scim-base-url-row');
			expect(within(row).getByRole('textbox')).toHaveValue('https://n8n.example.com/scim/v2');
			await userEvent.click(within(row).getByTestId('copy-input-button'));

			await waitFor(() =>
				expect(telemetryTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.SCIM.SCIM_BASE_URL_COPIED, {}),
			);
		});
	});

	describe('disable', () => {
		it('sends enabled: false after the confirm and shows the off state', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(enabledConfig())
				.mockResolvedValueOnce(makeConfig({ hasToken: true, tokenHint: '3f2a' }));
			updateScimConfigMock.mockResolvedValue({ enabled: false });
			const { findByTestId } = renderView();

			await findByTestId('scim-connection-section');
			await userEvent.click(screen.getByTestId('scim-status-button'));
			await userEvent.click(await screen.findByText('Disable'));
			const dialog = await screen.findByRole('dialog', { name: 'Disable SCIM provisioning?' });
			await userEvent.click(within(dialog).getByText('Disable SCIM provisioning'));

			await findByTestId('scim-off');
			expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), { enabled: false });
		});

		it('sends nothing when the confirm is cancelled', async () => {
			getScimConfigMock.mockResolvedValue(enabledConfig());
			const { findByTestId } = renderView();

			await findByTestId('scim-connection-section');
			await userEvent.click(screen.getByTestId('scim-status-button'));
			await userEvent.click(await screen.findByText('Disable'));
			const dialog = await screen.findByRole('dialog', { name: 'Disable SCIM provisioning?' });
			await userEvent.click(within(dialog).getByText('Cancel'));

			expect(updateScimConfigMock).not.toHaveBeenCalled();
			expect(screen.getByTestId('scim-connection-section')).toBeInTheDocument();
		});
	});

	describe('token actions', () => {
		it('rotates the token after the confirm and shows the new value once', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(enabledConfig())
				.mockResolvedValueOnce(enabledConfig({ tokenHint: '9c1d' }));
			generateScimTokenMock.mockResolvedValue({ token: 'rotated-token', baseUrl: '' });
			const { findByTestId } = renderView();

			await findByTestId('scim-connection-section');
			await userEvent.click(screen.getByTestId('scim-token-actions'));
			await userEvent.click(await screen.findByText('Rotate token'));
			const dialog = await screen.findByRole('dialog', { name: 'Rotate the token?' });
			await userEvent.click(within(dialog).getByRole('button', { name: 'Rotate token' }));

			await waitFor(() => expect(generateScimTokenMock).toHaveBeenCalledTimes(1));
			const row = await findByTestId('scim-token-row');
			await waitFor(() => expect(within(row).getByRole('textbox')).toHaveValue('rotated-token'));
			expect(screen.getByTestId('scim-token-copy-now')).toBeInTheDocument();
		});

		it('revokes the token after the confirm and keeps SCIM enabled', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(enabledConfig())
				.mockResolvedValueOnce(makeConfig({ enabled: true, hasToken: false }));
			revokeScimTokenMock.mockResolvedValue({ success: true });
			const { findByTestId } = renderView();

			await findByTestId('scim-connection-section');
			await userEvent.click(screen.getByTestId('scim-token-actions'));
			await userEvent.click(await screen.findByText('Revoke token'));
			const dialog = await screen.findByRole('dialog', { name: 'Revoke the token?' });
			await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke token' }));

			await findByTestId('scim-callout-no_token');
			expect(revokeScimTokenMock).toHaveBeenCalledTimes(1);
			expect(screen.getByTestId('scim-connection-section')).toBeInTheDocument();
		});

		it('sends nothing when a token confirm is cancelled', async () => {
			getScimConfigMock.mockResolvedValue(enabledConfig());
			const { findByTestId } = renderView();

			await findByTestId('scim-connection-section');
			await userEvent.click(screen.getByTestId('scim-token-actions'));
			await userEvent.click(await screen.findByText('Revoke token'));
			const dialog = await screen.findByRole('dialog', { name: 'Revoke the token?' });
			await userEvent.click(within(dialog).getByText('Cancel'));

			expect(revokeScimTokenMock).not.toHaveBeenCalled();
			expect(generateScimTokenMock).not.toHaveBeenCalled();
		});
	});
});
