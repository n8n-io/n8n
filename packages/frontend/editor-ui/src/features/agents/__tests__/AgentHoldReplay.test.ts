import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import AgentHeldActionsTray from '../components/chatMode/AgentHeldActionsTray.vue';
import AgentTestRunEmptyState from '../components/chatMode/AgentTestRunEmptyState.vue';
import {
	actionObject,
	actionOutcome,
	extractHeldActions,
	formatCommitTime,
	isHeldWriteToolCall,
	type AgentHeldAction,
} from '../components/chatMode/heldActions';
import { TOOL_CALL_STATE } from '../constants';

configure({ testIdAttribute: 'data-testid' });

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
						{ actionId: 'call-2', toolName: 'linear__create_issue', status: 'failed' },
					],
				},
			},
		});

		await waitFor(() => expect(getAllByTestId('agent-held-action-preview')).toHaveLength(2));
		const rows = getAllByTestId('agent-held-action-preview-toggle');
		expect(rows[0]).toHaveTextContent('Slack: message sent');
		expect(rows[1]).toHaveTextContent('Linear: issue');
		expect(rows[1]).not.toHaveTextContent('Linear: issue saved');
		expect(getByTestId('agent-held-action-failed')).toHaveTextContent('Failed');
		expect(getByTestId('agent-held-actions-committed-banner')).toHaveTextContent('1 action done');
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
		expect(banner).toHaveTextContent('0 actions done');
		expect(banner).not.toHaveTextContent('2 actions done');
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
