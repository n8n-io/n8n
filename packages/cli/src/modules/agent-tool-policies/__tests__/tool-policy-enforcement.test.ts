import type { PreToolExecutionContext } from '@n8n/agents';
import type { ToolPolicy } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { PolicedToolCallRecord, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AgentPolicyService } from '@/modules/agents/agent-policy.service';
import type { AgentToolCallHistoryService } from '@/modules/agents/agent-tool-call-history.service';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { PolicyDecisionService } from '@/modules/policy-infrastructure/policy-decision.service';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import { ToolEffectResolver } from '../tool-effect-resolver';
import { ToolPolicyCheck } from '../tool-policy.check';

/**
 * The whole path of one tool call: the hook of the agent runtime, the enforcement point, the
 * decision service, the check and the rule engine. Only the stored history is a mock.
 */
describe('tool policy enforcement for an agent tool call', () => {
	const toolPolicy: ToolPolicy = {
		defaultAction: 'allow',
		rules: [
			{
				id: 'no-email-after-db',
				action: 'deny',
				tools: [{ kind: 'tool', ref: { type: 'node', name: 'Send Email' } }],
				when: { toolUsed: [{ kind: 'tool', ref: { type: 'node', name: 'Read Customer DB' } }] },
				message: 'Email is not available after the customer database was read',
			},
		],
	};

	const sendEmailCall: PreToolExecutionContext = {
		toolCallId: 'call-2',
		runId: 'run-1',
		tool: { name: 'Send_Email', metadata: { kind: 'node', nodeType: 'n8n-nodes-base.gmailTool' } },
		input: { to: 'someone@example.com' },
		resumed: false,
		persistence: { threadId: 'thread-1', resourceId: 'user-1' },
		runToolCalls: () => [],
	};

	const readDb: PolicedToolCallRecord = {
		toolCallId: 'call-1',
		toolName: 'Read_Customer_DB',
		input: {},
		status: 'success',
		output: { rows: 3 },
	};

	function hookFor(policy: ToolPolicy | null, earlierCalls: PolicedToolCallRecord[]) {
		Container.set(Logger, mockLogger());
		Container.set(ToolEffectResolver, mock<ToolEffectResolver>());
		const enforcement = new PolicyEnforcementService();
		enforcement.setImplementation(
			new PolicyDecisionService(
				mockLogger(),
				mock<PolicyCheckMetadata>({ getClasses: () => [ToolPolicyCheck] }),
				mock<EventService>(),
			),
		);
		const history = mock<AgentToolCallHistoryService>();
		history.sessionHistory.mockResolvedValue([
			{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: earlierCalls },
		]);
		return new AgentPolicyService(
			enforcement,
			history,
			mock<AgentRepository>(),
		).preToolExecutionHook({
			projectId: 'project-1',
			agentId: 'agent-1',
			toolPolicy: policy,
			usePublishedVersion: false,
		});
	}

	afterEach(() => {
		Container.reset();
	});

	it('allows the call while the condition of the deny rule does not hold', async () => {
		expect(await hookFor(toolPolicy, [])(sendEmailCall)).toEqual({ allow: true });
	});

	it('refuses the call with the message of the rule once the condition holds', async () => {
		const decision = await hookFor(toolPolicy, [readDb])(sendEmailCall);

		expect(decision).toEqual({
			allow: false,
			result: expect.objectContaining({
				isPolicyRefusal: true,
				message: 'Email is not available after the customer database was read',
				violations: [
					expect.objectContaining({
						checkId: 'agent-tool-policy',
						matchedRuleId: 'no-email-after-db',
					}),
				],
			}),
		});
	});

	it('allows every call of an agent without a tool policy', async () => {
		expect(await hookFor(null, [readDb])(sendEmailCall)).toEqual({ allow: true });
	});
});
