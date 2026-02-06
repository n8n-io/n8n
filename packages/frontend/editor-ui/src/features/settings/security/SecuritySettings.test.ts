import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import SecuritySettings from './SecuritySettings.vue';
import { MODAL_CONFIRM } from '@/app/constants/modals';

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

const confirmMessage = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMessage }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const renderView = createComponentRenderer(SecuritySettings, {
	pinia: createTestingPinia(),
});

describe('SecuritySettings', () => {
	const defaultSettings = {
		personalSpacePublishing: false,
		personalSpaceSharing: false,
		publishedPersonalWorkflowsCount: 14,
		sharedPersonalWorkflowsCount: 12,
		sharedPersonalCredentialsCount: 5,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		getSecuritySettings.mockResolvedValue(defaultSettings);
	});

	it('should render security heading and personal space section', async () => {
		const { getByText } = renderView();

		await waitFor(() => {
			expect(getSecuritySettings).toHaveBeenCalled();
		});

		expect(getByText('Security')).toBeInTheDocument();
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

	it('should show confirm dialog when disabling personal space publishing', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpacePublishing: true,
		});
		confirmMessage.mockResolvedValue(MODAL_CONFIRM);
		updateSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpacePublishing: false,
		});

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});

		const publishingToggle = getByTestId('security-personal-space-publishing-toggle');
		await userEvent.click(publishingToggle);

		await waitFor(() => {
			expect(confirmMessage).toHaveBeenCalled();
		});
		await waitFor(() => {
			expect(updateSecuritySettings).toHaveBeenCalledWith(expect.anything(), {
				personalSpacePublishing: false,
			});
		});
	});

	it('should show confirm dialog when disabling personal space sharing', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: true,
		});
		confirmMessage.mockResolvedValue(MODAL_CONFIRM);
		updateSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: false,
		});

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
		});

		const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
		await userEvent.click(sharingToggle);

		await waitFor(() => {
			expect(confirmMessage).toHaveBeenCalled();
		});
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
		confirmMessage.mockResolvedValue('cancel');

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-publishing-toggle')).toBeInTheDocument();
		});

		const publishingToggle = getByTestId('security-personal-space-publishing-toggle');
		await userEvent.click(publishingToggle);

		await waitFor(() => {
			expect(confirmMessage).toHaveBeenCalled();
		});
		expect(updateSecuritySettings).not.toHaveBeenCalled();
	});

	it('should not call updateSecuritySettings when user cancels disable sharing confirmation', async () => {
		getSecuritySettings.mockResolvedValue({
			...defaultSettings,
			personalSpaceSharing: true,
		});
		confirmMessage.mockResolvedValue('cancel');

		const { getByTestId } = renderView();

		await waitFor(() => {
			expect(getByTestId('security-personal-space-sharing-toggle')).toBeInTheDocument();
		});

		const sharingToggle = getByTestId('security-personal-space-sharing-toggle');
		await userEvent.click(sharingToggle);

		await waitFor(() => {
			expect(confirmMessage).toHaveBeenCalled();
		});
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
});
