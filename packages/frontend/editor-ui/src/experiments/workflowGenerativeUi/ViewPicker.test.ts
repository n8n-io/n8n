import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import ViewPicker from './ViewPicker.vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

describe('ViewPicker', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request failed')));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('offers exactly the three workflow views and defaults to Canvas', async () => {
		const store = useWorkflowGenerativeUiStore();
		const user = userEvent.setup();
		renderComponent(ViewPicker);

		expect(store.view).toBe('canvas');
		await user.click(screen.getByRole('combobox', { name: 'Workflow view' }));
		const options = await screen.findAllByRole('option');

		expect(options.map((option) => option.textContent?.trim())).toEqual([
			'Canvas',
			'Story',
			'Play-by-play',
		]);
	});

	it('shows API key entry and retries generation after saving a key', async () => {
		const store = useWorkflowGenerativeUiStore();
		const user = userEvent.setup();
		store.setWorkflowGetter(() => ({
			id: 'workflow-1',
			name: 'Workflow',
			nodes: [],
			connections: {},
		}));
		renderComponent(ViewPicker);

		await user.click(screen.getByRole('combobox', { name: 'Workflow view' }));
		await user.click(await screen.findByRole('option', { name: 'Story' }));

		await waitFor(() => expect(store.error).toBe('missing-key'));
		expect(screen.getByLabelText('Anthropic API key')).toBeInTheDocument();
		expect(fetch).not.toHaveBeenCalled();
		expect(localStorage.getItem('n8n.workflowGenerativeUi.apiKey')).toBeNull();

		await user.type(screen.getByLabelText('Anthropic API key'), 'test-key');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
		expect(store.apiKey).toBe('test-key');
		expect(localStorage.getItem('n8n.workflowGenerativeUi.apiKey')).toBe('test-key');
	});
});
