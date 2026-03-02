import { createComponentRenderer } from '@/__tests__/render';
import ChatSuggestedPrompts from './ChatSuggestedPrompts.vue';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(ChatSuggestedPrompts);

describe('ChatSuggestedPrompts', () => {
	it('renders all prompt texts', () => {
		const { getByText } = renderComponent({
			props: {
				prompts: [{ text: 'Summarize this' }, { text: 'Translate to French' }],
			},
		});

		expect(getByText('Summarize this')).toBeInTheDocument();
		expect(getByText('Translate to French')).toBeInTheDocument();
	});

	it('emits select with the prompt text when clicked', async () => {
		const { getByText, emitted } = renderComponent({
			props: {
				prompts: [{ text: 'Draft a report' }, { text: 'Write a summary' }],
			},
		});

		await userEvent.click(getByText('Draft a report'));

		expect(emitted('select')).toEqual([['Draft a report']]);
	});

	it('renders emoji in icon slot when icon type is emoji', () => {
		const { getByText } = renderComponent({
			props: {
				prompts: [{ text: 'Translate', icon: { type: 'emoji' as const, value: '🇪🇸' } }],
			},
		});

		expect(getByText('🇪🇸')).toBeInTheDocument();
	});

	it('renders nothing when prompts array is empty', () => {
		const { container } = renderComponent({
			props: { prompts: [] },
		});

		expect(container.querySelectorAll('button')).toHaveLength(0);
	});
});
