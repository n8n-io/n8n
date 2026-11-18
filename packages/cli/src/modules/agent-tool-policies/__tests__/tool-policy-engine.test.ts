import type {
	ToolPolicy,
	ToolPolicyCondition,
	ToolPolicyRule,
	ToolPolicyToolIdentity,
} from '@n8n/api-types';
import type {
	PolicedSession,
	PolicedTool,
	PolicedToolCallRecord,
	PreToolExecutionContext,
} from '@n8n/decorators';

import {
	evaluateToolCall,
	identifyPolicedTool,
	type EvaluateToolCallInput,
	type SourcedToolPolicy,
} from '../tool-policy-engine';

const sendEmail: PolicedTool = {
	name: 'Send_Email',
	metadata: { kind: 'node', nodeType: 'n8n-nodes-base.gmailTool' },
};
const readDb: PolicedTool = {
	name: 'Read_Customer_DB',
	metadata: { kind: 'node', nodeType: 'n8n-nodes-base.postgresTool' },
};
const runCode: PolicedTool = {
	name: 'Run_Code',
	metadata: { kind: 'node', nodeType: '@n8n/n8n-nodes-langchain.toolCode' },
};
const notionFetch: PolicedTool = {
	name: 'Notion_notion-fetch',
	mcpServerName: 'Notion',
	mcpToolName: 'notion-fetch',
	mcpAnnotations: { readOnlyHint: true },
};

const ref = (name: string) => ({ kind: 'tool', ref: { type: 'node', name } }) as const;
const notion = { kind: 'tool', ref: { type: 'mcpServer', name: 'Notion' } } as const;
const sendsDataOut = { kind: 'category', value: 'sendsDataOut' } as const;
const readsData = { kind: 'category', value: 'readsData' } as const;

function record(
	toolName: string,
	status: PolicedToolCallRecord['status'] = 'success',
	output?: unknown,
): PolicedToolCallRecord {
	return { toolCallId: `call-${toolName}-${status}`, toolName, input: {}, status, output };
}

/** Tools by agent, as the runtime would describe them. */
const toolsByAgent: Record<string, Record<string, ToolPolicyToolIdentity>> = {
	child: {
		Send_Email: { type: 'node', name: 'Send_Email', nodeType: 'n8n-nodes-base.gmailTool' },
		Read_Customer_DB: {
			type: 'node',
			name: 'Read_Customer_DB',
			nodeType: 'n8n-nodes-base.postgresTool',
		},
		Run_Code: { type: 'node', name: 'Run_Code', nodeType: '@n8n/n8n-nodes-langchain.toolCode' },
		'Notion_notion-fetch': { type: 'mcpServer', name: 'Notion' },
	},
	parent: {
		Read_Customer_DB: {
			type: 'node',
			name: 'Read_Customer_DB',
			nodeType: 'n8n-nodes-base.postgresTool',
		},
	},
};
const describeTool = (agentId: string | null, name: string) =>
	agentId ? toolsByAgent[agentId]?.[name] : undefined;

/** A call of agent `child`, with its own earlier calls and those of its parent sessions. */
function context(
	tool: PolicedTool,
	history: PolicedToolCallRecord[] = [],
	parentHistory?: PolicedToolCallRecord[],
) {
	const current: PolicedToolCallRecord = {
		toolCallId: 'current',
		toolName: tool.name,
		input: {},
		status: 'pending',
	};
	const sessions: PolicedSession[] = [
		{ threadId: 'thread-child', agentId: 'child', toolCalls: [...history, current] },
		...(parentHistory
			? [{ threadId: 'thread-parent', agentId: 'parent', toolCalls: parentHistory }]
			: []),
	];
	const sessionHistory = vi.fn<PreToolExecutionContext['sessionHistory']>(async () => sessions);
	const ctx: PreToolExecutionContext = {
		agentId: 'child',
		projectId: 'project-1',
		threadId: 'thread-child',
		agentExecutionId: 'exec-1',
		runId: 'run-1',
		toolCallId: 'current',
		tool,
		input: {},
		resumed: false,
		delegated: false,
		toolPolicy: null,
		loadAgentToolPolicy: async () => await Promise.resolve(null),
		runToolCalls: () => [...history, current],
		sessionHistory,
	};
	return { ctx, sessionHistory };
}

