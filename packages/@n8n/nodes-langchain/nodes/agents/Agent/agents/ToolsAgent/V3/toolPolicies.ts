import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeProperties, INodePropertyTypeOptions } from 'n8n-workflow';

/*
 * Tool policy types. They mirror `ToolPolicy` in `@n8n/api-types`
 * (`src/agents/agent-tool-policy.schema.ts`), which this package cannot
 * import. Keep them in sync. Read that file for the evaluation rules.
 */

export type ToolPolicyAction = 'allow' | 'deny';

export type ToolPolicyCategory = 'sendsDataOut' | 'readsData';

export type ToolPolicySelector =
	| { kind: 'tool'; ref: { type: 'node'; name: string } }
	| { kind: 'nodeType'; value: string }
	| { kind: 'category'; value: ToolPolicyCategory };

export type ToolPolicyCondition =
	| { toolUsed: ToolPolicySelector[] }
	| { all: ToolPolicyCondition[] }
	| { any: ToolPolicyCondition[] };

export interface ToolPolicyRule {
	id: string;
	name?: string;
	action: ToolPolicyAction;
	tools: ToolPolicySelector[];
	when?: ToolPolicyCondition;
	message?: string;
}

export interface ToolPolicy {
	defaultAction: ToolPolicyAction;
	rules: ToolPolicyRule[];
}

export const DEFAULT_TOOL_POLICY_DENY_MESSAGE = 'This tool is not available';

const CATEGORY_OPTIONS = [
	{
		name: 'Any Tool That Sends Data Out',
		value: 'sendsDataOut',
		description: 'Email, chat, HTTP, search, MCP, and workflow tools',
	},
	{
		name: 'Any Tool That Reads Business Data',
		value: 'readsData',
		description: 'Databases, CRMs, support desks, files, and mailboxes',
	},
];

const sendsDataOut: ToolPolicySelector = { kind: 'category', value: 'sendsDataOut' };
const readsData: ToolPolicySelector = { kind: 'category', value: 'readsData' };

/** Mirrors `TOOL_POLICY_TEMPLATES` in `@n8n/api-types`. Keep them in sync. */
const TEMPLATES: Record<
	string,
	{ defaultAction?: ToolPolicyAction; rules: Array<Omit<ToolPolicyRule, 'id'>> }
> = {
	preventDataLeaks: {
		rules: [
			{
				name: 'No sending data out after reading business data',
				action: 'deny',
				tools: [sendsDataOut],
				when: { toolUsed: [readsData] },
			},
		],
	},
	readOnly: {
		defaultAction: 'deny',
		rules: [
			{ name: 'Allow reading business data', action: 'allow', tools: [readsData] },
			{ name: 'Never send data out', action: 'deny', tools: [sendsDataOut] },
		],
	},
	noOutbound: {
		rules: [{ name: 'Never send data out', action: 'deny', tools: [sendsDataOut] }],
	},
};

export const toolPolicyTemplatesOption: INodeProperties = {
	displayName: 'Built-in Tool Policies',
	name: 'toolPolicyTemplates',
	type: 'multiOptions',
	noDataExpression: true,
	default: [],
	options: [
		{
			name: 'Prevent Data Leaks',
			value: 'preventDataLeaks',
			description: 'After the agent read business data, it cannot send data out',
		},
		{
			name: 'Read Only',
			value: 'readOnly',
			description:
				'The agent can only use tools that read business data. Sets the default action to Deny.',
		},
		{
			name: 'No Outbound',
			value: 'noOutbound',
			description: 'The agent can never send data out',
		},
	],
	description: 'Ready-made policies. They apply together with the tool policies below.',
};

const connectedToolNames: INodePropertyTypeOptions = {
	optionsFromConnectedNodes: { connectionType: NodeConnectionTypes.AiTool, value: 'nodeName' },
};

const connectedToolTypes: INodePropertyTypeOptions = {
	optionsFromConnectedNodes: { connectionType: NodeConnectionTypes.AiTool, value: 'nodeType' },
};

