import isEqual from 'lodash/isEqual';
import {
	instantiateToolPolicyTemplate,
	isToolPolicyRefOnAgent,
	TOOL_POLICY_CATEGORY_NAMES,
	toolPolicySelectorMatches,
	type AgentJsonConfig,
	type ToolPolicy,
	type ToolPolicyAction,
	type ToolPolicyCategory,
	type ToolPolicyCondition,
	type ToolPolicyRule,
	type ToolPolicySelector,
	type ToolPolicyTemplate,
	type ToolPolicyToolIdentity,
} from '@n8n/api-types';

/**
 * `after`: after any of the used tools. `afterAll`: after all of them.
 * `advanced` is a saved nested condition. The panel shows it but cannot edit it.
 */
export type ToolPolicyAppliesMode = 'always' | 'after' | 'afterAll' | 'advanced';

/** True for the modes that need at least one used tool. */
export function needsToolUsed(mode: ToolPolicyAppliesMode): boolean {
	return mode === 'after' || mode === 'afterAll';
}

/** Editable state of one rule. It can be incomplete, so it is not a `ToolPolicyRule`. */
export interface ToolPolicyRuleDraft {
	id: string;
	name: string;
	action: ToolPolicyAction;
	tools: ToolPolicySelector[];
	applies: ToolPolicyAppliesMode;
	toolUsed: ToolPolicySelector[];
	/** The saved nested condition, kept as is when `applies` is `advanced`. */
	advancedWhen?: ToolPolicyCondition;
	message: string;
}

type AgentGuardrails = NonNullable<AgentJsonConfig['config']>['guardrails'];

export interface ToolPolicyDraft {
	defaultAction: ToolPolicyAction;
	rules: ToolPolicyRuleDraft[];
}

export type ToolPolicyOptionSource =
	| { type: 'node'; name: string }
	| { type: 'workflow'; name: string }
	| { type: 'mcpServer'; name: string }
	| { type: 'nodeType'; nodeType: string }
	| { type: 'category'; category: ToolPolicyCategory };

export interface ToolPolicySelectorOption {
	key: string;
	selector: ToolPolicySelector;
	source: ToolPolicyOptionSource;
}

/** A stable string for a selector, for select values and for comparisons. */
export function toolPolicySelectorKey(selector: ToolPolicySelector): string {
	if (selector.kind !== 'tool') return JSON.stringify([selector.kind, selector.value]);
	const { ref } = selector;
	return JSON.stringify(['tool', ref.type, ref.type === 'workflow' ? ref.workflowId : ref.name]);
}

/** The tools, MCP servers, and node types of the agent that a rule can select. */
export function buildToolPolicyOptions(
	config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'> | null,
): ToolPolicySelectorOption[] {
	const options: ToolPolicySelectorOption[] = [];
	const nodeTypes = new Set<string>();
	const add = (selector: ToolPolicySelector, source: ToolPolicyOptionSource) => {
		const key = toolPolicySelectorKey(selector);
		if (!options.some((option) => option.key === key)) options.push({ key, selector, source });
	};

	// Categories come first: they also cover tools that are added later.
	for (const category of TOOL_POLICY_CATEGORY_NAMES) {
		add({ kind: 'category', value: category }, { type: 'category', category });
	}

	for (const tool of config?.tools ?? []) {
		if (tool.type === 'node') {
			add(
				{ kind: 'tool', ref: { type: 'node', name: tool.name } },
				{ type: 'node', name: tool.name },
			);
			nodeTypes.add(tool.node.nodeType);
		} else if (tool.type === 'workflow' && tool.workflowId) {
			add(
				{ kind: 'tool', ref: { type: 'workflow', workflowId: tool.workflowId } },
				{ type: 'workflow', name: tool.name || tool.workflow },
			);
		}
	}
	for (const server of config?.mcpServers ?? []) {
		add(
			{ kind: 'tool', ref: { type: 'mcpServer', name: server.name } },
			{ type: 'mcpServer', name: server.name },
		);
	}
	for (const nodeType of nodeTypes) {
		add({ kind: 'nodeType', value: nodeType }, { type: 'nodeType', nodeType });
	}
	return options;
}

function isFlatCondition(when: ToolPolicyCondition): when is { toolUsed: ToolPolicySelector[] } {
	return 'toolUsed' in when;
}

/**
 * The selectors of an "after all of these tools" condition: `all` of
 * one-selector `toolUsed` conditions. Undefined for any other shape.
 */
