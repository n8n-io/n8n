import { createComponentRenderer } from '@/__tests__/render';
import ImportWorkflowUrlModal from './ImportWorkflowUrlModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUIStore } from '@/stores/ui.store';
import { nodeViewEventBus } from '@/event-bus';
import { IMPORT_WORKFLOW_URL_MODAL_KEY } from '@/constants';
import userEvent from '@testing-library/user-event';

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
	modalsById: {
		[IMPORT_WORKFLOW_URL_MODAL_KEY]: {
			open: true,
		},
	},
	modalStack: [IMPORT_WORKFLOW_URL_MODAL_KEY],
};

const global = {
	stubs: {
		Modal: ModalStub,
	},
};

const renderModal = createComponentRenderer(ImportWorkflowUrlModal);
let pinia: ReturnType<typeof createTestingPinia>;

describe('ImportWorkflowUrlModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
	});

	it('should close the modal on cancel', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		const uiStore = useUIStore();

		await userEvent.click(getByTestId('cancel-workflow-import-url-button'));

		expect(uiStore.closeModal).toHaveBeenCalledWith(IMPORT_WORKFLOW_URL_MODAL_KEY);
	});

	it('should emit importWorkflowUrl event on confirm', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		const urlInput = getByTestId('workflow-url-import-input');
		const confirmButton = getByTestId('confirm-workflow-import-url-button');

		await userEvent.type(urlInput, 'https://valid-url.com/workflow.json');
		expect(confirmButton).toBeEnabled();

		const emitSpy = vi.spyOn(nodeViewEventBus, 'emit');
		await userEvent.click(confirmButton);

		expect(emitSpy).toHaveBeenCalledWith('importWorkflowUrl', {
			url: 'https://valid-url.com/workflow.json',
		});
	});

	it('should disable confirm button for invalid URL', async () => {
		const { getByTestId } = renderModal({
			global,
			pinia,
		});

		const urlInput = getByTestId('workflow-url-import-input');
		const confirmButton = getByTestId('confirm-workflow-import-url-button');

		await userEvent.type(urlInput, 'invalid-url');
		expect(confirmButton).toBeDisabled();
	});
});
