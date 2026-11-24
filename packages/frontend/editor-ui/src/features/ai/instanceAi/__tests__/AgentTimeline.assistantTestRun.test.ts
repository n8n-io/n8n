import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';

const renderComponent = createThreadComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			ThinkingBlock: { template: '<div data-test-id="thinking-block-stub" />' },
			AgentSection: { template: '<div />' },
			TimelineTextSegment: { template: '<div />' },
		},
	},
});

const simulatedResult = {
	status: 'completed',
	simulated: true,
	agentId: 'agent-1',
	projectId: 'project-1',
	agentName: 'Support notifier',
	sessionId: 'test-chat-42',
	executionId: 'exec-1',
	response: 'I drafted the email and Slack message.',
	simulationNote:
		'This was a simulated test run. No real emails, messages, or external writes were sent.',
	simulation: {
		worldId: 'world-1',
		toolCalls: [
			{
				toolCallId: 'tc-email',
				toolName: 'send_email',
				route: 'simulated_made_up',
				reason: 'invented_by_llm',
				preview: {
					kind: 'email',
					toolName: 'send_email',
					to: ['customer@example.com'],
					subject: 'Refund update',
					body: 'Your refund is on the way.',
				},
			},
			{
				toolCallId: 'tc-slack',
				toolName: 'Send_Slack',
				route: 'simulated',
				reason: 'served_from_world',
				preview: {
					kind: 'chatMessage',
					toolName: 'Send_Slack',
					channel: '#support',
					text: 'Escalated refund for customer@example.com',
				},
			},
			{
				toolCallId: 'tc-blocked',
				toolName: 'run_code',
				route: 'blocked',
				reason: 'not_simulatable',
				detail: 'Custom code cannot run in a test run.',
			},
		],
		localToolCalls: [{ toolCallId: 'tc-local', toolName: 'load_skill' }],
	},
};

function makeNode(toolCallOverrides: Record<string, unknown> = {}): InstanceAiAgentNode {
	return {
		agentId: 'root',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [
			{
				toolCallId: 'tc-call-agent',
				toolName: 'agent_builder_call_agent',
				args: { message: 'Send refund email and notify Slack' },
				isLoading: false,
				result: simulatedResult,
				...toolCallOverrides,
			},
		],
		children: [],
		timeline: [{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-call-agent' }],
	} as unknown as InstanceAiAgentNode;
}

describe('AgentTimeline assistant test run card', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('renders AgentAssistantTestRunCard with email and Slack previews and blocked/local calls', async () => {
		const openAgentChatPreview = vi.fn(() => true);
		const { getByTestId, getByRole, getByText, container } = renderComponent({
			props: { agentNode: makeNode() },
			global: {
				provide: { openAgentChatPreview },
			},
		});

		const card = getByTestId('agent-assistant-test-run-card');
		expect(card).toBeVisible();
		expect(getByText('Support notifier')).toBeVisible();
		expect(getByText('Test run', { exact: true })).toBeVisible();

		await userEvent.click(getByRole('button', { name: 'Test run details' }));

		const emailRow = within(
			container.querySelector<HTMLElement>('[data-tool-call-id="tc-email"]')!,
		);
		expect(emailRow.getByText('Refund update')).toBeVisible();
		expect(emailRow.getByText('customer@example.com')).toBeVisible();
		expect(emailRow.getByText('Your refund is on the way.')).toBeVisible();
		expect(emailRow.getByText('Not sent in this test run')).toBeVisible();

		const slackRow = within(
			container.querySelector<HTMLElement>('[data-tool-call-id="tc-slack"]')!,
		);
		expect(slackRow.getByText('#support')).toBeVisible();
		expect(slackRow.getByText('Escalated refund for customer@example.com')).toBeVisible();
		expect(slackRow.getByText('Not sent in this test run')).toBeVisible();

		const blockedRow = within(
			container.querySelector<HTMLElement>('[data-tool-call-id="tc-blocked"]')!,
		);
		expect(blockedRow.getByText('run_code')).toBeVisible();
		expect(blockedRow.queryByText('Not sent in this test run')).not.toBeInTheDocument();

		const localRow = within(
			container.querySelector<HTMLElement>('[data-tool-call-id="tc-local"]')!,
		);
		expect(localRow.getByText('load_skill')).toBeVisible();

		await userEvent.click(getByRole('button', { name: 'Open test chat' }));
		expect(openAgentChatPreview).toHaveBeenCalledExactlyOnceWith(
			'agent-1',
			'project-1',
			'test-chat-42',
		);
	});

	it('does not render the test run card for non-simulated historical results', () => {
		const { queryByTestId } = renderComponent({
			props: {
				agentNode: makeNode({
					result: {
						status: 'completed',
						response: 'Hello',
						sessionId: 'old-session',
						executionId: 'exec-old',
					},
				}),
			},
		});

		expect(queryByTestId('agent-assistant-test-run-card')).not.toBeInTheDocument();
		expect(queryByTestId('thinking-block-stub')).toBeInTheDocument();
	});

	it('keeps an in-flight call_agent inside the thinking block until it finishes', () => {
		const { queryByTestId } = renderComponent({
			props: {
				agentNode: makeNode({
					isLoading: true,
					result: undefined,
				}),
			},
		});

		expect(queryByTestId('agent-assistant-test-run-card')).not.toBeInTheDocument();
		expect(queryByTestId('thinking-block-stub')).toBeInTheDocument();
	});
});
