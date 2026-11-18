import type {
	ToolPolicy,
	ToolPolicyCondition,
	ToolPolicyRule,
	ToolPolicyToolIdentity,
} from '@n8n/api-types';
import type { PolicedTool, PolicedToolCallRecord, PreToolExecutionContext } from '@n8n/decorators';

import { evaluateToolCall, identifyPolicedTool } from '../tool-policy-engine';

const sendEmail: PolicedTool = {
	name: 'Send_Email',
	metadata: { kind: 'node', nodeType: 'n8n-nodes-base.gmailTool' },
};
const readDb: PolicedTool = {
	name: 'Read_Customer_DB',
	metadata: { kind: 'node', nodeType: 'n8n-nodes-base.postgresTool' },
};
const notionFetch: PolicedTool = {
	name: 'Notion_notion-fetch',
	mcpServerName: 'Notion',
	mcpToolName: 'notion-fetch',
	mcpAnnotations: { readOnlyHint: true },
};

const ref = (name: string) => ({ kind: 'tool', ref: { type: 'node', name } }) as const;
const sendsDataOut = { kind: 'category', value: 'sendsDataOut' } as const;
const readsData = { kind: 'category', value: 'readsData' } as const;

function record(
	toolName: string,
	status: PolicedToolCallRecord['status'] = 'success',
	output?: unknown,
): PolicedToolCallRecord {
	return { toolCallId: `call-${toolName}-${status}`, toolName, input: {}, status, output };
}

function context(tool: PolicedTool, history: PolicedToolCallRecord[] = []) {
	const current: PolicedToolCallRecord = {
		toolCallId: 'current',
		toolName: tool.name,
		input: {},
		status: 'pending',
	};
	const sessionHistory = vi.fn<PreToolExecutionContext['sessionHistory']>(async () => [
		{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: [...history, current] },
	]);
	const ctx: PreToolExecutionContext = {
		agentId: 'agent-1',
		projectId: 'project-1',
		threadId: 'thread-1',
		agentExecutionId: 'exec-1',
		runId: 'run-1',
		toolCallId: 'current',
		tool,
		input: {},
		resumed: false,
		runToolCalls: () => [...history, current],
		sessionHistory,
	};
	return { ctx, sessionHistory };
}

const describe_: Record<string, ToolPolicyToolIdentity> = {
	Send_Email: { type: 'node', name: 'Send_Email', nodeType: 'n8n-nodes-base.gmailTool' },
	Read_Customer_DB: {
		type: 'node',
		name: 'Read_Customer_DB',
		nodeType: 'n8n-nodes-base.postgresTool',
	},
	'Notion_notion-fetch': { type: 'mcpServer', name: 'Notion' },
};
const describeTool = (name: string) => describe_[name];

function policy(rules: ToolPolicyRule[], defaultAction: ToolPolicy['defaultAction'] = 'allow') {
	return { defaultAction, rules };
}

async function decide(p: ToolPolicy, tool: PolicedTool, history: PolicedToolCallRecord[] = []) {
	const { ctx, sessionHistory } = context(tool, history);
	const decision = await evaluateToolCall({
		policy: p,
		context: ctx,
		checkId: 'check',
		describeTool,
	});
	return { decision, sessionHistory };
}

const noEmailAfterDb: ToolPolicyRule = {
	id: 'no-email-after-db',
	action: 'deny',
	tools: [ref('Send Email')],
	when: { toolUsed: [ref('Read Customer DB')] },
	message: 'Email is not available now',
};

describe('identifyPolicedTool', () => {
	it('identifies node, workflow, and MCP tools', () => {
		expect(identifyPolicedTool(sendEmail)).toEqual({
			type: 'node',
			name: 'Send_Email',
			nodeType: 'n8n-nodes-base.gmailTool',
		});
		expect(
			identifyPolicedTool({ name: 'refund', metadata: { kind: 'workflow', workflowId: 'wf-1' } }),
		).toEqual({ type: 'workflow', workflowId: 'wf-1' });
		expect(identifyPolicedTool(notionFetch)).toEqual({ type: 'mcpServer', name: 'Notion' });
	});
});

