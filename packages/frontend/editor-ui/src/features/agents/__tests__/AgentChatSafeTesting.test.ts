import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	AGENT_SAFE_TESTING_FLAG,
	type AgentPersistedMessageDto,
	type ToolTestCapability,
} from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { usePostHog } from '@/app/stores/posthog.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { mockedStore } from '@/__tests__/utils';
import { convertDbMessages } from '@/features/ai/shared/agentsChat/messageMappers';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import AgentChatToolSteps from '@/features/agents/components/AgentChatToolSteps.vue';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { TOOL_CALL_STATE } from '@/features/agents/constants';
import {
	clearTestChatMessages,
	getAgentTestRunTools,
	resetAgentTestRun,
	getChatMessages,
	getTestChatMessages,
	getAgentChatQueue,
} from '@/features/agents/composables/useAgentApi';

vi.mock('@/features/agents/composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/agents/composables/useAgentApi')>();
	return {
		...actual,
		clearTestChatMessages: vi.fn(),
		getAgentTestRunTools: vi.fn(),
		resetAgentTestRun: vi.fn(),
		getChatMessages: vi.fn(),
		getTestChatMessages: vi.fn(),
		getAgentChatQueue: vi.fn(),
	};
});

const trackStartedNewTestRunMock = vi.fn();
vi.mock('@/features/agents/composables/useAgentTelemetry', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/agents/composables/useAgentTelemetry')>();
	return {
		useAgentTelemetry: () => ({
			...actual.useAgentTelemetry(),
			trackStartedNewTestRun: trackStartedNewTestRunMock,
		}),
	};
});

const renderToolSteps = createComponentRenderer(AgentChatToolSteps);
const renderChatPanel = createComponentRenderer(AgentChatPanel);

