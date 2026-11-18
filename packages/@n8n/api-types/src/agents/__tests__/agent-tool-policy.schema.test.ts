import { findToolPolicyRefIssues, isToolPolicyRefOnAgent } from '../agent-json-config.schema';
import {
	collectToolPolicySelectors,
	TOOL_POLICY_MAX_CONDITION_DEPTH,
	TOOL_POLICY_NAME_MAX_LENGTH,
	ToolPolicySchema,
	toolPolicySelectorMatches,
	instantiateToolPolicyTemplate,
	TOOL_POLICY_TEMPLATE_NAMES,
	type ToolPolicy,
	type ToolPolicyCondition,
	type ToolPolicyRule,
} from '../agent-tool-policy.schema';

const readDb = { kind: 'tool', ref: { type: 'node', name: 'Read Customer DB' } } as const;
const sendEmail = { kind: 'tool', ref: { type: 'node', name: 'Send Email' } } as const;

const validPolicy: ToolPolicy = {
	defaultAction: 'allow',
	rules: [
		{
			id: 'no-email-after-db',
			action: 'deny',
			tools: [sendEmail, { kind: 'nodeType', value: 'n8n-nodes-base.gmailTool' }],
			when: { toolUsed: [readDb] },
			message: 'Email is not available now',
		},
		{
			id: 'allow_workflow',
			action: 'allow',
			tools: [
				{ kind: 'tool', ref: { type: 'workflow', workflowId: 'wf-1' } },
				{ kind: 'tool', ref: { type: 'mcpServer', name: 'github' } },
				{ kind: 'package', value: 'n8n-nodes-base' },
			],
		},
	],
};

function nestedCondition(depth: number): ToolPolicyCondition {
	let condition: ToolPolicyCondition = { toolUsed: [readDb] };
	for (let level = 1; level < depth; level++) condition = { all: [condition] };
	return condition;
}

function withRule(rule: Record<string, unknown>) {
	return { defaultAction: 'allow', rules: [rule] };
}

describe('ToolPolicySchema', () => {
	it('accepts a valid policy', () => {
		expect(ToolPolicySchema.safeParse(validPolicy).success).toBe(true);
	});

	it('accepts a policy without rules', () => {
		expect(ToolPolicySchema.safeParse({ defaultAction: 'deny', rules: [] }).success).toBe(true);
	});

	it('accepts a rule name and trims it', () => {
		const result = ToolPolicySchema.parse({
			defaultAction: 'allow',
			rules: [{ id: 'r1', name: '  No email  ', action: 'deny', tools: [sendEmail] }],
		});
		expect(result.rules[0].name).toBe('No email');
	});

	it('rejects an empty or too long rule name', () => {
		for (const name of ['   ', 'x'.repeat(TOOL_POLICY_NAME_MAX_LENGTH + 1)]) {
			const result = ToolPolicySchema.safeParse({
				defaultAction: 'allow',
				rules: [{ id: 'r1', name, action: 'deny', tools: [sendEmail] }],
			});
			expect(result.success).toBe(false);
		}
	});

	it('rejects duplicate rule ids', () => {
		const result = ToolPolicySchema.safeParse({
			defaultAction: 'allow',
			rules: [
				{ id: 'r1', action: 'allow', tools: [readDb] },
				{ id: 'r1', action: 'deny', tools: [sendEmail] },
			],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues).toEqual([
			expect.objectContaining({
				path: ['rules', 1, 'id'],
				message: 'Duplicate tool policy rule id: "r1"',
			}),
		]);
	});

	it('rejects a rule id with characters that are not allowed', () => {
		const result = ToolPolicySchema.safeParse(
			withRule({ id: 'rule 1', action: 'allow', tools: [readDb] }),
		);

		expect(result.success).toBe(false);
	});

	it('rejects a message on an allow rule', () => {
		const result = ToolPolicySchema.safeParse(
			withRule({ id: 'r1', action: 'allow', tools: [readDb], message: 'Nope' }),
		);

		expect(result.success).toBe(false);
		expect(result.error?.issues).toEqual([
			expect.objectContaining({
				path: ['rules', 0, 'message'],
				message: 'Only deny rules can have a message',
			}),
		]);
	});

	it('rejects a rule with empty tools', () => {
		const result = ToolPolicySchema.safeParse(withRule({ id: 'r1', action: 'deny', tools: [] }));

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['rules', 0, 'tools']);
	});

	it('rejects an empty toolUsed condition', () => {
		const result = ToolPolicySchema.safeParse(
			withRule({ id: 'r1', action: 'deny', tools: [sendEmail], when: { toolUsed: [] } }),
		);

		expect(result.success).toBe(false);
	});

	it(`accepts conditions nested ${TOOL_POLICY_MAX_CONDITION_DEPTH} levels deep`, () => {
		const result = ToolPolicySchema.safeParse(
			withRule({
				id: 'r1',
				action: 'deny',
				tools: [sendEmail],
				when: nestedCondition(TOOL_POLICY_MAX_CONDITION_DEPTH),
			}),
		);

		expect(result.success).toBe(true);
	});

	it('rejects conditions nested deeper than the limit', () => {
		const result = ToolPolicySchema.safeParse(
			withRule({
				id: 'r1',
				action: 'deny',
				tools: [sendEmail],
				when: nestedCondition(TOOL_POLICY_MAX_CONDITION_DEPTH + 1),
			}),
		);

		expect(result.success).toBe(false);
		expect(result.error?.issues).toEqual([expect.objectContaining({ path: ['rules', 0, 'when'] })]);
	});

	it.each([
		['policy', { ...validPolicy, extra: true }],
		['rule', withRule({ id: 'r1', action: 'allow', tools: [readDb], priority: 1 })],
		[
			'condition',
			withRule({
				id: 'r1',
				action: 'deny',
				tools: [sendEmail],
				when: { toolUsed: [readDb], not: true },
			}),
		],
	])('rejects unknown keys on a %s', (_name, input) => {
		expect(ToolPolicySchema.safeParse(input).success).toBe(false);
	});

	it('rejects an unknown selector kind and ref type', () => {
		expect(
			ToolPolicySchema.safeParse(
				withRule({ id: 'r1', action: 'allow', tools: [{ kind: 'regex', value: '.*' }] }),
			).success,
		).toBe(false);
		expect(
			ToolPolicySchema.safeParse(
				withRule({
					id: 'r1',
					action: 'allow',
					tools: [{ kind: 'tool', ref: { type: 'custom', id: 'x' } }],
				}),
			).success,
		).toBe(false);
	});
});

