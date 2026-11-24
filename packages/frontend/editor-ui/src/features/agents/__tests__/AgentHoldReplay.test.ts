import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import AgentHeldActionsTray from '../components/chatMode/AgentHeldActionsTray.vue';
import AgentRunHeldActionsModal from '../components/chatMode/AgentRunHeldActionsModal.vue';
import AgentTestRunEmptyState from '../components/chatMode/AgentTestRunEmptyState.vue';
import {
	extractHeldActions,
	formatCommitTime,
	isHeldWriteToolCall,
	type AgentHeldAction,
} from '../components/chatMode/heldActions';
import { useAgentHeldActions } from '../components/chatMode/useAgentHeldActions';
import { TOOL_CALL_STATE } from '../constants';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

const commitAgentTestRunActionsMock = vi.fn();

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../composables/useAgentApi')>();
	return {
		...actual,
		commitAgentTestRunActions: (...args: unknown[]) => commitAgentTestRunActionsMock(...args),
	};
});

const sampleActions: AgentHeldAction[] = [
	{
		actionId: 'call-1',
		toolName: 'slack__post_message',
		appName: 'Slack',
		actionLabel: 'Post message',
		target: '#ops',
		input: { channel: '#ops', text: 'Deployment finished' },
		icon: 'message-square',
	},
	{
		actionId: 'call-2',
		toolName: 'linear__create_issue',
		appName: 'Linear',
		actionLabel: 'Create issue',
		target: 'ENG-123',
		input: { identifier: 'ENG-123', title: 'Follow up on release' },
		icon: 'check-square',
	},
];

describe('heldActions helpers', () => {
	it('selects only simulated tool calls with world_write evidence', () => {
		const calls: ToolCall[] = [
			{
				tool: 'linear__get_issue',
				toolCallId: 'read-1',
				state: TOOL_CALL_STATE.DONE,
				simulation: { route: 'simulated', reason: 'served_from_world', evidence: ['real_read'] },
			},
			{
				tool: 'slack__post_message',
				toolCallId: 'write-1',
				input: { channel: '#support', text: 'Hello' },
				state: TOOL_CALL_STATE.DONE,
				simulation: { route: 'simulated', reason: 'served_from_world', evidence: ['world_write'] },
			},
			{
				tool: 'custom__webhook',
				toolCallId: 'blocked-1',
				state: TOOL_CALL_STATE.DONE,
				simulation: { route: 'blocked', reason: 'not_simulatable' },
			},
		];

		expect(isHeldWriteToolCall(calls[0])).toBe(false);
		expect(isHeldWriteToolCall(calls[1])).toBe(true);
		expect(isHeldWriteToolCall(calls[2])).toBe(false);

		const held = extractHeldActions(calls);
		expect(held).toHaveLength(1);
		expect(held[0]).toMatchObject({
			actionId: 'write-1',
			toolName: 'slack__post_message',
			appName: 'Slack',
			actionLabel: 'Post message',
			target: '#support',
			icon: 'message-square',
			nodeType: 'n8n-nodes-base.slack',
		});
	});

	it('formats committedAt timestamps as HH:MM', () => {
		const date = new Date(2026, 10, 20, 9, 5, 0);
		expect(formatCommitTime(date.toISOString())).toBe('09:05');
		expect(formatCommitTime('not-a-date')).toBe('');
	});
});

describe('AgentTestRunEmptyState', () => {
	const renderEmptyState = createComponentRenderer(AgentTestRunEmptyState);

	it('renders the safe-testing title, two bullets, and clickable starter chips', async () => {
		const { getByTestId, getAllByTestId, emitted } = renderEmptyState({
			props: {
				agentConfig: { name: 'Support Agent', instructions: '', model: 'openai/gpt-4o' },
				starterPrompts: ['Check open tickets', 'Draft a weekly summary'],
			},
		});

		expect(getByTestId('agent-test-run-empty-title')).toHaveTextContent(
			'Test Support Agent safely',
		);
		expect(getByTestId('agent-test-run-empty-bullets')).toHaveTextContent(
			'Looks things up in your apps for real',
		);
		expect(getByTestId('agent-test-run-empty-bullets')).toHaveTextContent(
			'Holds every send and change for you to review',
		);

		const chips = getAllByTestId('agent-test-run-starter-chip');
		expect(chips).toHaveLength(2);
		await fireEvent.click(chips[0]);
		expect(emitted('select-prompt')).toEqual([['Check open tickets']]);
	});

	it('falls back to a generic title when the agent has no name', () => {
		const { getByTestId } = renderEmptyState({
			props: { agentConfig: null },
		});

		expect(getByTestId('agent-test-run-empty-title')).toHaveTextContent('Test this agent safely');
	});
});

