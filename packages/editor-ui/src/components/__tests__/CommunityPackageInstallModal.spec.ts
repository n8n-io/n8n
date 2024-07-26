import { createComponentRenderer } from '@/__tests__/render';
import CommunityPackageInstallModal from '../CommunityPackageInstallModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY, STORES } from '@/constants';
import userEvent from '@testing-library/user-event';
import { retry } from '@/__tests__/utils';

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
	it('should disable install button until user agrees', async () => {
		const wrapper = renderComponent();

		await retry(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		const installButton = wrapper.getByTestId('install-community-package-button');

		expect(installButton).toBeDisabled();

		await userEvent.click(wrapper.getByTestId('user-agreement-checkbox'));

		expect(installButton).toBeEnabled();

		await userEvent.click(wrapper.getByTestId('user-agreement-checkbox'));

		expect(installButton).toBeDisabled();
	});
});
