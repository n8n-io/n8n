import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import FollowUpBar from './FollowUpBar.vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

describe('FollowUpBar', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('keeps the instruction when the follow-up fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request failed')));
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		store.view = 'story';
		store.setWorkflowGetter(() => ({ name: 'Workflow', nodes: [], connections: {} }));
		const user = userEvent.setup();
		renderComponent(FollowUpBar);

		await user.type(screen.getByLabelText('Follow-up instruction'), 'Show the branches');
		await user.click(screen.getByRole('button', { name: 'Submit' }));

		await waitFor(() => expect(store.error).toBe('generate-failed'));
		expect(screen.getByLabelText('Follow-up instruction')).toHaveValue('Show the branches');
	});

	it('clears the instruction when the follow-up succeeds', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									root: 'screen',
									elements: { screen: { type: 'Screen', props: { title: 'Done' }, children: [] } },
								}),
							},
						],
					}),
					{ status: 200 },
				),
			),
		);
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		store.view = 'story';
		store.setWorkflowGetter(() => ({ name: 'Workflow', nodes: [], connections: {} }));
		const user = userEvent.setup();
		renderComponent(FollowUpBar);

		await user.type(screen.getByLabelText('Follow-up instruction'), 'Show the branches');
		await user.click(screen.getByRole('button', { name: 'Submit' }));

		await waitFor(() => expect(screen.getByLabelText('Follow-up instruction')).toHaveValue(''));
		expect(store.error).toBeNull();
	});
});
