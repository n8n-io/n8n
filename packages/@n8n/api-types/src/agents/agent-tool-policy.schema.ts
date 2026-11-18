import { z } from 'zod';

/**
 * Tool policies decide which tools an agent may call, based on the tools it
 * already used in the conversation.
 *
 * Evaluation, for one tool call:
 * 1. Take the rules whose `tools` match the tool and whose `when` holds.
 * 2. If any of them denies, the call is denied.
 * 3. Else, if any of them allows, the call is allowed.
 * 4. Else, `defaultAction` applies.
 *
 * Rule order has no effect. A deny can never be undone by an allow, because
 * the model chooses which tools to call and so can trigger any allow rule.
 *
 * Conditions have no `not`. A rule can only start to apply, never stop, so
 * calling a tool can never remove a restriction.
 */

export const TOOL_POLICY_ACTIONS = ['allow', 'deny'] as const;
export const ToolPolicyActionSchema = z.enum(TOOL_POLICY_ACTIONS);
export type ToolPolicyAction = z.infer<typeof ToolPolicyActionSchema>;

export const TOOL_POLICY_MESSAGE_MAX_LENGTH = 500;
export const TOOL_POLICY_NAME_MAX_LENGTH = 100;
export const TOOL_POLICY_MAX_RULES = 100;
export const TOOL_POLICY_MAX_CONDITION_DEPTH = 4;

/**
 * A tool configured on the agent. For the AI Agent node, `node.name` is the
 * name of a tool node connected to the agent.
 */
export const ToolPolicyToolRefSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('node'), name: z.string().min(1) }),
	z.object({ type: z.literal('workflow'), workflowId: z.string().min(1) }),
	z.object({ type: z.literal('mcpServer'), name: z.string().min(1) }),
]);
export type ToolPolicyToolRef = z.infer<typeof ToolPolicyToolRefSchema>;

const BASE = 'n8n-nodes-base';
const LANGCHAIN = '@n8n/n8n-nodes-langchain';

/**
 * Tool categories, so a rule can cover tools by what they do. Each lists base
 * node types: `n8n-nodes-base.gmail` also covers the `n8n-nodes-base.gmailTool`
 * tool variant.
 *
 * The lists work per node type, not per operation. Gmail both reads and sends,
 * so it is in both categories. Missing node types are a silent gap in every
 * rule that uses the category, so add new integrations here.
 */
export const TOOL_POLICY_CATEGORIES = {
	/**
	 * Tools that can send data outside n8n. Search tools count, because a query
	 * can carry data. MCP servers and workflow tools can do anything, so they
	 * count too.
	 */
	sendsDataOut: {
		includesMcpServers: true,
		includesWorkflowTools: true,
		nodeTypes: [
			`${BASE}.discord`,
			`${BASE}.emailSend`,
			`${BASE}.gmail`,
			`${BASE}.googleChat`,
			`${BASE}.httpRequest`,
			`${BASE}.mailchimp`,
			`${BASE}.mailgun`,
			`${BASE}.mattermost`,
			`${BASE}.microsoftOutlook`,
			`${BASE}.microsoftTeams`,
			`${BASE}.sendGrid`,
			`${BASE}.sendInBlue`,
			`${BASE}.slack`,
			`${BASE}.telegram`,
			`${BASE}.twilio`,
			`${BASE}.whatsApp`,
			`${LANGCHAIN}.mcpClientTool`,
			`${LANGCHAIN}.toolHttpRequest`,
			`${LANGCHAIN}.toolSearXng`,
			`${LANGCHAIN}.toolSerpApi`,
			`${LANGCHAIN}.toolWikipedia`,
			`${LANGCHAIN}.toolWolframAlpha`,
			`${LANGCHAIN}.toolWorkflow`,
		],
	},
	/** Tools that read business data: databases, CRMs, support desks, files, and mailboxes. */
	readsData: {
		includesMcpServers: false,
		includesWorkflowTools: false,
		nodeTypes: [
			`${BASE}.airtable`,
			`${BASE}.awsS3`,
			`${BASE}.baserow`,
			`${BASE}.dropbox`,
			`${BASE}.elasticsearch`,
			`${BASE}.freshdesk`,
			`${BASE}.github`,
			`${BASE}.gitlab`,
			`${BASE}.gmail`,
			`${BASE}.googleBigQuery`,
			`${BASE}.googleDocs`,
			`${BASE}.googleDrive`,
			`${BASE}.googleSheets`,
			`${BASE}.hubspot`,
			`${BASE}.intercom`,
			`${BASE}.jira`,
			`${BASE}.linear`,
			`${BASE}.microsoftOneDrive`,
			`${BASE}.microsoftOutlook`,
			`${BASE}.microsoftSql`,
			`${BASE}.mongoDb`,
			`${BASE}.mySql`,
			`${BASE}.nocoDb`,
			`${BASE}.notion`,
			`${BASE}.pipedrive`,
			`${BASE}.postgres`,
			`${BASE}.redis`,
			`${BASE}.salesforce`,
			`${BASE}.shopify`,
			`${BASE}.snowflake`,
			`${BASE}.stripe`,
			`${BASE}.supabase`,
			`${BASE}.zendesk`,
			`${BASE}.zohoCrm`,
			`${LANGCHAIN}.toolVectorStore`,
		],
	},
} as const satisfies Record<
	string,
	{ includesMcpServers: boolean; includesWorkflowTools: boolean; nodeTypes: readonly string[] }