describe('evaluateToolCall', () => {
	it('allows a call that no rule covers when the default is allow', async () => {
		const { decision, sessionHistory } = await decide(policy([noEmailAfterDb]), readDb);

		expect(decision).toEqual({ action: 'allow', ruleIds: [], violations: [] });
		expect(sessionHistory).not.toHaveBeenCalled();
	});

	it('allows the email before the database was read', async () => {
		const { decision } = await decide(policy([noEmailAfterDb]), sendEmail);
		expect(decision.action).toBe('allow');
	});

	it('denies the email after the database was read, matching the config name of the tool', async () => {
		const { decision } = await decide(policy([noEmailAfterDb]), sendEmail, [
			record('Read_Customer_DB'),
		]);

		expect(decision).toEqual({
			action: 'deny',
			ruleIds: ['no-email-after-db'],
			violations: [
				{
					kind: 'agent-tool-policy',
					checkId: 'check',
					message: 'Email is not available now',
					subject: 'Send_Email',
					subjectType: 'agentTool',
					projectId: 'project-1',
					matchedRuleId: 'no-email-after-db',
				},
			],
		});
	});

	it('counts failed and canceled calls as used', async () => {
		for (const status of ['error', 'canceled'] as const) {
			const { decision } = await decide(policy([noEmailAfterDb]), sendEmail, [
				record('Read_Customer_DB', status),
			]);
			expect(decision.action).toBe('deny');
		}
	});

	it('does not count pending calls or calls that a policy refused', async () => {
		const { decision } = await decide(policy([noEmailAfterDb]), sendEmail, [
			record('Read_Customer_DB', 'pending'),
			{
				...record('Read_Customer_DB'),
				toolCallId: 'refused',
				output: { isPolicyRefusal: true, message: 'no' },
			},
		]);
		expect(decision.action).toBe('allow');
	});

	it('uses earlier calls from parent sessions', async () => {
		const ctx: PreToolExecutionContext = {
			...context(sendEmail).ctx,
			sessionHistory: async () => [
				{ threadId: 'child', agentId: 'agent-1', toolCalls: [] },
				{ threadId: 'parent', agentId: 'agent-0', toolCalls: [record('Read_Customer_DB')] },
			],
		};

		const decision = await evaluateToolCall({
			policy: policy([noEmailAfterDb]),
			context: ctx,
			checkId: 'check',
			describeTool,
		});
		expect(decision.action).toBe('deny');
	});

	it('lets a deny win over an allow, whatever the rule order', async () => {
		const allowEmail: ToolPolicyRule = {
			id: 'allow-email',
			action: 'allow',
			tools: [ref('Send Email')],
		};
		for (const rules of [
			[allowEmail, noEmailAfterDb],
			[noEmailAfterDb, allowEmail],
		]) {
			const { decision } = await decide(policy(rules, 'deny'), sendEmail, [
				record('Read_Customer_DB'),
			]);
			expect(decision.ruleIds).toEqual(['no-email-after-db']);
		}
	});

	it('denies by default, and allows what an allow rule covers', async () => {
		const allowRead: ToolPolicyRule = { id: 'allow-read', action: 'allow', tools: [readsData] };
		const p = policy([allowRead], 'deny');

		expect((await decide(p, readDb)).decision).toEqual({
			action: 'allow',
			ruleIds: ['allow-read'],
			violations: [],
		});

		const { decision } = await decide(p, notionFetch);
		expect(decision.action).toBe('deny');
		expect(decision.violations[0]).not.toHaveProperty('matchedRuleId');
		expect(decision.violations[0].message).toBe('This tool is not available');
	});

	it('does not read the history for a deny without a condition', async () => {
		const { decision, sessionHistory } = await decide(
			policy([{ id: 'no-out', action: 'deny', tools: [sendsDataOut] }, noEmailAfterDb]),
			sendEmail,
		);

		expect(decision.ruleIds).toEqual(['no-out']);
		expect(sessionHistory).not.toHaveBeenCalled();
	});

	it('applies the data leak template to an MCP server through categories', async () => {
		const preventLeaks: ToolPolicyRule = {
			id: 'leaks',
			action: 'deny',
			tools: [sendsDataOut],
			when: { toolUsed: [readsData] },
		};

		expect((await decide(policy([preventLeaks]), notionFetch)).decision.action).toBe('allow');
		expect(
			(await decide(policy([preventLeaks]), notionFetch, [record('Read_Customer_DB')])).decision
				.action,
		).toBe('deny');
	});

	it('matches an MCP server rule on earlier calls only through describeTool', async () => {
		const afterNotion: ToolPolicyRule = {
			id: 'after-notion',
			action: 'deny',
			tools: [ref('Send Email')],
			when: { toolUsed: [{ kind: 'tool', ref: { type: 'mcpServer', name: 'Notion' } }] },
		};
		const history = [record('Notion_notion-fetch')];

		expect((await decide(policy([afterNotion]), sendEmail, history)).decision.action).toBe('deny');

		const { ctx } = context(sendEmail, history);
		const withoutDescribe = await evaluateToolCall({
			policy: policy([afterNotion]),
			context: ctx,
			checkId: 'check',
		});
		expect(withoutDescribe.action).toBe('allow');
	});

	it('supports all and any conditions', async () => {
		const parts: ToolPolicyCondition[] = [
			{ toolUsed: [ref('Read Customer DB')] },
			{ toolUsed: [{ kind: 'tool', ref: { type: 'mcpServer', name: 'Notion' } }] },
		];
		const both: ToolPolicyRule = {
			id: 'both',
			action: 'deny',
			tools: [ref('Send Email')],
			when: { all: parts },
		};

		expect(
			(await decide(policy([both]), sendEmail, [record('Read_Customer_DB')])).decision.action,
		).toBe('allow');
		expect(
			(
				await decide(policy([both]), sendEmail, [
					record('Read_Customer_DB'),
					record('Notion_notion-fetch'),
				])
			).decision.action,
		).toBe('deny');

		// eslint-disable-next-line id-denylist -- `any` is a key of the policy language
		const either: ToolPolicyRule = { ...both, id: 'either', when: { any: parts } };
		expect(
			(await decide(policy([either]), sendEmail, [record('Notion_notion-fetch')])).decision.action,
		).toBe('deny');
	});
});
