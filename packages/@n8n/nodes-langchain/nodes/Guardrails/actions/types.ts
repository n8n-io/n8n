import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type {
	CheckFn,
	CustomRegex,
	GuardrailResult,
	PIIEntity,
} from '@n8n/ai-utilities/guardrails';

export {
	GuardrailError,
	type CheckFn,
	type CreateCheckFn,
	type CustomRegex,
	type GuardrailResult,
} from '@n8n/ai-utilities/guardrails';

export type LLMConfig = {
	model: BaseChatModel;
	systemMessage?: string;
	prompt: string;
	threshold: number;
};

type Value<T> = {
	value?: T;
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

export interface StageGuardRails {
	preflight: Array<{ name: string; check: CheckFn }>;
	input: Array<{ name: string; check: CheckFn }>;
}
export type GroupedGuardrailResults = {
	passed: Array<PromiseFulfilledResult<GuardrailResult>>;
	failed: Array<PromiseRejectedResult | PromiseFulfilledResult<GuardrailResult>>;
};
