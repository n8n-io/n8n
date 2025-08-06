import { createComponentRenderer } from '@/__tests__/render';
import CommunityPackageInstallModal from './CommunityPackageInstallModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { cleanupAppModals, createAppModals, retry } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(CommunityPackageInstallModal, {
	props: {
		appendToBody: false,
	},
	data() {
		return {
			packageName: 'n8n-nodes-hello',
		};
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalsById: {
					[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]: { open: true },
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

describe('CommunityPackageInstallModal', () => {
	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
	});
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