describe('collectToolPolicySelectors', () => {
	it('returns the selectors of tools and of nested conditions', () => {
		const rule: ToolPolicyRule = {
			id: 'r1',
			action: 'deny',
			tools: [sendEmail],
			when: { all: [{ toolUsed: [readDb] }, { all: [{ toolUsed: [sendEmail] }] }] },
		};

		expect(collectToolPolicySelectors(rule)).toEqual([sendEmail, readDb, sendEmail]);
	});
});

describe('findToolPolicyRefIssues', () => {
	const agent = {
		tools: [
			{ type: 'workflow' as const, workflow: 'My Workflow', workflowId: 'wf-1' },
			{
				type: 'node' as const,
				name: 'Read Customer DB',
				node: { nodeType: 'n8n-nodes-base.postgresTool', nodeTypeVersion: 1, nodeParameters: {} },
			},
		],
		mcpServers: [
			{
				name: 'github',
				url: 'https://example.com/mcp',
				transport: 'sse' as const,
				authentication: 'none' as const,
			},
		],
	};

	it('returns no issues when the policy is unset', () => {
		expect(findToolPolicyRefIssues(agent)).toEqual([]);
	});

	it('returns no issues when every ref resolves', () => {
		expect(
			findToolPolicyRefIssues({
				...agent,
				config: {
					guardrails: {
						toolPolicy: {
							defaultAction: 'allow',
							rules: [
								{
									id: 'r1',
									action: 'deny',
									tools: [
										{ kind: 'tool', ref: { type: 'workflow', workflowId: 'wf-1' } },
										{ kind: 'tool', ref: { type: 'mcpServer', name: 'github' } },
										{ kind: 'nodeType', value: 'n8n-nodes-base.gmailTool' },
									],
									when: { toolUsed: [readDb] },
								},
							],
						},
					},
				},
			}),
		).toEqual([]);
	});

	it('returns each dangling ref one time for each rule, also from conditions', () => {
		const issues = findToolPolicyRefIssues({
			...agent,
			config: {
				guardrails: {
					toolPolicy: {
						defaultAction: 'allow',
						rules: [
							{ id: 'r1', action: 'allow', tools: [readDb] },
							{
								id: 'r2',
								action: 'deny',
								tools: [sendEmail, { kind: 'tool', ref: { type: 'mcpServer', name: 'gone' } }],
								when: { all: [{ toolUsed: [sendEmail] }] },
							},
						],
					},
				},
			},
		});

		expect(issues).toEqual([
			{ ruleIndex: 1, ref: { type: 'node', name: 'Send Email' } },
			{ ruleIndex: 1, ref: { type: 'mcpServer', name: 'gone' } },
		]);
	});

	it('does not match a workflow ref on a node tool with the same name', () => {
		expect(
			isToolPolicyRefOnAgent(agent, { type: 'workflow', workflowId: 'Read Customer DB' }),
		).toBe(false);
	});
});

