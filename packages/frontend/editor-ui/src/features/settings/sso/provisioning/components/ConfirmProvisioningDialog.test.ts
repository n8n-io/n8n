import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import ConfirmProvisioningDialog from './ConfirmProvisioningDialog.vue';

const downloadInstanceRolesCsv = vi.fn().mockResolvedValue(undefined);
const downloadProjectRolesCsv = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/settings/sso/provisioning/composables/useAccessSettingsCsvExport', () => ({
	useAccessSettingsCsvExport: () => ({
		hasDownloadedInstanceRoleCsv: false,
		hasDownloadedProjectRoleCsv: false,
		downloadInstanceRolesCsv,
		downloadProjectRolesCsv,
		accessSettingsCsvExportOnModalClose: vi.fn(),
	}),
}));

const renderDialog = createComponentRenderer(ConfirmProvisioningDialog, {
	pinia: createTestingPinia(),
});

const baseProps = {
	modelValue: true,
	transitionType: 'backup' as const,
	showProjectRolesCsv: true,
	authProtocol: 'saml' as const,
};

describe('ConfirmProvisioningDialog — project rules deletion warning', () => {
	afterEach(() => {
		// ElDialog teleports content to body — clean up between tests.
		document.body.innerHTML = '';
	});

	it('does not render the deletion warning when willDeleteProjectRules is absent (defaults to false)', async () => {
		renderDialog({ props: baseProps });
		await screen.findByTestId('provisioning-confirmation-checkbox');

		expect(screen.queryByTestId('provisioning-project-rules-deletion-warning')).toBeNull();
	});

	it('does not render the deletion warning when willDeleteProjectRules is explicitly false', async () => {
		renderDialog({ props: { ...baseProps, willDeleteProjectRules: false } });
		await screen.findByTestId('provisioning-confirmation-checkbox');

		expect(screen.queryByTestId('provisioning-project-rules-deletion-warning')).toBeNull();
	});

	it('renders the deletion warning callout when willDeleteProjectRules is true', async () => {
		renderDialog({ props: { ...baseProps, willDeleteProjectRules: true } });

		const warning = await screen.findByTestId('provisioning-project-rules-deletion-warning');
		expect(warning).toBeInTheDocument();
		expect(warning).toHaveTextContent(
			'Existing project mapping rules will be permanently deleted.',
		);
	});

	it('renders the deletion warning in the switchToManual flow too (disabling SSO with project rules)', async () => {
		renderDialog({
			props: {
				...baseProps,
				transitionType: 'switchToManual' as const,
				willDeleteProjectRules: true,
			},
		});

		expect(
			await screen.findByTestId('provisioning-project-rules-deletion-warning'),
		).toBeInTheDocument();
	});
});
