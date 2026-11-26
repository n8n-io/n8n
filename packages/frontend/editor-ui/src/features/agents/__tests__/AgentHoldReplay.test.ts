import { ResponseError } from '@n8n/rest-api-client/utils';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import AgentHeldActionsTray from '../components/chatMode/AgentHeldActionsTray.vue';
import AgentTestChatSubHeader from '../components/chatMode/AgentTestChatSubHeader.vue';
import AgentRunHeldActionsModal from '../components/chatMode/AgentRunHeldActionsModal.vue';
import AgentTestRunEmptyState from '../components/chatMode/AgentTestRunEmptyState.vue';
import {
	actionObject,
	actionOutcome,
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

	it('keeps the verb of a tool name that starts with a verb', () => {
		const [held] = extractHeldActions([
			{
				tool: 'edit_message',
				toolCallId: 'write-1',
				state: TOOL_CALL_STATE.DONE,
				simulation: { route: 'simulated', reason: 'served_from_world', evidence: ['world_write'] },
			},
		]);

		expect(held.actionLabel).toBe('Edit message');
		expect(actionObject(held)).toBe('message');
		expect(actionOutcome(held)).toBe('saved');
	});

	it.each(['mcp_linear_create_issue', 'mcp__linear__create_issue'])(
		'reads the server of the MCP tool %s as its app',
		(tool) => {
			const [held] = extractHeldActions([
				{
					tool,
					toolCallId: 'write-mcp',
					state: TOOL_CALL_STATE.DONE,
					simulation: {
						route: 'simulated',
						reason: 'served_from_world',
						evidence: ['world_write'],
					},
				},
			]);

			expect(held.appName).toBe('Linear');
			expect(held.actionLabel).toBe('Create issue');
			expect(held.toolName).toBe(tool);
		},
	);

	it('formats committedAt timestamps as HH:MM', () => {
		const date = new Date(2026, 10, 20, 9, 5, 0);
		expect(formatCommitTime(date.toISOString())).toBe('09:05');
		expect(formatCommitTime('not-a-date')).toBe('');
	});
});

