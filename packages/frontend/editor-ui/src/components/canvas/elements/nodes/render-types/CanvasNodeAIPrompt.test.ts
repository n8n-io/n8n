import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import CanvasNodeAIPrompt from '@/components/canvas/elements/nodes/render-types/CanvasNodeAIPrompt.vue';
import { MODAL_CONFIRM, NODE_CREATOR_OPEN_SOURCES } from '@/constants';
import { WORKFLOW_SUGGESTIONS } from '@/constants/workflowSuggestions';

// Mock stores
const streaming = ref(false);
const openChat = vi.fn();
const sendChatMessage = vi.fn();
vi.mock('@/stores/builder.store', () => {
	return {
		useBuilderStore: vi.fn(() => ({
			get streaming() {
				return streaming.value;
			},
			openChat,
			sendChatMessage,
		})),
	};
});

const isNewWorkflow = ref(false);
vi.mock('@/stores/workflows.store', () => {
	return {
		useWorkflowsStore: vi.fn(() => ({
			get isNewWorkflow() {
				return isNewWorkflow.value;
			},
		})),
	};
});

const openNodeCreatorForTriggerNodes = vi.fn();
vi.mock('@/stores/nodeCreator.store', () => ({
	useNodeCreatorStore: vi.fn(() => ({
		openNodeCreatorForTriggerNodes,
	})),
}));

// Mock composables
const saveCurrentWorkflow = vi.fn();
vi.mock('@/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: vi.fn(() => ({
		saveCurrentWorkflow,
	})),
}));

const confirmMock = vi.fn();
vi.mock('@/composables/useMessage', () => ({
	useMessage: vi.fn(() => ({
		confirm: confirmMock,
	})),
}));

const telemetryTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: telemetryTrack,
	})),
}));

