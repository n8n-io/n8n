import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import ConfirmProvisioningDialog from './ConfirmProvisioningDialog.vue';

const csvExport = await vi.hoisted(async () => {
	const { ref } = await import('vue');
	return {
		hasDownloadedInstanceRoleCsv: ref(false),
		hasDownloadedProjectRoleCsv: ref(false),
		downloadInstanceRolesCsv: vi.fn().mockResolvedValue(undefined),
		downloadProjectRolesCsv: vi.fn().mockResolvedValue(undefined),
		accessSettingsCsvExportOnModalClose: vi.fn(),
	};
});

vi.mock('@/features/settings/sso/provisioning/composables/useAccessSettingsCsvExport', () => ({
	useAccessSettingsCsvExport: () => csvExport,
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

describe('ConfirmProvisioningDialog', () => {
	beforeEach(() => {
		csvExport.hasDownloadedInstanceRoleCsv.value = false;
		csvExport.hasDownloadedProjectRoleCsv.value = false;
	});

	describe('project rules deletion warning', () => {
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

		it('points to the CSV download control in the backup flow', async () => {
			renderDialog({ props: { ...baseProps, willDeleteProjectRules: true } });

			const warning = await screen.findByTestId('provisioning-project-rules-deletion-warning');
			expect(warning).toHaveTextContent('Download the project roles CSV above');
			expect(screen.getByTestId('provisioning-download-project-roles-csv-button')).toBeVisible();
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

		it('does not point to a CSV control in the switchToManual flow, where none is rendered', async () => {
			renderDialog({
				props: {
					...baseProps,
					transitionType: 'switchToManual' as const,
					willDeleteProjectRules: true,
				},
			});

			const warning = await screen.findByTestId('provisioning-project-rules-deletion-warning');
			expect(warning).not.toHaveTextContent('CSV');
			expect(warning).toHaveTextContent(
				'If you switch back to project role provisioning later, you will need to create them again.',
			);
			expect(screen.queryByTestId('provisioning-download-project-roles-csv-button')).toBeNull();
		});
	});

	describe('save button gating', () => {
		it('switchToManual: enables Save on the confirmation checkbox alone, even when project roles were stored', async () => {
			const { emitted } = renderDialog({
				props: {
					...baseProps,
					transitionType: 'switchToManual' as const,
					showProjectRolesCsv: true,
					willDeleteProjectRules: true,
				},
			});

			const checkbox = await screen.findByTestId('provisioning-confirmation-checkbox');
			const saveButton = screen.getByTestId('provisioning-confirm-button');

			expect(screen.queryByTestId('provisioning-download-instance-roles-csv-button')).toBeNull();
			expect(screen.queryByTestId('provisioning-download-project-roles-csv-button')).toBeNull();
			expect(checkbox).toBeEnabled();
			expect(saveButton).toBeDisabled();

			await userEvent.click(checkbox);
			expect(saveButton).toBeEnabled();

			await userEvent.click(saveButton);
			expect(emitted('confirmProvisioning')).toHaveLength(1);
		});

		it('backup with project roles: keeps Save disabled until both CSVs are downloaded', async () => {
			renderDialog({ props: baseProps });

			const checkbox = await screen.findByTestId('provisioning-confirmation-checkbox');
			const saveButton = screen.getByTestId('provisioning-confirm-button');
			expect(checkbox).toBeDisabled();
			expect(saveButton).toBeDisabled();

			csvExport.hasDownloadedInstanceRoleCsv.value = true;
			await nextTick();
			expect(checkbox).toBeDisabled();
			expect(saveButton).toBeDisabled();

			csvExport.hasDownloadedProjectRoleCsv.value = true;
			await nextTick();
			expect(checkbox).toBeEnabled();
			expect(saveButton).toBeDisabled();

			await userEvent.click(checkbox);
			expect(saveButton).toBeEnabled();
		});

		it('backup without project roles: needs the instance CSV only', async () => {
			renderDialog({ props: { ...baseProps, showProjectRolesCsv: false } });

			const checkbox = await screen.findByTestId('provisioning-confirmation-checkbox');
			const saveButton = screen.getByTestId('provisioning-confirm-button');
			expect(screen.queryByTestId('provisioning-download-project-roles-csv-button')).toBeNull();
			expect(checkbox).toBeDisabled();

			csvExport.hasDownloadedInstanceRoleCsv.value = true;
			await nextTick();
			expect(checkbox).toBeEnabled();

			await userEvent.click(checkbox);
			expect(saveButton).toBeEnabled();
		});
	});
});