describe('actionObject and actionOutcome', () => {
	it.each([
		['Send email', 'Gmail', 'email', 'sent'],
		['Post message', 'Slack', 'message', 'sent'],
		['Append row', 'Google Sheets', 'row', 'saved'],
		['Create contact', 'HubSpot', 'contact', 'saved'],
		['Reply', 'Gmail', 'reply', 'sent'],
		['Send', 'Gmail', 'action', 'sent'],
		['Edit message', 'Slack', 'message', 'saved'],
		['Update message', 'Telegram', 'message', 'saved'],
		['Gmail', 'Gmail', 'action', 'saved'],
	] as const)('%s in %s is a %s that is %s', (actionLabel, appName, object, outcome) => {
		expect(actionObject({ actionLabel, appName })).toBe(object);
		expect(actionOutcome({ actionLabel, appName })).toBe(outcome);
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
			'Makes up replies from your apps, so nothing real is read',
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
		expect(
			getAllByTestId('agent-held-action-preview-toggle').map((row) => row.textContent),
		).toEqual([
			expect.stringContaining('Slack: message'),
			expect.stringContaining('Linear: issue'),
		]);

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

	it('does not emit run-actions while the run is disabled', async () => {
		const { getByTestId, emitted, rerender } = renderTray({
			props: { actions: sampleActions, runDisabled: true },
		});

		await fireEvent.click(getByTestId('agent-held-actions-toggle'));
		await waitFor(() => expect(getByTestId('agent-held-actions-run-btn')).toBeDisabled());
		await fireEvent.click(getByTestId('agent-held-actions-run-btn'));
		expect(emitted('run-actions')).toBeUndefined();

		await rerender({ runDisabled: false });
		expect(getByTestId('agent-held-actions-run-btn')).toBeEnabled();
		await fireEvent.click(getByTestId('agent-held-actions-run-btn'));
		expect(emitted('run-actions')).toEqual([[sampleActions]]);
	});

	it('updates in place to the done count and done summary after commit', () => {
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

		expect(getByTestId('agent-held-actions-committed-banner')).toHaveTextContent('2 actions done');
		expect(
			getByTestId('agent-held-actions-toggle').querySelector('[data-icon="check"]'),
		).toBeInTheDocument();
		expect(getByTestId('agent-held-actions-done-summary')).toHaveTextContent(
			'Done in your real apps at 14:07.',
		);
		expect(queryByTestId('agent-held-actions-run-btn')).not.toBeInTheDocument();
	});
	it('says what each action did once it ran, and keeps a failed one as it was', async () => {
		const { getByTestId, getAllByTestId } = renderTray({
			props: {
				actions: sampleActions,
				committed: {
					committedAt: new Date(2026, 10, 20, 14, 7, 0).toISOString(),
					results: [
						{ actionId: 'call-1', toolName: 'slack__post_message', status: 'done' },
						{
							actionId: 'call-2',
							toolName: 'linear__create_issue',
							status: 'failed',
							error: 'Team not found',
						},
					],
				},
			},
		});

		await waitFor(() => expect(getAllByTestId('agent-held-action-preview')).toHaveLength(2));
		// Only the failed row opens, so its error shows without a click.
		await waitFor(() => expect(getAllByTestId('agent-held-action-preview-body')).toHaveLength(1));
		expect(getByTestId('agent-held-action-preview-body')).toHaveTextContent('Team not found');
		expect(getByTestId('agent-held-actions-done-summary')).toHaveTextContent(
			'Some actions failed. The rest ran in your real apps at 14:07.',
		);
		const rows = getAllByTestId('agent-held-action-preview-toggle');
		expect(rows[0]).toHaveTextContent('Slack: message sent');
		expect(rows[1]).toHaveTextContent('Linear: issue');
		expect(rows[1]).not.toHaveTextContent('Linear: issue saved');
		expect(getByTestId('agent-held-action-failed')).toHaveTextContent('Failed');
		expect(getByTestId('agent-held-actions-committed-banner')).toHaveTextContent(
			'1 of 2 actions done',
		);
		expect(
			getByTestId('agent-held-actions-toggle').querySelector('[data-icon="check"]'),
		).not.toBeInTheDocument();
	});

	it('does not show a replay as a success when every action failed', async () => {
		const { getByTestId, getAllByTestId } = renderTray({
			props: {
				actions: sampleActions,
				committed: {
					committedAt: new Date(2026, 10, 20, 14, 7, 0).toISOString(),
					results: [
						{ actionId: 'call-1', toolName: 'slack__post_message', status: 'failed' },
						{ actionId: 'call-2', toolName: 'linear__create_issue', status: 'failed' },
					],
				},
			},
		});

		await waitFor(() => expect(getAllByTestId('agent-held-action-failed')).toHaveLength(2));
		const banner = getByTestId('agent-held-actions-committed-banner');
		expect(banner).toHaveTextContent('2 actions failed');
		expect(banner).not.toHaveTextContent('done');
		expect(getByTestId('agent-held-actions-done-summary')).toHaveTextContent(
			'Nothing was sent or saved. See why below.',
		);
		await waitFor(() => expect(getAllByTestId('agent-held-action-preview-body')).toHaveLength(2));
		expect(
			getByTestId('agent-held-actions-toggle').querySelector('[data-icon="check"]'),
		).not.toBeInTheDocument();
	});

	it('shows a saved row for an action that changed data', async () => {
		const { getAllByTestId } = renderTray({
			props: {
				actions: [sampleActions[1]],
				committed: {
					committedAt: new Date(2026, 10, 20, 14, 7, 0).toISOString(),
					results: [
						{ actionId: 'call-2', toolName: 'linear__create_issue', status: 'already_committed' },
					],
				},
			},
		});

		await waitFor(() =>
			expect(getAllByTestId('agent-held-action-preview-toggle')[0]).toHaveTextContent(
				'Linear: issue saved',
			),
		);
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
		expect(items[0]).toHaveTextContent('Slack: message');
		expect(items[0]).toHaveTextContent('#ops');
		expect(items[1]).toHaveTextContent('Linear: issue');
		expect(items[1]).toHaveTextContent('ENG-123');

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

	it('keeps the busy state of a new commit when a commit for an earlier chat settles', async () => {
		const settle: Array<{ resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
		commitAgentTestRunActionsMock.mockImplementation(
			async () =>
				await new Promise((resolve, reject) => {
					settle.push({ resolve, reject });
				}),
		);

		const sessionId = ref('chat-1');
		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId,
		});

		state.openConfirmModal('reply-1', sampleActions);
		const firstCommit = state.confirmCommit();
		expect(state.committingReplyId.value).toBe('reply-1');

		sessionId.value = 'chat-2';
		await nextTick();
		expect(state.committingReplyId.value).toBeNull();

		state.openConfirmModal('reply-2', sampleActions);
		const secondCommit = state.confirmCommit();
		expect(state.committingReplyId.value).toBe('reply-2');

		// The commit for the earlier chat fails after the new commit starts.
		settle[0].reject(new Error('Old chat failed'));
		expect(await firstCommit).toBe(false);
		expect(state.committingReplyId.value).toBe('reply-2');
		expect(state.commitError.value).toBeNull();
		expect(state.confirmModalOpen.value).toBe(true);

		const response = { committedAt: new Date().toISOString(), results: [] };
		settle[1].resolve(response);
		expect(await secondCommit).toBe(true);
		expect(state.committingReplyId.value).toBeNull();
		expect(state.committedByReply.value).toEqual({ 'reply-2': response });
	});

	it('shows an error and keeps the modal open when there is no test chat session', async () => {
		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId: ref(undefined),
		});

		state.openConfirmModal('reply-1', sampleActions);
		expect(await state.confirmCommit()).toBe(false);

		expect(commitAgentTestRunActionsMock).not.toHaveBeenCalled();
		expect(state.confirmModalOpen.value).toBe(true);
		expect(state.commitError.value).toBe(
			'This test chat is no longer available. Start a new test to run these actions.',
		);
	});

	it('shows localized text instead of the server message, and clears it on a retry', async () => {
		commitAgentTestRunActionsMock.mockRejectedValueOnce(
			new ResponseError('Request failed with status code 500', { httpStatusCode: 500 }),
		);
		const response = { committedAt: new Date().toISOString(), results: [] };
		commitAgentTestRunActionsMock.mockResolvedValueOnce(response);

		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId: ref('chat-1'),
		});

		state.openConfirmModal('reply-1', sampleActions);
		expect(await state.confirmCommit()).toBe(false);
		expect(state.commitError.value).toBe('Could not run these actions. Try again.');
		expect(state.confirmModalOpen.value).toBe(true);
		expect(state.committingReplyId.value).toBeNull();

		expect(await state.confirmCommit()).toBe(true);
		expect(commitAgentTestRunActionsMock).toHaveBeenCalledTimes(2);
		expect(state.commitError.value).toBeNull();
		expect(state.confirmModalOpen.value).toBe(false);
		expect(state.committedByReply.value).toEqual({ 'reply-1': response });
	});

	it('says the test chat is gone when the server cannot find the session', async () => {
		commitAgentTestRunActionsMock.mockRejectedValueOnce(
			new ResponseError('Test chat session not found.', { httpStatusCode: 404 }),
		);

		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId: ref('chat-1'),
		});

		state.openConfirmModal('reply-1', sampleActions);
		expect(await state.confirmCommit()).toBe(false);
		expect(state.commitError.value).toBe(
			'This test chat is no longer available. Start a new test to run these actions.',
		);
	});

	it('ignores a second confirm and a cancel while a commit is in progress', async () => {
		let resolveCommit: (value: unknown) => void = () => {};
		commitAgentTestRunActionsMock.mockImplementationOnce(
			async () =>
				await new Promise((resolve) => {
					resolveCommit = resolve;
				}),
		);

		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId: ref('chat-1'),
		});

		state.openConfirmModal('reply-1', sampleActions);
		const firstCommit = state.confirmCommit();

		expect(await state.confirmCommit()).toBe(false);
		state.cancelConfirmModal();
		state.confirmModalOpen.value = false;
		expect(state.confirmModalOpen.value).toBe(true);
		expect(commitAgentTestRunActionsMock).toHaveBeenCalledTimes(1);

		resolveCommit({ committedAt: new Date().toISOString(), results: [] });
		expect(await firstCommit).toBe(true);
		expect(state.confirmModalOpen.value).toBe(false);
	});

	it('counts the actions of the chat that ran, across replies, without failed ones', async () => {
		const state = useAgentHeldActions({
			projectId: ref('p1'),
			agentId: ref('a1'),
			sessionId: ref('chat-1'),
		});
		expect(state.sentCount.value).toBe(0);

		commitAgentTestRunActionsMock.mockResolvedValueOnce({
			committedAt: new Date().toISOString(),
			results: [
				{ actionId: 'call-1', toolName: 'slack__post_message', status: 'done' },
				{ actionId: 'call-2', toolName: 'linear__create_issue', status: 'failed' },
			],
		});
		state.openConfirmModal('reply-1', sampleActions);
		await state.confirmCommit();
		expect(state.sentCount.value).toBe(1);

		commitAgentTestRunActionsMock.mockResolvedValueOnce({
			committedAt: new Date().toISOString(),
			results: [{ actionId: 'call-3', toolName: 'gmail_send_email', status: 'already_committed' }],
		});
		state.openConfirmModal('reply-2', [{ ...sampleActions[0], actionId: 'call-3' }]);
		await state.confirmCommit();
		expect(state.sentCount.value).toBe(2);
	});
});

describe('AgentTestChatSubHeader', () => {
	const renderSubHeader = createComponentRenderer(AgentTestChatSubHeader, {
		pinia: createTestingPinia(),
	});

	it('shows the Test chat title without a status before a run', () => {
		const { getByTestId, queryByTestId } = renderSubHeader({ props: { sentCount: 0 } });
		expect(getByTestId('agent-test-chat-sub-header')).toHaveTextContent('Test chat');
		expect(queryByTestId('agent-test-chat-sent-status')).not.toBeInTheDocument();
	});

	it('says how many actions were sent after a run', () => {
		const { getByTestId } = renderSubHeader({ props: { sentCount: 4 } });
		expect(getByTestId('agent-test-chat-sent-status')).toHaveTextContent(
			'4 actions sent to your apps',
		);
	});

	it('uses the singular for one action', () => {
		const { getByTestId } = renderSubHeader({ props: { sentCount: 1 } });
		expect(getByTestId('agent-test-chat-sent-status')).toHaveTextContent(
			'1 action sent to your apps',
		);
	});
});
