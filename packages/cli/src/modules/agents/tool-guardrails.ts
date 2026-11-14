import {
	createCustomRegexCheckFn,
	createKeywordsCheckFn,
	createPiiCheckFn,
	createSecretKeysCheckFn,
	createUrlsCheckFn,
	type CheckFn,
	PIIEntity,
} from '@n8n/ai-utilities/guardrails';
import type { ExecutionOptions, GuardrailDecision, ModelGuardrail, RunOptions } from '@n8n/agents';
import type { AgentToolGuardrailConfig, AgentToolGuardrailKind } from '@n8n/api-types';
import { nodeNameToToolName } from 'n8n-workflow';

import { attachGuardrails } from './budget-guardrail';
import type { ToolRegistry } from './tool-registry';

/**
 * Pattern-based tool guardrails for saved agents. Each configured entry
 * becomes one hook that runs at the stages its kind supports: absent
 * `stage` means every supported stage (both, for pattern kinds), absent
 * `tools` means every tool. The check runs on the JSON-stringified tool
 * input (before) and final tool result (after). A trigger or a check
 * failure stops the call with the code `guardrail.<kind>.<id>`.
 * Model-based kinds are ignored until their ticket.
 */

function buildCheck(guardrail: AgentToolGuardrailConfig): CheckFn | undefined {
	switch (guardrail.kind) {
		case 'keywords':
			return createKeywordsCheckFn({ keywords: guardrail.keywords });
		case 'pii': {
			const entities = guardrail.type === 'selected' ? guardrail.entities : undefined;
			if (entities === undefined) return createPiiCheckFn({});
			return createPiiCheckFn({ entities: entities as PIIEntity[] });
		}
		case 'secretKeys':
			return createSecretKeysCheckFn({ threshold: guardrail.permissiveness });
		case 'urls':
			return createUrlsCheckFn({
				allowedUrls: guardrail.allowedUrls ?? [],
				allowedSchemes: guardrail.allowedSchemes ?? ['https'],
				blockUserinfo: guardrail.blockUserinfo ?? true,
				allowSubdomains: guardrail.allowSubdomains ?? false,
			});
		case 'customRegex':
			return createCustomRegexCheckFn({ customRegex: guardrail.regex });
		default:
			return undefined;
	}
}

/** Resolves an entry's typed refs to runtime tool names. */
function resolveToolNames(
	refs: NonNullable<AgentToolGuardrailConfig['tools']>,
	registry: ToolRegistry,
): Set<string> {
	const names = new Set<string>();
	for (const ref of refs) {
		if (ref.type === 'node') {
			// A node tool registers under the sanitized form of its config
			// name (the config `name` is a human-readable label, e.g.
			// "Google Drive"), so a ref resolves either way.
			if (registry.has(ref.name)) names.add(ref.name);
			const sanitized = nodeNameToToolName(ref.name);
			if (sanitized !== ref.name && registry.has(sanitized)) names.add(sanitized);
			continue;
		}
		// A workflow tool matches by id, so renaming it at runtime still finds it.
		for (const [toolName, entry] of registry) {
			if (entry.kind === 'workflow' && entry.workflowId === ref.workflowId) {
				names.add(toolName);
			}
		}
	}
	return names;
}

function checkedText(value: unknown): string {
	return JSON.stringify(value) ?? '';
}

/**
 * Checks fail closed: a trigger, a reported failure, or a throw all stop.
 * Serialization lives inside the try so a circular or `BigInt` value stops
 * the call instead of escaping as an exception.
 */
async function decide(
	check: CheckFn,
	value: unknown,
	code: string,
): Promise<GuardrailDecision | undefined> {
	try {
		const result = await check(checkedText(value));
		if (result.tripwireTriggered || result.executionFailed) return { action: 'stop', code };
		return undefined;
	} catch {
		return { action: 'stop', code };
	}
}

const BOTH_STAGES: ReadonlySet<'before' | 'after'> = new Set(['before', 'after']);

/**
 * Stage support is a property of the kind: the pattern kinds run at both
 * stages; a workflow-backed kind (follow-up) registers before-only. The
 * model kinds are unreachable until AGENT-1549 adds their checks.
 */
const SUPPORTED_STAGES: Record<AgentToolGuardrailKind, ReadonlySet<'before' | 'after'>> = {
	keywords: BOTH_STAGES,
	pii: BOTH_STAGES,
	secretKeys: BOTH_STAGES,
	urls: BOTH_STAGES,
	customRegex: BOTH_STAGES,
	jailbreak: BOTH_STAGES,
	nsfw: BOTH_STAGES,
	topicalAlignment: BOTH_STAGES,
	customPrompt: BOTH_STAGES,
};

function buildHook(
	guardrail: AgentToolGuardrailConfig,
	registry: ToolRegistry,
): ModelGuardrail | undefined {
	const check = buildCheck(guardrail);
	if (!check) return undefined;
	const stages =
		guardrail.stage === undefined ? SUPPORTED_STAGES[guardrail.kind] : new Set([guardrail.stage]);
	const toolNames =
		guardrail.tools === undefined ? undefined : resolveToolNames(guardrail.tools, registry);
	const covers = (toolName: string) => toolNames === undefined || toolNames.has(toolName);
	const code = `guardrail.${guardrail.kind}.${guardrail.id}`;
	const run = async (value: unknown) => await decide(check, value, code);

	const hook: ModelGuardrail = {};
	if (stages.has('before')) {
		hook.beforeTool = async (ctx) => (covers(ctx.toolName) ? await run(ctx.input) : undefined);
	}
	if (stages.has('after')) {
		hook.afterTool = async (ctx, result): Promise<GuardrailDecision> => {
			if (!covers(ctx.toolName)) return { action: 'allow' };
			return (await run(result)) ?? { action: 'allow' };
		};
	}
	return hook;
}

export function withToolGuardrails<T extends RunOptions & ExecutionOptions>(
	options: T,
	input: { toolGuardrails?: AgentToolGuardrailConfig[]; toolRegistry: ToolRegistry },
): T {
	const guardrails = input.toolGuardrails ?? [];
	if (guardrails.length === 0) return options;

	const hooks: ModelGuardrail[] = [];
	for (const guardrail of guardrails) {
		const hook = buildHook(guardrail, input.toolRegistry);
		if (hook) hooks.push(hook);
	}
	if (hooks.length === 0) return options;

	return attachGuardrails(options, hooks, options.guardrails?.onNotice);
}