>;

export type ToolPolicyCategory = keyof typeof TOOL_POLICY_CATEGORIES;
export const TOOL_POLICY_CATEGORY_NAMES = [
	'sendsDataOut',
	'readsData',
] as const satisfies readonly ToolPolicyCategory[];

/**
 * Which tools a rule covers. `nodeType` and `package` match like the
 * `name` and `package` selectors of node type policies, so a rule also
 * covers tools that are added or renamed later.
 */
export const ToolPolicySelectorSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('tool'), ref: ToolPolicyToolRefSchema }),
	z.object({ kind: z.literal('nodeType'), value: z.string().min(1) }),
	z.object({ kind: z.literal('package'), value: z.string().min(1) }),
	z.object({ kind: z.literal('category'), value: z.enum(TOOL_POLICY_CATEGORY_NAMES) }),
]);
export type ToolPolicySelector = z.infer<typeof ToolPolicySelectorSchema>;

export type ToolPolicyCondition =
	/** True when a matching tool ran earlier in the conversation. A failed run counts; a blocked call does not. */
	| { toolUsed: ToolPolicySelector[] }
	| { all: ToolPolicyCondition[] }
	| { any: ToolPolicyCondition[] };

export const ToolPolicyConditionSchema: z.ZodType<ToolPolicyCondition> = z.lazy(() =>
	z.union([
		z.object({ toolUsed: z.array(ToolPolicySelectorSchema).min(1) }).strict(),
		z.object({ all: z.array(ToolPolicyConditionSchema).min(1) }).strict(),
		z.object({ any: z.array(ToolPolicyConditionSchema).min(1) }).strict(),
	]),
);

function conditionDepth(condition: ToolPolicyCondition): number {
	if ('toolUsed' in condition) return 1;
	const children = 'all' in condition ? condition.all : condition.any;
	return 1 + Math.max(...children.map(conditionDepth));
}

export const ToolPolicyRuleSchema = z
	.object({
		id: z
			.string()
			.min(1)
			.regex(
				/^[A-Za-z0-9_-]+$/,
				'Rule id can only contain letters, numbers, hyphens, and underscores',
			),
		/** Shown to builders and in the audit log. Absent means the UI shows the rule's position. */
		name: z.string().trim().min(1).max(TOOL_POLICY_NAME_MAX_LENGTH).optional(),
		action: ToolPolicyActionSchema,
		tools: z.array(ToolPolicySelectorSchema).min(1),
		/** Absent means the rule always applies. */
		when: ToolPolicyConditionSchema.optional(),
		/** Returned to the model instead of the tool result. Deny rules only. */
		message: z.string().trim().min(1).max(TOOL_POLICY_MESSAGE_MAX_LENGTH).optional(),
	})
	.strict()
	.superRefine((rule, ctx) => {
		if (rule.message !== undefined && rule.action !== 'deny') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['message'],
				message: 'Only deny rules can have a message',
			});
		}
		if (rule.when && conditionDepth(rule.when) > TOOL_POLICY_MAX_CONDITION_DEPTH) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['when'],
				message: `Conditions can be nested at most ${TOOL_POLICY_MAX_CONDITION_DEPTH} levels deep`,
			});
		}
	});
export type ToolPolicyRule = z.infer<typeof ToolPolicyRuleSchema>;

export const ToolPolicySchema = z
	.object({
		defaultAction: ToolPolicyActionSchema,
		rules: z
			.array(ToolPolicyRuleSchema)
			.max(TOOL_POLICY_MAX_RULES)
			.superRefine((rules, ctx) => {
				const seen = new Set<string>();
				for (const [index, rule] of rules.entries()) {
					if (seen.has(rule.id)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							path: [index, 'id'],
							message: `Duplicate tool policy rule id: "${rule.id}"`,
						});
					}
					seen.add(rule.id);
				}
			}),
	})
	.strict();
export type ToolPolicy = z.infer<typeof ToolPolicySchema>;

/** Text the model gets for a denied call when the rule sets no message. */
export const DEFAULT_TOOL_POLICY_DENY_MESSAGE = 'This tool is not available';