describe('Safe testing labels, previews, reload persistence, and fresh test runs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getChatMessages).mockResolvedValue({
			messages: [],
			openSuspensions: [],
			activeExecutionId: null,
		});
		vi.mocked(getAgentChatQueue).mockResolvedValue({ items: [], steerableExecutionId: null });
		vi.mocked(resetAgentTestRun).mockResolvedValue({ reset: true });
	});

	it('keeps raw tool calls collapsed under the N tool calls toggle and shows how each ran after reload', () => {
		const persistedMessages: AgentPersistedMessageDto[] = [
			{
				id: 'exec-1:assistant',
				role: 'assistant',
				executionId: 'exec-1',
				executionStatus: 'success',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-email',
						toolName: 'gmail_send',
						state: 'resolved',
						input: {
							to: 'ana@example.com',
							subject: 'Your refund',
							body: 'We issued a refund of $42.00.',
						},
						output: { sent: true },
						simulation: {
							route: 'simulated',
							reason: 'served_from_world',
							evidence: ['world_write'],
						},
					},
					{
						type: 'tool-call',
						toolCallId: 'call-slack',
						toolName: 'slack_post_message',
						state: 'resolved',
						input: {
							channel: '#support',
							text: 'Refund issued for Ana.',
						},
						output: { ok: true },
						simulation: {
							route: 'simulated_made_up',
							reason: 'invented_by_llm',
						},
					},
				],
			},
		];

		const restored = convertDbMessages(persistedMessages);
		const reloadedToolCalls: ToolCall[] = restored[0]?.toolCalls ?? [];
		expect(reloadedToolCalls).toHaveLength(2);
		expect(reloadedToolCalls[0].simulation?.route).toBe('simulated');
		expect(reloadedToolCalls[1].simulation?.route).toBe('simulated_made_up');

		const { getByTestId, getByRole } = renderToolSteps({
			props: { toolCalls: reloadedToolCalls },
			pinia: createTestingPinia(),
		});

		// Raw tool calls stay collapsed by default under the "2 tool calls" disclosure toggle.
		const rawGroupToggle = getByRole('button', { name: /2 tool calls/i });
		expect(rawGroupToggle).toHaveAttribute('aria-expanded', 'false');

		const routeList = getByTestId('agent-tool-call-route-list');
		const routeRows = within(routeList).getAllByTestId('agent-tool-call-route-row');
		expect(routeRows).toHaveLength(2);
		expect(routeRows[0]).toHaveAttribute('data-route', 'simulated');
		expect(routeRows[1]).toHaveAttribute('data-route', 'simulated_made_up');
	});

	it('collapses even a single simulated raw tool call under the tool calls toggle', () => {
		const singleSimulatedCall: ToolCall = {
			tool: 'gmail_send',
			toolCallId: 'call-single',
			state: TOOL_CALL_STATE.DONE,
			input: { to: 'ana@example.com', subject: 'Hi', body: 'Hello' },
			output: { sent: true },
			simulation: {
				route: 'simulated',
				reason: 'served_from_world',
				evidence: ['world_write'],
			},
		};

		const { getByRole } = renderToolSteps({
			props: { toolCalls: [singleSimulatedCall] },
			pinia: createTestingPinia(),
		});

		const rawGroupToggle = getByRole('button', { name: /1 tool calls/i });
		expect(rawGroupToggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('collapses a single local tool call in a test run, which has no simulation', () => {
		const localCall: ToolCall = {
			tool: 'read_file',
			toolCallId: 'call-local',
			state: TOOL_CALL_STATE.DONE,
			input: { path: 'notes.md' },
			output: 'Notes',
		};

		const testRun = renderToolSteps({
			props: { toolCalls: [localCall], testRun: true },
			pinia: createTestingPinia(),
		});
		expect(testRun.getByRole('button', { name: /1 tool calls/i })).toHaveAttribute(
			'aria-expanded',
			'false',
		);
		testRun.unmount();

		const liveRun = renderToolSteps({
			props: { toolCalls: [localCall] },
			pinia: createTestingPinia(),
		});
		expect(liveRun.queryByRole('button', { name: /1 tool calls/i })).not.toBeInTheDocument();
	});

	it('does not show Fix with Assistant callout for a simulated blocked tool call', () => {
		const blockedCall: ToolCall = {
			tool: 'run_custom_code',
			toolCallId: 'call-blocked',
			state: TOOL_CALL_STATE.ERROR,
			output: 'This tool did not run because this is a test run.',
			simulation: {
				route: 'blocked',
				reason: 'not_simulatable',
				detail: 'Custom code tools cannot run in a test run.',
			},
		};

		const { queryByTestId, getByTestId } = renderToolSteps({
			props: {
				toolCalls: [blockedCall],
				canFixWithAssistant: true,
				executionId: 'exec-blocked',
			},
			pinia: createTestingPinia(),
		});

		expect(queryByTestId('agent-chat-tool-fix-with-assistant-callout')).not.toBeInTheDocument();
		expect(getByTestId('agent-tool-call-route-row')).toHaveAttribute('data-route', 'blocked');
	});

	it('lists unsupported tools before the first message and starts a fresh test run on reset', async () => {
		const tools: ToolTestCapability[] = [
			{ toolName: 'gmail_send', kind: 'node', testability: 'simulated' },
			{
				toolName: 'run_custom_code',
				kind: 'custom',
				testability: 'blocked',
				reason: 'not_simulatable',
				detail: 'Runs arbitrary code',
			},
		];
		vi.mocked(getAgentTestRunTools).mockResolvedValue({ tools });

		const pinia = createTestingPinia();
		const posthog = mockedStore(usePostHog);
		posthog.isVariantEnabled.mockImplementation(
			(flag, variant) => flag === AGENT_SAFE_TESTING_FLAG && variant === 'test',
		);
		const pushStore = mockedStore(usePushConnectionStore);
		pushStore.addEventListener.mockReturnValue(() => {});

		const { container, emitted } = renderChatPanel({
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				continueSessionId: 'session-1',
				agentConfig: {
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-5-5',
					instructions: 'Help users',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
				visible: true,
			},
			pinia,
		});

		await waitFor(() => {
			expect(getAgentTestRunTools).toHaveBeenCalledWith(expect.anything(), 'project-1', 'agent-1');
		});

		await waitFor(() => {
			const notice = container.querySelector('[data-testid="agent-test-run-tools"]');
			expect(notice).toBeInTheDocument();
			expect(notice).toHaveTextContent('run_custom_code');
			expect(notice).not.toHaveTextContent('gmail_send');
		});

		expect(
			container.querySelector('[data-testid="agent-test-run-changes-note"]'),
		).toBeInTheDocument();

		const newTestRunBtn = container.querySelector('[data-testid="agent-new-test-run-button"]');
		expect(newTestRunBtn).toBeInTheDocument();
		await fireEvent.click(newTestRunBtn!);

		await waitFor(() => {
			expect(resetAgentTestRun).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'session-1',
			);
		});
		expect(emitted('new-test-run')).toHaveLength(1);
		expect(trackStartedNewTestRunMock).toHaveBeenCalledExactlyOnceWith({
			agentId: 'agent-1',
			hadMessages: false,
		});
	});

	it('does not start a new test run in a chat that the panel opened during the reset', async () => {
		vi.mocked(getAgentTestRunTools).mockResolvedValue({
			tools: [
				{
					toolName: 'run_custom_code',
					kind: 'custom',
					testability: 'blocked',
					reason: 'not_simulatable',
				},
			],
		});
		let finishReset: (value: { reset: true }) => void = () => {};
		vi.mocked(resetAgentTestRun).mockReturnValue(
			new Promise((resolve) => {
				finishReset = resolve;
			}),
		);

		const pinia = createTestingPinia();
		const posthog = mockedStore(usePostHog);
		posthog.isVariantEnabled.mockImplementation(
			(flag, variant) => flag === AGENT_SAFE_TESTING_FLAG && variant === 'test',
		);
		const pushStore = mockedStore(usePushConnectionStore);
		pushStore.addEventListener.mockReturnValue(() => {});

		const { container, emitted, rerender } = renderChatPanel({
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				continueSessionId: 'session-1',
				agentConfig: {
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-5-5',
					instructions: 'Help users',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
				visible: true,
			},
			pinia,
		});

		await waitFor(() => {
			expect(container.querySelector('[data-testid="agent-test-run-tools"]')).toBeInTheDocument();
		});
		await fireEvent.click(container.querySelector('[data-testid="agent-new-test-run-button"]')!);
		await waitFor(() => {
			expect(resetAgentTestRun).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'session-1',
			);
		});

		await rerender({ continueSessionId: 'session-2' });
		finishReset({ reset: true });
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(emitted('new-test-run')).toBeUndefined();
		expect(trackStartedNewTestRunMock).not.toHaveBeenCalled();
	});

	it('tracks a new test run in a chat without a session only when the history clears', async () => {
		vi.mocked(getAgentTestRunTools).mockResolvedValue({
			tools: [
				{
					toolName: 'run_custom_code',
					kind: 'custom',
					testability: 'blocked',
					reason: 'not_simulatable',
				},
			],
		});
		vi.mocked(getTestChatMessages).mockResolvedValue({
			messages: [],
			openSuspensions: [],
			activeExecutionId: null,
		});
		vi.mocked(clearTestChatMessages).mockRejectedValueOnce(new Error('Request failed'));

		const pinia = createTestingPinia();
		const posthog = mockedStore(usePostHog);
		posthog.isVariantEnabled.mockImplementation(
			(flag, variant) => flag === AGENT_SAFE_TESTING_FLAG && variant === 'test',
		);
		const pushStore = mockedStore(usePushConnectionStore);
		pushStore.addEventListener.mockReturnValue(() => {});

		const { container } = renderChatPanel({
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				agentConfig: {
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-5-5',
					instructions: 'Help users',
				},
				agentStatus: 'draft',
				connectedTriggers: [],
				visible: true,
			},
			pinia,
		});
		const newTestRunButton = () =>
			container.querySelector('[data-testid="agent-new-test-run-button"]');
		// The button does nothing while the history loads.
		await waitFor(() => expect(getTestChatMessages).toHaveBeenCalled());
		await waitFor(() => expect(newTestRunButton()).toBeEnabled());

		await fireEvent.click(newTestRunButton()!);
		await waitFor(() => expect(clearTestChatMessages).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(newTestRunButton()).toBeEnabled());
		expect(trackStartedNewTestRunMock).not.toHaveBeenCalled();

		await fireEvent.click(newTestRunButton()!);
		await waitFor(() =>
			expect(trackStartedNewTestRunMock).toHaveBeenCalledExactlyOnceWith({
				agentId: 'agent-1',
				hadMessages: false,
			}),
		);
		expect(clearTestChatMessages).toHaveBeenCalledTimes(2);
	});
});
