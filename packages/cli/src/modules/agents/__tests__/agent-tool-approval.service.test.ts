import type { ApprovalResumePayload } from '@n8n/agents';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { AgentToolApprovalService } from '../agent-tool-approval.service';
import { buildAgentConfigurationTelemetryFromConfig } from '../agent-telemetry';
import type { AgentThreadGrantRepository } from '../repositories/agent-thread-grant.repository';
import type { ToolRegistryEntry } from '../tool-registry';

const grants = mock<AgentThreadGrantRepository>();
const telemetry = mock<Telemetry>();
const service = new AgentToolApprovalService(grants, telemetry);
const params = {
	threadId: 'child-thread',
	agentId: 'agent-1',
	telemetry: {
		userId: 'user-1',
		runType: 'test' as const,
		configuration: buildAgentConfigurationTelemetryFromConfig(null),
	},
};
const key = '["tool","notion_search"]';

beforeEach(() => {
	vi.clearAllMocks();
	grants.findKeys.mockImplementation(async () => new Set());
});

it.each<{ name: string; entry?: ToolRegistryEntry; input: unknown; expected: unknown }>([
	{
		name: 'ordinary tool arguments',
		input: { query: 'visible', nested: { password: 'secret' } },
		expected: { query: 'visible', nested: { password: '[REDACTED]' } },
	},
	{
		name: 'fixed node parameters with no model arguments',
		entry: {
			kind: 'node',
			nodeParameters: { url: 'https://example.com/data', method: 'GET', apiKey: 'secret' },
		},
		input: {},
		expected: {
			parameters: { url: 'https://example.com/data', method: 'GET', apiKey: '[REDACTED]' },
		},
	},
	{
		name: 'resolved node parameters and distinct model arguments',
		entry: {
			kind: 'node',
			nodeParameters: {
				url: '={{ $json.token }}',
				query: "={{ $fromAI('token', 'Token', 'string') }}",
				method: 'POST',
				body: "={{ $fromAI('content', 'Content', 'string') }}",
				headers: { authorization: '={{ $json.token }}' },
			},
		},
		input: { content: 'visible', token: 'opaque-value', method: 'model input' },
		expected: {
			parameters: {
				url: '[REDACTED]',
				query: '[REDACTED]',
				method: 'POST',
				body: 'visible',
				headers: { authorization: '[REDACTED]' },
			},
			input: { content: 'visible', token: '[REDACTED]', method: 'model input' },
		},
	},
	{
		name: 'model arguments when the node has no configured parameters',
		entry: { kind: 'node', nodeParameters: {} },
		input: { query: 'visible' },
		expected: { query: 'visible' },
	},
])('prepares $name for approval display', async ({ entry, input, expected }) => {
	const originalInput = structuredClone(input);
	const originalEntry = structuredClone(entry);
	const context = await service.createContext(params, new Map(entry ? [['tool', entry]] : []));

	expect(context.getDisplayArgs?.('tool', input)).toEqual(expected);
	expect(input).toEqual(originalInput);
	expect(entry).toEqual(originalEntry);
});

it.each<{
	decision: ApprovalResumePayload;
	allowed: boolean;
	scope: 'once' | 'session';
	source?: string;
	expectedSource: string;
}>([
	{
		decision: { approved: true },
		allowed: false,
		scope: 'once',
		source: 'subagent',
		expectedSource: 'subagent',
	},
	{
		decision: { approved: true, scope: 'once' },
		allowed: false,
		scope: 'once',
		source: 'n8n_chat_production',
		expectedSource: 'n8n_chat',
	},
	{
		decision: { approved: false, scope: 'session' },
		allowed: false,
		scope: 'session',
		source: 'slack',
		expectedSource: 'slack',
	},
	{
		decision: { approved: true, scope: 'session' },
		allowed: true,
		scope: 'session',
		expectedSource: 'unknown',
	},
])(
	'records the decision and grants only session approvals: $decision',
	async ({ decision, allowed, scope, source, expectedSource }) => {
		const context = await service.createContext({ ...params, source });
		await context.onDecision(key, decision);
		expect(context.approvedKeys.has(key)).toBe(allowed);
		if (allowed) expect(grants.grant).toHaveBeenCalledWith('child-thread', key);
		else expect(grants.grant).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_RESPONDED_TO_AGENT_TOOL_APPROVAL,
			{
				agent_id: 'agent-1',
				user_id: 'user-1',
				run_type: 'test',
				approved: decision.approved,
				scope,
				counts_by_source: { [expectedSource]: { count: 1 } },
			},
		);
		expect(
			TELEMETRY_EVENT.AGENTS.USER_RESPONDED_TO_AGENT_TOOL_APPROVAL.getValidationError(
				telemetry.track.mock.calls[0][1],
			),
		).toBeNull();
	},
);

it('keeps the allowance unset until the database write succeeds', async () => {
	const pending = createDeferredPromise<undefined>();
	grants.grant.mockReturnValueOnce(pending.promise);
	const context = await service.createContext(params);
	const decision = context.onDecision(key, { approved: true, scope: 'session' });
	expect(context.approvedKeys.has(key)).toBe(false);
	pending.reject(new Error('Database unavailable'));
	await expect(decision).rejects.toThrow('Could not save the session allowance');
	expect(context.approvedKeys.has(key)).toBe(false);
});
