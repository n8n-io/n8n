import { createTestingPinia } from '@pinia/testing';
import ConfirmPasswordModal from './ConfirmPasswordModal.vue';
import type { createPinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CONFIRM_PASSWORD_MODAL_KEY } from '../auth.constants';
import { confirmPasswordEventBus } from '../auth.eventBus';
import { STORES } from '@n8n/stores';

const renderModal = createComponentRenderer(ConfirmPasswordModal);

const DialogStub = {
	props: ['header', 'description'],
	template: `
		<div role="dialog">
			<h2 v-if="header">{{ header }}</h2>
			<p v-if="description">{{ description }}</p>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const initialState = {
	[STORES.UI]: {
		modalStateById: {
			[CONFIRM_PASSWORD_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [CONFIRM_PASSWORD_MODAL_KEY],
	},
};

const global = {
	stubs: {
		Dialog: DialogStub,
		DialogHeader: dialogPartStub,
		DialogTitle: dialogPartStub,
		DialogFooter: dialogPartStub,
		DialogDescription: dialogPartStub,
	},
};

describe('ConfirmPasswordModal', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		vi.restoreAllMocks();
		pinia = createTestingPinia({ initialState });
	});

	it('should render correctly', async () => {
		const { getByTestId } = renderModal({ pinia });

		expect(await waitFor(() => getByTestId('currentPassword'))).toBeInTheDocument();
		expect(getByTestId('confirm-password-button')).toBeInTheDocument();
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
