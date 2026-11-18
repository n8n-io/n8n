import type { ToolPolicy, ToolPolicyRule } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { PolicedTool, PolicedToolCallRecord, PreToolExecutionContext } from '@n8n/decorators';
import { PolicyCheckMetadata, pointsImplementedBy } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ToolEffectResolver } from '../tool-effect-resolver';
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
		parent?: { agentId: string; toolPolicy: ToolPolicy | null },
	) {
		const logger = mockLogger();
		const sessionHistory = vi.fn<PreToolExecutionContext['sessionHistory']>();
		sessionHistory.mockResolvedValue([
			{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: history },
			...(parent ? [{ threadId: 'thread-0', agentId: parent.agentId, toolCalls: [] }] : []),
		]);
		const loadAgentToolPolicy = vi.fn<PreToolExecutionContext['loadAgentToolPolicy']>();
		loadAgentToolPolicy.mockResolvedValue(parent?.toolPolicy ?? null);
		const toolEffects = mock<ToolEffectResolver>();
		toolEffects.effectOf.mockReturnValue(undefined);
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
			delegated: parent !== undefined,
			toolPolicy,
			loadAgentToolPolicy,
			runToolCalls: () => history,
			sessionHistory,
		};
		return {
			logger,
			debug: vi.mocked(logger.scoped('policy').debug),
			check: new ToolPolicyCheck(logger, toolEffects),
			toolEffects,
			context,
			sessionHistory,
			loadAgentToolPolicy,
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

	describe('for a run that another agent delegated', () => {
		const noOutbound: ToolPolicyRule = {
			id: 'no-outbound',
			action: 'deny',
			tools: [{ kind: 'category', value: 'sendsDataOut' }],
		};

		it('denies a call that the policy of the parent denies', async () => {
			const { check, context, loadAgentToolPolicy } = setUp(policy([]), sendEmail, [], {
				agentId: 'parent-agent',
				toolPolicy: policy([noOutbound]),
			});

			const { violations } = await check.onPreToolExecution(context);

			expect(loadAgentToolPolicy).toHaveBeenCalledExactlyOnceWith('parent-agent');
			expect(violations).toEqual([
				expect.objectContaining({ matchedRuleId: 'no-outbound', scope: 'agent:parent-agent' }),
			]);
		});

		it('applies the policy of the parent to an agent without a policy of its own', async () => {
			const { check, context } = setUp(null, sendEmail, [], {
				agentId: 'parent-agent',
				toolPolicy: policy([noOutbound]),
			});

			expect((await check.onPreToolExecution(context)).violations).toHaveLength(1);
		});

		it('allows the call when the parent has no policy either', async () => {
			const { check, context } = setUp(null, sendEmail, [], {
				agentId: 'parent-agent',
				toolPolicy: null,
			});

			expect(await check.onPreToolExecution(context)).toEqual({ violations: [] });
		});
	});

	describe('rules by category', () => {
		const preventDataLeaks: ToolPolicyRule = {
			id: 'prevent-data-leaks',
			action: 'deny',
			tools: [{ kind: 'category', value: 'sendsDataOut' }],
			when: { toolUsed: [{ kind: 'category', value: 'readsData' }] },
		};
		const usedTool = (tool: PolicedTool): PolicedToolCallRecord => ({ ...used(tool), tool });

		it('denies sending after a tool that reads business data was used', async () => {
			const { check, context } = setUp(policy([preventDataLeaks]), sendEmail, [usedTool(readDb)]);

			expect((await check.onPreToolExecution(context)).violations).toHaveLength(1);
		});

		it('allows sending after a tool that is in no category was used', async () => {
			const { check, context } = setUp(policy([preventDataLeaks]), sendEmail, [
				usedTool({ name: 'load_skill' }),
			]);

			expect(await check.onPreToolExecution(context)).toEqual({ violations: [] });
		});

		it('does not count a mail tool that only reads as a tool that sends', async () => {
			const { check, context, toolEffects } = setUp(policy([preventDataLeaks]), sendEmail, [
				usedTool(readDb),
			]);
			toolEffects.effectOf.mockImplementation((tool) =>
				tool.name === sendEmail.name ? 'read' : undefined,
			);

			expect(await check.onPreToolExecution(context)).toEqual({ violations: [] });
		});

		it('counts an MCP tool that reads as a tool that reads business data', async () => {
			const fetchPage: PolicedTool = {
				name: 'Notion_fetch',
				mcpServerName: 'Notion',
				mcpToolName: 'fetch',
			};
			const { check, context, toolEffects } = setUp(policy([preventDataLeaks]), sendEmail, [
				usedTool(fetchPage),
			]);
			toolEffects.effectOf.mockImplementation((tool) =>
				tool.name === fetchPage.name ? 'read' : undefined,
			);

			expect((await check.onPreToolExecution(context)).violations).toHaveLength(1);
		});
	});

	it('does not look for parents in a run that no agent delegated', async () => {
		const { check, context, sessionHistory, loadAgentToolPolicy } = setUp(policy([]));

		await check.onPreToolExecution(context);

		expect(sessionHistory).not.toHaveBeenCalled();
		expect(loadAgentToolPolicy).not.toHaveBeenCalled();
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
				policyAgentIds: ['agent-1'],
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