function allOfSingleTools(when: ToolPolicyCondition): ToolPolicySelector[] | undefined {
	if (!('all' in when)) return undefined;
	const selectors: ToolPolicySelector[] = [];
	for (const part of when.all) {
		if (!('toolUsed' in part) || part.toolUsed.length !== 1) return undefined;
		selectors.push(part.toolUsed[0]);
	}
	return selectors;
}

export function toToolPolicyDraft(policy: ToolPolicy | undefined): ToolPolicyDraft {
	return {
		defaultAction: policy?.defaultAction ?? 'allow',
		rules: (policy?.rules ?? []).map((rule) => {
			const draft: ToolPolicyRuleDraft = {
				id: rule.id,
				name: rule.name ?? '',
				action: rule.action,
				tools: [...rule.tools],
				applies: 'always',
				toolUsed: [],
				message: rule.message ?? '',
			};
			const allOf = rule.when ? allOfSingleTools(rule.when) : undefined;
			if (rule.when && isFlatCondition(rule.when)) {
				draft.applies = 'after';
				draft.toolUsed = [...rule.when.toolUsed];
			} else if (allOf) {
				draft.applies = 'afterAll';
				draft.toolUsed = allOf;
			} else if (rule.when) {
				draft.applies = 'advanced';
				draft.advancedWhen = rule.when;
			}
			return draft;
		}),
	};
}

/** True when the draft has all fields the schema needs. */
export function isToolPolicyRuleComplete(rule: ToolPolicyRuleDraft): boolean {
	if (rule.tools.length === 0) return false;
	return !needsToolUsed(rule.applies) || rule.toolUsed.length > 0;
}

function toRule(draft: ToolPolicyRuleDraft): ToolPolicyRule {
	const rule: ToolPolicyRule = { id: draft.id, action: draft.action, tools: draft.tools };
	const name = draft.name.trim();
	if (name) rule.name = name;
	if (draft.applies === 'after') rule.when = { toolUsed: draft.toolUsed };
	if (draft.applies === 'afterAll') {
		// One tool is the same as "after any", so it is saved in the simpler form.
		rule.when =
			draft.toolUsed.length === 1
				? { toolUsed: draft.toolUsed }
				: { all: draft.toolUsed.map((selector) => ({ toolUsed: [selector] })) };
	}
	if (draft.applies === 'advanced' && draft.advancedWhen) rule.when = draft.advancedWhen;
	const message = draft.message.trim();
	if (draft.action === 'deny' && message) rule.message = message;
	return rule;
}

/**
 * The policy to save. Incomplete rules stay out, so the saved config is always
 * valid. No rules and default Allow is the same as no policy, so it is
 * `undefined`.
 */
export function fromToolPolicyDraft(draft: ToolPolicyDraft): ToolPolicy | undefined {
	const rules = draft.rules.filter(isToolPolicyRuleComplete).map(toRule);
	if (rules.length === 0 && draft.defaultAction === 'allow') return undefined;
	return { defaultAction: draft.defaultAction, rules };
}

/** True when the saved policy and the draft give the same saved value. */
export function isSameToolPolicy(saved: ToolPolicy | undefined, draft: ToolPolicyDraft): boolean {
	return isEqual(fromToolPolicyDraft(toToolPolicyDraft(saved)), fromToolPolicyDraft(draft));
}

/** Writes the policy and keeps the other guardrails. `undefined` removes the policy. */
export function toolPolicySave(
	config: AgentJsonConfig | null,
	policy: ToolPolicy | undefined,
): Partial<AgentJsonConfig> {
	const agentConfig: NonNullable<AgentJsonConfig['config']> = config?.config ?? {};
	const current: NonNullable<AgentGuardrails> = agentConfig.guardrails ?? {};
	const { toolPolicy: _previous, ...otherGuardrails } = current;
	const guardrails = policy ? { ...otherGuardrails, toolPolicy: policy } : otherGuardrails;
	const { guardrails: _guardrails, ...otherConfig } = agentConfig;
	return {
		config: Object.keys(guardrails).length > 0 ? { ...otherConfig, guardrails } : otherConfig,
	};
}

/** The first `rule-<n>` id that no rule uses. */
export function nextToolPolicyRuleId(rules: Array<Pick<ToolPolicyRuleDraft, 'id'>>): string {
	const used = new Set(rules.map((rule) => rule.id));
	let index = rules.length + 1;
	while (used.has(`rule-${index}`)) index++;
	return `rule-${index}`;
}

/**
 * Adds a template's rules after the existing ones, with new ids. A template
 * that sets a default action also changes the default.
 */