// All fields are fixed values. Rules must not depend on run data, because the
// caller of the agent controls part of that data.
export const toolPolicyDefaultOption: INodeProperties = {
	displayName: 'Default Action for Tools',
	name: 'toolPolicyDefault',
	type: 'options',
	noDataExpression: true,
	default: 'allow',
	options: [
		{
			name: 'Allow',
			value: 'allow',
			description: 'The agent can use a tool unless a tool policy denies it',
		},
		{
			name: 'Deny',
			value: 'deny',
			description: 'The agent can use a tool only if a tool policy allows it',
		},
	],
	description: 'What happens to a tool call when no tool policy applies to it',
};

export const toolPoliciesOption: INodeProperties = {
	displayName: 'Tool Policies',
	name: 'toolPolicies',
	type: 'fixedCollection',
	placeholder: 'Add Policy',
	default: {},
	description:
		'Allow or deny tools based on the tools the agent already used in this chat. When a deny policy and an allow policy apply to the same tool, the tool is denied. Connect a memory to apply policies across chat messages.',
	typeOptions: {
		multipleValues: true,
		fixedCollection: {
			itemTitle: '={{ $collection.item.value.name }}',
		},
	},
	options: [
		{
			name: 'rules',
			displayName: 'Policy',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					noDataExpression: true,
					default: '',
					placeholder: 'e.g. No email after customer lookup',
					description: 'Shown as the title of this policy and in the audit log',
				},
				{
					displayName: 'Action',
					name: 'action',
					type: 'options',
					noDataExpression: true,
					default: 'deny',
					options: [
						{ name: 'Deny', value: 'deny' },
						{ name: 'Allow', value: 'allow' },
					],
				},
				{
					displayName: 'Tools',
					name: 'tools',
					type: 'multiOptions',
					noDataExpression: true,
					default: [],
					options: [],
					typeOptions: connectedToolNames,
					description: 'The tools to allow or deny. Only tools connected to this agent are listed.',
				},
				{
					displayName: 'Tool Categories',
					name: 'toolCategories',
					type: 'multiOptions',
					noDataExpression: true,
					default: [],
					options: CATEGORY_OPTIONS,
					description: 'Also allow or deny every tool in these categories',
				},
				{
					displayName: 'Tool Types',
					name: 'toolTypes',
					type: 'multiOptions',
					noDataExpression: true,
					default: [],
					options: [],
					typeOptions: connectedToolTypes,
					description:
						'Also allow or deny every tool of these types, including tools you connect later',
				},
				{
					displayName: 'Apply',
					name: 'trigger',
					type: 'options',
					noDataExpression: true,
					default: 'toolUsed',
					options: [
						{
							name: 'After Any of These Tools Was Used',
							value: 'toolUsed',
							description: 'Apply after the agent used one of the selected tools in this chat',
						},
						{
							name: 'After All of These Tools Were Used',
							value: 'allToolsUsed',
							description: 'Apply after the agent used every selected tool in this chat',
						},
						{
							name: 'Always',
							value: 'always',
							description: 'Apply from the first message',
						},
					],
				},
				{
					displayName: 'After These Tools',
					name: 'afterTools',
					type: 'multiOptions',
					noDataExpression: true,
					default: [],
					options: [],
					typeOptions: connectedToolNames,
					description: 'Only tools connected to this agent are listed',
					displayOptions: { show: { trigger: ['toolUsed', 'allToolsUsed'] } },
				},
				{
					displayName: 'After Tools in These Categories',
					name: 'afterToolCategories',
					type: 'multiOptions',
					noDataExpression: true,
					default: [],
					options: CATEGORY_OPTIONS,
					description: 'Each category counts as used when any tool in it was used',
					displayOptions: { show: { trigger: ['toolUsed', 'allToolsUsed'] } },
				},
				{
					displayName: 'After Tools of These Types',
					name: 'afterToolTypes',
					type: 'multiOptions',
					noDataExpression: true,
					default: [],
					options: [],
					typeOptions: connectedToolTypes,
					description: 'Each type counts as used when any tool of that type was used',
					displayOptions: { show: { trigger: ['toolUsed', 'allToolsUsed'] } },
				},
				{
					displayName: 'Message to the Agent',
					name: 'message',
					type: 'string',
					noDataExpression: true,
					default: DEFAULT_TOOL_POLICY_DENY_MESSAGE,
					description:
						'The agent gets this text instead of the tool result. Do not name the policy or what triggered it: chat users can see the agent replies.',
					displayOptions: { show: { action: ['deny'] } },
				},
			],
		},
	],
};

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((v) => typeof v === 'string');

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isCategory = (value: string): value is ToolPolicyCategory =>
	value === 'sendsDataOut' || value === 'readsData';