describe('toolPolicySelectorMatches', () => {
	const gmailNode = {
		type: 'node',
		name: 'Send Email',
		nodeType: 'n8n-nodes-base.gmailTool',
	} as const;
	const langchainNode = {
		type: 'node',
		name: 'Search',
		nodeType: '@n8n/n8n-nodes-langchain.toolSerpApi',
	} as const;

	it('matches a node tool by name, node type, and package', () => {
		expect(toolPolicySelectorMatches(sendEmail, gmailNode)).toBe(true);
		expect(
			toolPolicySelectorMatches({ kind: 'nodeType', value: 'n8n-nodes-base.gmailTool' }, gmailNode),
		).toBe(true);
		expect(toolPolicySelectorMatches({ kind: 'package', value: 'n8n-nodes-base' }, gmailNode)).toBe(
			true,
		);
		expect(
			toolPolicySelectorMatches(
				{ kind: 'package', value: '@n8n/n8n-nodes-langchain' },
				langchainNode,
			),
		).toBe(true);
	});

	it('does not match a different tool, type, or package', () => {
		expect(toolPolicySelectorMatches(readDb, gmailNode)).toBe(false);
		expect(
			toolPolicySelectorMatches({ kind: 'nodeType', value: 'n8n-nodes-base.slackTool' }, gmailNode),
		).toBe(false);
		expect(toolPolicySelectorMatches({ kind: 'package', value: 'n8n-nodes' }, gmailNode)).toBe(
			false,
		);
	});

	it('matches workflow tools by id and MCP servers by name, never by node type', () => {
		const workflow = { type: 'workflow', workflowId: 'wf-1' } as const;
		const mcp = { type: 'mcpServer', name: 'crm' } as const;

		expect(toolPolicySelectorMatches({ kind: 'tool', ref: workflow }, workflow)).toBe(true);
		expect(
			toolPolicySelectorMatches(
				{ kind: 'tool', ref: { type: 'workflow', workflowId: 'wf-2' } },
				workflow,
			),
		).toBe(false);
		expect(toolPolicySelectorMatches({ kind: 'tool', ref: mcp }, mcp)).toBe(true);
		expect(
			toolPolicySelectorMatches({ kind: 'tool', ref: { type: 'node', name: 'crm' } }, mcp),
		).toBe(false);
		expect(toolPolicySelectorMatches({ kind: 'package', value: 'n8n-nodes-base' }, mcp)).toBe(
			false,
		);
	});
});

describe('tool policy categories', () => {
	const sendsDataOut = { kind: 'category', value: 'sendsDataOut' } as const;
	const readsData = { kind: 'category', value: 'readsData' } as const;

	it('accepts a known category and rejects an unknown one', () => {
		const policy = (value: string) => ({
			defaultAction: 'allow',
			rules: [{ id: 'r1', action: 'deny', tools: [{ kind: 'category', value }] }],
		});
		expect(ToolPolicySchema.safeParse(policy('sendsDataOut')).success).toBe(true);
		expect(ToolPolicySchema.safeParse(policy('everything')).success).toBe(false);
	});

	it('matches a node tool by its base type or its tool variant', () => {
		const gmailTool = { type: 'node', name: 'Mail', nodeType: 'n8n-nodes-base.gmailTool' } as const;
		const gmail = { type: 'node', name: 'Mail', nodeType: 'n8n-nodes-base.gmail' } as const;
		for (const tool of [gmailTool, gmail]) {
			expect(toolPolicySelectorMatches(sendsDataOut, tool)).toBe(true);
			expect(toolPolicySelectorMatches(readsData, tool)).toBe(true);
		}
	});

	it('matches AI tool nodes whose name already ends in Tool', () => {
		const mcp = {
			type: 'node',
			name: 'MCP',
			nodeType: '@n8n/n8n-nodes-langchain.mcpClientTool',
		} as const;
		expect(toolPolicySelectorMatches(sendsDataOut, mcp)).toBe(true);
	});

	it('does not match tools outside the category', () => {
		const calculator = {
			type: 'node',
			name: 'Calc',
			nodeType: '@n8n/n8n-nodes-langchain.toolCalculator',
		} as const;
		const postgres = { type: 'node', name: 'DB', nodeType: 'n8n-nodes-base.postgresTool' } as const;
		expect(toolPolicySelectorMatches(sendsDataOut, calculator)).toBe(false);
		expect(toolPolicySelectorMatches(readsData, calculator)).toBe(false);
		expect(toolPolicySelectorMatches(sendsDataOut, postgres)).toBe(false);
		expect(toolPolicySelectorMatches(readsData, postgres)).toBe(true);
	});

	it('counts MCP servers and workflow tools as sending data out, not as reading data', () => {
		const mcp = { type: 'mcpServer', name: 'crm' } as const;
		const workflow = { type: 'workflow', workflowId: 'wf-1' } as const;
		for (const tool of [mcp, workflow]) {
			expect(toolPolicySelectorMatches(sendsDataOut, tool)).toBe(true);
			expect(toolPolicySelectorMatches(readsData, tool)).toBe(false);
		}
	});
});

describe('tool policy templates', () => {
	it.each(TOOL_POLICY_TEMPLATE_NAMES)('%s is a valid policy once its rules have ids', (name) => {
		const template = instantiateToolPolicyTemplate(name);
		const result = ToolPolicySchema.safeParse({
			defaultAction: template.defaultAction ?? 'allow',
			rules: template.rules.map((rule, index) => ({ ...rule, id: `t${index}` })),
		});
		expect(result.success).toBe(true);
	});

	it('returns a copy that can be changed without changing the template', () => {
		const first = instantiateToolPolicyTemplate('noOutbound');
		first.rules[0].tools.push(readDb);
		expect(instantiateToolPolicyTemplate('noOutbound').rules[0].tools).toHaveLength(1);
	});
});
