import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import StopManyExecutionsModal from './StopManyExecutionsModal.vue';
import { useToast } from '@n8n/composables/useToast';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
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

	it('should use the singular form for one stopped execution', async () => {
		const { getByTestId } = renderModal();
		const executionsStore = useExecutionsStore();
		const showMessage = useToast().showMessage;
		vi.mocked(executionsStore.stopManyExecutions).mockResolvedValue({ stopped: 1 });

		await userEvent.click(getByTestId('sme-submit-button'));

		expect(showMessage).toHaveBeenCalledWith({
			title: 'Stopped 1 execution.',
			type: 'success',
		});
	});

	it('should use the plural form for multiple stopped executions', async () => {
		const { getByTestId } = renderModal();
		const executionsStore = useExecutionsStore();
		const showMessage = useToast().showMessage;
		vi.mocked(executionsStore.stopManyExecutions).mockResolvedValue({ stopped: 2 });

		await userEvent.click(getByTestId('sme-submit-button'));

		expect(showMessage).toHaveBeenCalledWith({
			title: 'Stopped 2 executions.',
			type: 'success',
		});
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
});
