import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '../constants';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import StopManyExecutionsModal from './StopManyExecutionsModal.vue';
import type { RenderResult } from '@testing-library/vue';

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
		}),
	};
});

vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

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
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let executionsStore: MockedStore<typeof useExecutionsStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let telemetry: ReturnType<typeof useTelemetry>;
	let toast: ReturnType<typeof useToast>;

	beforeEach(() => {
		pinia = createTestingPinia();

		workflowsStore = mockedStore(useWorkflowsStore);
		executionsStore = mockedStore(useExecutionsStore);
		uiStore = mockedStore(useUIStore);
		settingsStore = mockedStore(useSettingsStore);
		telemetry = useTelemetry();
		toast = useToast();

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

		const cancelButton = getByTestId('stop-executions-submit-button');
		expect(cancelButton).toBeEnabled();

		const submitButton = getByTestId('stop-executions-submit-button');
		expect(submitButton).toBeDisabled();
	});

	it('should enable submit button when any form is checked', async () => {
		const { getByTestId } = renderModal();

		const textarea = getByTestId('workflow-description-input');
		await userEvent.clear(textarea);
		await userEvent.type(textarea, 'Updated description');

		await userEvent.type(textarea, '{Esc}');

		expect(workflowsStore.saveWorkflowDescription).not.toHaveBeenCalled();
	});
});
