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

export interface ToolPolicyDecision {
	action: 'allow' | 'deny';
	/** The rules that decided. Empty when the default action decided. */
	ruleIds: string[];
	/** One violation for each deny rule, or one for a default deny. Empty for allow. */
	violations: PolicyViolation[];
}

export interface EvaluateToolCallInput {
	policy: ToolPolicy;
	context: PreToolExecutionContext;
	/** Written on each violation, so the audit log names the check. */
	checkId: string;
	/**
	 * Describes the tool of an earlier call by its runtime name. History records carry only
	 * the name, so without this an earlier call matches only rules that name the tool. Rules
	 * on MCP servers, node types, workflow tools, and categories then never see earlier calls.
	 */
	describeTool?: (toolName: string) => ToolPolicyToolIdentity | undefined;
}

/** The tool of the call being decided, from what the runtime sends. */
export function identifyPolicedTool(tool: PolicedTool): ToolPolicyToolIdentity {
	if (tool.mcpServerName) return { type: 'mcpServer', name: tool.mcpServerName };
	const { metadata } = tool;
	if (metadata?.kind === 'workflow' && typeof metadata.workflowId === 'string') {
		return { type: 'workflow', workflowId: metadata.workflowId };
	}
	const nodeType = typeof metadata?.nodeType === 'string' ? metadata.nodeType : undefined;
	return { type: 'node', name: tool.name, ...(nodeType !== undefined && { nodeType }) };
}

/**
 * A rule names a node tool by its config name. The runtime runs it under the sanitized form
 * of that name, so both forms match, like tool guardrail refs.
 */
function matches(selector: ToolPolicySelector, tool: ToolPolicyToolIdentity): boolean {
	if (selector.kind === 'tool' && selector.ref.type === 'node' && tool.type === 'node') {
		return selector.ref.name === tool.name || nodeNameToToolName(selector.ref.name) === tool.name;
	}
	return toolPolicySelectorMatches(selector, tool);
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

function conditionHolds(
	condition: ToolPolicyCondition,
	used: readonly ToolPolicyToolIdentity[],
): boolean {
	if ('toolUsed' in condition) {
		return used.some((tool) => condition.toolUsed.some((selector) => matches(selector, tool)));
	}
	if ('all' in condition) return condition.all.every((part) => conditionHolds(part, used));
	return condition.any.some((part) => conditionHolds(part, used));
}

function violation(
	input: EvaluateToolCallInput,
	message: string,
	rule?: ToolPolicyRule,
): PolicyViolation {
	return {
		kind: TOOL_POLICY_VIOLATION_KIND,
		checkId: input.checkId,
		message,
		subject: input.context.tool.name,
		subjectType: 'agentTool',
		projectId: input.context.projectId,
		...(rule && { matchedRuleId: rule.id }),
	};
}

function deny(input: EvaluateToolCallInput, rules: ToolPolicyRule[]): ToolPolicyDecision {
	return {
		action: 'deny',
		ruleIds: rules.map((rule) => rule.id),
		violations: rules.map((rule) =>
			violation(input, rule.message ?? DEFAULT_TOOL_POLICY_DENY_MESSAGE, rule),
		),
	};
}

/**
 * Decides one tool call. Among the rules that cover the tool and whose condition holds, a
 * deny wins over an allow, and the default action applies when no rule does. Rule order has
 * no effect.
 *
 * Earlier calls come from every session in `sessionHistory`, so a sub-agent inherits what its
 * parents used. The history is read only when a rule that covers the tool has a condition.
 */
export async function evaluateToolCall(input: EvaluateToolCallInput): Promise<ToolPolicyDecision> {
	const { policy, context } = input;
	const tool = identifyPolicedTool(context.tool);
	const covering = policy.rules.filter((rule) => rule.tools.some((s) => matches(s, tool)));

	// A deny without a condition decides alone, so the history is not needed.
	const unconditionalDenies = covering.filter((rule) => rule.action === 'deny' && !rule.when);
	if (unconditionalDenies.length > 0) return deny(input, unconditionalDenies);

	let used: ToolPolicyToolIdentity[] = [];
	if (covering.some((rule) => rule.when)) {
		const sessions = await context.sessionHistory();
		used = sessions
			.flatMap((session) => session.toolCalls)
			.filter((call) => call.toolCallId !== context.toolCallId && hasRun(call))
			.map(
				(call): ToolPolicyToolIdentity =>
					input.describeTool?.(call.toolName) ?? { type: 'node', name: call.toolName },
			);
	}

	const active = covering.filter((rule) => !rule.when || conditionHolds(rule.when, used));

	const denies = active.filter((rule) => rule.action === 'deny');
	if (denies.length > 0) return deny(input, denies);

	const allows = active.filter((rule) => rule.action === 'allow');
	if (allows.length > 0) {
		return { action: 'allow', ruleIds: allows.map((rule) => rule.id), violations: [] };
	}

	if (policy.defaultAction === 'deny') {
		return {
			action: 'deny',
			ruleIds: [],
			violations: [violation(input, DEFAULT_TOOL_POLICY_DENY_MESSAGE)],
		};
	}
	return { action: 'allow', ruleIds: [], violations: [] };
}
