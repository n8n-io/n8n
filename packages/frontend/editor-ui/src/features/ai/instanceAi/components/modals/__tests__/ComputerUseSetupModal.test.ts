import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY } from '../../../constants';
import ComputerUseSetupModal from '../ComputerUseSetupModal.vue';

const renderComponent = createComponentRenderer(ComputerUseSetupModal, {
	props: { modalName: INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY },
	global: {
		stubs: {
			ComputerUseSetupContent: {
				template: '<div data-test-id="computer-use-setup-content" />',
			},
		},
	},
});

function renderOpen() {
	createTestingPinia({ stubActions: false });
	const uiStore = useUIStore();
	uiStore.openModal(INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY);
	return { ...renderComponent(), uiStore };
}

describe('ComputerUseSetupModal', () => {
	it('opens from the modal store', async () => {
		const { findByRole, findByTestId } = renderOpen();

		expect(await findByRole('dialog')).toBeInTheDocument();
		expect(await findByTestId('computer-use-setup-content')).toBeInTheDocument();
	});

	it('closes from the close button and clears the modal store', async () => {
		const { findByTestId, uiStore } = renderOpen();

		await userEvent.click(await findByTestId('dialog-close-button'));

		expect(uiStore.modalsById[INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY]?.open).toBe(false);
	});

	it('closes when the user presses Escape', async () => {
		const { findByRole, uiStore } = renderOpen();

		expect(await findByRole('dialog')).toBeInTheDocument();

		await userEvent.keyboard('{Escape}');

		expect(uiStore.modalsById[INSTANCE_AI_COMPUTER_USE_SETUP_MODAL_KEY]?.open).toBe(false);
	});
});
