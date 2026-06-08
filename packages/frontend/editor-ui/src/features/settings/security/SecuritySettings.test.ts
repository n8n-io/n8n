import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { FrontendSettings } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import SecuritySettings from './SecuritySettings.vue';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';

const getSecuritySettings = vi.fn();
const updateSecuritySettings = vi.fn();

vi.mock('@n8n/rest-api-client/api/security-settings', () => ({
	getSecuritySettings: (...args: unknown[]) => getSecuritySettings(...args),
	updateSecuritySettings: (...args: unknown[]) => updateSecuritySettings(...args),
}));

const showToast = vi.fn();
const showError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showToast, showError }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToUpgrade: vi.fn() }),
}));

const pinia = createTestingPinia();

const renderView = createComponentRenderer(SecuritySettings, {
	pinia,
});

describe('SecuritySettings', () => {
	const defaultSettings = {
		personalSpacePublishing: false,
		personalSpaceSharing: false,
		publishedPersonalWorkflowsCount: 14,
		sharedPersonalWorkflowsCount: 12,
		sharedPersonalCredentialsCount: 5,
		managedByEnv: false,
	};

	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

	const enableRedactionEnforcementFlag = (enabled: boolean) => {
		if (!settingsStore.settings) {
			settingsStore.settings = {} as FrontendSettings;
		}
		settingsStore.settings.envFeatureFlags = enabled
			? { N8N_ENV_FEAT_REDACTION_ENFORCEMENT: 'true' }
			: {};
	};

	beforeEach(() => {
		vi.clearAllMocks();
		getSecuritySettings.mockResolvedValue(defaultSettings);

		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);

		settingsStore.isMFAEnforced = false;
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.EnforceMFA] = true;
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.PersonalSpacePolicy] = true;
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = true;
		enableRedactionEnforcementFlag(false);
		usersStore.updateEnforceMfa = vi.fn().mockResolvedValue(undefined);
	});

	it('should render security heading and personal space section', async () => {
		const { getByText } = renderView();

		await waitFor(() => {
			expect(getSecuritySettings).toHaveBeenCalled();
		});

		expect(getByText('Security & policies')).toBeInTheDocument();
		expect(getByText('Personal Space')).toBeInTheDocument();
	});

	it('should render both publishing and sharing toggles with correct test ids', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});

		expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
	});

	it('should call updateSecuritySettings and show toast when enabling personal space publishing', async () => {
		updateSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpacePublishing: true,
		});

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});

		const publishingToggle = getByTestId('security-personal-space-publishing-toggle');
		await userEvent.click(publishingToggle);

		await waitFor(() => {
			expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
				personalSpacePublishing: true,
			});
		});
		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'success',
			}),
		);
	});

	it('should call updateSecuritySettings and show toast when enabling personal space sharing', async () => {
		updateSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: true,
		});

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
		});

		const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
		await userEvent.click(sharingToggle);

		await waitFor(() => {
			expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
				personalSpaceSharing: true,
			});
		});
		expect(showToast).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'success',
			}),
		);
	});

	it('should show alert dialog and proceed when confirming disable publishing', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpacePublishing: true,
		});
		updateSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpacePublishing: false,
		});

		const { getByTestId, getByRole } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});

		const publishingToggle = getByTestId('security-personal-space-publishing-toggle');
		await userEvent.click(publishingToggle);

		// N8nAlertDialog should appear (uses role="dialog" via reka-ui DialogContent)
		await waitFor(() => {
			expect(getByRole('dialog')).toBeInTheDocument();
		});

		// Click Confirm button in the dialog
		await userEvent.click(getByRole('button', { name: 'Confirm' }));

		await waitFor(() => {
			expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
				personalSpacePublishing: false,
			});
		});
	});

	it('should show alert dialog and proceed when confirming disable sharing', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: true,
		});
		updateSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: false,
		});

		const { getByTestId, getByRole } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
		});

		const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
		await userEvent.click(sharingToggle);

		// N8nAlertDialog should appear (uses role="dialog" via reka-ui DialogContent)
		await waitFor(() => {
			expect(getByRole('dialog')).toBeInTheDocument();
		});

		// Click Confirm button in the dialog
		await userEvent.click(getByRole('button', { name: 'Confirm' }));

		await waitFor(() => {
			expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
				personalSpaceSharing: false,
			});
		});
	});

	it('should not call updateSecuritySettings when user cancels disable publishing confirmation', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpacePublishing: true,
		});

		const { getByTestId, getByRole } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});

		const publishingToggle = getByTestId('security-personal-space-publishing-toggle');
		await userEvent.click(publishingToggle);

		// N8nAlertDialog should appear (uses role="dialog" via reka-ui DialogContent)
		await waitFor(() => {
			expect(getByRole('dialog')).toBeInTheDocument();
		});

		// Click Cancel button in the dialog
		await userEvent.click(getByRole('button', { name: 'Cancel' }));

		expect(updateSecuritySettings).not.toHaveBeenCalled();
	});

	it('should not call updateSecuritySettings when user cancels disable sharing confirmation', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: true,
		});

		const { getByTestId, getByRole } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
		});

		const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
		await userEvent.click(sharingToggle);

		// N8nAlertDialog should appear (uses role="dialog" via reka-ui DialogContent)
		await waitFor(() => {
			expect(getByRole('dialog')).toBeInTheDocument();
		});

		// Click Cancel button in the dialog
		await userEvent.click(getByRole('button', { name: 'Cancel' }));

		expect(updateSecuritySettings).not.toHaveBeenCalled();
	});

	it('should display published workflows count', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-publishing-count')).toHaveTextContent('14 workflows');
		});

		expect(getByTestId('security-publishing-count')).toHaveTextContent(
			'Existing published workflows',
		);
	});

	it('should display shared workflows and credentials counts', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-sharing-count')).toHaveTextContent(
				'12 workflows, 5 credentials',
			);
		});

		expect(getByTestId('security-sharing-count')).toHaveTextContent('Existing shares');
	});

	it('should render the enforce MFA toggle', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('enable-force-mfa')).toBeInTheDocument();
		});
	});

	it('should turn enforcing MFA on', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('enable-force-mfa')).toBeInTheDocument();
		});

		const actionSwitch = getByTestId('enable-force-mfa');
		await userEvent.click(actionSwitch);

		expect(usersStore.updateEnforceMfa).toHaveBeenCalledWith(true);
	});

	it('should turn enforcing MFA off', async () => {
		settingsStore.isMFAEnforced = true;
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('enable-force-mfa')).toBeInTheDocument();
		});

		const actionSwitch = getByTestId('enable-force-mfa');
		await userEvent.click(actionSwitch);

		expect(usersStore.updateEnforceMfa).toHaveBeenCalledWith(false);
	});

	it('should show success toast when enabling MFA enforcement', async () => {
		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('enable-force-mfa')).toBeInTheDocument();
		});

		const actionSwitch = getByTestId('enable-force-mfa');
		await userEvent.click(actionSwitch);

		await waitFor(() => {
			expect(showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
				}),
			);
		});
	});

	it('should show error toast when MFA enforcement update fails', async () => {
		usersStore.updateEnforceMfa = vi.fn().mockRejectedValue(new Error('MFA update failed'));

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('enable-force-mfa')).toBeInTheDocument();
		});

		const actionSwitch = getByTestId('enable-force-mfa');
		await userEvent.click(actionSwitch);

		await waitFor(() => {
			expect(showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		});
	});

	it('should not show personal space toggles before settings are loaded', async () => {
		let resolveSettings: (value: typeof defaultSettings) => void = () => {};
		getSecuritySettings.mockImplementation(
			async () => await new Promise((resolve) => (resolveSettings = resolve)),
		);

		const { queryByTestId } = renderView();

		expect(queryByTestId('security-personal-space-sharing-toggle')).not.toBeInTheDocument();
		expect(queryByTestId('security-personal-space-publishing-toggle')).not.toBeInTheDocument();

		resolveSettings(defaultSettings);

		await waitFor(() => {
			expect(queryByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			expect(queryByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});
	});

	describe('when managed by environment variables', () => {
		beforeEach(() => {
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				managedByEnv: true,
			});
		});

		it('should show env-managed notice banner', async () => {
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-managed-by-env-notice')).toBeInTheDocument();
			});
		});

		it('should not show env-managed notice when managedByEnv is false', async () => {
			getSecuritySettings.mockResolvedValue(defaultSettings);
			const { queryByTestId } = renderView();

			await waitFor(() => {
				expect(queryByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			expect(queryByTestId('security-managed-by-env-notice')).not.toBeInTheDocument();
		});

		it('should disable all toggles when managed by env', async () => {
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			expect(getByTestId('enable-force-mfa')).toHaveClass('is-disabled');
			expect(getByTestId('security-personal-space-sharing-toggle')).toHaveClass('is-disabled');
			expect(getByTestId('security-personal-space-publishing-toggle')).toHaveClass('is-disabled');
		});

		it('should not call update APIs when clicking disabled toggles', async () => {
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('security-personal-space-sharing-toggle'));
			await userEvent.click(getByTestId('enable-force-mfa'));

			expect(updateSecuritySettings).not.toHaveBeenCalled();
			expect(usersStore.updateEnforceMfa).not.toHaveBeenCalled();
		});
	});

	describe('when personalSpacePolicy feature is not licensed', () => {
		beforeEach(() => {
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.PersonalSpacePolicy] =
				false;
		});

		it('should show upgrade badges on sharing and publishing titles', async () => {
			const { getAllByText, getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			// Two upgrade badges for sharing + publishing (plus one for MFA if unlicensed)
			const upgradeBadges = getAllByText('Upgrade');
			expect(upgradeBadges.length).toBeGreaterThanOrEqual(2);
		});

		it('should render disabled sharing toggle when unlicensed', async () => {
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
			expect(sharingToggle).toHaveClass('is-disabled');
		});

		it('should render disabled publishing toggle when unlicensed', async () => {
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
			});

			const publishingToggle = getByTestId('security-personal-space-publishing-toggle');
			expect(publishingToggle).toHaveClass('is-disabled');
		});

		it('should not call updateSecuritySettings when clicking disabled toggle', async () => {
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
			await userEvent.click(sharingToggle);

			expect(updateSecuritySettings).not.toHaveBeenCalled();
		});
	});

	describe('Data redaction section', () => {
		it('should not render section when REDACTION_ENFORCEMENT flag is off', async () => {
			enableRedactionEnforcementFlag(false);
			const { queryByTestId, getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
			});

			expect(queryByTestId('enable-redaction-enforcement')).not.toBeInTheDocument();
			expect(queryByTestId('redaction-enforcement-summary')).not.toBeInTheDocument();
		});

		it('should render toggle and summary when flag is on', async () => {
			enableRedactionEnforcementFlag(true);
			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent('Affected scope');
			expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent('No executions');
		});

		it('should not render scope dropdown when enforcement is off', async () => {
			enableRedactionEnforcementFlag(true);
			const { queryByTestId, getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			expect(queryByTestId('redaction-enforcement-scope-row')).not.toBeInTheDocument();
		});

		it('should render scope dropdown when enforcement is on', async () => {
			enableRedactionEnforcementFlag(true);
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'production' },
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('redaction-enforcement-scope-row')).toBeInTheDocument();
			});

			expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent(
				'Production executions',
			);
		});

		it('should show enable dialog and POST floor=production when confirming', async () => {
			enableRedactionEnforcementFlag(true);
			updateSecuritySettings.mockResolvedValue(undefined);

			const { getByTestId, getByRole } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('enable-redaction-enforcement'));

			await waitFor(() => {
				expect(getByRole('dialog')).toBeInTheDocument();
			});

			expect(getByRole('dialog')).toHaveTextContent('manage data redaction permission');
			expect(getByRole('dialog')).not.toHaveTextContent('Workflow editors');

			await userEvent.click(getByRole('button', { name: 'Enable' }));

			await waitFor(() => {
				expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
					redactionEnforcement: { floor: 'production' },
				});
			});
			expect(showToast).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
				}),
			);
		});

		it('should not POST when cancelling enable dialog', async () => {
			enableRedactionEnforcementFlag(true);

			const { getByTestId, getByRole } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('enable-redaction-enforcement'));

			await waitFor(() => {
				expect(getByRole('dialog')).toBeInTheDocument();
			});

			await userEvent.click(getByRole('button', { name: 'Cancel' }));

			expect(updateSecuritySettings).not.toHaveBeenCalled();
		});

		it('should show disable dialog and POST floor=off when confirming', async () => {
			enableRedactionEnforcementFlag(true);
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'production' },
			});
			updateSecuritySettings.mockResolvedValue(undefined);

			const { getByTestId, getByRole } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('enable-redaction-enforcement'));

			await waitFor(() => {
				expect(getByRole('dialog')).toBeInTheDocument();
			});

			expect(getByRole('dialog')).toHaveTextContent('manage data redaction permission');
			expect(getByRole('dialog')).not.toHaveTextContent('Workflow editors');

			await userEvent.click(getByRole('button', { name: 'Disable' }));

			await waitFor(() => {
				expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
					redactionEnforcement: { floor: 'off' },
				});
			});
		});

		it('should show error toast when confirmed enable fails', async () => {
			enableRedactionEnforcementFlag(true);
			updateSecuritySettings.mockRejectedValue(new Error('boom'));

			const { getByTestId, getByRole } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('enable-redaction-enforcement'));

			await waitFor(() => {
				expect(getByRole('dialog')).toBeInTheDocument();
			});

			await userEvent.click(getByRole('button', { name: 'Enable' }));

			await waitFor(() => {
				expect(showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			});
		});

		it('should show upgrade badge when DataRedaction feature is not licensed', async () => {
			enableRedactionEnforcementFlag(true);
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			expect(getByTestId('enable-redaction-enforcement')).toHaveClass('is-disabled');
		});

		it('should render disabled scope dropdown when unlicensed even if enforced=true', async () => {
			enableRedactionEnforcementFlag(true);
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'production' },
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			expect(getByTestId('redaction-enforcement-scope-row')).toBeInTheDocument();
			expect(getByTestId('redaction-enforcement-scope-select')).toHaveAttribute('data-disabled');
		});

		it('should render scope dropdown with Upgrade badge when unlicensed and not enforced', async () => {
			enableRedactionEnforcementFlag(true);
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;

			const { getAllByText, getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			expect(getByTestId('redaction-enforcement-scope-row')).toBeInTheDocument();
			expect(getByTestId('redaction-enforcement-scope-select')).toHaveAttribute('data-disabled');
			// One badge on the toggle row, one on the scope row.
			expect(getAllByText('Upgrade').length).toBeGreaterThanOrEqual(2);
			// Summary reflects stored floor='off' while the disabled dropdown previews 'production'.
			expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent('No executions');
		});

		it('should not call updateSecuritySettings when clicking disabled scope dropdown', async () => {
			enableRedactionEnforcementFlag(true);
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'production' },
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('redaction-enforcement-scope-select')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('redaction-enforcement-scope-select'));

			expect(updateSecuritySettings).not.toHaveBeenCalled();
		});

		it('should show stored scope value when unlicensed with floor=production (downgrade)', async () => {
			enableRedactionEnforcementFlag(true);
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'production' },
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('redaction-enforcement-scope-row')).toBeInTheDocument();
			});

			expect(getByTestId('redaction-enforcement-scope-select')).toHaveAttribute('data-disabled');
			expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent(
				'Production executions',
			);
		});

		it('should show stored scope value when unlicensed with floor=all (downgrade)', async () => {
			enableRedactionEnforcementFlag(true);
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'all' },
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('redaction-enforcement-scope-row')).toBeInTheDocument();
			});

			expect(getByTestId('redaction-enforcement-scope-select')).toHaveAttribute('data-disabled');
			expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent(
				'Manual and production executions',
			);
		});

		it('should disable toggle when managed by env', async () => {
			enableRedactionEnforcementFlag(true);
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				managedByEnv: true,
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
			});

			expect(getByTestId('enable-redaction-enforcement')).toHaveClass('is-disabled');
		});

		it('should render correct affected-scope summary for floor=all', async () => {
			enableRedactionEnforcementFlag(true);
			getSecuritySettings.mockResolvedValue({
				...defaultSettings,
				redactionEnforcement: { floor: 'all' },
			});

			const { getByTestId } = renderView();

			await waitFor(() => {
				expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent(
					'Manual and production executions',
				);
			});
		});

		describe('when security settings endpoint is unlicensed (403)', () => {
			beforeEach(() => {
				enableRedactionEnforcementFlag(true);
				settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction] = false;
				// Reproduce the 403: useAsyncState keeps state === undefined.
				getSecuritySettings.mockRejectedValue(new Error('Forbidden'));
			});

			it('should still render the data redaction section when the endpoint 403s', async () => {
				const { getByTestId } = renderView();

				await waitFor(() => {
					expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
				});

				expect(getByTestId('enable-redaction-enforcement')).toHaveClass('is-disabled');
			});

			it('should show the Upgrade badges and disabled scope dropdown when endpoint 403s', async () => {
				const { getByTestId, getAllByText } = renderView();

				await waitFor(() => {
					expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
				});

				expect(getByTestId('redaction-enforcement-scope-row')).toBeInTheDocument();
				expect(getByTestId('redaction-enforcement-scope-select')).toHaveAttribute('data-disabled');
				// One badge on the toggle row, one on the scope row.
				expect(getAllByText('Upgrade').length).toBeGreaterThanOrEqual(2);
				// Defaults to floor 'off' when state never resolves.
				expect(getByTestId('redaction-enforcement-summary')).toHaveTextContent('No executions');
			});

			it('should not show an error toast when the endpoint 403s', async () => {
				const { getByTestId } = renderView();

				await waitFor(() => {
					expect(getByTestId('enable-redaction-enforcement')).toBeInTheDocument();
				});

				expect(showError).not.toHaveBeenCalled();
			});
		});
	});
});
