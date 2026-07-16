import { computed } from 'vue';

import { useStorage } from '@/app/composables/useStorage';

import { INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS } from './prompts';
import type { PersonalizedPromptRole, PersonalizedPromptUseCase } from './types';

export const PERSONALIZED_PROMPT_PROFILE_OVERRIDE_QUERY_PARAM =
	'instanceAiPersonalizedPromptProfile';
export const PERSONALIZED_PROMPT_PROFILE_OVERRIDE_STORAGE_KEY =
	'N8N_INSTANCE_AI_PERSONALIZED_PROMPT_PROFILE_OVERRIDE';
export const PERSONALIZED_PROMPT_PROFILE_OVERRIDE_CLEAR_VALUE = 'clear';
export const PERSONALIZED_PROMPT_PROFILE_OVERRIDE_FALLBACK_VALUE = 'fallback';

export type PersonalizedPromptProfileOverride =
	| {
			kind: 'segment';
			role: PersonalizedPromptRole;
			useCase: PersonalizedPromptUseCase;
			segmentKey: string;
	  }
	| { kind: 'fallback' };

const PERSONALIZED_PROMPT_ROLES = [
	'executive-owner',
	'support',
	'product-design',
	'sales',
	'it',
	'engineering',
	'marketing',
	'other',
] satisfies readonly PersonalizedPromptRole[];

const PERSONALIZED_PROMPT_USE_CASES = [
	'lead-generation-qualification',
	'lead-nurturing',
	'market-research',
	'content-creation',
	'campaign-audience-engagement',
	'data-insights',
	'customer-inquiries',
	'issue-resolution',
	'inbox-process-automation',
	'scam-phishing-detection',
	'data-protection',
	'it-service-desk',
	'data-management',
	'development-support',
	'insights-reporting',
	'user-market-research',
	'content-asset-creation',
	'role-default',
	'global-top-performers',
] satisfies readonly PersonalizedPromptUseCase[];

const PERSONALIZED_PROMPT_ROLE_VALUES = new Set<string>(PERSONALIZED_PROMPT_ROLES);
const PERSONALIZED_PROMPT_USE_CASE_VALUES = new Set<string>(PERSONALIZED_PROMPT_USE_CASES);
const PERSONALIZED_PROMPT_BUCKET_KEYS = new Set<string>(
	INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS.map(
		(suggestion) => `${suggestion.role}:${suggestion.useCase}`,
	),
);

function isPersonalizedPromptRole(value: string): value is PersonalizedPromptRole {
	return PERSONALIZED_PROMPT_ROLE_VALUES.has(value);
}

function isPersonalizedPromptUseCase(value: string): value is PersonalizedPromptUseCase {
	return PERSONALIZED_PROMPT_USE_CASE_VALUES.has(value);
}

export function parsePersonalizedPromptProfileOverride(
	value: string | null,
): PersonalizedPromptProfileOverride | null {
	if (!value) {
		return null;
	}

	if (value === PERSONALIZED_PROMPT_PROFILE_OVERRIDE_FALLBACK_VALUE) {
		return { kind: 'fallback' };
	}

	const [role, useCase, unexpected] = value.split(':');
	if (unexpected !== undefined || !role || !useCase) {
		return null;
	}

	if (!isPersonalizedPromptRole(role) || !isPersonalizedPromptUseCase(useCase)) {
		return null;
	}

	const segmentKey = `${role}:${useCase}`;
	if (!PERSONALIZED_PROMPT_BUCKET_KEYS.has(segmentKey)) {
		return null;
	}

	return {
		kind: 'segment',
		role,
		useCase,
		segmentKey,
	};
}

function getUrlOverrideValue() {
	const value = new URL(window.location.href).searchParams.get(
		PERSONALIZED_PROMPT_PROFILE_OVERRIDE_QUERY_PARAM,
	);

	return value ?? undefined;
}

export function usePersonalizedPromptProfileOverride() {
	const storedOverride = useStorage(PERSONALIZED_PROMPT_PROFILE_OVERRIDE_STORAGE_KEY);
	const urlOverrideValue = getUrlOverrideValue();

	if (urlOverrideValue !== undefined) {
		storedOverride.value =
			urlOverrideValue === PERSONALIZED_PROMPT_PROFILE_OVERRIDE_CLEAR_VALUE ||
			urlOverrideValue === ''
				? null
				: urlOverrideValue;
	}

	if (storedOverride.value && !parsePersonalizedPromptProfileOverride(storedOverride.value)) {
		storedOverride.value = null;
	}

	return computed(() => parsePersonalizedPromptProfileOverride(storedOverride.value));
}