// Mock router
vi.mock('vue-router', () => ({
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(CanvasNodeAIPrompt);

describe('CanvasNodeAIPrompt', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		// Reset all mocks
		vi.clearAllMocks();
		streaming.value = false;
		isNewWorkflow.value = false;
	});

	// Snapshot Test
	it('should render component correctly', () => {
		const { html } = renderComponent();
		expect(html()).toMatchSnapshot();
	});

	describe('disabled state', () => {
		it('should disable textarea when builder is streaming', () => {
			streaming.value = true;
			const { container } = renderComponent();

			const textarea = container.querySelector('textarea');
			expect(textarea).toHaveAttribute('disabled');
		});

		it('should disable submit button when builder is streaming', () => {
			streaming.value = true;
			const { container } = renderComponent();

			const submitButton = container.querySelector('button[type="submit"]');
			expect(submitButton).toHaveAttribute('disabled');
		});

		it('should disable submit button when prompt is empty', () => {
			const { container } = renderComponent();

			const submitButton = container.querySelector('button[type="submit"]');
			expect(submitButton).toHaveAttribute('disabled');
		});
	});

	describe('form submission', () => {
		it('should submit form on Cmd+Enter keyboard shortcut', async () => {
			const { container } = renderComponent();
			const textarea = container.querySelector('textarea');

			if (!textarea) throw new Error('Textarea not found');

			// Type in textarea
			await fireEvent.update(textarea, 'Test prompt');

			// Fire Cmd+Enter
			await fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

			await waitFor(() => {
				expect(openChat).toHaveBeenCalled();
				expect(sendChatMessage).toHaveBeenCalledWith({
					initialGeneration: true,
					text: 'Test prompt',
					source: 'canvas',
				});
			});
		});

		it('should not submit when prompt is empty', async () => {
			const { container } = renderComponent();
			const form = container.querySelector('form');

			if (!form) throw new Error('Form not found');

			await fireEvent.submit(form);

			expect(openChat).not.toHaveBeenCalled();
		});

		it('should not submit when streaming', async () => {
			streaming.value = true;
			const { container } = renderComponent();
			const textarea = container.querySelector('textarea');
			const form = container.querySelector('form');

			if (!textarea || !form) throw new Error('Elements not found');

			// Even with content, submission should be blocked
			await fireEvent.update(textarea, 'Test prompt');
			await fireEvent.submit(form);

			expect(openChat).not.toHaveBeenCalled();
		});

		it('should open AI assistant panel and send message on submit', async () => {
			const { container } = renderComponent();
			const textarea = container.querySelector('textarea');
			const form = container.querySelector('form');

			if (!textarea || !form) throw new Error('Elements not found');

			await fireEvent.update(textarea, 'Test workflow prompt');
			await fireEvent.submit(form);

			await waitFor(() => {
				expect(openChat).toHaveBeenCalled();
				expect(sendChatMessage).toHaveBeenCalledWith({
					initialGeneration: true,
					text: 'Test workflow prompt',
					source: 'canvas',
				});
			});
		});

		it('should save new workflow before opening chat', async () => {
			isNewWorkflow.value = true;
			const { container } = renderComponent();
			const textarea = container.querySelector('textarea');
			const form = container.querySelector('form');

			if (!textarea || !form) throw new Error('Elements not found');

			await fireEvent.update(textarea, 'Test prompt');
			await fireEvent.submit(form);

			await waitFor(() => {
				expect(saveCurrentWorkflow).toHaveBeenCalled();
				expect(openChat).toHaveBeenCalled();
				// Ensure save is called before chat opens
				expect(saveCurrentWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
					openChat.mock.invocationCallOrder[0],
				);
			});
		});
	});

	describe('suggestion pills', () => {
		it('should render all workflow suggestions', () => {
			const { container } = renderComponent();
			const pills = container.querySelectorAll('[role="group"] button');

			expect(pills).toHaveLength(WORKFLOW_SUGGESTIONS.length);

			WORKFLOW_SUGGESTIONS.forEach((suggestion, index) => {
				expect(pills[index]).toHaveTextContent(suggestion.summary);
			});
		});

		it('should disable suggestion pills when builder is streaming', () => {
			streaming.value = true;
			const { container } = renderComponent();
			const pills = container.querySelectorAll('[role="group"] button');

			pills.forEach((pill) => {
				expect(pill).toHaveAttribute('disabled');
			});
		});

		it('should replace prompt when suggestion is clicked', async () => {
			const { container } = renderComponent();
			const firstPill = container.querySelector('[role="group"] button');
			const textarea = container.querySelector('textarea');

			if (!firstPill || !textarea) throw new Error('Elements not found');

			await fireEvent.click(firstPill);

			expect(textarea).toHaveValue(WORKFLOW_SUGGESTIONS[0].prompt);
		});

		it('should show confirmation dialog when user has edited prompt', async () => {
			confirmMock.mockResolvedValue(MODAL_CONFIRM);
			const { container } = renderComponent();
			const textarea = container.querySelector('textarea');
			const firstPill = container.querySelector('[role="group"] button');

			if (!textarea || !firstPill) throw new Error('Elements not found');

			// Type in textarea (triggers userEditedPrompt = true)
			await fireEvent.update(textarea, 'My custom prompt');
			await fireEvent.input(textarea);

			// Click a suggestion
			await fireEvent.click(firstPill);

			expect(confirmMock).toHaveBeenCalled();

			// After confirmation, prompt should be replaced
			await waitFor(() => {
				expect(textarea).toHaveValue(WORKFLOW_SUGGESTIONS[0].prompt);
			});
		});

		it('should not show confirmation when prompt is empty', async () => {
			const { container } = renderComponent();
			const firstPill = container.querySelector('[role="group"] button');
			const textarea = container.querySelector('textarea');

			if (!firstPill || !textarea) throw new Error('Elements not found');

			await fireEvent.click(firstPill);

			expect(confirmMock).not.toHaveBeenCalled();
			expect(textarea).toHaveValue(WORKFLOW_SUGGESTIONS[0].prompt);
		});

		it('should track telemetry when suggestion is clicked', async () => {
			const { container } = renderComponent();
			const firstPill = container.querySelector('[role="group"] button');

			if (!firstPill) throw new Error('Pill not found');

			await fireEvent.click(firstPill);

			expect(telemetryTrack).toHaveBeenCalledWith('User clicked suggestion pill', {
				prompt: '',
				suggestion: WORKFLOW_SUGGESTIONS[0].id,
			});
		});

		it('should not replace prompt if user cancels confirmation', async () => {
			confirmMock.mockResolvedValue('cancel'); // Not MODAL_CONFIRM
			const { container } = renderComponent();
			const textarea = container.querySelector('textarea');
			const firstPill = container.querySelector('[role="group"] button');

			if (!textarea || !firstPill) throw new Error('Elements not found');

			// Type in textarea
			await fireEvent.update(textarea, 'My custom prompt');
			await fireEvent.input(textarea);

			const originalValue = textarea.value;

			// Click suggestion
			await fireEvent.click(firstPill);

			// Prompt should not be replaced
			expect(textarea).toHaveValue(originalValue);
		});
	});

	describe('manual node creation', () => {
		it('should open node creator when "Add node manually" is clicked', async () => {
			const { container } = renderComponent();
			const addButton = container.querySelector('[aria-label="Add node manually"]');

			if (!addButton) throw new Error('Add button not found');

			await fireEvent.click(addButton);

			expect(openNodeCreatorForTriggerNodes).toHaveBeenCalledWith(
				NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON,
			);
		});

		it('should disable "Add node manually" button when builder is streaming', () => {
			streaming.value = true;
			const { container } = renderComponent();
			const addButton = container.querySelector('[aria-label="Add node manually"]');

			expect(addButton).toHaveAttribute('disabled');
		});

		it('should not open node creator when streaming', async () => {
			streaming.value = true;
			const { container } = renderComponent();
			const addButton = container.querySelector('[aria-label="Add node manually"]');

			if (!addButton) throw new Error('Add button not found');

			await fireEvent.click(addButton);

			expect(openNodeCreatorForTriggerNodes).not.toHaveBeenCalled();
		});
	});

	describe('event propagation', () => {
		it.each(['click', 'dblclick', 'mousedown', 'scroll', 'wheel'])(
			'should stop propagation of %s event on prompt container',
			(eventType) => {
				const { container } = renderComponent();
				const promptContainer = container.querySelector('.promptContainer');

				if (!promptContainer) throw new Error('Prompt container not found');

				const event = new Event(eventType, { bubbles: true });
				const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

				promptContainer.dispatchEvent(event);

				expect(stopPropagationSpy).toHaveBeenCalled();
			},
		);
	});
});
