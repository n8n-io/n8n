import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiInput from '../components/InstanceAiInput.vue';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS as suggestions } from '../emptyStateSuggestions';

const toggleResearchMode = vi.fn();
const telemetryTrack = vi.fn();
const storeState = reactive({
	amendContext: null as { agentId: string; role: string } | null,
	contextualSuggestion: null as string | null,
	currentThreadId: 'thread-1',
	researchMode: false,
	isSendingMessage: false,
	toggleResearchMode,
});

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: telemetryTrack })),
}));

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(() => storeState),
}));

const renderComponent = createComponentRenderer(InstanceAiInput);

describe('InstanceAiInput', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		telemetryTrack.mockReset();
		storeState.amendContext = null;
		storeState.contextualSuggestion = null;
		storeState.currentThreadId = 'thread-1';
		storeState.researchMode = false;
		storeState.isSendingMessage = false;
	});

	it('uses the shared suggestions fixture with the expected top-level contract', () => {
		expect(suggestions.map((suggestion) => ({ id: suggestion.id, type: suggestion.type }))).toEqual(
			[
				{ id: 'build-workflow', type: 'prompt' },
				{ id: 'build-agent', type: 'prompt' },
				{ id: 'find-automation-ideas', type: 'prompt' },
				{ id: 'quick-examples', type: 'menu' },
			],
		);
	});

	it('renders the four empty-state suggestions when the textarea is empty', () => {
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		expect(getByTestId('instance-ai-suggestion-build-workflow')).toHaveTextContent(
			'Build a workflow',
		);
		expect(getByTestId('instance-ai-suggestion-build-agent')).toHaveTextContent('Build an agent');
		expect(getByTestId('instance-ai-suggestion-find-automation-ideas')).toHaveTextContent(
			'Find inspiration',
		);
		expect(getByTestId('instance-ai-suggestion-quick-examples')).toHaveTextContent(
			'Quick examples',
		);
	});

	it('shows a ghost prompt in the placeholder when hovering a prompt suggestion', async () => {
		const { getByRole, getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		const initialPlaceholder = textbox.getAttribute('placeholder');

		await userEvent.hover(getByTestId('instance-ai-suggestion-build-workflow'));

		expect(textbox).toHaveAttribute(
			'placeholder',
			"I want to build a new workflow. Help me figure out what to build. Ask me what's the end goal, what should trigger it, and what apps or services are involved.",
		);

		await userEvent.unhover(getByTestId('instance-ai-suggestion-build-workflow'));

		expect(textbox).toHaveAttribute('placeholder', initialPlaceholder ?? '');
	});

	it('fills the textarea from the contextual suggestion when Tab is pressed on an empty input', async () => {
		storeState.contextualSuggestion = 'Summarize the last workflow error for me';
		const { getByRole } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		await fireEvent.keyDown(textbox, { key: 'Tab' });

		await waitFor(() => {
			expect(textbox).toHaveValue('Summarize the last workflow error for me');
		});
	});

	it('does not submit when Enter is pressed on an empty draft', async () => {
		const { emitted, getByRole } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		await fireEvent.keyDown(getByRole('textbox'), { key: 'Enter' });

		expect(emitted().submit).toBeUndefined();
	});

	it('does not change the placeholder when hovering the quick examples trigger', async () => {
		const { getByRole, getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		const initialPlaceholder = textbox.getAttribute('placeholder');

		await userEvent.hover(getByTestId('instance-ai-suggestion-quick-examples'));

		expect(textbox).toHaveAttribute('placeholder', initialPlaceholder ?? '');
	});

	it('keeps suggestions visible for whitespace-only input but does not preview a ghost prompt', async () => {
		const { getByRole, getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		const initialPlaceholder = textbox.getAttribute('placeholder') ?? '';
		await userEvent.type(textbox, '   ');

		expect(getByTestId('instance-ai-suggestion-build-workflow')).toBeInTheDocument();
		await userEvent.hover(getByTestId('instance-ai-suggestion-build-workflow'));
		expect(textbox).toHaveAttribute('placeholder', initialPlaceholder);
	});

	it('shows a ghost prompt in the placeholder when hovering a quick example row', async () => {
		const { getByRole, getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		const initialPlaceholder = textbox.getAttribute('placeholder');

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.hover(getByTestId('instance-ai-quick-example-monitor-competitors'));

		expect(textbox).toHaveAttribute(
			'placeholder',
			'Once per week, search Google News for mentions of all the competitors listed in a Google Sheet, use Claude to summarize any articles published in the last week, and post the summary to #competitive-intel in Slack.',
		);

		await userEvent.unhover(getByTestId('instance-ai-quick-example-monitor-competitors'));

		expect(textbox).toHaveAttribute('placeholder', initialPlaceholder ?? '');
	});

	it('clears the ghost prompt when quick examples are closed by clicking outside', async () => {
		const { getByRole, getByTestId, queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		const initialPlaceholder = textbox.getAttribute('placeholder') ?? '';

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.hover(getByTestId('instance-ai-quick-example-monitor-competitors'));
		expect(textbox.getAttribute('placeholder')).not.toBe(initialPlaceholder);

		await fireEvent.click(document.body);

		expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
		expect(textbox).toHaveAttribute('placeholder', initialPlaceholder);
	});

	it('submits immediately when a prompt suggestion is clicked', async () => {
		const { emitted, getByRole, getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		await userEvent.click(getByTestId('instance-ai-suggestion-build-agent'));

		expect(emitted().submit?.[0]).toEqual([
			'I want to build a new agent. Help me figure out what to build. Ask me what the main purpose of the agent is, what should trigger it into action, what apps, tools, or knowledge it should have access to, and whether I have a preference for the AI model used.',
			undefined,
		]);
		expect(textbox).toHaveValue('');
	});

	it('submits typed text and attachments from the send button', async () => {
		const { container, emitted, getByRole, getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		await userEvent.type(textbox, 'Please send this with context');

		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
		const textFile = new File(['hello world'], 'note.txt', { type: 'text/plain' });
		Object.defineProperty(fileInput, 'files', { value: [textFile], configurable: true });
		await fireEvent.change(fileInput);

		await userEvent.click(getByTestId('instance-ai-send-button'));

		await waitFor(() => {
			expect(emitted().submit?.[0]).toBeDefined();
		});

		expect(emitted().submit).toEqual([
			[
				'Please send this with context',
				[
					expect.objectContaining({
						data: expect.any(String),
						mimeType: 'text/plain',
						fileName: 'note.txt',
					}),
				],
			],
		]);
		expect(textbox).toHaveValue('');
	});

	it('opens quick examples and submits immediately when an example is clicked', async () => {
		const { emitted, getByRole, getByTestId, queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

		const panel = getByTestId('instance-ai-quick-examples-panel');
		expect(panel).toBeVisible();
		expect(within(panel).getByText('Track competitor news')).toBeVisible();
		expect(within(panel).getByText('Automate my inbox')).toBeVisible();

		await userEvent.click(getByTestId('instance-ai-quick-example-answer-support-requests'));

		const textbox = getByRole('textbox');
		expect(emitted().submit?.[0]).toEqual([
			'When a new email arrives in our Outlook inbox, use Claude to summarize what the prospect is looking for, rate its urgency and potential value, then notify the right person in Slack based on the product and region of the prospect.',
			undefined,
		]);
		expect(textbox).toHaveValue('');
		expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
	});

	it('hides suggestions and quick examples when a file is attached', async () => {
		const { container, getByTestId, queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
		const file = new File(['hello'], 'note.txt', { type: 'text/plain' });

		Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });

		await fireEvent.change(fileInput);

		await waitFor(() => {
			expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
		});
	});

	it('shows empty-state suggestions again after removing the last attachment', async () => {
		const { container, getByTestId, queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
		const imageFile = new File(['image data'], 'diagram.png', { type: 'image/png' });

		Object.defineProperty(fileInput, 'files', { value: [imageFile], configurable: true });

		await fireEvent.change(fileInput);

		await waitFor(() => {
			expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(getByTestId('attachment-preview-remove')).toBeInTheDocument();
		});

		await userEvent.click(getByTestId('attachment-preview-remove'));

		await waitFor(() => {
			expect(getByTestId('instance-ai-suggestion-build-workflow')).toBeInTheDocument();
			expect(getByTestId('instance-ai-suggestion-quick-examples')).toBeInTheDocument();
		});
	});

	it('hides suggestions while a send is pending', async () => {
		const { queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		expect(queryByTestId('instance-ai-suggestion-build-workflow')).toBeInTheDocument();

		storeState.isSendingMessage = true;

		await waitFor(() => {
			expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
		});
	});

	it('toggles research mode from the composer footer button', async () => {
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		await userEvent.click(getByTestId('instance-ai-research-toggle'));

		expect(toggleResearchMode).toHaveBeenCalledTimes(1);
	});

	it('emits stop when the streaming stop button is clicked', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				isStreaming: true,
				suggestions,
			},
		});

		await userEvent.click(getByTestId('instance-ai-stop-button'));

		expect(emitted().stop).toEqual([[]]);
	});

	it('clears the ghost prompt when suggestions become hidden', async () => {
		const { getByRole, getByTestId, queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		const textbox = getByRole('textbox');
		const initialPlaceholder = textbox.getAttribute('placeholder') ?? '';
		await userEvent.hover(getByTestId('instance-ai-suggestion-build-workflow'));
		expect(textbox.getAttribute('placeholder')).not.toBe(initialPlaceholder);

		storeState.isSendingMessage = true;

		await waitFor(() => {
			expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
			expect(textbox).toHaveAttribute('placeholder', initialPlaceholder);
		});
	});

	it('tracks suggestions shown once when suggestions hide and reappear in the same thread', async () => {
		storeState.currentThreadId = 'thread-shown';

		renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
				thread_id: 'thread-shown',
				suggestion_catalog_version: 'v1',
				research_mode: false,
			});
		});

		storeState.isSendingMessage = true;
		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledTimes(1);
		});

		storeState.isSendingMessage = false;
		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledTimes(1);
		});
	});

	it('tracks suggestions shown again when the empty-state thread changes', async () => {
		storeState.currentThreadId = 'thread-a';

		renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
				thread_id: 'thread-a',
				suggestion_catalog_version: 'v1',
				research_mode: false,
			});
		});

		storeState.currentThreadId = 'thread-b';

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
				thread_id: 'thread-b',
				suggestion_catalog_version: 'v1',
				research_mode: false,
			});
		});
		expect(
			telemetryTrack.mock.calls.filter(
				([eventName]) => eventName === 'Instance AI prompt suggestions shown',
			),
		).toHaveLength(2);
	});

	it('tracks quick examples opened with semantic payload', async () => {
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		telemetryTrack.mockClear();
		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

		expect(telemetryTrack).toHaveBeenCalledWith('Instance AI quick examples opened', {
			thread_id: 'thread-1',
			suggestion_catalog_version: 'v1',
			research_mode: false,
			suggestion_id: 'quick-examples',
			position: 4,
		});
	});

	it('includes research mode in the quick examples telemetry payload when enabled', async () => {
		storeState.researchMode = true;
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		telemetryTrack.mockClear();
		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

		expect(telemetryTrack).toHaveBeenCalledTimes(1);
		expect(telemetryTrack.mock.calls[0]).toEqual([
			'Instance AI quick examples opened',
			{
				thread_id: 'thread-1',
				suggestion_catalog_version: 'v1',
				research_mode: true,
				suggestion_id: 'quick-examples',
				position: 4,
			},
		]);
	});

	it('tracks top-level suggestion selection before submit', async () => {
		const onSubmit = vi.fn();
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
			attrs: {
				onSubmit,
			},
		});

		telemetryTrack.mockClear();
		telemetryTrack.mockImplementationOnce(() => {
			expect(onSubmit).not.toHaveBeenCalled();
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-build-workflow'));

		expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
			thread_id: 'thread-1',
			suggestion_catalog_version: 'v1',
			research_mode: false,
			suggestion_id: 'build-workflow',
			suggestion_kind: 'prompt',
			position: 1,
		});
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('includes the research-mode flag when tracking top-level suggestion selection telemetry', async () => {
		storeState.researchMode = true;
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		telemetryTrack.mockClear();

		await userEvent.click(getByTestId('instance-ai-suggestion-build-workflow'));

		expect(telemetryTrack).toHaveBeenCalledTimes(1);
		expect(telemetryTrack.mock.calls[0]).toEqual([
			'Instance AI prompt suggestion selected',
			{
				thread_id: 'thread-1',
				suggestion_catalog_version: 'v1',
				research_mode: true,
				suggestion_id: 'build-workflow',
				suggestion_kind: 'prompt',
				position: 1,
			},
		]);
	});

	it('tracks quick-example suggestion selection with semantic payload', async () => {
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		telemetryTrack.mockClear();
		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		telemetryTrack.mockClear();

		await userEvent.click(getByTestId('instance-ai-quick-example-answer-support-requests'));

		expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
			thread_id: 'thread-1',
			suggestion_catalog_version: 'v1',
			research_mode: false,
			suggestion_id: 'answer-support-requests',
			suggestion_kind: 'quick_example',
			position: 3,
		});
	});

	it('never includes prompt text in telemetry payloads', async () => {
		const { getByTestId } = renderComponent({
			props: {
				isStreaming: false,
				suggestions,
			},
		});

		telemetryTrack.mockClear();
		await userEvent.click(getByTestId('instance-ai-suggestion-build-workflow'));
		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.click(getByTestId('instance-ai-quick-example-answer-support-requests'));

		const payloads = telemetryTrack.mock.calls.map(
			([, payload]) => payload as Record<string, unknown>,
		);
		for (const payload of payloads) {
			expect(payload).not.toHaveProperty('prompt');
			expect(payload).not.toHaveProperty('prompt_text');
			expect(Object.values(payload)).not.toContain(
				'When a new email arrives in our Outlook inbox, use Claude to summarize what the prospect is looking for, rate its urgency and potential value, then notify the right person in Slack based on the product and region of the prospect.',
			);
		}
	});

	it('does not render suggestions when the prop is omitted', () => {
		const { queryByTestId } = renderComponent({
			props: {
				isStreaming: false,
			},
		});

		expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
	});
});
