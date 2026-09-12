import type { ModelConfig } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

import { resolveModelIdString } from '../agent/model-config-identity';

const OPENROUTER_PROVIDER_SLUG = /^[a-z0-9][a-z0-9._-]*$/;

export const OPENROUTER_PROVIDER_ENV = 'N8N_INSTANCE_AI_OPENROUTER_PROVIDER';

export type OpenRouterProviderPin = {
	provider: {
		only: [string];
		allow_fallbacks: false;
	};
};

/**
 * OpenRouter host slug from an env value (e.g. `together`, `fireworks`, `z-ai`).
 * Empty / unset → undefined. A set but invalid value throws so a bad pin cannot
 * silently fall back to OpenRouter's default routing.
 */
export function parseOpenRouterProviderSlug(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	const slug = trimmed.toLowerCase();
	if (!OPENROUTER_PROVIDER_SLUG.test(slug)) {
		throw new UserError(
			`Invalid ${OPENROUTER_PROVIDER_ENV} "${trimmed}". Use one OpenRouter provider slug such as together or fireworks.`,
		);
	}
	return slug;
}

export function resolveOpenRouterProviderSlugFromEnv(
	value: string | undefined = process.env[OPENROUTER_PROVIDER_ENV],
): string | undefined {
	return parseOpenRouterProviderSlug(value);
}

export function openRouterProviderPinExtraBody(slug: string): OpenRouterProviderPin {
	return {
		provider: {
			only: [slug],
			allow_fallbacks: false,
		},
	};
}

/**
 * Attach OpenRouter `provider.only` to a model config when the env pin is set.
 * Non-OpenRouter models and LanguageModel instances are left unchanged.
 */
export function withOpenRouterProviderPin(model: ModelConfig): ModelConfig {
	const slug = resolveOpenRouterProviderSlugFromEnv();
	if (!slug) return model;

	const id = resolveModelIdString(model);
	if (!id?.startsWith('openrouter/')) return model;

	const extraBody = openRouterProviderPinExtraBody(slug);
	if (typeof model === 'string') {
		return { id: model, extraBody };
	}
	if (!isRecord(model)) return model;
	const record: Record<string, unknown> = model;
	if (typeof record.id !== 'string') return model;

	const existing = isRecord(record.extraBody) ? record.extraBody : {};
	return {
		...record,
		id: record.id,
		extraBody: {
			...existing,
			...extraBody,
		},
	};
}
