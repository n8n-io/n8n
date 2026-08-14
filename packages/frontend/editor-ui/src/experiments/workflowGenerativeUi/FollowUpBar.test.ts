import { nextTick } from 'vue';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import FollowUpBar from './FollowUpBar.vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

function specResponse(title: string) {
	return new Response(
		JSON.stringify({
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						root: 'screen',
						elements: {
							screen: {
								type: 'Screen',
								props: { title, summary: `A generated view of ${title}.` },
								children: ['board'],
							},
							board: {
								type: 'GuidedTimeline',
								props: {},
								children: ['sec-1', 'sec-2', 'sec-3'],
							},
							'sec-1': { type: 'Group', props: { title: 'Intake' }, children: [] },
							'sec-2': { type: 'Group', props: { title: 'Process' }, children: [] },
							'sec-3': { type: 'Group', props: { title: 'Deliver' }, children: [] },
						},
					}),
				},
			],
		}),
		{ status: 200 },
	);
}

describe('FollowUpBar', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is hidden on canvas and visible on generated views', async () => {
		const store = useWorkflowGenerativeUiStore();
		store.view = 'canvas';
		renderComponent(FollowUpBar);

		expect(screen.queryByTestId('generative-ui-follow-up')).not.toBeInTheDocument();

		store.view = 'story';
		await nextTick();
		expect(screen.getByTestId('generative-ui-follow-up')).toBeInTheDocument();

		store.view = 'play';
		await nextTick();
		expect(screen.getByTestId('generative-ui-follow-up')).toBeInTheDocument();
	});

	it('exposes an accessible send control that stays disabled until there is text', async () => {
		const store = useWorkflowGenerativeUiStore();
		store.view = 'story';
		const user = userEvent.setup();
		renderComponent(FollowUpBar);

		const send = screen.getByRole('button', { name: 'Send' });
		expect(send).toBeDisabled();

		await user.type(screen.getByLabelText('Follow-up instruction'), 'Show branches');
		expect(send).toBeEnabled();
	});

	it('disables the field and send control while generating', async () => {
		const store = useWorkflowGenerativeUiStore();
		store.view = 'story';
		store.isGenerating = true;
		renderComponent(FollowUpBar);

		expect(screen.getByLabelText('Follow-up instruction')).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('aria-busy', 'true');
	});

	it('keeps the instruction when the follow-up fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request failed')));
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		store.view = 'story';
		store.setWorkflowGetter(() => ({
			id: 'workflow-1',
			name: 'Workflow',
			nodes: [],
			connections: {},
		}));
		const user = userEvent.setup();
		renderComponent(FollowUpBar);

		await user.type(screen.getByLabelText('Follow-up instruction'), 'Show the branches');
		await user.click(screen.getByRole('button', { name: 'Send' }));

		await waitFor(() => expect(store.error).toBe('generate-failed'));
		expect(screen.getByLabelText('Follow-up instruction')).toHaveValue('Show the branches');
	});

	it('clears the instruction when the follow-up succeeds', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(specResponse('Done')));
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		store.view = 'story';
		store.setWorkflowGetter(() => ({
			id: 'workflow-1',
			name: 'Workflow',
			nodes: [],
			connections: {},
		}));
		const user = userEvent.setup();
		renderComponent(FollowUpBar);

		await user.type(screen.getByLabelText('Follow-up instruction'), 'Show the branches');
		await user.click(screen.getByRole('button', { name: 'Send' }));

		await waitFor(() => expect(screen.getByLabelText('Follow-up instruction')).toHaveValue(''));
		expect(store.error).toBeNull();
	});
});
