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
import {
	chargeModelSpend,
	type BudgetGuardrailOptions,
	type ExecutionOptions,
	type GuardrailDecision,
	type ModelGuardrail,
	type RunOptions,
} from '@n8n/agents';
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
 * Workflow checks use the structured tool input and run before the call.
 */

/** The node's default trigger confidence for the model-based kinds. */
const DEFAULT_LLM_THRESHOLD = 0.7;

type GuardrailSpend = {
	modelId: string;
	budget: BudgetGuardrailOptions;
	callId: string;
};

/** Adapts an AI SDK model to the model-agnostic LLM check seam. */
function toGuardrailModelRunner(
	model: LanguageModel,
	spend: GuardrailSpend | undefined,
): GuardrailModelRunner {
	return async (systemPrompt, input) => {
		const result = await generateText({ model, instructions: systemPrompt, prompt: input });
		if (spend) {
			await chargeModelSpend({
				modelId: spend.modelId,
				usage: result.usage,
				providerMetadata: result.finalStep.providerMetadata,
				callId: spend.callId,
				budget: spend.budget,
			});
		}
		return { text: result.text, ...(result.usage ? { usage: result.usage } : {}) };
	};
}

type ModelGuardrailKind = 'jailbreak' | 'nsfw' | 'topicalAlignment';

type PatternToolGuardrailConfig = Exclude<AgentToolGuardrailConfig, { kind: ModelGuardrailKind }>;

type ModelToolGuardrailConfig = Extract<AgentToolGuardrailConfig, { kind: ModelGuardrailKind }>;

function buildPatternCheck(guardrail: PatternToolGuardrailConfig): CheckFn | undefined {
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
		default:
			return undefined;
	}
}

function buildModelCheck(
	guardrail: ModelToolGuardrailConfig,
	model: LanguageModel,
	spend: GuardrailSpend | undefined,
): CheckFn {
	const run = toGuardrailModelRunner(model, spend);
	const threshold = guardrail.threshold ?? DEFAULT_LLM_THRESHOLD;
	const prompt = guardrail.prompt?.trim();
	if (guardrail.kind === 'jailbreak') {
		return createJailbreakCheckFn({
			run,
			prompt: prompt || JAILBREAK_PROMPT,
			threshold,
		});
	}
	if (guardrail.kind === 'nsfw') {
		return createNSFWCheckFn({
			run,
			prompt: prompt || NSFW_SYSTEM_PROMPT,
			threshold,
		});
	}
	return createTopicalAlignmentCheckFn({
		run,
		prompt: prompt || TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
		threshold,
	});
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

function isModelKind(guardrail: AgentToolGuardrailConfig): guardrail is ModelToolGuardrailConfig {
	return (
		guardrail.kind === 'jailbreak' ||
		guardrail.kind === 'nsfw' ||
		guardrail.kind === 'topicalAlignment'
	);
}

function guardrailCallId(
	toolCallId: string,
	guardrail: ModelToolGuardrailConfig,
	stage: 'before' | 'after',
): string {
	return `${toolCallId}:guardrail:${guardrail.kind}:${guardrail.id}:${stage}`;
}

function buildHook(
	guardrail: AgentToolGuardrailConfig,
	registry: ToolRegistry,
	guardrailModel: LanguageModel | undefined,
	spend: Omit<GuardrailSpend, 'callId'> | undefined,
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

	// A model check is built per tool call so its ledger id closes over that
	// call. Parallel tools must not share one id.
	let run: (
		stage: 'before' | 'after',
		toolCallId: string,
		value: unknown,
	) => Promise<GuardrailDecision | undefined>;
	if (isModelKind(guardrail)) {
		if (guardrailModel === undefined) return undefined;
		const model = guardrailModel;
		run = async (stage, toolCallId, value) =>
			await decide(
				buildModelCheck(
					guardrail,
					model,
					spend ? { ...spend, callId: guardrailCallId(toolCallId, guardrail, stage) } : undefined,
				),
				value,
				code,
			);
	} else {
		const check = buildPatternCheck(guardrail);
		if (!check) return undefined;
		run = async (_stage, _toolCallId, value) => await decide(check, value, code);
	}

	const hook: ModelGuardrail = {};
	if (stages.has('before')) {
		hook.beforeTool = async (ctx) =>
			covers(ctx.toolName) ? await run('before', ctx.toolCallId, ctx.input) : undefined;
	}
	if (stages.has('after')) {
		hook.afterTool = async (ctx, result): Promise<GuardrailDecision> => {
			if (!covers(ctx.toolName)) return { action: 'allow' };
			return (await run('after', ctx.toolCallId, result)) ?? { action: 'allow' };
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
		/** Catalog id of `guardrailModel`. Pricing misses the catalog without it. */
		guardrailModelId?: string;
		/** Set only when a session cap or a monthly budget is on. */
		budget?: BudgetGuardrailOptions;
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
	const spend =
		input.budget && input.guardrailModelId
			? { modelId: input.guardrailModelId, budget: input.budget }
			: undefined;

	const hooks: ModelGuardrail[] = [];
	for (const guardrail of ordered) {
		const hook = buildHook(
			guardrail,
			input.toolRegistry,
			input.guardrailModel,
			spend,
			input.guardrailWorkflowContext,
		);
		if (hook) hooks.push(hook);
	}
	if (hooks.length === 0) return options;

	return attachGuardrails(options, hooks, options.guardrails?.onNotice);
}
