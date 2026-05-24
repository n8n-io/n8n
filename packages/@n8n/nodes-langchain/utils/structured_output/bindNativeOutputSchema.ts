// Attach an n8n Output Parser's schema directly to a connected chat model as
// **native constrained-decoding configuration** — Anthropic's
// `output_config.format`, OpenAI's `response_format: json_schema`, etc.
//
// When this is wired up the agent / chain can skip the legacy "ask the model
// nicely to call a synthetic `format_final_json_response` tool" workaround.
// The model is guaranteed to emit schema-conformant JSON by construction, and
// the parser still owns final validation.
//
// **Provider-internals safety net**: the binders read/write fields on the
// concrete LangChain provider classes (`ChatAnthropic.outputConfig`,
// `ChatOpenAI.defaultOptions`). Those names are stable, but they're a
// covenant with `@langchain/anthropic` / `@langchain/openai` private internals.
// The integration tests in `bindNativeOutputSchema.integration.test.ts`
// construct real model instances and assert that the binding lands on the
// `invocationParams()` wire payload — so a LangChain rename will fail CI here,
// not silently in production.

import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { toJsonSchema } from '@langchain/core/utils/json_schema';
import { ChatOpenAI } from '@langchain/openai';

import type { N8nOutputParser } from '../output_parsers/N8nOutputParser';

const STRUCTURED_OUTPUT_NAME = 'output';

/**
 * Apply the parser's schema to a single chat model. Mutates the instance in
 * place — safe because chat-model `supplyData` returns a freshly constructed
 * model per execution.
 *
 * Returns `true` when the binding was applied. When the model's provider is
 * not supported, or no usable schema is available, returns `false` and the
 * caller falls back to the legacy synthetic-tool / formatting-instructions
 * path.
 */
export const bindNativeOutputSchema = (
	model: BaseLanguageModel,
	outputParser: N8nOutputParser | undefined,
): boolean => {
	if (!outputParser) return false;

	const zodSchema = outputParser.getSchema();
	if (!zodSchema) return false;

	const jsonSchema = toJsonSchema(zodSchema as Parameters<typeof toJsonSchema>[0]) as Record<
		string,
		unknown
	>;

	if (model instanceof ChatAnthropic) {
		// `outputConfig` is a public typed field; `invocationParams()` reads it
		// directly and emits it on the wire as `output_config.format`. Spread
		// to preserve other config the user may have set (e.g. `effort` for
		// adaptive thinking).
		model.outputConfig = {
			...(model.outputConfig ?? {}),
			format: { type: 'json_schema', schema: jsonSchema },
		};
		return true;
	}

	if (model instanceof ChatOpenAI) {
		// `defaultOptions` is `protected` on ChatOpenAI but is the only field
		// that flows into the internal `completions` / `responses` sub-
		// instances' `invocationParams()` via `_combineCallOptions()`. Setting
		// `modelKwargs` on the outer instance does NOT propagate and is
		// silently dropped on the wire. Bypassing the visibility modifier is
		// intentional; the field name is covered by the integration test.
		//
		// `strict: true` enables actual constrained decoding. With `strict:
		// false` OpenAI treats the schema as a hint only, so the new path
		// would offer no real guarantee over the legacy prompt-injection
		// approach. The trade-off: the schema must be OpenAI-strict-compliant
		// (`additionalProperties: false`, all properties `required`, no
		// unsupported keywords); non-compliant schemas return a 400 from
		// OpenAI surfaced as a NodeApiError.
		const target = model as unknown as { defaultOptions: Record<string, unknown> };
		target.defaultOptions = {
			...(target.defaultOptions ?? {}),
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: STRUCTURED_OUTPUT_NAME,
					schema: jsonSchema,
					strict: true,
				},
			},
		};
		return true;
	}

	return false;
};

/**
 * Bind the parser's schema across every model that could run for an execution
 * (typically primary + fallback). Returns `true` only when **every** model
 * accepted the binding — if any one fails, fall back to the legacy path
 * uniformly, so a fallback-on-failure can't bypass the schema and emit
 * non-conformant text the parser would reject.
 */
export const tryBindNativeOutputSchema = (
	models: Array<BaseLanguageModel | null | undefined>,
	outputParser: N8nOutputParser | undefined,
): boolean => {
	if (!outputParser) return false;
	const eligibleModels = models.filter((m): m is BaseLanguageModel => m != null);
	if (eligibleModels.length === 0) return false;
	return eligibleModels.every((m) => bindNativeOutputSchema(m, outputParser));
};