export function applyToolPolicyTemplate(
	draft: ToolPolicyDraft,
	template: ToolPolicyTemplate,
): ToolPolicyDraft {
	const { defaultAction, rules } = instantiateToolPolicyTemplate(template);
	const result: ToolPolicyDraft = {
		defaultAction: defaultAction ?? draft.defaultAction,
		rules: [...draft.rules],
	};
	for (const rule of rules) {
		const id = nextToolPolicyRuleId(result.rules);
		result.rules.push(
			...toToolPolicyDraft({ defaultAction: 'allow', rules: [{ ...rule, id }] }).rules,
		);
	}
	return result;
}

/** At the start of a conversation no tool was used, so only rules without `when` apply. */
export function blocksAllToolsAtStart(draft: ToolPolicyDraft): boolean {
	if (draft.defaultAction !== 'deny') return false;
	return !draft.rules.some(
		(rule) => rule.action === 'allow' && rule.applies === 'always' && rule.tools.length > 0,
	);
}

function conditionSelectors(rule: ToolPolicyRuleDraft): ToolPolicySelector[] {
	if (needsToolUsed(rule.applies)) return rule.toolUsed;
	if (rule.applies !== 'advanced' || !rule.advancedWhen) return [];
	const out: ToolPolicySelector[] = [];
	const visit = (condition: ToolPolicyCondition) => {
		if ('toolUsed' in condition) out.push(...condition.toolUsed);
		else ('all' in condition ? condition.all : condition.any).forEach(visit);
	};
	visit(rule.advancedWhen);
	return out;
}

/** Selectors that are both in the condition and in the tools of the rule. */
interface AgentToolEntry {
	identity: ToolPolicyToolIdentity;
	label: string;
}

/** Every tool and MCP server of the agent that a policy can refer to. */
function agentToolEntries(
	config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'> | null,
): AgentToolEntry[] {
	const entries: AgentToolEntry[] = [];
	for (const tool of config?.tools ?? []) {
		if (tool.type === 'node') {
			entries.push({
				identity: { type: 'node', name: tool.name, nodeType: tool.node.nodeType },
				label: tool.name,
			});
		} else if (tool.type === 'workflow' && tool.workflowId) {
			entries.push({
				identity: { type: 'workflow', workflowId: tool.workflowId },
				label: tool.name ?? tool.workflow,
			});
		}
	}
	for (const server of config?.mcpServers ?? []) {
		entries.push({ identity: { type: 'mcpServer', name: server.name }, label: server.name });
	}
	return entries;
}

/**
 * Labels of the tools that the rule's condition and the rule's tools both cover.
 * A selector covers a tool directly, or through its node type or package, so
 * "after Send Email" and "all Gmail tools" overlap when Send Email is a Gmail
 * tool. Equal selectors that match no tool of the agent overlap too.
 */
export function overlappingTools(
	config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'> | null,
	rule: ToolPolicyRuleDraft,
): string[] {
	const condition = conditionSelectors(rule);
	if (condition.length === 0 || rule.tools.length === 0) return [];

	const covers = (selectors: ToolPolicySelector[], tool: ToolPolicyToolIdentity) =>
		selectors.some((selector) => toolPolicySelectorMatches(selector, tool));

	const labels = agentToolEntries(config)
		.filter(({ identity }) => covers(condition, identity) && covers(rule.tools, identity))
		.map(({ label }) => label);

	const toolKeys = new Set(rule.tools.map(toolPolicySelectorKey));
	for (const selector of condition) {
		if (!toolKeys.has(toolPolicySelectorKey(selector))) continue;
		const matchesAgentTool = agentToolEntries(config).some(({ identity }) =>
			toolPolicySelectorMatches(selector, identity),
		);
		if (!matchesAgentTool) labels.push(selectorFallbackLabel(selector));
	}
	return [...new Set(labels)];
}

function selectorFallbackLabel(selector: ToolPolicySelector): string {
	if (selector.kind !== 'tool') return selector.value;
	return selector.ref.type === 'workflow' ? selector.ref.workflowId : selector.ref.name;
}

/** Tool selectors of the rule that point at no tool or MCP server of the agent. */
export function missingToolSelectors(
	config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'> | null,
	rule: ToolPolicyRuleDraft,
): ToolPolicySelector[] {
	const seen = new Set<string>();
	return [...rule.tools, ...conditionSelectors(rule)].filter((selector) => {
		if (selector.kind !== 'tool') return false;
		const key = toolPolicySelectorKey(selector);
		if (seen.has(key)) return false;
		seen.add(key);
		return !isToolPolicyRefOnAgent(config ?? {}, selector.ref);
	});
}
