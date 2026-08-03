import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ChatGreetings from './ChatGreetings.vue';
import type { ChatModelDto } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(ChatGreetings, {
	global: {
		stubs: {
			ChatAgentAvatar: { template: '<div data-test-id="agent-avatar" />' },
		},
	},
});

const createAgent = (overrides: Partial<ChatModelDto> = {}): ChatModelDto => ({
	model: { provider: 'n8n', workflowId: 'wf-1' },
	name: 'My Agent',
	description: 'Helps with tasks',
	icon: null,
	updatedAt: null,
	createdAt: null,
	metadata: {
		capabilities: { functionCalling: false },
		available: true,
		allowFileUploads: true,
		allowedFilesMimeTypes: 'text/*',
	},
	groupName: null,
	groupIcon: null,
	...overrides,
});

describe('ChatGreetings', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();
	});

	describe('agent model (n8n provider)', () => {
		it('displays agent name and description', () => {
			const agent = createAgent({
				name: 'Sales Bot',
				description: 'Handles sales inquiries',
			});

			const { getByText } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			expect(getByText('Sales Bot')).toBeInTheDocument();
			expect(getByText('Handles sales inquiries')).toBeInTheDocument();
		});

		it('does not render description when agent has none', () => {
			const agent = createAgent({ description: null });

			const { queryByText } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			expect(queryByText('Helps with tasks')).not.toBeInTheDocument();
		});

		it('displays suggested prompts', () => {
			const agent = createAgent({
				suggestedPrompts: [{ text: 'Help me write an email' }, { text: 'Summarize this document' }],
			});

			const { getByText } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			expect(getByText('Help me write an email')).toBeInTheDocument();
			expect(getByText('Summarize this document')).toBeInTheDocument();
		});

		it('emits select-prompt when a suggested prompt is clicked', async () => {
			const agent = createAgent({
				suggestedPrompts: [{ text: 'Draft a report' }],
			});

			const { getByText, emitted } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			await userEvent.click(getByText('Draft a report'));

			expect(emitted('select-prompt')).toEqual([['Draft a report']]);
		});

		it('does not render suggested prompts when list is empty', () => {
			const agent = createAgent({ suggestedPrompts: [] });

			const { queryByText } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			expect(queryByText('Help me write an email')).not.toBeInTheDocument();
		});

		it('truncates long agent names', () => {
			const longName = 'A'.repeat(50);
			const agent = createAgent({ name: longName });

			const { getByText } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			expect(getByText('A'.repeat(40) + '...')).toBeInTheDocument();
		});
	});

	describe('loading state', () => {
		it('shows loading skeletons instead of agent details when loading', () => {
			const agent = createAgent({ name: 'Sales Bot', description: 'I handle inquiries' });

			const { queryByText, container } = renderComponent({
				props: { selectedAgent: agent, loading: true },
				pinia,
			});

			// Agent name and description should not be visible
			expect(queryByText('Sales Bot')).not.toBeInTheDocument();
			expect(queryByText('I handle inquiries')).not.toBeInTheDocument();

			// Loading skeletons should be rendered (N8nLoading components)
			const loadingElements = container.querySelectorAll('.n8n-loading');
			expect(loadingElements.length).toBeGreaterThan(0);
		});

		it('does not show suggested prompts when loading', () => {
			const agent = createAgent({
				suggestedPrompts: [{ text: 'Help me' }],
			});

			const { queryByText } = renderComponent({
				props: { selectedAgent: agent, loading: true },
				pinia,
			});

			expect(queryByText('Help me')).not.toBeInTheDocument();
		});
	});

	describe('LLM provider model (non workflow agent)', () => {
		it('shows greeting text with agent name for LLM provider', () => {
			const agent = createAgent({
				model: { provider: 'openai', model: 'gpt-4' },
				name: 'GPT-4',
			});

			const { getByText } = renderComponent({
				props: { selectedAgent: agent },
				pinia,
			});

			expect(getByText('GPT-4')).toBeInTheDocument();
		});

		it('shows fallback greeting when no agent is selected', () => {
			const { getByText } = renderComponent({
				props: { selectedAgent: null },
				pinia,
			});

			expect(getByText('Select a model to start chatting')).toBeInTheDocument();
		});
	});
});
