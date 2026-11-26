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
import type {
	ExecutionOptions,
	GuardrailDecision,
	GuardrailNotice,
	GuardrailToolCallContext,
	ModelGuardrail,
	RunOptions,
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
import type { ToolGuardrailReviewContext } from './guardrail-review';
import { ToolGuardrailReviewService } from './guardrail-review';
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
 * matches removed; a `review` response routes the flagged content to the
 * agent's human-review configuration and lets the call continue.
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

/** The configured response, with the kind's default for configs saved before the field existed. */
function responseOf(guardrail: AgentToolGuardrailConfig): 'block' | 'redact' | 'review' {
	return guardrail.response ?? TOOL_GUARDRAIL_RESPONSES[guardrail.kind].default;
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
 * A check run. `failed` covers a reported failure and a throw.
 */
type CheckOutcome = { failed: true } | { failed: false; result: GuardrailResult };

async function runCheck(check: CheckFn, value: unknown): Promise<CheckOutcome> {
	try {
		return { failed: false, result: await check(checkedText(value)) };
	} catch {
		return { failed: true };
	}
}

/**
 * Checks fail closed: a trigger, a reported failure, or a throw all stop a
 * `block` response. A `redact` response re-runs the check on every string of
 * the value and masks the matches in place, so a token that the serialized
 * scan reported with JSON punctuation attached still redacts cleanly. A match
 * no string can carry (structural characters) cannot be honored, so it stops
 * the call instead of leaking through.
 */
async function decide(
	check: CheckFn,
	value: unknown,
	code: string,
	response: 'block' | 'redact',
): Promise<GuardrailDecision | undefined> {
	const outcome = await runCheck(check, value);
	if (outcome.failed || outcome.result.executionFailed) return { action: 'stop', code };
	if (!outcome.result.tripwireTriggered) return undefined;
	if (response === 'block') return { action: 'stop', code };

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
	return checkedText(rewritten) === checkedText(value)
		? { action: 'stop', code }
		: { action: 'redact', code, value: rewritten };
}

/** The kinds whose check runs on an LLM rather than a local pattern. */
const MODEL_KINDS: ReadonlySet<AgentToolGuardrailKind> = new Set([
	'jailbreak',
	'nsfw',
	'topicalAlignment',
]);

/** Fires the flagged content at the review destination; the call itself continues. */
function routeReview(
	review: { service: ToolGuardrailReviewService; context: ToolGuardrailReviewContext | undefined },
	guardrail: AgentToolGuardrailConfig,
	ctx: GuardrailToolCallContext,
	stage: 'before' | 'after',
	value: unknown,
	result: GuardrailResult,
): void {
	void review.service.route(review.context, guardrail, ctx, {
		stage,
		value,
		matchDetails: result.info,
	});
}

function buildHook(
	guardrail: AgentToolGuardrailConfig,
	registry: ToolRegistry,
	guardrailModel: LanguageModel | undefined,
	guardrailWorkflowContext: WorkflowToolContext | undefined,
	review:
		| { service: ToolGuardrailReviewService; context: ToolGuardrailReviewContext | undefined }
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
				if (response === 'review') {
					if (review) {
						notice?.({ code, outcome: 'review' });
						routeReview(review, guardrail, ctx, 'before', ctx.input, result);
					}
					return undefined;
				}
				return { action: 'stop', code };
			};
		}
		return hook;
	}

	const check = buildCheck(guardrail, guardrailModel);
	if (!check) return undefined;

	if (response === 'review' && review) {
		const reviewStage = async (
			stage: 'before' | 'after',
			ctx: GuardrailToolCallContext,
			value: unknown,
		): Promise<GuardrailDecision | undefined> => {
			if (!covers(ctx.toolName)) return undefined;
			const outcome = await runCheck(check, value);
			if (outcome.failed || outcome.result.executionFailed) return { action: 'stop', code };
			if (!outcome.result.tripwireTriggered) return undefined;
			notice?.({ code, outcome: 'review' });
			routeReview(review, guardrail, ctx, stage, value, outcome.result);
			// The call continues: a review informs, it never gates.
			return undefined;
		};
		const hook: ModelGuardrail = {};
		if (stages.has('before')) {
			hook.beforeTool = async (ctx) => await reviewStage('before', ctx, ctx.input);
		}
		if (stages.has('after')) {
			hook.afterTool = async (ctx, result): Promise<GuardrailDecision> =>
				(await reviewStage('after', ctx, result)) ?? { action: 'allow' };
		}
		return hook;
	}

	const run =
		response === 'redact'
			? async (value: unknown) => await decide(check, value, code, 'redact')
			: async (value: unknown) => await decide(check, value, code, 'block');

	const hook: ModelGuardrail = {};
	if (stages.has('before')) {
		hook.beforeTool = async (ctx) => {
			const decision = covers(ctx.toolName) ? await run(ctx.input) : undefined;
			if (decision?.action === 'redact') notice?.({ code, outcome: 'redact' });
			return decision;
		};
	}
	if (stages.has('after')) {
		hook.afterTool = async (ctx, result): Promise<GuardrailDecision> => {
			if (!covers(ctx.toolName)) return { action: 'allow' };
			const decision = await run(result);
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
		/** Callable-workflow machinery for `workflow`-kind guardrail checks. */
		guardrailWorkflowContext?: WorkflowToolContext;
		/** Review identity for `review`-response guardrails. */
		guardrailReview?: ToolGuardrailReviewContext;
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

	const review = guardrails.some((guardrail) => responseOf(guardrail) === 'review')
		? { service: Container.get(ToolGuardrailReviewService), context: input.guardrailReview }
		: undefined;

	const hooks: ModelGuardrail[] = [];
	for (const guardrail of ordered) {
		const hook = buildHook(
			guardrail,
			input.toolRegistry,
			input.guardrailModel,
			input.guardrailWorkflowContext,
			review,
			options.guardrails?.onNotice,
		);
		if (hook) hooks.push(hook);
	}
	if (hooks.length === 0) return options;

	return attachGuardrails(options, hooks, options.guardrails?.onNotice);
}
