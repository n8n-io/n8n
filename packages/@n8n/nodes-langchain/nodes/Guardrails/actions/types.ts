import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { PIIEntity } from './checks/pii';

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

export type LLMConfig = {
	model: BaseChatModel;
	systemMessage?: string;
	prompt: string;
	threshold: number;
};

export type CheckFn<TInfo extends Record<string, unknown> = Record<string, unknown>> = (
	input: string,
) => GuardrailResult<TInfo> | Promise<GuardrailResult<TInfo>>;

export type CreateCheckFn<
	TCfg = object,
	TInfo extends Record<string, unknown> = Record<string, unknown>,
> = (config: TCfg) => CheckFn<TInfo>;

type Value<T> = {
	value?: T;
};

export type CustomRegex = {
	name: string;
	value: string;
};

export interface GuardrailsOptions {
	keywords?: string;
	jailbreak?: Value<{
		prompt?: string;
		threshold: number;
	}>;
	nsfw?: Value<{
		prompt?: string;
		threshold: number;
	}>;
	pii?: Value<{
		type: 'all' | 'selected';
		entities?: PIIEntity[];
	}>;
	urls?: Value<{
		allowedUrls: string;
		allowedSchemes: string[];
		blockUserinfo: boolean;
		allowSubdomains: boolean;
	}>;
	secretKeys?: Value<{
		permissiveness: 'strict' | 'balanced' | 'permissive';
	}>;
	topicalAlignment?: Value<{
		prompt?: string;
		threshold: number;
	}>;
	custom?: {
		guardrail: Array<{
			name: string;
			prompt: string;
			threshold: number;
		}>;
	};
	customRegex?: {
		regex: CustomRegex[];
	};
}

export interface GuardrailUserResult {
	name: string;
	triggered: boolean;
	confidenceScore?: number;
	executionFailed?: boolean;
	exception?: {
		name: string;
		description: string;
	};
	info?: Record<string, unknown>;
}

export class GuardrailError extends Error {
	constructor(
		readonly guardrailName: string,
		message: string,
		readonly description: string,
	) {
		super(message);
	}
}

export interface StageGuardRails {
	preflight: Array<{ name: string; check: CheckFn }>;
	input: Array<{ name: string; check: CheckFn }>;
}
export type GroupedGuardrailResults = {
	passed: Array<PromiseFulfilledResult<GuardrailResult>>;
	failed: Array<PromiseRejectedResult | PromiseFulfilledResult<GuardrailResult>>;
};
