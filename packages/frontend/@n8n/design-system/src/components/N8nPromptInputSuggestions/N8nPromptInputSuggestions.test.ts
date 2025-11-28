import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';

import N8nPromptInputSuggestions from './N8nPromptInputSuggestions.vue';
import type { WorkflowSuggestion } from '../../types/assistant';

const mockSuggestions: WorkflowSuggestion[] = [
	{
		id: 'test-1',
		summary: 'Test Suggestion 1',
		prompt: 'This is test prompt 1',
	},
	{
		id: 'test-2',
		summary: 'Test Suggestion 2',
		prompt: 'This is test prompt 2',
	},
	{
		id: 'test-3',
		summary: 'Test Suggestion 3',
		prompt: 'This is test prompt 3',
	},
];

describe('N8nPromptInputSuggestions', () => {
	it('renders correctly with default props', () => {
		const { container } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders all suggestion pills', () => {
		const { getByText } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
			},
		});
		mockSuggestions.forEach((suggestion) => {
			expect(getByText(suggestion.summary)).toBeTruthy();
		});
	});

	it('emits suggestion-click event when pill is clicked', () => {
		const { getByText, emitted } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
			},
		});

		const firstPill = getByText(mockSuggestions[0].summary) as unknown as HTMLInputElement;
		firstPill.click();

		expect(emitted()).toHaveProperty('suggestionClick');
		expect(emitted().suggestionClick[0]).toEqual([mockSuggestions[0]]);
	});

	it('hides suggestion pills when streaming', () => {
		const { container } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
				streaming: true,
			},
		});

		const pillsContainer = container.querySelector('[role="group"]');
		expect(pillsContainer).toBeFalsy();
	});

	it('disables pills when disabled prop is true', () => {
		const { getByText } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
				disabled: true,
			},
		});

		const firstPill = getByText(mockSuggestions[0].summary) as unknown as HTMLInputElement;
		expect(firstPill.disabled).toBe(true);
	});

	it('does not render suggestion pills when suggestions array is empty', () => {
		const { container } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: [],
			},
		});

		const pillsContainer = container.querySelector('[role="group"]');
		expect(pillsContainer).toBeFalsy();
	});

	it('renders prompt-input slot content', () => {
		const { getByTestId } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
			},
			slots: {
				'prompt-input': '<div data-test-id="custom-prompt">Custom Prompt Input</div>',
			},
		});

		expect(getByTestId('custom-prompt')).toBeTruthy();
	});

	it('renders footer slot content', () => {
		const { getByTestId } = render(N8nPromptInputSuggestions, {
			props: {
				suggestions: mockSuggestions,
			},
			slots: {
				footer: '<div data-test-id="custom-footer">Custom Footer</div>',
			},
		});

		expect(getByTestId('custom-footer')).toBeTruthy();
	});
});
