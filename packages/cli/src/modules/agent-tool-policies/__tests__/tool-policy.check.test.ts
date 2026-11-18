import type { ToolPolicy, ToolPolicyRule } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { PolicedTool, PolicedToolCallRecord, PreToolExecutionContext } from '@n8n/decorators';
import { PolicyCheckMetadata, pointsImplementedBy } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ToolPolicyCheck } from '../tool-policy.check';

describe('ToolPolicyCheck', () => {
	const sendEmail: PolicedTool = {
		name: 'Send_Email',
		metadata: { kind: 'node', nodeType: 'n8n-nodes-base.gmailTool' },
	};
	const readDb: PolicedTool = {
		name: 'Read_Customer_DB',
		metadata: { kind: 'node', nodeType: 'n8n-nodes-base.postgresTool' },
	};

	const noEmailAfterDb: ToolPolicyRule = {
		id: 'no-email-after-db',
		action: 'deny',
		tools: [{ kind: 'tool', ref: { type: 'node', name: 'Send Email' } }],
		when: { toolUsed: [{ kind: 'tool', ref: { type: 'node', name: 'Read Customer DB' } }] },
		message: 'Email is not available after the customer database was read',
	};

	const policy = (
		rules: ToolPolicyRule[],
		defaultAction: ToolPolicy['defaultAction'] = 'allow',
	): ToolPolicy => ({ defaultAction, rules });

	const used = (tool: PolicedTool): PolicedToolCallRecord => ({
		toolCallId: `call-${tool.name}`,
		toolName: tool.name,
		input: {},
		status: 'success',
		output: { ok: true },
	});

	// `mockLogger` returns the same inner mock from each `scoped()` call.
	function setUp(
		toolPolicy: ToolPolicy | null,
		tool: PolicedTool = sendEmail,
		history: PolicedToolCallRecord[] = [],
	) {
		const logger = mockLogger();
		const sessionHistory = vi.fn<PreToolExecutionContext['sessionHistory']>();
		sessionHistory.mockResolvedValue([
			{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: history },
		]);
		const context: PreToolExecutionContext = {
			agentId: 'agent-1',
			projectId: 'project-1',
			threadId: 'thread-1',
			agentExecutionId: 'agent-exec-1',
			runId: 'run-1',
			toolCallId: 'call-1',
			tool,
			input: { to: 'someone@example.com', body: 'A customer record' },
			resumed: false,
			toolPolicy,
			runToolCalls: () => history,
			sessionHistory,
		};
		return {
			logger,
			debug: vi.mocked(logger.scoped('policy').debug),
			check: new ToolPolicyCheck(logger),
			context,
			sessionHistory,
		};
	}

	it('is registered for the preToolExecution point only', () => {
		const { check } = setUp(null);

		expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(ToolPolicyCheck);
		expect(pointsImplementedBy(check)).toEqual(['preToolExecution']);
	});

	it('allows every call of an agent without a tool policy, and reads no history', async () => {
		const { check, context, sessionHistory } = setUp(null);

		expect(await check.onPreToolExecution(context)).toEqual({ violations: [] });
		expect(sessionHistory).not.toHaveBeenCalled();
	});

	it('allows a call that no rule denies', async () => {
		const { check, context } = setUp(policy([noEmailAfterDb]));

		expect(await check.onPreToolExecution(context)).toEqual({ violations: [] });
	});

	it('denies a call with the message of the rule, once the tool in its condition was used', async () => {
		const { check, context } = setUp(policy([noEmailAfterDb]), sendEmail, [used(readDb)]);

		expect(await check.onPreToolExecution(context)).toEqual({
			violations: [
				expect.objectContaining({
					checkId: 'agent-tool-policy',
					message: 'Email is not available after the customer database was read',
					matchedRuleId: 'no-email-after-db',
					subject: 'Send_Email',
					projectId: 'project-1',
				}),
			],
		});
	});

	it('denies a call that only the default action covers', async () => {
		const { check, context } = setUp(policy([], 'deny'));

		const { violations } = await check.onPreToolExecution(context);

		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({ checkId: 'agent-tool-policy', subject: 'Send_Email' });
	});

	describe('debug lines', () => {
		it('names the call and the decision in the policy scope, without the input', async () => {
			const { logger, debug, check, context } = setUp(policy([noEmailAfterDb]), sendEmail, [
				used(readDb),
			]);

			await check.onPreToolExecution(context);

			expect(logger.scoped).toHaveBeenCalledWith('policy');
			expect(debug).toHaveBeenCalledExactlyOnceWith('Agent tool policy: deny Send_Email', {
				agentId: 'agent-1',
				toolCallId: 'call-1',
				ruleIds: ['no-email-after-db'],
			});
		});

		it('says that an agent has no tool policy', async () => {
			const { debug, check, context } = setUp(null);

			await check.onPreToolExecution(context);

			expect(debug).toHaveBeenCalledExactlyOnceWith('Agent tool policy: none for Send_Email', {
				agentId: 'agent-1',
				toolCallId: 'call-1',
			});
		});
	});
});
