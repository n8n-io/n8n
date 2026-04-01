import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import InstanceAiInput from '../components/InstanceAiInput.vue';
import { useInstanceAiStore } from '../instanceAi.store';

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(),
}));

const renderComponent = createComponentRenderer(InstanceAiInput, {
	global: {
		plugins: [createTestingPinia()],
		stubs: {
			ChatInputBase: {
				props: ['placeholder', 'disabled', 'canSubmit'],
				template:
					'<div><input :placeholder="placeholder" :disabled="disabled" data-test-id="chat-input" /></div>',
			},
			N8nTooltip: { template: '<div><slot /></div>' },
		},
	},
});

describe('InstanceAiInput', () => {
	it('disables freeform input while a template choice is pending', () => {
		vi.mocked(useInstanceAiStore).mockReturnValue({
			amendContext: null,
			contextualSuggestion: null,
			pendingConfirmations: [],
			researchMode: false,
			hasBlockingTemplateChoice: true,
			toggleResearchMode: vi.fn(),
		} as never);

		renderComponent({ props: { isStreaming: false } });

		const input = screen.getByTestId('chat-input');
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute('placeholder', 'Choose a template to continue.');
	});

	it('shows a question-specific placeholder during template adaptation follow-up questions', () => {
		vi.mocked(useInstanceAiStore).mockReturnValue({
			amendContext: null,
			contextualSuggestion: null,
			pendingConfirmations: [
				{
					toolCall: {
						toolCallId: 'tc-choose',
						toolName: 'choose-workflow-template',
						args: {},
						isLoading: true,
						confirmation: {
							requestId: 'req-2',
							severity: 'info',
							message: 'What would you like to change?',
							inputType: 'questions',
						},
					},
				},
			],
			researchMode: false,
			hasBlockingTemplateChoice: true,
			toggleResearchMode: vi.fn(),
		} as never);

		renderComponent({ props: { isStreaming: false } });

		const input = screen.getByTestId('chat-input');
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute('placeholder', 'Answer the pending question to continue.');
	});

	it('allows input when no template choice is pending', () => {
		vi.mocked(useInstanceAiStore).mockReturnValue({
			amendContext: null,
			contextualSuggestion: null,
			pendingConfirmations: [],
			researchMode: false,
			hasBlockingTemplateChoice: false,
			toggleResearchMode: vi.fn(),
		} as never);

		renderComponent({ props: { isStreaming: false } });

		const input = screen.getByTestId('chat-input');
		expect(input).not.toBeDisabled();
	});
});
