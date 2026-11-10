export interface GuardrailResult<TInfo extends Record<string, unknown> = Record<string, unknown>> {
	/** The name of the guardrail. */
	guardrailName: string;
	/** True if the guardrail identified a critical failure. */
	tripwireTriggered: boolean;
	/** The confidence score of the guardrail. */
	confidenceScore?: number;
	/** True if the guardrail failed to execute properly. */
	executionFailed?: boolean;
	/** The original exception if execution failed. */
	originalException?: Error;
	/** Additional structured data about the check result,
        such as error details, matched patterns, or diagnostic messages.
        Must include checked_text field containing the processed text. */
	info: TInfo & {
		maskEntities?: Record<string, string[]>;
	};
}

/**
 * Model-agnostic seam for LLM guardrails: the full system prompt goes in,
 * the raw model text comes out. Adapters wrap a concrete model client
 * (LangChain in the Guardrails node, AI SDK in the agent runtime).
 */
export type GuardrailModelRunner = (systemPrompt: string, input: string) => Promise<string>;

export type LlmGuardrailConfig = {
	run: GuardrailModelRunner;
	prompt: string;
	threshold: number;
	systemMessage?: string;
};

export type CheckFn<TInfo extends Record<string, unknown> = Record<string, unknown>> = (
	input: string,
) => GuardrailResult<TInfo> | Promise<GuardrailResult<TInfo>>;

export type CreateCheckFn<
	TCfg = object,
	TInfo extends Record<string, unknown> = Record<string, unknown>,
> = (config: TCfg) => CheckFn<TInfo>;

export type CustomRegex = {
	name: string;
	value: string;
};

export class GuardrailError extends Error {
	constructor(
		readonly guardrailName: string,
		message: string,
		readonly description: string,
	) {
		super(message);
	}
}
