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
	type GuardrailResult,
	NSFW_SYSTEM_PROMPT,
	PIIEntity,
	redactMatches,
	TOPICAL_ALIGNMENT_SYSTEM_PROMPT,
} from '@n8n/ai-utilities/guardrails';
import {
	chargeModelSpend,
	type BudgetGuardrailOptions,
	type ExecutionOptions,
	type GuardrailDecision,
	type GuardrailNotice,
	type GuardrailToolCallContext,
	type ModelGuardrail,
	type RunOptions,
} from '@n8n/agents';
import {
	TOOL_GUARDRAIL_RESPONSES,
	TOOL_GUARDRAIL_STAGE_SCOPE,
	type AgentToolGuardrailConfig,
	type AgentToolGuardrailKind,
} from '@n8n/api-types';
import { Container } from '@n8n/di';
import { generateText, type LanguageModel } from 'ai';
import { nodeNameToToolName } from 'n8n-workflow';

import { attachGuardrails } from './budget-guardrail';
import type { ToolGuardrailApprovalContext } from './guardrail-approval';
import { ToolGuardrailApprovalService } from './guardrail-approval';
import { createWorkflowGuardrailCheck } from './tools/workflow-guardrail-check';
import type { WorkflowToolContext } from './tools/workflow-tool-factory';
import type { ToolRegistry } from './tool-registry';

/**
 * Pattern-, model-, and workflow-based tool guardrails for saved agents. Each
 * configured entry becomes one hook that runs at the stages its kind supports:
 * absent `stage` means the kind's scope, absent `tools` means every tool. The
 * check runs on the JSON-stringified tool input (before) and final tool
 * result (after). A `block` response stops the call with the code
 * `guardrail.<kind>.<id>`; a `redact` response rewrites the value with the
 * matches removed; a `approval` response routes the flagged content to the
 * agent's human-review configuration and lets the call continue.
 * Pattern kinds check locally; the model kinds run on the agent's own model
 * through the AGENT-1547 seam and charge its spend; workflow checks use the
 * structured tool input and run before the call. Hooks build pattern kinds
 * first, so a cheap stop short-circuits the model spend, and workflow checks
 * last, as the most expensive stop.
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

/** The configured response, with the kind's default for configs saved before the field existed. */
function responseOf(guardrail: AgentToolGuardrailConfig): 'block' | 'redact' | 'approval' {
	return guardrail.response ?? TOOL_GUARDRAIL_RESPONSES[guardrail.kind].default;
}

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
 * A check run. `failed` covers a reported failure and a throw. Serialization
 * lives inside the try so a circular or `BigInt` value fails the check
 * instead of escaping as an exception.
 */
type CheckOutcome = { failed: true } | { failed: false; result: GuardrailResult };

async function runCheck(check: CheckFn, value: unknown): Promise<CheckOutcome> {
	try {
		return { failed: false, result: await check(checkedText(value)) };
	} catch {
		return { failed: true };
	}
}

/** Fires the flagged content at the approval destination; the call itself continues. */
function routeApproval(
	approval: {
		service: ToolGuardrailApprovalService;
		context: ToolGuardrailApprovalContext | undefined;
	},
	guardrail: AgentToolGuardrailConfig,
	ctx: GuardrailToolCallContext,
	stage: 'before' | 'after',
	value: unknown,
	result: GuardrailResult,
): void {
	void approval.service.route(approval.context, guardrail, ctx, {
		stage,
		value,
		matchDetails: result.info,
	});
}

/** Everything a triggered check needs to apply the configured response. */
interface ResponseContext {
	code: string;
	response: 'block' | 'redact' | 'approval';
	guardrail: AgentToolGuardrailConfig;
	stage: 'before' | 'after';
	ctx: GuardrailToolCallContext;
	approval:
		| { service: ToolGuardrailApprovalService; context: ToolGuardrailApprovalContext | undefined }
		| undefined;
	notice: ((notice: GuardrailNotice) => void) | undefined;
}

/**
 * Checks fail closed: a trigger, a reported failure, or a throw all stop a
 * `block` response. A `redact` response re-runs the check on every string of
 * the value and masks the matches in place, so a token that the serialized
 * scan reported with JSON punctuation attached still redacts cleanly. A match
 * that exists only in the serialized form (a serialization artifact, no field
 * content carries it) has nothing to remove, so the call continues. A
 * `approval` response routes the flagged content to the agent's human-review
 * configuration and lets the call continue.
 */
