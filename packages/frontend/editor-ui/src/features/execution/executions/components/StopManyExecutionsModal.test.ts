import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import { useToast } from '@n8n/composables/useToast';
import { mockedStore } from '@/__tests__/utils';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import StopManyExecutionsModal from './StopManyExecutionsModal.vue';
import type { RenderResult } from '@testing-library/vue';

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

const global = {
	stubs: {
		Modal: ModalStub,
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

	it.each([
		[0, 'Stopped 0 executions.', 'info'],
		[1, 'Stopped 1 execution.', 'success'],
		[3, 'Stopped 3 executions.', 'success'],
	])('should show the toast for a stopped count of %i', async (stopped, title, type) => {
		const executionsStore = mockedStore(useExecutionsStore);
		executionsStore.stopManyExecutions.mockResolvedValue({ stopped });

		const { getByTestId } = renderModal();
		await userEvent.click(getByTestId('sme-submit-button'));

		await vi.waitFor(() => expect(useToast().showMessage).toHaveBeenCalledWith({ title, type }));
	});
});
