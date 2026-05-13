import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useExecutionsStore } from '../executions.store';
import * as assistantApi from '@/features/ai/assistant/assistant.api';
import ExecutionsNlFilter from './ExecutionsNlFilter.vue';

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	generateCodeForPrompt: vi.fn(),
}));

const renderComponent = createComponentRenderer(ExecutionsNlFilter, {
	pinia: createTestingPinia({ stubActions: false }),
});

describe('ExecutionsNlFilter', () => {
	beforeEach(() => {
		const settings = mockedStore(useSettingsStore);
		settings.isAskAiEnabled = true;

		const executions = mockedStore(useExecutionsStore);
		executions.fetchExecutions.mockResolvedValue({
			count: 0,
			results: [],
			estimated: false,
			concurrentExecutionsCount: 0,
		});
		executions.resetData.mockImplementation(() => {});

		vi.clearAllMocks();
	});

	it('renders the input when askAi is enabled', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('executions-nl-filter-input')).toBeInTheDocument();
		expect(getByTestId('executions-nl-filter-submit')).toBeInTheDocument();
	});

	it('renders nothing when askAi is disabled', () => {
		const settings = mockedStore(useSettingsStore);
		settings.isAskAiEnabled = false;
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('executions-nl-filter-input')).toBeNull();
	});

	it('submits the prompt and updates the executions filter on success', async () => {
		vi.mocked(assistantApi.generateCodeForPrompt).mockResolvedValue({
			code: '{"status":"error"}',
		});
		const { getByTestId } = renderComponent();
		await userEvent.type(getByTestId('executions-nl-filter-input'), 'failed runs');
		await userEvent.click(getByTestId('executions-nl-filter-submit'));

		// Wait for the async pipeline
		await new Promise((r) => setTimeout(r, 0));

		const executionsStore = useExecutionsStore();
		expect(executionsStore.filters.status).toBe('error');
	});
});