function toSelectors(names: unknown, types: unknown, categories: unknown): ToolPolicySelector[] {
	return [
		...(isStringArray(categories) ? categories : [])
			.filter(isCategory)
			.map((value): ToolPolicySelector => ({ kind: 'category', value })),
		...(isStringArray(names) ? names : []).map(
			(name): ToolPolicySelector => ({ kind: 'tool', ref: { type: 'node', name } }),
		),
		...(isStringArray(types) ? types : []).map(
			(value): ToolPolicySelector => ({ kind: 'nodeType', value }),
		),
	];
}

/**
 * Reads the tool policy from the agent options. Returns `undefined` when the
 * agent has no policy, so the caller can skip all checks.
 *
 * Malformed values fall back to the stricter choice: an unknown action becomes
 * `deny`. A rule that can never apply (no tools, or no trigger tools) is dropped.
 */
export function parseToolPolicy(options: {
	toolPolicyDefault?: unknown;
	toolPolicyTemplates?: unknown;
	toolPolicies?: unknown;
}): ToolPolicy | undefined {
	let defaultAction: ToolPolicyAction = options.toolPolicyDefault === 'deny' ? 'deny' : 'allow';
	const rules: ToolPolicyRule[] = [];

	for (const template of isStringArray(options.toolPolicyTemplates)
		? options.toolPolicyTemplates
		: []) {
		const definition = TEMPLATES[template];
		if (!definition) continue;
		// A template can only make the default stricter.
		if (definition.defaultAction === 'deny') defaultAction = 'deny';
		definition.rules.forEach((rule, index) => {
			rules.push({ ...structuredClone(rule), id: `template-${template}-${index + 1}` });
		});
	}

	const rawRules =
		isRecord(options.toolPolicies) && Array.isArray(options.toolPolicies.rules)
			? options.toolPolicies.rules
			: [];

	rawRules.forEach((raw: unknown, index: number) => {
		if (!isRecord(raw)) return;

		const action: ToolPolicyAction = raw.action === 'allow' ? 'allow' : 'deny';
		const tools = toSelectors(raw.tools, raw.toolTypes, raw.toolCategories);
		if (tools.length === 0) return;

		// Rules have no id in the node UI, so the position is the id the audit log shows.
		const rule: ToolPolicyRule = { id: `rule-${index + 1}`, action, tools };
		if (typeof raw.name === 'string' && raw.name.trim() !== '') rule.name = raw.name.trim();

		if (raw.trigger !== 'always') {
			const toolUsed = toSelectors(raw.afterTools, raw.afterToolTypes, raw.afterToolCategories);
			if (toolUsed.length === 0) return;
			rule.when =
				raw.trigger === 'allToolsUsed' && toolUsed.length > 1
					? { all: toolUsed.map((selector) => ({ toolUsed: [selector] })) }
					: { toolUsed };
		}

		if (action === 'deny') {
			rule.message =
				typeof raw.message === 'string' && raw.message.trim() !== ''
					? raw.message.trim()
					: DEFAULT_TOOL_POLICY_DENY_MESSAGE;
		}

		rules.push(rule);
	});

	if (defaultAction === 'allow' && rules.length === 0) return undefined;
	return { defaultAction, rules };
}