/** Every tool selector a rule uses, in its `tools` and in its `when` condition. */
export function collectToolPolicySelectors(rule: ToolPolicyRule): ToolPolicySelector[] {
	const out = [...rule.tools];
	const visit = (condition: ToolPolicyCondition) => {
		if ('toolUsed' in condition) out.push(...condition.toolUsed);
		else ('all' in condition ? condition.all : condition.any).forEach(visit);
	};
	if (rule.when) visit(rule.when);
	return out;
}

/** One tool of an agent, as the policy sees it. `nodeType` is set for node tools only. */
export type ToolPolicyToolIdentity = ToolPolicyToolRef & { nodeType?: string };

/** `n8n-nodes-base.gmailTool` → `n8n-nodes-base.gmail`. Other names stay as they are. */
function stripToolSuffix(nodeType: string): string {
	return nodeType.endsWith('Tool') ? nodeType.slice(0, -'Tool'.length) : nodeType;
}

/** The package part of a node type: `n8n-nodes-base.gmailTool` → `n8n-nodes-base`. */
function packageOfNodeType(nodeType: string): string {
	const dot = nodeType.lastIndexOf('.');
	return dot === -1 ? nodeType : nodeType.slice(0, dot);
}

/** True when the selector covers the tool. */
export function toolPolicySelectorMatches(
	selector: ToolPolicySelector,
	tool: ToolPolicyToolIdentity,
): boolean {
	if (selector.kind === 'nodeType') return tool.nodeType === selector.value;
	if (selector.kind === 'category') {
		const category = TOOL_POLICY_CATEGORIES[selector.value];
		if (tool.type === 'mcpServer') return category.includesMcpServers;
		if (tool.type === 'workflow') return category.includesWorkflowTools;
		if (tool.nodeType === undefined) return false;
		const listed: readonly string[] = category.nodeTypes;
		return listed.includes(tool.nodeType) || listed.includes(stripToolSuffix(tool.nodeType));
	}
	if (selector.kind === 'package') {
		return tool.nodeType !== undefined && packageOfNodeType(tool.nodeType) === selector.value;
	}
	const { ref } = selector;
	if (ref.type !== tool.type) return false;
	if (ref.type === 'workflow' && tool.type === 'workflow')
		return ref.workflowId === tool.workflowId;
	if (ref.type !== 'workflow' && tool.type !== 'workflow') return ref.name === tool.name;
	return false;
}

/**
 * Ready-made policies that a builder can start from. Applying a template adds
 * its rules and, when set, changes the default action.
 */
export const TOOL_POLICY_TEMPLATES = {
	/** After the agent read business data, it cannot send data out. */
	preventDataLeaks: {
		rules: [
			{
				name: 'No sending data out after reading business data',
				action: 'deny',
				tools: [{ kind: 'category', value: 'sendsDataOut' }],
				when: { toolUsed: [{ kind: 'category', value: 'readsData' }] },
			},
		],
	},
	/** The agent can only read business data. Tools that also send, like Gmail, stay denied. */
	readOnly: {
		defaultAction: 'deny',
		rules: [
			{
				name: 'Allow reading business data',
				action: 'allow',
				tools: [{ kind: 'category', value: 'readsData' }],
			},
			{
				name: 'Never send data out',
				action: 'deny',
				tools: [{ kind: 'category', value: 'sendsDataOut' }],
			},
		],
	},
	/** The agent can never send data out. */
	noOutbound: {
		rules: [
			{
				name: 'Never send data out',
				action: 'deny',
				tools: [{ kind: 'category', value: 'sendsDataOut' }],
			},
		],
	},
} as const satisfies Record<
	string,
	{ defaultAction?: ToolPolicyAction; rules: ReadonlyArray<Omit<ToolPolicyRule, 'id'>> }
>;

export type ToolPolicyTemplate = keyof typeof TOOL_POLICY_TEMPLATES;
export const TOOL_POLICY_TEMPLATE_NAMES = [
	'preventDataLeaks',
	'readOnly',
	'noOutbound',
] as const satisfies readonly ToolPolicyTemplate[];

/** A fresh, editable copy of a template. The caller gives the rules their ids. */
export function instantiateToolPolicyTemplate(template: ToolPolicyTemplate): {
	defaultAction?: ToolPolicyAction;
	rules: Array<Omit<ToolPolicyRule, 'id'>>;
} {
	const source: {
		defaultAction?: ToolPolicyAction;
		rules: ReadonlyArray<Omit<ToolPolicyRule, 'id'>>;
	} = TOOL_POLICY_TEMPLATES[template];
	return {
		...(source.defaultAction && { defaultAction: source.defaultAction }),
		rules: source.rules.map((rule) => structuredClone(rule)),
	};
}
