import { describe, expect, it } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY } from '@/features/ai/chatHub/constants';
import ModelByIdSelectorModal from './ModelByIdSelectorModal.vue';

const renderComponent = createComponentRenderer(ModelByIdSelectorModal);

const props = {
	modalName: CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	data: {
		provider: 'openai' as const,
		initialValue: null,
		onSelect: () => {},
	},
};

function renderOpen() {
	createTestingPinia({ stubActions: false });
	const uiStore = useUIStore();
	uiStore.openModal(CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY);
	return { ...renderComponent({ props }), uiStore };
}

describe('ModelByIdSelectorModal', () => {
	it('stays closed until the modal store opens it', () => {
		createTestingPinia({ stubActions: false });
		const { queryByRole } = renderComponent({ props });

		expect(queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('opens from the modal store and closes on cancel', async () => {
		const { findByRole, uiStore } = renderOpen();

		expect(await findByRole('dialog')).toBeInTheDocument();

		await userEvent.click(await findByRole('button', { name: 'Cancel' }));

		expect(uiStore.modalsById[CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY]?.open).toBe(false);
	});

	it('closes when the dialog requests close', async () => {
		const { findByTestId, uiStore } = renderOpen();

		await userEvent.click(await findByTestId('dialog-close-button'));

		expect(uiStore.modalsById[CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY]?.open).toBe(false);
	});
});
