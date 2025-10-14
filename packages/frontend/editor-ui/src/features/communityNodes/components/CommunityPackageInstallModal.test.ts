import { createComponentRenderer } from '@/__tests__/render';
import { retry } from '@/__tests__/utils';
import { useInstallNode } from '../composables/useInstallNode';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '../communityNodes.constants';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { vi, type MockedFunction } from 'vitest';
import { ref } from 'vue';
import CommunityPackageInstallModal from './CommunityPackageInstallModal.vue';

vi.mock('../composables/useInstallNode');
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
		pageEventQueue: [],
		previousPath: '',
		rudderStack: [],
		init: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
		page: vi.fn(),
		trackEvent: vi.fn(),
	}),
}));

const mockInstallNode = vi.fn();

const mockUseInstallNode = useInstallNode as MockedFunction<typeof useInstallNode>;

const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
	value: mockWindowOpen,
	writable: true,
});

const renderComponent = (modalData = {}) => {
	const renderer = createComponentRenderer(CommunityPackageInstallModal, {
		pinia: createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalsById: {
						[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]: {
							open: true,
							data: modalData,
						},
					},
				},
				[STORES.SETTINGS]: {
					settings: {
						templates: {
							host: '',
						},
					},
				},
			},
		}),
	});
	return renderer();
};

describe('CommunityPackageInstallModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseInstallNode.mockReturnValue({
			installNode: mockInstallNode,
			loading: ref(false),
		});
	});

	describe('Modal Rendering', () => {
		it('should render the modal with correct title and structure', async () => {
			const { getByTestId, getByText } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			expect(getByText('Install community nodes')).toBeInTheDocument();
			expect(getByTestId('package-name-input')).toBeInTheDocument();
			expect(getByTestId('user-agreement-checkbox')).toBeInTheDocument();
			expect(getByTestId('install-community-package-button')).toBeInTheDocument();
		});
	});

	describe('Package Name Input', () => {
		it('should initialize with provided package name', async () => {
			const { getByTestId } = renderComponent({ packageName: 'n8n-nodes-custom' });

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');
			expect(packageNameInput).toHaveValue('n8n-nodes-custom');
		});

		it('should clean npm commands on blur', async () => {
			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');

			await userEvent.type(packageNameInput, 'npm install n8n-nodes-test');
			await userEvent.tab(); // Trigger blur

			expect(packageNameInput).toHaveValue('n8n-nodes-test');
		});

		it('should clean npm i commands on blur', async () => {
			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');

			await userEvent.type(packageNameInput, 'npm i n8n-nodes-test');
			await userEvent.tab(); // Trigger blur

			expect(packageNameInput).toHaveValue('n8n-nodes-test');
		});

		it('should be disabled when loading', async () => {
			mockUseInstallNode.mockReturnValue({
				installNode: mockInstallNode,
				loading: ref(true),
			});

			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			expect(getByTestId('package-name-input')).toBeDisabled();
		});

		it('should be disabled when disableInput is true', async () => {
			const { getByTestId } = renderComponent({ disableInput: true });

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			expect(getByTestId('package-name-input')).toBeDisabled();
		});
	});

	describe('Checkbox Agreement', () => {
		it('should disable install button until user agrees', async () => {
			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');
			const installButton = getByTestId('install-community-package-button');

			await userEvent.type(packageNameInput, 'n8n-nodes-test');

			expect(installButton).toBeDisabled();

			await userEvent.click(getByTestId('user-agreement-checkbox'));

			expect(installButton).toBeEnabled();

			await userEvent.click(getByTestId('user-agreement-checkbox'));

			expect(installButton).toBeDisabled();
		});
	});

	describe('Install Button', () => {
		it('should be disabled when package name is empty', async () => {
			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const installButton = getByTestId('install-community-package-button');
			expect(installButton).toBeDisabled();
		});

		it('should be disabled when user has not agreed', async () => {
			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');
			const installButton = getByTestId('install-community-package-button');

			await userEvent.type(packageNameInput, 'n8n-nodes-test');

			expect(installButton).toBeDisabled();
		});

		it('should be enabled when package name is provided and user agreed', async () => {
			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');
			const installButton = getByTestId('install-community-package-button');

			await userEvent.type(packageNameInput, 'n8n-nodes-test');
			await userEvent.click(getByTestId('user-agreement-checkbox'));

			expect(installButton).toBeEnabled();
		});

		it('should be disabled when loading', async () => {
			mockUseInstallNode.mockReturnValue({
				installNode: mockInstallNode,
				loading: ref(true),
			});

			const { getByTestId } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			expect(getByTestId('install-community-package-button')).toBeDisabled();
		});
	});

	describe('Install Process', () => {
		it('should call installNode with correct parameters on successful install', async () => {
			mockInstallNode.mockResolvedValue({ success: true });

			const { getByTestId } = renderComponent({ nodeType: 'n8n-nodes-test.TestNode' });

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');
			const installButton = getByTestId('install-community-package-button');

			await userEvent.type(packageNameInput, 'n8n-nodes-test');
			await userEvent.click(getByTestId('user-agreement-checkbox'));
			await userEvent.click(installButton);

			expect(mockInstallNode).toHaveBeenCalledWith({
				type: 'unverified',
				packageName: 'n8n-nodes-test',
				nodeType: 'n8n-nodes-test.TestNode',
			});
		});

		it('should show error message on 400 error', async () => {
			const errorMessage = 'Package not found';
			mockInstallNode.mockResolvedValue({
				success: false,
				error: { httpStatusCode: 400, message: errorMessage },
			});

			const { getByTestId, getByText } = renderComponent();

			await retry(() => expect(getByTestId('communityPackageInstall-modal')).toBeInTheDocument());

			const packageNameInput = getByTestId('package-name-input');
			const installButton = getByTestId('install-community-package-button');

			await userEvent.type(packageNameInput, 'n8n-nodes-test');
			await userEvent.click(getByTestId('user-agreement-checkbox'));
			await userEvent.click(installButton);

			await retry(() => expect(getByText(errorMessage)).toBeInTheDocument());
		});
	});
});