const own = (
	rules: ToolPolicyRule[],
	defaultAction: ToolPolicy['defaultAction'] = 'allow',
): SourcedToolPolicy => ({
	source: { kind: 'agent', agentId: 'child' },
	policy: { defaultAction, rules },
});
const ofParent = (
	rules: ToolPolicyRule[],
	defaultAction: ToolPolicy['defaultAction'] = 'allow',
): SourcedToolPolicy => ({
	source: { kind: 'agent', agentId: 'parent' },
	policy: { defaultAction, rules },
});

async function decide(
	policies: SourcedToolPolicy[],
	tool: PolicedTool,
	history: PolicedToolCallRecord[] = [],
	options: {
		parentHistory?: PolicedToolCallRecord[];
		describe?: EvaluateToolCallInput['describeTool'];
	} = {},
) {
	const { ctx, sessionHistory } = context(tool, history, options.parentHistory);
	const decision = await evaluateToolCall({
		policies,
		context: ctx,
		checkId: 'check',
		describeTool: 'describe' in options ? options.describe : describeTool,
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

const preventLeaks: ToolPolicyRule = {
	id: 'leaks',
	action: 'deny',
	tools: [sendsDataOut],
	when: { toolUsed: [readsData] },
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
		expect(identifyPolicedTool(notionFetch)).toEqual({
			type: 'mcpServer',
			name: 'Notion',
			tool: 'notion-fetch',
		});
		expect(identifyPolicedTool({ name: 'Notion_x', mcpServerName: 'Notion' })).toEqual({
			type: 'mcpServer',
			name: 'Notion',
		});
	});
});

