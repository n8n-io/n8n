import {
	DEFAULT_TOOL_POLICY_DENY_MESSAGE,
	toolPolicySelectorMatches,
	type PolicyViolation,
	type ToolPolicy,
	type ToolPolicyCondition,
	type ToolPolicyRule,
	type ToolPolicySelector,
	type ToolPolicyToolIdentity,
} from '@n8n/api-types';
import type { PolicedTool, PolicedToolCallRecord, PreToolExecutionContext } from '@n8n/decorators';
import { nodeNameToToolName } from 'n8n-workflow';

export const TOOL_POLICY_VIOLATION_KIND = 'agent-tool-policy';

/** Where a policy comes from. It decides which tools the policy's tool refs can name. */
export type ToolPolicySource =
	/** The policy of an agent: the agent of the call, or an agent that delegated to it. */
	| { kind: 'agent'; agentId: string }
	/** A policy above agents, such as one for a project. Its tool refs name no tool. */
	| { kind: 'scope'; scope: string };

export interface SourcedToolPolicy {
	source: ToolPolicySource;
	policy: ToolPolicy;
}

export interface ToolPolicyDecision {
	action: 'allow' | 'deny';
	/** The rules that denied, or that allowed when the call is allowed. Default decisions add none. */
	ruleIds: string[];
	/** One violation for each deny rule and each default deny. Empty when the call is allowed. */
	violations: PolicyViolation[];
}

export interface EvaluateToolCallInput {
	/**
	 * Every policy that applies to the call. The call runs only if each of them allows it.
	 * Usually the agent's own policy, the policy of each agent that delegated to it, and
	 * policies above agents.
	 */
	policies: readonly SourcedToolPolicy[];
	context: PreToolExecutionContext;
	/** Written on each violation, so the audit log names the check. */
	checkId: string;
	/**
	 * Names a tool for the policy, from what the runtime or a stored turn says about it. It is
	 * used for the call being decided and for each earlier call that describes its tool.
	 * Defaults to {@link identifyPolicedTool}.
	 */
	identify?: (tool: PolicedTool) => ToolPolicyToolIdentity;
	/**
	 * Describes the tool of an earlier call that does not describe its tool, by the agent that
	 * made the call and the runtime name. A call that neither describes counts as unknown: see
	 * {@link evaluateToolCall}.
	 */
	describeTool?: (agentId: string | null, toolName: string) => ToolPolicyToolIdentity | undefined;
}

/** A tool call, with the agent that made it. `identity` is absent when the tool is unknown. */
interface CallTarget {
	agentId: string | null;
	toolName: string;
	identity?: ToolPolicyToolIdentity;
}

/** The tool of the call being decided, from what the runtime sends. */
export function identifyPolicedTool(tool: PolicedTool): ToolPolicyToolIdentity {
	if (tool.mcpServerName) {
		return {
			type: 'mcpServer',
			name: tool.mcpServerName,
			...(tool.mcpToolName !== undefined && { tool: tool.mcpToolName }),
		};
	}
	const { metadata } = tool;
	if (metadata?.kind === 'workflow' && typeof metadata.workflowId === 'string') {
		return { type: 'workflow', workflowId: metadata.workflowId };
	}
	const nodeType = typeof metadata?.nodeType === 'string' ? metadata.nodeType : undefined;
	return { type: 'node', name: tool.name, ...(nodeType !== undefined && { nodeType }) };
}

/**
 * Whether a selector of a policy covers a call. The answer is `unknown` only for a call whose
 * tool cannot be described.
 *
 * A tool ref names a tool in one agent's config. It matches only calls of that agent, because
 * a tool of the same name in another agent is a different tool. Node types, packages, and
 * categories match the calls of every agent.
 */
function selectorMatches(
	selector: ToolPolicySelector,
	source: ToolPolicySource,
	call: CallTarget,
): boolean | 'unknown' {
	if (selector.kind === 'tool') {
		if (source.kind !== 'agent' || source.agentId !== call.agentId) return false;
		const { ref } = selector;
		// A node tool runs under the sanitized form of its config name, like tool guardrail refs.
		if (ref.type === 'node' && (call.identity === undefined || call.identity.type === 'node')) {
			return ref.name === call.toolName || nodeNameToToolName(ref.name) === call.toolName;
		}
	}
	if (call.identity === undefined) return 'unknown';
	return toolPolicySelectorMatches(selector, call.identity);
}

function isPolicyRefusal(output: unknown): boolean {
	return (
		typeof output === 'object' &&
		output !== null &&
		'isPolicyRefusal' in output &&
		output.isPolicyRefusal === true
	);
}

/**
 * A call counts as used when its tool ran: it succeeded, failed, or was canceled while it ran.
 * A pending call has not run yet. A refused call never ran, although the model got a result.
 */
function hasRun(call: PolicedToolCallRecord): boolean {
	return call.status !== 'pending' && !isPolicyRefusal(call.output);
}

