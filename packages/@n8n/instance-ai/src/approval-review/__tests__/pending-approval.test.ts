import type { BuiltTool } from '@n8n/agents';

import { readPendingApproval, routeApproval } from '../pending-approval';

function builtTool(overrides: Partial<BuiltTool> = {}): BuiltTool {
	return { name: 'data_tables', description: 'Manage data tables', ...overrides };
}

describe('readPendingApproval', () => {
	it('reads a plain approval payload', () => {
		const approval = readPendingApproval(
			builtTool(),
			{ action: 'delete-rows', dataTableId: 'dt_1' },
			{
				requestId: 'req_1',
				message: 'Delete 3 rows',
				severity: 'destructive',
				resourceName: 'Leads',
				approvalDetails: { action: 'delete-table' },
			},
			'call_1',
		);

		expect(approval).toEqual({
			toolName: 'data_tables',
			toolCallId: 'call_1',
			args: { action: 'delete-rows', dataTableId: 'dt_1' },
			message: 'Delete 3 rows',
			severity: 'destructive',
			resourceName: 'Leads',
			approvalDetails: { action: 'delete-table' },
		});
	});

	it.each([
		['setupRequests', { setupRequests: [{ node: 'Slack' }] }],
		['questions', { inputType: 'questions', questions: [] }],
		['credentialRequests', { credentialRequests: [] }],
		['credentialDestination', { credentialDestination: { workflowId: 'wf_1' } }],
		['resourceDecision', { inputType: 'resource-decision', resourceDecision: {} }],
		['testListener', { testListener: { workflowId: 'wf_1' } }],
	])('ignores a card that needs input (%s)', (_name, extra) => {
		expect(
			readPendingApproval(
				builtTool(),
				{},
				{
					requestId: 'req_1',
					message: 'Set up the workflow',
					severity: 'info',
					...extra,
				},
			),
		).toBeUndefined();
	});

	it('ignores a payload without a message or a valid severity', () => {
		expect(
			readPendingApproval(builtTool(), {}, { requestId: 'r', message: '', severity: 'info' }),
		).toBeUndefined();
		expect(
			readPendingApproval(builtTool(), {}, { requestId: 'r', message: 'Do it', severity: 'loud' }),
		).toBeUndefined();
		expect(readPendingApproval(builtTool(), {}, 'not an object')).toBeUndefined();
	});

	it('reads the approval gate of an MCP tool with its hints', () => {
		const approval = readPendingApproval(
			builtTool({
				name: 'linear_delete_issue',
				mcpTool: true,
				mcpServerName: 'linear',
				mcpToolName: 'delete_issue',
				mcpAnnotations: { destructiveHint: true },
			}),
			{ id: 'ISS-1' },
			{ type: 'approval', toolName: 'linear_delete_issue', args: { id: 'ISS-1' } },
		);

		expect(approval).toMatchObject({
			toolName: 'linear_delete_issue',
			message: 'Call delete_issue',
			severity: 'destructive',
			mcp: { serverName: 'linear', hints: { destructiveHint: true } },
		});
	});

	it('ignores the approval gate of a tool that is not an MCP tool', () => {
		expect(
			readPendingApproval(
				builtTool({ name: 'agent_builder_call_agent' }),
				{},
				{ type: 'approval', toolName: 'send_email', args: {} },
			),
		).toBeUndefined();
	});
});

describe('routeApproval', () => {
	it('always asks before a skill is deleted, and lets the judge decide other skill changes', () => {
		expect(routeApproval({ toolName: 'skills', args: { action: 'delete', skillId: 's1' } })).toBe(
			'always-ask',
		);
		expect(routeApproval({ toolName: 'skills', args: { action: 'update', skillId: 's1' } })).toBe(
			'judge',
		);
	});

	it('sends an MCP tool to the judge even when its name matches a built-in tool', () => {
		expect(
			routeApproval({
				toolName: 'delete_credential',
				args: {},
				mcp: { serverName: 'vault' },
			}),
		).toBe('judge');
	});
});
