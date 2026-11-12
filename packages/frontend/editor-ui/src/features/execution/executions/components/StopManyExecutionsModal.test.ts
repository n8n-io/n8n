import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import StopManyExecutionsModal from './StopManyExecutionsModal.vue';
import type { RenderResult } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';

vi.mock('@n8n/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));

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

const global = {
	stubs: {
		Dialog: DialogStub,
		DialogHeader: dialogPartStub,
		DialogTitle: dialogPartStub,
		DialogFooter: dialogPartStub,
		DialogDescription: dialogPartStub,
	},
};

let renderModal: () => RenderResult;

let pinia: ReturnType<typeof createTestingPinia>;

describe('StopManyExecutionsModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia();

		renderModal = () =>
			createComponentRenderer(StopManyExecutionsModal)({
				props: {
					modalName: STOP_MANY_EXECUTIONS_MODAL_KEY,
				},
				pinia,
				global,
			});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render modal', async () => {
		const { getByTestId } = renderModal();

		const cancelButton = getByTestId('sme-close-button');
		expect(cancelButton).toBeEnabled();

		const submitButton = getByTestId('sme-submit-button');
		expect(submitButton).toBeEnabled();
	});

	it('should disable submit button if no boxes are checked', async () => {
		const { getByTestId } = renderModal();

		for (const testId of ['running', 'waiting', 'queued']) {
			const form = getByTestId(`sme-check-${testId}`);
			await userEvent.click(form);
		}

		const cancelButton = getByTestId('sme-close-button');
		expect(cancelButton).toBeEnabled();

		const submitButton = getByTestId('sme-submit-button');
		expect(submitButton).toBeDisabled();
	});

	it('closes the dialog when the stop request finishes', async () => {
		const { getByTestId } = renderModal();
		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.stopManyExecutions.mockResolvedValue({ stopped: 1 });

		await userEvent.click(getByTestId('sme-submit-button'));
		await flushPromises();

		expect(useUIStore().closeModal).toHaveBeenCalledWith(STOP_MANY_EXECUTIONS_MODAL_KEY);
	});

	it('does not close a dialog opened after this instance unmounts', async () => {
		const { getByTestId, unmount } = renderModal();
		const executionsStore = mockedStore(useExecutionsStore);
		let resolveStop: (value: { stopped: number }) => void = () => {};
		executionsStore.stopManyExecutions.mockReturnValue(
			new Promise((resolve) => {
				resolveStop = resolve;
			}),
		);

		await userEvent.click(getByTestId('sme-submit-button'));
		unmount();
		resolveStop({ stopped: 1 });
		await flushPromises();

		expect(useUIStore().closeModal).not.toHaveBeenCalled();
	});
});