describe('AgentHeldActionsTray', () => {
	const renderTray = createComponentRenderer(AgentHeldActionsTray, { pinia: createTestingPinia() });

	it('shows N actions on hold, expands previews, and emits run-actions', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, emitted } = renderTray({
			props: { actions: sampleActions },
		});

		expect(getByTestId('agent-held-actions-count')).toHaveTextContent('2 actions on hold');
		expect(queryByTestId('agent-held-actions-body')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('agent-held-actions-toggle'));
		await waitFor(() =>
			expect(getByTestId('agent-held-actions-note')).toHaveTextContent(
				'Nothing was sent or saved.',
			),
		);
		expect(getAllByTestId('agent-held-action-preview')).toHaveLength(2);

		// Expand first per-app preview
		const previewToggles = getAllByTestId('agent-held-action-preview-toggle');
		await fireEvent.click(previewToggles[0]);
		await waitFor(() =>
			expect(getByTestId('agent-held-action-preview-body')).toHaveTextContent(
				'Deployment finished',
			),
		);

		// Click Run N actions
		const runBtn = getByTestId('agent-held-actions-run-btn');
		expect(runBtn).toHaveTextContent('Run 2 actions');
		await fireEvent.click(runBtn);
		expect(emitted('run-actions')).toEqual([[sampleActions]]);
	});

	it('updates in place to committed banner and done summary after commit', () => {
		const committedAt = new Date(2026, 10, 20, 14, 7, 0).toISOString();
		const { getByTestId, queryByTestId } = renderTray({
			props: {
				actions: sampleActions,
				committed: {
					committedAt,
					results: [
						{ actionId: 'call-1', toolName: 'slack__post_message', status: 'done' },
						{ actionId: 'call-2', toolName: 'linear__create_issue', status: 'done' },
					],
				},
			},
		});

		expect(getByTestId('agent-held-actions-committed-banner')).toHaveTextContent(
			'2 actions sent to your apps',
		);
		expect(getByTestId('agent-held-actions-done-summary')).toHaveTextContent(
			'Done in your real apps at 14:07.',
		);
		expect(queryByTestId('agent-held-actions-run-btn')).not.toBeInTheDocument();
	});
});

describe('AgentRunHeldActionsModal', () => {
	const renderModal = createComponentRenderer(AgentRunHeldActionsModal, {
		pinia: createTestingPinia(),
		global: { stubs: { AgentModal: AgentModalTestStub } },
	});

	it('lists each action with its target and emits confirm', async () => {
		const { emitted } = renderModal({
			props: { open: true, actions: sampleActions },
		});

		expect(
			screen.getByRole('heading', { name: 'Run these actions for real?' }),
		).toBeInTheDocument();
		const items = screen.getAllByTestId('agent-run-held-actions-item');
		expect(items).toHaveLength(2);
		expect(screen.getByTestId('agent-run-held-actions-description')).toHaveTextContent(
			"These actions from this test will run in your real apps. This can't be undone.",
		);
		expect(items[0]).toHaveTextContent('Post message');
		expect(items[0]).toHaveTextContent('Slack · #ops');
		expect(items[1]).toHaveTextContent('Create issue');
		expect(items[1]).toHaveTextContent('Linear · ENG-123');

		await fireEvent.click(screen.getByTestId('agent-run-held-actions-confirm'));
		expect(emitted('confirm')).toHaveLength(1);
	});
});

describe('useAgentHeldActions', () => {
	beforeEach(() => {
		commitAgentTestRunActionsMock.mockReset();
	});

	it('commits held actions and stores the response per reply', async () => {
		const committedAt = new Date(2026, 10, 20, 15, 30, 0).toISOString();
		const response = {
			committedAt,
			results: [
				{ actionId: 'call-1', toolName: 'slack__post_message', status: 'done' },
				{ actionId: 'call-2', toolName: 'linear__create_issue', status: 'done' },
			],
		};
		commitAgentTestRunActionsMock.mockResolvedValueOnce(response);

		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId: ref('chat-1'),
		});

		state.openConfirmModal('reply-1', sampleActions);
		expect(state.confirmModalOpen.value).toBe(true);

		expect(await state.confirmCommit()).toBe(true);
		expect(commitAgentTestRunActionsMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			{
				testChatId: 'chat-1',
				actionIds: ['call-1', 'call-2'],
			},
		);
		expect(state.confirmModalOpen.value).toBe(false);
		expect(state.committedByReply.value['reply-1']).toEqual(response);
	});
});
