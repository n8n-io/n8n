import { nextTick } from 'vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { DEBUG_PAYWALL_MODAL_KEY } from '@/features/execution/executions/executions.constants';
import DebugPaywallModal from './DebugPaywallModal.vue';

const DialogStub = {
	props: ['open', 'header'],
	emits: ['update:open'],
	template: `
		<div role="dialog" :data-open="String(open === true)">
			<h2 v-if="header">{{ header }}</h2>
			<button type="button" data-test-id="stub-dialog-request-close" @click="$emit('update:open', false)"></button>
			<slot />
		</div>
	`,
};

const dialogPartStub = { template: '<div><slot /></div>' };

const renderModal = createComponentRenderer(DebugPaywallModal, {
	global: {
		stubs: {
			Dialog: DialogStub,
			DialogBody: dialogPartStub,
			DialogFooter: dialogPartStub,
		},
	},
});

describe('DebugPaywallModal', () => {
	it('follows the store open state and clears the store on close', async () => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalStateById: {
						[DEBUG_PAYWALL_MODAL_KEY]: { open: true },
					},
				},
			},
		});

		const { getByRole, getByTestId } = renderModal({
			pinia,
			props: {
				modalName: DEBUG_PAYWALL_MODAL_KEY,
				data: {
					title: 'Upgrade to access Debug In Editor',
					footerButtonAction: vi.fn(),
				},
			},
			attrs: {
				'data-test-id': 'debug-paywall-modal',
			},
		});

		expect(getByTestId('debug-paywall-modal')).toBe(getByRole('dialog'));
		expect(getByRole('dialog')).toHaveAttribute('data-open', 'true');

		const uiStore = useUIStore();
		uiStore.modalStateById[DEBUG_PAYWALL_MODAL_KEY] = { open: false };
		await nextTick();
		expect(getByRole('dialog')).toHaveAttribute('data-open', 'false');

		uiStore.modalStateById[DEBUG_PAYWALL_MODAL_KEY] = { open: true };
		await nextTick();
		await userEvent.click(getByTestId('stub-dialog-request-close'));

		expect(uiStore.closeModal).toHaveBeenCalledWith(DEBUG_PAYWALL_MODAL_KEY);
	});
});