describe('evaluateToolCall', () => {
	describe('one policy', () => {
		it('allows a call that no rule covers, without reading the history', async () => {
			const { decision, sessionHistory } = await decide([own([noEmailAfterDb])], readDb);

			expect(decision).toEqual({ action: 'allow', ruleIds: [], violations: [] });
			expect(sessionHistory).not.toHaveBeenCalled();
		});

		it('allows the email before the database was read', async () => {
			const { decision } = await decide([own([noEmailAfterDb])], sendEmail);
			expect(decision.action).toBe('allow');
		});

		it('denies the email after the database was read, matching the config name', async () => {
			const { decision } = await decide([own([noEmailAfterDb])], sendEmail, [
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
						scope: 'agent:child',
						projectId: 'project-1',
						matchedRuleId: 'no-email-after-db',
					},
				],
			});
		});

		it('counts failed and canceled calls as used', async () => {
			for (const status of ['error', 'canceled'] as const) {
				const { decision } = await decide([own([noEmailAfterDb])], sendEmail, [
					record('Read_Customer_DB', status),
				]);
				expect(decision.action).toBe('deny');
			}
		});

		it('does not count pending calls or calls that a policy refused', async () => {
			const { decision } = await decide([own([noEmailAfterDb])], sendEmail, [
				record('Read_Customer_DB', 'pending'),
				{
					...record('Read_Customer_DB'),
					toolCallId: 'refused',
					output: { isPolicyRefusal: true, message: 'no' },
				},
			]);
			expect(decision.action).toBe('allow');
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
				const { decision } = await decide([own(rules, 'deny')], sendEmail, [
					record('Read_Customer_DB'),
				]);
				expect(decision.ruleIds).toEqual(['no-email-after-db']);
			}
		});

		it('denies by default, and allows what an allow rule covers', async () => {
			const allowRead: ToolPolicyRule = { id: 'allow-read', action: 'allow', tools: [readsData] };
			const policies = [own([allowRead], 'deny')];

			expect((await decide(policies, readDb)).decision).toEqual({
				action: 'allow',
				ruleIds: ['allow-read'],
				violations: [],
			});

			const { decision } = await decide(policies, notionFetch);
			expect(decision.action).toBe('deny');
			expect(decision.violations[0]).not.toHaveProperty('matchedRuleId');
			expect(decision.violations[0].message).toBe('This tool is not available');
		});

		it('applies the data leak template to an MCP server through categories', async () => {
			expect((await decide([own([preventLeaks])], notionFetch)).decision.action).toBe('allow');
			expect(
				(await decide([own([preventLeaks])], notionFetch, [record('Read_Customer_DB')])).decision
					.action,
			).toBe('deny');
		});

		it('supports all and any conditions', async () => {
			const parts: ToolPolicyCondition[] = [
				{ toolUsed: [ref('Read Customer DB')] },
				{ toolUsed: [notion] },
			];
			const both: ToolPolicyRule = {
				id: 'both',
				action: 'deny',
				tools: [ref('Send Email')],
				when: { all: parts },
			};

			expect(
				(await decide([own([both])], sendEmail, [record('Read_Customer_DB')])).decision.action,
			).toBe('allow');
			expect(
				(
					await decide([own([both])], sendEmail, [
						record('Read_Customer_DB'),
						record('Notion_notion-fetch'),
					])
				).decision.action,
			).toBe('deny');

			// eslint-disable-next-line id-denylist -- `any` is a key of the policy language
			const either: ToolPolicyRule = { ...both, id: 'either', when: { any: parts } };
			expect(
				(await decide([own([either])], sendEmail, [record('Notion_notion-fetch')])).decision.action,
			).toBe('deny');
		});
	});

	describe('several policies', () => {
		it('denies when any policy denies, and lists the violations of each', async () => {
			const noOut: ToolPolicyRule = { id: 'no-out', action: 'deny', tools: [sendsDataOut] };
			const { decision } = await decide(
				[
					own([{ id: 'allow-email', action: 'allow', tools: [ref('Send Email')] }]),
					ofParent([noOut]),
					{
						source: { kind: 'scope', scope: 'project' },
						policy: { defaultAction: 'deny', rules: [] },
					},
				],
				sendEmail,
			);

			expect(decision.action).toBe('deny');
			expect(decision.ruleIds).toEqual(['no-out']);
			expect(decision.violations.map((v) => v.scope)).toEqual(['agent:parent', 'project']);
		});

		it('allows only when every policy allows', async () => {
			const { decision } = await decide(
				[own([]), ofParent([{ id: 'allow-out', action: 'allow', tools: [sendsDataOut] }], 'deny')],
				sendEmail,
			);

			expect(decision).toEqual({ action: 'allow', ruleIds: ['allow-out'], violations: [] });
		});

		it("applies a parent's default deny to the tools of the sub-agent", async () => {
			const readOnlyParent = ofParent(
				[{ id: 'allow-read', action: 'allow', tools: [readsData] }],
				'deny',
			);

			expect((await decide([own([]), readOnlyParent], runCode)).decision.action).toBe('deny');
			expect((await decide([own([]), readOnlyParent], readDb)).decision.action).toBe('allow');
		});

		it("does not let a parent's tool ref name a tool of the sub-agent", async () => {
			const parentRule: ToolPolicyRule = {
				id: 'parent-no-email',
				action: 'deny',
				tools: [ref('Send Email')],
			};
			expect((await decide([own([]), ofParent([parentRule])], sendEmail)).decision.action).toBe(
				'allow',
			);
		});

		it('sees what a parent used, through categories', async () => {
			const { decision } = await decide([own([preventLeaks])], sendEmail, [], {
				parentHistory: [record('Read_Customer_DB')],
			});
			expect(decision.action).toBe('deny');
		});

		it("does not count a parent's call for a tool ref of the sub-agent", async () => {
			const { decision } = await decide([own([noEmailAfterDb])], sendEmail, [], {
				parentHistory: [record('Read_Customer_DB')],
			});
			expect(decision.action).toBe('allow');
		});

		it('reads the history once for all policies', async () => {
			const { sessionHistory } = await decide(
				[own([preventLeaks]), ofParent([preventLeaks])],
				sendEmail,
				[record('Read_Customer_DB')],
			);
			expect(sessionHistory).toHaveBeenCalledTimes(1);
		});
	});

	describe('earlier calls that describe their tool', () => {
		const used = (tool: PolicedTool): PolicedToolCallRecord => ({ ...record(tool.name), tool });
		const calculator: PolicedTool = { name: 'calculator' };

		it('uses the tool of the call, without a lookup', async () => {
			const noLookup = { describe: undefined };

			expect(
				(await decide([own([preventLeaks])], sendEmail, [used(readDb)], noLookup)).decision.action,
			).toBe('deny');
			// A tool with a name only is known, and it is in no category.
			expect(
				(await decide([own([preventLeaks])], sendEmail, [used(calculator)], noLookup)).decision
					.action,
			).toBe('allow');
		});

		it('names a tool for the policy through identify, for the call and for earlier calls', async () => {
			const identify = vi.fn((tool: PolicedTool) => ({
				...identifyPolicedTool(tool),
				// As if the node types said that this database tool writes and the mail tool reads.
				effect: tool.name === 'Read_Customer_DB' ? ('write' as const) : ('read' as const),
			}));
			const { ctx } = context(sendEmail, [used(readDb)]);

			const decision = await evaluateToolCall({
				policies: [own([preventLeaks])],
				context: ctx,
				checkId: 'check',
				identify,
			});

			// The mail tool only reads, so the rule for sending tools does not cover it.
			expect(decision.action).toBe('allow');
			expect(identify).toHaveBeenCalledWith(sendEmail);
		});

		it('does not take a tool that the model provider ran for an MCP tool', async () => {
			const afterNotion: ToolPolicyRule = {
				id: 'after-notion',
				action: 'deny',
				tools: [ref('Send Email')],
				when: { toolUsed: [notion] },
			};
			const toolSearch = used({ name: 'anthropic.tool_search', metadata: { kind: 'provider' } });

			const { decision } = await decide([own([afterNotion])], sendEmail, [toolSearch], {
				describe: undefined,
			});

			expect(decision.action).toBe('allow');
		});

		it('denies one tool of an MCP server and leaves its other tools', async () => {
			const noNotionCreate: ToolPolicyRule = {
				id: 'no-notion-create',
				action: 'deny',
				tools: [
					{ kind: 'tool', ref: { type: 'mcpServer', name: 'Notion', tool: 'notion-create-page' } },
				],
			};
			const notionCreate: PolicedTool = {
				name: 'Notion_notion-create-page',
				mcpServerName: 'Notion',
				mcpToolName: 'notion-create-page',
			};

			expect((await decide([own([noNotionCreate])], notionCreate)).decision.action).toBe('deny');
			expect((await decide([own([noNotionCreate])], notionFetch)).decision.action).toBe('allow');
		});
	});

	describe('earlier calls of unknown tools', () => {
		const afterNotion: ToolPolicyRule = {
			id: 'after-notion',
			action: 'deny',
			tools: [ref('Send Email')],
			when: { toolUsed: [notion] },
		};

		it('identifies an earlier MCP call through describeTool', async () => {
			expect(
				(await decide([own([afterNotion])], sendEmail, [record('Notion_notion-fetch')])).decision
					.action,
			).toBe('deny');
			expect(
				(await decide([own([afterNotion])], sendEmail, [record('Read_Customer_DB')])).decision
					.action,
			).toBe('allow');
		});

		it('counts an unknown call as the trigger of a deny rule', async () => {
			const { decision } = await decide([own([preventLeaks])], sendEmail, [record('mystery')], {
				describe: undefined,
			});
			expect(decision.action).toBe('deny');
		});

		it('never counts an unknown call as the trigger of an allow rule', async () => {
			const unlock: ToolPolicyRule = {
				id: 'unlock',
				action: 'allow',
				tools: [ref('Send Email')],
				when: { toolUsed: [readsData] },
			};
			const { decision } = await decide([own([unlock], 'deny')], sendEmail, [record('mystery')], {
				describe: undefined,
			});
			expect(decision.action).toBe('deny');
		});

		it('still matches tool refs of the same agent by name without describeTool', async () => {
			const { decision } = await decide([own([noEmailAfterDb])], sendEmail, [record('Run_Code')], {
				describe: undefined,
			});
			expect(decision.action).toBe('allow');
		});
	});
});
