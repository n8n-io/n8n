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
import type { AgentToolGuardrailConfig } from '@n8n/api-types';

import { attachGuardrails } from './budget-guardrail';
import type { ToolRegistry } from './tool-registry';

/**
 * Pattern-based tool guardrails for saved agents. Each configured
 * entry becomes one hook: a beforeTool or an afterTool hook
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
	refs: AgentToolGuardrailConfig['tools'],
	registry: ToolRegistry,
): Set<string> {
	const names = new Set<string>();
	for (const ref of refs) {
		if (ref.type === 'node') {
			if (registry.has(ref.name)) names.add(ref.name);
			continue;
		}
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

/** Checks fail closed: a trigger, a reported failure, or a throw all stop. */
async function decide(
	check: CheckFn,
	text: string,
	code: string,
): Promise<GuardrailDecision | undefined> {
	try {
		const result = await check(text);
		if (result.tripwireTriggered || result.executionFailed) return { action: 'stop', code };
		return undefined;
	} catch {
		return { action: 'stop', code };
	}
}

function buildHook(
	guardrail: AgentToolGuardrailConfig,
	registry: ToolRegistry,
): ModelGuardrail | undefined {
	const check = buildCheck(guardrail);
	if (!check) return undefined;
	const toolNames = resolveToolNames(guardrail.tools, registry);
	const code = `guardrail.${guardrail.kind}.${guardrail.id}`;
	const run = async (text: string) => await decide(check, text, code);

	if (guardrail.stage === 'before') {
		return {
			beforeTool: async (ctx) =>
				toolNames.has(ctx.toolName) ? await run(checkedText(ctx.input)) : undefined,
		};
	}
	return {
		afterTool: async (ctx, result): Promise<GuardrailDecision> => {
			if (!toolNames.has(ctx.toolName)) return { action: 'allow' };
			return (await run(checkedText(result))) ?? { action: 'allow' };
		},
	};
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
