import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentTimeline from '../components/AgentTimeline.vue';

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(() => ({
		resolveConfirmation: vi.fn(),
		confirmAction: vi.fn(),
	})),
}));

const renderComponent = createComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			InstanceAiMarkdown: {
				props: ['content'],
				template: '<div data-test-id="markdown">{{ content }}</div>',
			},
			AgentSection: { template: '<div data-test-id="agent-section" />' },
			ArtifactCard: { template: '<div data-test-id="artifact-card" />' },
			ToolCallStep: { template: '<div data-test-id="tool-call-step" />' },
			DelegateCard: { template: '<div data-test-id="delegate-card" />' },
			TaskChecklist: { template: '<div data-test-id="task-checklist" />' },
			AnsweredQuestions: { template: '<div data-test-id="answered-questions" />' },
			PlanReviewPanel: { template: '<div data-test-id="plan-review" />' },
			TemplateChoiceSummary: {
				props: ['toolCall'],
				template:
					// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
					'<div data-test-id="template-choice-summary">{{ toolCall.result?.action === "use_now" ? `Opened template "${toolCall.result.templateName}"` : `Adapting "${toolCall.result?.templateName}" as reference` }}</div>',
			},
		},
	},
});

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-nodes',
		args: {},
		isLoading: false,
		renderHint: 'default',
		...overrides,
	};
}

function makeAgentNode(toolCall: InstanceAiToolCallState): InstanceAiAgentNode {
	return {
		agentId: 'agent-root',
		role: 'assistant',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [toolCall],
		children: [],
		timeline: [{ type: 'tool-call', toolCallId: toolCall.toolCallId }],
	};
}

function makeAgentNodeWithToolCalls(toolCalls: InstanceAiToolCallState[]): InstanceAiAgentNode {
	return {
		agentId: 'agent-root',
		role: 'assistant',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls,
		children: [],
		timeline: toolCalls.map((toolCall) => ({
			type: 'tool-call' as const,
			toolCallId: toolCall.toolCallId,
		})),
	};
}

describe('AgentTimeline', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

	it('suppresses the chooser tool row while template choice is pending', () => {
		const toolCall = makeToolCall({
			toolCallId: 'tc-choose',
			toolName: 'choose-workflow-template',
			isLoading: true,
			confirmation: {
				requestId: 'req-1',
				severity: 'info',
				message: 'Pick one',
				inputType: 'template-choice',
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
		});

		const { queryByTestId } = renderComponent({
			props: { agentNode: makeAgentNode(toolCall) },
		});

		expect(queryByTestId('tool-call-step')).not.toBeInTheDocument();
		expect(queryByTestId('template-choice-summary')).not.toBeInTheDocument();
	});

	it('suppresses the chooser tool row for legacy template-choice payloads', () => {
		const toolCall = makeToolCall({
			toolCallId: 'tc-choose',
			toolName: 'choose-workflow-template',
			args: {
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
				introMessage: 'Pick one',
			},
			isLoading: true,
			confirmation: {
				requestId: 'req-1',
				severity: 'info',
				message: 'Pick one',
			},
		});

		const { queryByTestId } = renderComponent({
			props: { agentNode: makeAgentNode(toolCall) },
		});

		expect(queryByTestId('tool-call-step')).not.toBeInTheDocument();
		expect(queryByTestId('template-choice-summary')).not.toBeInTheDocument();
	});

	it('renders a compact summary after template choice resolves', () => {
		const toolCall = makeToolCall({
			toolCallId: 'tc-choose',
			toolName: 'choose-workflow-template',
			isLoading: false,
			result: {
				selected: true,
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
			confirmation: {
				requestId: 'req-1',
				severity: 'info',
				message: 'Pick one',
				inputType: 'template-choice',
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			props: { agentNode: makeAgentNode(toolCall) },
		});

		expect(getByTestId('template-choice-summary')).toHaveTextContent(
			'Adapting "Slack alert triage" as reference',
		);
		expect(queryByTestId('tool-call-step')).not.toBeInTheDocument();
	});

	it('renders a compact summary for legacy template-choice payloads after resolution', () => {
		const toolCall = makeToolCall({
			toolCallId: 'tc-choose',
			toolName: 'choose-workflow-template',
			args: {
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
				introMessage: 'Pick one',
			},
			isLoading: false,
			result: {
				selected: true,
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
			confirmation: {
				requestId: 'req-1',
				severity: 'info',
				message: 'Pick one',
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			props: { agentNode: makeAgentNode(toolCall) },
		});

		expect(getByTestId('template-choice-summary')).toHaveTextContent(
			'Adapting "Slack alert triage" as reference',
		);
		expect(queryByTestId('tool-call-step')).not.toBeInTheDocument();
	});

	it('suppresses raw template search steps when a chooser flow exists in the same turn', () => {
		const searchToolCall = makeToolCall({
			toolCallId: 'tc-search',
			toolName: 'search-workflow-templates',
			isLoading: false,
			result: {
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
		});
		const chooserToolCall = makeToolCall({
			toolCallId: 'tc-choose',
			toolName: 'choose-workflow-template',
			isLoading: false,
			result: {
				selected: true,
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
			confirmation: {
				requestId: 'req-1',
				severity: 'info',
				message: 'Pick one',
				inputType: 'template-choice',
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
		});

		const { getByTestId, queryByTestId, queryAllByTestId } = renderComponent({
			props: { agentNode: makeAgentNodeWithToolCalls([searchToolCall, chooserToolCall]) },
		});

		expect(getByTestId('template-choice-summary')).toHaveTextContent(
			'Adapting "Slack alert triage" as reference',
		);
		expect(queryAllByTestId('tool-call-step')).toHaveLength(0);
		expect(queryByTestId('delegate-card')).not.toBeInTheDocument();
	});

	it('renders the template summary and answered questions after chooser follow-up questions resolve', () => {
		const toolCall = makeToolCall({
			toolCallId: 'tc-choose',
			toolName: 'choose-workflow-template',
			args: {
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
			isLoading: false,
			result: {
				selected: true,
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
				answers: [
					{
						questionId: 'template_changes',
						selectedOptions: [],
						customText: 'Nothing',
					},
				],
			},
			confirmation: {
				requestId: 'req-2',
				severity: 'info',
				message: 'What would you like to change?',
				inputType: 'questions',
				questions: [
					{
						id: 'template_changes',
						question: 'What would you like to change?',
						type: 'text',
					},
				],
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			props: { agentNode: makeAgentNode(toolCall) },
		});

		expect(getByTestId('template-choice-summary')).toHaveTextContent(
			'Adapting "Slack alert triage" as reference',
		);
		expect(getByTestId('answered-questions')).toBeInTheDocument();
		expect(queryByTestId('tool-call-step')).not.toBeInTheDocument();
	});
});
