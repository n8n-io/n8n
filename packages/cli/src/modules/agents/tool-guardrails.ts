import {
	createJailbreakCheckFn,
	createKeywordsCheckFn,
	createNSFWCheckFn,
	createPiiCheckFn,
	createSecretKeysCheckFn,
	createTopicalAlignmentCheckFn,
	createUrlsCheckFn,
	JAILBREAK_PROMPT,
	type CheckFn,
	type GuardrailModelRunner,
	NSFW_SYSTEM_PROMPT,
	PIIEntity,
	TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
} from '@n8n/ai-utilities/guardrails';
import type { ExecutionOptions, GuardrailDecision, ModelGuardrail, RunOptions } from '@n8n/agents';
import type { AgentToolGuardrailConfig, AgentToolGuardrailKind } from '@n8n/api-types';
import { generateText, type LanguageModel } from 'ai';
import { nodeNameToToolName } from 'n8n-workflow';

import { attachGuardrails } from './budget-guardrail';
import { createWorkflowGuardrailCheck } from './tools/workflow-guardrail-check';
import type { WorkflowToolContext } from './tools/workflow-tool-factory';
import type { ToolRegistry } from './tool-registry';

/**
 * Pattern-, model-, and workflow-based tool guardrails for saved agents. Each
 * configured entry becomes one hook that runs at the stages its kind supports:
 * absent `stage` means every supported stage, absent `tools` means every tool.
 * The check runs on the JSON-stringified tool input (before) and final tool
 * result (after). A trigger or a check failure stops the call with the code
 * `guardrail.<kind>.<id>`.
 * Pattern kinds check locally; the four model kinds run on the agent's own
 * model through the AGENT-1547 seam; the workflow kind runs a check workflow
 * before the call, with the structured tool call as its input. Hooks build
 * pattern kinds first, so a cheap stop short-circuits the model spend, and
 * workflow checks last, as the most expensive stop.
 */

/** The node's default trigger confidence for the model-based kinds. */
const DEFAULT_LLM_THRESHOLD = 0.7;

/** Adapts an AI SDK model to the model-agnostic LLM check seam. */
function toGuardrailModelRunner(model: LanguageModel): GuardrailModelRunner {
	return async (systemPrompt, input) => {
		const result = await generateText({ model, instructions: systemPrompt, prompt: input });
		return result.text;
	};
}

function buildCheck(
	guardrail: AgentToolGuardrailConfig,
	guardrailModel: LanguageModel | undefined,
): CheckFn | undefined {
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
		case 'jailbreak':
		case 'nsfw':
		case 'topicalAlignment': {
			// A model kind needs the agent's model; a draft without a model
			// cannot run, so skipping is safe there.
			if (guardrailModel === undefined) return undefined;
			const run = toGuardrailModelRunner(guardrailModel);
			const threshold = guardrail.threshold ?? DEFAULT_LLM_THRESHOLD;
			if (guardrail.kind === 'jailbreak') {
				return createJailbreakCheckFn({
					run,
					prompt: guardrail.prompt?.trim() || JAILBREAK_PROMPT,
					threshold,
				});
			}
			if (guardrail.kind === 'nsfw') {
				return createNSFWCheckFn({
					run,
					prompt: guardrail.prompt?.trim() || NSFW_SYSTEM_PROMPT,
					threshold,
				});
			}
			if (guardrail.kind === 'topicalAlignment') {
				return createTopicalAlignmentCheckFn({
					run,
					prompt: guardrail.prompt?.trim() || TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
					threshold,
				});
			}
		}
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
const BEFORE_ONLY: ReadonlySet<'before' | 'after'> = new Set(['before']);

/**
 * Stage support is a property of the kind: the pattern kinds run at both
 * stages; the model kinds run at both; a workflow-backed kind registers
 * before-only, since the call it guards has not produced a result yet.
 */
const SUPPORTED_STAGES: Record<AgentToolGuardrailKind, ReadonlySet<'before' | 'after'>> = {
	keywords: BOTH_STAGES,
	pii: BOTH_STAGES,
	secretKeys: BOTH_STAGES,
	urls: BOTH_STAGES,
	jailbreak: BOTH_STAGES,
	nsfw: BOTH_STAGES,
	topicalAlignment: BOTH_STAGES,
	workflow: BEFORE_ONLY,
};

/** The kinds whose check runs on an LLM rather than a local pattern. */
const MODEL_KINDS: ReadonlySet<AgentToolGuardrailKind> = new Set([
	'jailbreak',
	'nsfw',
	'topicalAlignment',
]);

function buildHook(
	guardrail: AgentToolGuardrailConfig,
	registry: ToolRegistry,
	guardrailModel: LanguageModel | undefined,
	guardrailWorkflowContext: WorkflowToolContext | undefined,
): ModelGuardrail | undefined {
	const stages =
		guardrail.stage === undefined ? SUPPORTED_STAGES[guardrail.kind] : new Set([guardrail.stage]);
	const toolNames =
		guardrail.tools === undefined ? undefined : resolveToolNames(guardrail.tools, registry);
	const covers = (toolName: string) => toolNames === undefined || toolNames.has(toolName);
	const code = `guardrail.${guardrail.kind}.${guardrail.id}`;

	if (guardrail.kind === 'workflow') {
		// A missing callable context is a construction gap, not a user
		// misconfig, so the hook is skipped — like a model kind without a
		// model. A missing check workflow itself fails closed at run time.
		if (guardrailWorkflowContext === undefined) return undefined;
		const check = createWorkflowGuardrailCheck(guardrail, guardrailWorkflowContext);
		const hook: ModelGuardrail = {};
		if (stages.has('before')) {
			hook.beforeTool = async (ctx) => {
				if (!covers(ctx.toolName)) return undefined;
				const result = await check(ctx.toolName, ctx.input);
				return result.tripwireTriggered || result.executionFailed
					? { action: 'stop', code }
					: undefined;
			};
		}
		return hook;
	}

	const check = buildCheck(guardrail, guardrailModel);
	if (!check) return undefined;
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
	input: {
		toolGuardrails?: AgentToolGuardrailConfig[];
		toolRegistry: ToolRegistry;
		guardrailModel?: LanguageModel;
		/** Callable-workflow machinery for `workflow`-kind guardrail checks. */
		guardrailWorkflowContext?: WorkflowToolContext;
	},
): T {
	const guardrails = input.toolGuardrails ?? [];
	if (guardrails.length === 0) return options;

	// Pattern kinds build first: a cheap stop short-circuits the model call,
	// so a configuration cannot pay LLM spend for a call a pattern already
	// refuses. Workflow checks build last, as the most expensive stop. The
	// runner stops at the first stop, in hook order.
	const ordered = [
		...guardrails.filter(
			(guardrail) => guardrail.kind !== 'workflow' && !MODEL_KINDS.has(guardrail.kind),
		),
		...guardrails.filter((guardrail) => MODEL_KINDS.has(guardrail.kind)),
		...guardrails.filter((guardrail) => guardrail.kind === 'workflow'),
	];

	const hooks: ModelGuardrail[] = [];
	for (const guardrail of ordered) {
		const hook = buildHook(
			guardrail,
			input.toolRegistry,
			input.guardrailModel,
			input.guardrailWorkflowContext,
		);
		if (hook) hooks.push(hook);
	}
	if (hooks.length === 0) return options;

	return attachGuardrails(options, hooks, options.guardrails?.onNotice);
}
