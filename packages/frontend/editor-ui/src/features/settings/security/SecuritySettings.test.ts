import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
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
	};

	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		getSecuritySettings.mockResolvedValue(defaultSettings);

		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);

		settingsStore.isMFAEnforced = false;
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.EnforceMFA] = true;
		settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.PersonalSpacePolicy] = true;
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
});