async function decide(
	check: CheckFn,
	value: unknown,
	rc: ResponseContext,
): Promise<GuardrailDecision | undefined> {
	const outcome = await runCheck(check, value);
	if (outcome.failed || outcome.result.executionFailed) return { action: 'stop', code: rc.code };
	if (!outcome.result.tripwireTriggered) return undefined;
	if (rc.response === 'approval') {
		if (rc.approval) {
			rc.notice?.({ code: rc.code, outcome: 'approval' });
			routeApproval(rc.approval, rc.guardrail, rc.ctx, rc.stage, value, outcome.result);
		}
		// The call continues: an approval informs, it never gates.
		return undefined;
	}
	if (rc.response === 'block') return { action: 'stop', code: rc.code };

	const isPlainObject = (entry: object): boolean => {
		const proto = Object.getPrototypeOf(entry);
		return proto === Object.prototype || proto === null;
	};
	const walk = async (entry: unknown): Promise<unknown> => {
		if (typeof entry === 'string') {
			// The check sees the raw string: the serialized scan already
			// carried the trigger, and this pass needs the clean tokens.
			let result: GuardrailResult | undefined;
			try {
				result = await check(entry);
			} catch {
				result = undefined;
			}
			if (result && !result.executionFailed && result.tripwireTriggered) {
				return redactMatches(entry, [result]);
			}
			return entry;
		}
		if (Array.isArray(entry)) {
			return await Promise.all(entry.map(async (item) => await walk(item)));
		}
		if (typeof entry === 'object' && entry !== null && isPlainObject(entry)) {
			return Object.fromEntries(
				await Promise.all(
					Object.entries(entry).map(async ([key, item]) => [key, await walk(item)]),
				),
			);
		}
		return entry;
	};
	const rewritten = await walk(value);
	if (checkedText(rewritten) === checkedText(value)) {
		return undefined;
	}
	return { action: 'redact', code: rc.code, value: rewritten };
}

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
	approval:
		| { service: ToolGuardrailApprovalService; context: ToolGuardrailApprovalContext | undefined }
		| undefined,
	notice: ((notice: GuardrailNotice) => void) | undefined,
): ModelGuardrail | undefined {
	const stages =
		guardrail.stage === undefined
			? new Set(TOOL_GUARDRAIL_STAGE_SCOPE[guardrail.kind])
			: new Set([guardrail.stage]);
	const toolNames =
		guardrail.tools === undefined ? undefined : resolveToolNames(guardrail.tools, registry);
	const covers = (toolName: string) => toolNames === undefined || toolNames.has(toolName);
	const code = `guardrail.${guardrail.kind}.${guardrail.id}`;
	const response = responseOf(guardrail);

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
				if (result.executionFailed) return { action: 'stop', code };
				if (!result.tripwireTriggered) return undefined;
				if (response === 'approval') {
					if (approval) {
						notice?.({ code, outcome: 'approval' });
						routeApproval(approval, guardrail, ctx, 'before', ctx.input, result);
					}
					return undefined;
				}
				return { action: 'stop', code };
			};
		}
		return hook;
	}

	// A model check is built per tool call so its ledger id closes over that
	// call. Parallel tools must not share one id.
	let run: (
		stage: 'before' | 'after',
		toolCallId: string,
		ctx: GuardrailToolCallContext,
		value: unknown,
	) => Promise<GuardrailDecision | undefined>;
	if (isModelKind(guardrail)) {
		if (guardrailModel === undefined) return undefined;
		const model = guardrailModel;
		run = async (stage, toolCallId, ctx, value) =>
			await decide(
				buildModelCheck(
					guardrail,
					model,
					spend ? { ...spend, callId: guardrailCallId(toolCallId, guardrail, stage) } : undefined,
				),
				value,
				{ code, response, guardrail, stage, ctx, approval, notice },
			);
	} else {
		const check = buildPatternCheck(guardrail);
		if (!check) return undefined;
		run = async (stage, _toolCallId, ctx, value) =>
			await decide(check, value, { code, response, guardrail, stage, ctx, approval, notice });
	}

	const hook: ModelGuardrail = {};
	if (stages.has('before')) {
		hook.beforeTool = async (ctx) => {
			if (!covers(ctx.toolName)) return undefined;
			const decision = await run('before', ctx.toolCallId, ctx, ctx.input);
			if (decision?.action === 'redact') notice?.({ code, outcome: 'redact' });
			return decision;
		};
	}
	if (stages.has('after')) {
		hook.afterTool = async (ctx, result): Promise<GuardrailDecision> => {
			if (!covers(ctx.toolName)) return { action: 'allow' };
			const decision = await run('after', ctx.toolCallId, ctx, result);
			if (decision?.action === 'redact') notice?.({ code, outcome: 'redact' });
			return decision ?? { action: 'allow' };
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
		/** Approval identity for `approval`-response guardrails. */
		guardrailApproval?: ToolGuardrailApprovalContext;
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
	const approval = guardrails.some((guardrail) => responseOf(guardrail) === 'approval')
		? { service: Container.get(ToolGuardrailApprovalService), context: input.guardrailApproval }
		: undefined;

	const hooks: ModelGuardrail[] = [];
	for (const guardrail of ordered) {
		const hook = buildHook(
			guardrail,
			input.toolRegistry,
			input.guardrailModel,
			spend,
			input.guardrailWorkflowContext,
			approval,
			options.guardrails?.onNotice,
		);
		if (hook) hooks.push(hook);
	}
	if (hooks.length === 0) return options;

	return attachGuardrails(options, hooks, options.guardrails?.onNotice);
}
