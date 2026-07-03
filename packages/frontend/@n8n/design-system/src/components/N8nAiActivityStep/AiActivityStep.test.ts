import { render } from '@testing-library/vue';

import AiActivityStep from './AiActivityStep.vue';

type ToolCallState = InstanceType<typeof AiActivityStep>['$props']['toolCall'];

const global = {
	stubs: {
		CollapsibleRoot: { template: '<div><slot :open="true" /></div>' },
		CollapsibleTrigger: { template: '<button><slot /></button>' },
		CollapsibleContent: { template: '<div><slot /></div>' },
		N8nButton: { template: '<div data-test-id="timeline-step-button"><slot /></div>' },
		N8nIcon: { template: '<span class="n8n-icon" />' },
	},
};

function makeToolCall(overrides: Partial<ToolCallState> = {}): ToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-nodes',
		args: { query: 'slack' },
		isLoading: false,
		...overrides,
	};
}

describe('N8nAiActivityStep', () => {
	it('should render without throwing', () => {
		expect(() =>
			render(AiActivityStep, { props: { toolCall: makeToolCall() }, global }),
		).not.toThrow();
	});

	it('should display the tool label', () => {
		const { getByText } = render(AiActivityStep, {
			props: { toolCall: makeToolCall({ toolName: 'search-nodes' }) },
			global,
		});

		expect(getByText('Search nodes')).toBeInTheDocument();
	});

	it('should use custom label when provided', () => {
		const { getByText } = render(AiActivityStep, {
			props: { toolCall: makeToolCall(), label: 'Custom Label' },
			global,
		});

		expect(getByText('Custom Label')).toBeInTheDocument();
	});

	it('should show loading affordance when loading', () => {
		const { getByText } = render(AiActivityStep, {
			props: { toolCall: makeToolCall({ isLoading: true }) },
			global,
		});

		expect(getByText('Search nodes').className).toContain('shimmer');
	});

	it('should show error text when tool call has error', () => {
		const { getByText } = render(AiActivityStep, {
			props: {
				toolCall: makeToolCall({
					error: 'Something went wrong',
					result: undefined,
				}),
			},
			global,
		});

		expect(getByText('Something went wrong')).toBeInTheDocument();
	});

	it('should append role to delegate tool label', () => {
		const { getByText } = render(AiActivityStep, {
			props: {
				toolCall: makeToolCall({
					toolName: 'delegate',
					args: { role: 'workflow-builder' },
				}),
			},
			global,
		});

		expect(getByText('Delegate (workflow-builder)')).toBeInTheDocument();
	});

	it('should append query to research web-search tool label', () => {
		const { getByText } = render(AiActivityStep, {
			props: {
				toolCall: makeToolCall({
					toolName: 'research',
					args: { action: 'web-search', query: 'n8n docs' },
				}),
			},
			global,
		});

		expect(getByText('Research: "n8n docs"')).toBeInTheDocument();
	});

	it('should show result data when expanded', () => {
		const { getByText } = render(AiActivityStep, {
			props: {
				toolCall: makeToolCall({
					result: { nodes: ['Slack'] },
				}),
			},
			global,
		});

		expect(getByText(/Slack/)).toBeInTheDocument();
	});

	it('should show args data when expanded', () => {
		const { getByText } = render(AiActivityStep, {
			props: {
				toolCall: makeToolCall({
					args: { query: 'test' },
					result: { data: [] },
				}),
			},
			global,
		});

		expect(getByText(/test/)).toBeInTheDocument();
	});
});
