import { createTestingPinia } from '@pinia/testing';
import ConfirmPasswordModal from '@/components/ConfirmPasswordModal/ConfirmPasswordModal.vue';
import type { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CONFIRM_PASSWORD_MODAL_KEY } from '@/constants';
import { confirmPasswordEventBus } from './confirm-password.event-bus';
import { STORES } from '@n8n/stores';

const renderModal = createComponentRenderer(ConfirmPasswordModal);

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

const initialState = {
	[STORES.UI]: {
		modalsById: {
			[CONFIRM_PASSWORD_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [CONFIRM_PASSWORD_MODAL_KEY],
	},
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

describe('ConfirmPasswordModal', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
	});

	it('should render correctly', () => {
		const wrapper = renderModal({ pinia });

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should emit password entered by the user when submitting form', async () => {
		const eventBusSpy = vi.spyOn(confirmPasswordEventBus, 'emit');

		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		// Wait for the onMounted hook to complete and form inputs to render
		const input = await waitFor(() => getByTestId('currentPassword').querySelector('input')!);

		await userEvent.clear(input);
		await userEvent.type(input, 'testpassword123');

		await userEvent.click(getByTestId('confirm-password-button'));

		expect(eventBusSpy).toHaveBeenCalledWith('close', {
			currentPassword: 'testpassword123',
		});
	});

	it('should not submit form when password is empty', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});
		const eventBusSpy = vi.spyOn(confirmPasswordEventBus, 'emit');

		await userEvent.click(getByTestId('confirm-password-button'));

		expect(eventBusSpy).not.toHaveBeenCalled();
	});
});