/**
 * An unknown earlier call is treated as the call that makes a deny rule apply, and never as
 * the call that makes an allow rule apply. So a tool that cannot be described can only make
 * the decision stricter.
 */
function conditionHolds(
	condition: ToolPolicyCondition,
	rule: ToolPolicyRule,
	source: ToolPolicySource,
	used: readonly CallTarget[],
): boolean {
	if ('toolUsed' in condition) {
		return used.some((call) =>
			condition.toolUsed.some((selector) => {
				const match = selectorMatches(selector, source, call);
				return match === 'unknown' ? rule.action === 'deny' : match;
			}),
		);
	}
	if ('all' in condition) {
		return condition.all.every((part) => conditionHolds(part, rule, source, used));
	}
	return condition.any.some((part) => conditionHolds(part, rule, source, used));
}

function sourceLabel(source: ToolPolicySource): string {
	return source.kind === 'agent' ? `agent:${source.agentId}` : source.scope;
}

function violation(
	input: EvaluateToolCallInput,
	source: ToolPolicySource,
	message: string,
	rule?: ToolPolicyRule,
): PolicyViolation {
	return {
		kind: TOOL_POLICY_VIOLATION_KIND,
		checkId: input.checkId,
		message,
		subject: input.context.tool.name,
		subjectType: 'agentTool',
		scope: sourceLabel(source),
		projectId: input.context.projectId,
		...(rule && { matchedRuleId: rule.id }),
	};
}

interface PolicyVerdict {
	action: 'allow' | 'deny';
	ruleIds: string[];
	violations: PolicyViolation[];
}

function decideOne(
	input: EvaluateToolCallInput,
	{ source, policy }: SourcedToolPolicy,
	current: CallTarget,
	used: () => readonly CallTarget[],
): PolicyVerdict {
	// The current tool is always described, so a match is never `unknown` here.
	const covering = policy.rules.filter((rule) =>
		rule.tools.some((selector) => selectorMatches(selector, source, current) === true),
	);
	const active = covering.filter(
		(rule) => !rule.when || conditionHolds(rule.when, rule, source, used()),
	);

	const denies = active.filter((rule) => rule.action === 'deny');
	if (denies.length > 0) {
		return {
			action: 'deny',
			ruleIds: denies.map((rule) => rule.id),
			violations: denies.map((rule) =>
				violation(input, source, rule.message ?? DEFAULT_TOOL_POLICY_DENY_MESSAGE, rule),
			),
		};
	}

	const allows = active.filter((rule) => rule.action === 'allow');
	if (allows.length > 0) {
		return { action: 'allow', ruleIds: allows.map((rule) => rule.id), violations: [] };
	}

	if (policy.defaultAction === 'deny') {
		return {
			action: 'deny',
			ruleIds: [],
			violations: [violation(input, source, DEFAULT_TOOL_POLICY_DENY_MESSAGE)],
		};
	}
	return { action: 'allow', ruleIds: [], violations: [] };
}

function needsHistory({ source, policy }: SourcedToolPolicy, current: CallTarget): boolean {
	return policy.rules.some(
		(rule) =>
			rule.when !== undefined &&
			rule.tools.some((selector) => selectorMatches(selector, source, current) === true),
	);
}

/**
 * Decides one tool call against every policy that applies to it. The call runs only if each
 * policy allows it.
 *
 * Inside one policy, a deny rule wins over an allow rule, and the default action applies when
 * no rule applies. Rule order and policy order have no effect.
 *
 * Earlier calls come from every session in `sessionHistory`, so an agent sees what the agents
 * that delegated to it used. The history is read once, and only when a rule with a condition
 * covers the tool.
 */
export async function evaluateToolCall(input: EvaluateToolCallInput): Promise<ToolPolicyDecision> {
	const { context } = input;
	const identify = input.identify ?? identifyPolicedTool;
	const current: CallTarget = {
		agentId: context.agentId,
		toolName: context.tool.name,
		identity: identify(context.tool),
	};

	let used: CallTarget[] = [];
	if (input.policies.some((sourced) => needsHistory(sourced, current))) {
		const sessions = await context.sessionHistory();
		used = sessions.flatMap((session) =>
			session.toolCalls
				.filter((call) => call.toolCallId !== context.toolCallId && hasRun(call))
				.map((call): CallTarget => {
					const identity = call.tool
						? identify(call.tool)
						: input.describeTool?.(session.agentId, call.toolName);
					return {
						agentId: session.agentId,
						toolName: call.toolName,
						...(identity && { identity }),
					};
				}),
		);
	}

	const verdicts = input.policies.map((sourced) => decideOne(input, sourced, current, () => used));
	const denied = verdicts.filter((verdict) => verdict.action === 'deny');
	if (denied.length > 0) {
		return {
			action: 'deny',
			ruleIds: denied.flatMap((verdict) => verdict.ruleIds),
			violations: denied.flatMap((verdict) => verdict.violations),
		};
	}
	return {
		action: 'allow',
		ruleIds: verdicts.flatMap((verdict) => verdict.ruleIds),
		violations: [],
	};
}
