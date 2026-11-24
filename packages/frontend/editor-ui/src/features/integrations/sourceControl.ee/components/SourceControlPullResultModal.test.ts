import { nextTick } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { SOURCE_CONTROL_PULL_RESULT_MODAL_KEY } from '../sourceControl.constants';
import SourceControlPullResultModal from './SourceControlPullResultModal.vue';

const DialogStub = {
	props: ['open'],
	emits: ['update:open'],
	template: `
		<div role="dialog" :data-open="String(open === true)">
			<button type="button" data-test-id="stub-dialog-request-close" @click="$emit('update:open', false)"></button>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const renderModal = createComponentRenderer(SourceControlPullResultModal, {
	global: {
		stubs: {
			Dialog: DialogStub,
			DialogHeader: dialogPartStub,
			DialogTitle: dialogPartStub,
			DialogBody: dialogPartStub,
			DialogFooter: dialogPartStub,
		},
	},
});

describe('SourceControlPullResultModal', () => {
	it('follows the store open state and clears the store on close', async () => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalStateById: {
						[SOURCE_CONTROL_PULL_RESULT_MODAL_KEY]: { open: true },
					},
				},
			},
		});

		const { getByRole, getByTestId } = renderModal({
			pinia,
			props: {
				modalName: SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
				data: { workflows: [] },
			},
		});

		expect(getByRole('dialog')).toHaveAttribute('data-open', 'true');

		const uiStore = useUIStore();
		uiStore.modalStateById[SOURCE_CONTROL_PULL_RESULT_MODAL_KEY] = { open: false };
		await nextTick();
		expect(getByRole('dialog')).toHaveAttribute('data-open', 'false');

		uiStore.modalStateById[SOURCE_CONTROL_PULL_RESULT_MODAL_KEY] = { open: true };
		await nextTick();
		await userEvent.click(getByTestId('stub-dialog-request-close'));

		expect(uiStore.closeModal).toHaveBeenCalledWith(SOURCE_CONTROL_PULL_RESULT_MODAL_KEY);
	});
});
