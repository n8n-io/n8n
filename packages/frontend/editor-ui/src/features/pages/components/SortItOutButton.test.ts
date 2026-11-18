import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import SortItOutButton from './SortItOutButton.vue';

const assistant = vi.hoisted(() => ({
	isAvailable: { value: true },
	startThread: vi.fn(),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => assistant.isAvailable,
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ startThread: assistant.startThread }),
}));
vi.mock('../composables/useIsPageModuleActive', () => ({
	useIsPageModuleActive: () => ({ value: true }),
}));

const toWorkflow = (index: number) => ({ id: `w${index}`, name: `Workflow ${index}` });

const renderComponent = createComponentRenderer(SortItOutButton, {
	props: { projectId: 'p1', undocumentedWorkflows: [toWorkflow(1), toWorkflow(2)] },
});

describe('SortItOutButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		assistant.isAvailable.value = true;
		assistant.startThread.mockResolvedValue('started');
	});

	it('should render nothing when the assistant is not available', () => {
		assistant.isAvailable.value = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('page-sort-it-out-button')).not.toBeInTheDocument();
	});

	it('should render nothing without a project', () => {
		const { queryByTestId } = renderComponent({ props: { projectId: undefined } });

		expect(queryByTestId('page-sort-it-out-button')).not.toBeInTheDocument();
	});

	it('should render nothing when each workflow has a page', () => {
		const { queryByTestId } = renderComponent({ props: { undocumentedWorkflows: [] } });

		expect(queryByTestId('page-sort-it-out-button')).not.toBeInTheDocument();
	});

	it('should ask the assistant for pages about the workflows without a page', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-sort-it-out-button'));

		expect(getByTestId('page-sort-it-out-button')).toHaveTextContent('Sort it out!');
		const [projectId, message, authorship, launch] = assistant.startThread.mock.calls[0];
		expect(projectId).toBe('p1');
		expect(message).toContain('- [Workflow 1](/workflow/w1)');
		expect(message).toContain('- [Workflow 2](/workflow/w2)');
		expect(message).toContain('Choose the 2 most important');
		expect(message).toContain(
			'[Open the documentation overview](/projects/p1/workflows?view=docs)',
		);
		expect(authorship).toEqual({ kind: 'prefill', prefillType: 'handoff_document_project' });
		expect(launch).toMatchObject({ source: 'page_overview_button' });
		expect(emitted().started).toHaveLength(1);
	});

	it('should ask for at most 5 pages', async () => {
		const workflows = [1, 2, 3, 4, 5, 6, 7].map(toWorkflow);
		const { getByTestId } = renderComponent({ props: { undocumentedWorkflows: workflows } });

		await userEvent.click(getByTestId('page-sort-it-out-button'));

		expect(assistant.startThread.mock.calls[0][1]).toContain('Choose the 5 most important');
	});

	it('should not report a start when the assistant opens its setup', async () => {
		assistant.startThread.mockResolvedValue('setup');
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-sort-it-out-button'));

		expect(emitted().started).toBeUndefined();
	});
});
