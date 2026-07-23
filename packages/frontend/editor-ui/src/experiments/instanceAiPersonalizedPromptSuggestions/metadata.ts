import { INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS } from './prompts';
import type { PersonalizedPromptProfileOverride } from './profileOverride';
import type {
	PersonalizedPromptDisplaySuggestion,
	PersonalizedPromptFormat,
	PersonalizedPromptMetadataLoadState,
	PersonalizedPromptRole,
	PersonalizedPromptSuggestion,
	PersonalizedPromptSuggestionResolution,
	PersonalizedPromptSuggestionSource,
	PersonalizedPromptUseCase,
} from './types';

export type CloudPersonalizationMetadata = Record<string, string | string[] | undefined> | null;

const TEAM_METADATA_KEY = 'what_team_are_you_on';
const SOMETHING_ELSE_ANSWER = 'Something else';

const ROLE_ANSWERS = {
	'Executive/Owner': 'executive-owner',
	Support: 'support',
	'Product & Design': 'product-design',
	Sales: 'sales',
	IT: 'it',
	Engineering: 'engineering',
	Marketing: 'marketing',
	Other: 'other',
} as const satisfies Record<string, PersonalizedPromptRole>;

const USE_CASE_METADATA_KEYS = {
	sales: 'what_do_you_automate_sales',
	marketing: 'what_do_you_automate_marketing',
	support: 'what_do_you_automate_support',
	it: 'what_do_you_automate_it',
	engineering: 'what_do_you_automate_eng',
	'product-design': 'what_do_you_automate_pad',
} as const satisfies Partial<Record<PersonalizedPromptRole, string>>;

const USE_CASE_ANSWERS = {
	sales: {
		'Lead generation & qualification': 'lead-generation-qualification',
		'Lead nurturing': 'lead-nurturing',
		'Market research': 'market-research',
	},
	marketing: {
		'Content creation': 'content-creation',
		'Campaigns & audience engagement': 'campaign-audience-engagement',
		'Data & insights': 'data-insights',
	},
	support: {
		'Customer inquiries': 'customer-inquiries',
		'Issue resolution': 'issue-resolution',
		'Inbox & process automation': 'inbox-process-automation',
	},
	it: {
		'Scam & phishing detection': 'scam-phishing-detection',
		'Data protection': 'data-protection',
		'IT service desk': 'it-service-desk',
	},
	engineering: {
		'Data management': 'data-management',
		'Development support': 'development-support',
		'Insights & reporting': 'insights-reporting',
	},
	'product-design': {
		'User & market research': 'user-market-research',
		'Insights & reporting': 'insights-reporting',
		'Content & asset creation': 'content-asset-creation',
	},
} as const satisfies Partial<
	Record<PersonalizedPromptRole, Record<string, PersonalizedPromptUseCase>>
>;

function getUseCaseAnswer(
	role: PersonalizedPromptRole,
	answer: string,
): PersonalizedPromptUseCase | undefined {
	const useCaseAnswers: Partial<
		Record<PersonalizedPromptRole, Record<string, PersonalizedPromptUseCase>>
	> = USE_CASE_ANSWERS;

	return useCaseAnswers[role]?.[answer];
}

type PromptSegment =
	| {
			source: Exclude<PersonalizedPromptSuggestionSource, 'v2_top_used_fallback'>;
			role: PersonalizedPromptRole;
			useCase: PersonalizedPromptUseCase;
			segmentKey: string;
	  }
	| {
			source: 'v2_top_used_fallback';
			role?: PersonalizedPromptRole;
			useCase?: PersonalizedPromptUseCase;
	  };
type MetadataStringValue =
	| { state: 'missing' }
	| { state: 'malformed' }
	| { state: 'value'; value: string };

function getStringMetadataValueState(
	metadata: CloudPersonalizationMetadata,
	key: string,
): MetadataStringValue {
	if (!metadata || !(key in metadata)) {
		return { state: 'missing' };
	}

	const value = metadata[key];
	if (value === undefined) {
		return { state: 'missing' };
	}

	if (typeof value !== 'string') {
		return { state: 'malformed' };
	}

	return { state: 'value', value };
}

function getRole(
	metadata: CloudPersonalizationMetadata,
): PersonalizedPromptRole | 'malformed' | undefined {
	const roleAnswer = getStringMetadataValueState(metadata, TEAM_METADATA_KEY);
	if (roleAnswer.state === 'missing') {
		return undefined;
	}

	if (roleAnswer.state === 'malformed') {
		return 'malformed';
	}

	return ROLE_ANSWERS[roleAnswer.value as keyof typeof ROLE_ANSWERS];
}

function getRoleDefaultSegment(role: PersonalizedPromptRole): PromptSegment {
	return {
		source: 'role_default',
		role,
		useCase: 'role-default',
		segmentKey: `${role}:role-default`,
	};
}

function getPromptSegmentFromProfileOverride(
	profileOverride: PersonalizedPromptProfileOverride,
): PromptSegment {
	if (profileOverride.kind === 'fallback') {
		return { source: 'v2_top_used_fallback' };
	}

	const source: Exclude<PersonalizedPromptSuggestionSource, 'v2_top_used_fallback'> =
		profileOverride.useCase === 'global-top-performers'
			? 'global_top_performers'
			: profileOverride.useCase === 'role-default'
				? 'role_default'
				: 'matrix';

	return {
		source,
		role: profileOverride.role,
		useCase: profileOverride.useCase,
		segmentKey: profileOverride.segmentKey,
	};
}

export function resolvePromptSegment(metadata: CloudPersonalizationMetadata): PromptSegment {
	const role = getRole(metadata);

	if (role === 'malformed') {
		return { source: 'v2_top_used_fallback' };
	}

	if (!role) {
		return { source: 'v2_top_used_fallback' };
	}

	if (role === 'executive-owner') {
		return {
			source: 'global_top_performers',
			role,
			useCase: 'global-top-performers',
			segmentKey: 'executive-owner:global-top-performers',
		};
	}

	if (role === 'other') {
		return getRoleDefaultSegment(role);
	}

	const useCaseMetadataKey = USE_CASE_METADATA_KEYS[role];
	if (!useCaseMetadataKey) {
		return { source: 'v2_top_used_fallback', role };
	}

	const useCaseAnswer = getStringMetadataValueState(metadata, useCaseMetadataKey);
	if (useCaseAnswer.state === 'malformed') {
		return { source: 'v2_top_used_fallback', role };
	}

	if (useCaseAnswer.state === 'missing' || useCaseAnswer.value === SOMETHING_ELSE_ANSWER) {
		return getRoleDefaultSegment(role);
	}

	const useCase = getUseCaseAnswer(role, useCaseAnswer.value);
	if (!useCase) {
		return { source: 'v2_top_used_fallback', role };
	}

	return {
		source: 'matrix',
		role,
		useCase,
		segmentKey: `${role}:${useCase}`,
	};
}

function getBucketSuggestions(
	segment: Exclude<PromptSegment, { source: 'v2_top_used_fallback' }>,
	catalog: readonly PersonalizedPromptSuggestion[],
): PersonalizedPromptDisplaySuggestion[] | null {
	const suggestions = catalog
		.filter(
			(suggestion) => suggestion.role === segment.role && suggestion.useCase === segment.useCase,
		)
		.sort((a, b) => a.order - b.order)
		.map(({ id, shortTitle, description, builderPrompt }) => ({
			id,
			shortTitle,
			description,
			builderPrompt,
		}));

	return suggestions.length === 4 ? suggestions : null;
}

function createFallbackResolution({
	fallbackSuggestions,
	format,
	metadataLoadState,
	role,
	useCase,
	profileOverride,
}: {
	fallbackSuggestions: PersonalizedPromptDisplaySuggestion[];
	format: PersonalizedPromptFormat;
	metadataLoadState: PersonalizedPromptMetadataLoadState;
	role?: PersonalizedPromptRole;
	useCase?: PersonalizedPromptUseCase;
	profileOverride?: boolean;
}): PersonalizedPromptSuggestionResolution {
	return {
		suggestions: fallbackSuggestions,
		fallbackSuggestions,
		showSeeMore: false,
		telemetryPayload: {
			suggestion_catalog_version: 'v4-personalized',
			suggestion_format: format,
			suggestion_source: 'v2_top_used_fallback',
			profile_role: role,
			profile_use_case: useCase,
			metadata_load_state: metadataLoadState,
			profile_override: profileOverride ? true : undefined,
		},
	};
}

export function resolvePersonalizedPromptSuggestions({
	metadata,
	metadataLoadState,
	fallbackSuggestions,
	format,
	profileOverride,
	catalog = INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS,
}: {
	metadata: CloudPersonalizationMetadata;
	metadataLoadState: PersonalizedPromptMetadataLoadState;
	fallbackSuggestions: PersonalizedPromptDisplaySuggestion[];
	format: PersonalizedPromptFormat;
	profileOverride?: PersonalizedPromptProfileOverride | null;
	catalog?: readonly PersonalizedPromptSuggestion[];
}): PersonalizedPromptSuggestionResolution {
	const hasProfileOverride = Boolean(profileOverride);
	const effectiveMetadataLoadState = hasProfileOverride ? 'loaded' : metadataLoadState;

	if (!hasProfileOverride && metadataLoadState !== 'loaded') {
		return createFallbackResolution({ fallbackSuggestions, format, metadataLoadState });
	}

	const segment = profileOverride
		? getPromptSegmentFromProfileOverride(profileOverride)
		: resolvePromptSegment(metadata);

	if (segment.source === 'v2_top_used_fallback') {
		return createFallbackResolution({
			fallbackSuggestions,
			format,
			metadataLoadState: effectiveMetadataLoadState,
			role: segment.role,
			useCase: segment.useCase,
			profileOverride: hasProfileOverride,
		});
	}

	const suggestions = getBucketSuggestions(segment, catalog);
	if (!suggestions) {
		return createFallbackResolution({
			fallbackSuggestions,
			format,
			metadataLoadState: effectiveMetadataLoadState,
			role: segment.role,
			useCase: segment.useCase,
			profileOverride: hasProfileOverride,
		});
	}

	return {
		suggestions,
		fallbackSuggestions,
		showSeeMore: true,
		telemetryPayload: {
			suggestion_catalog_version: 'v4-personalized',
			suggestion_format: format,
			suggestion_source: segment.source,
			profile_role: segment.role,
			profile_use_case: segment.useCase,
			segment_key: segment.segmentKey,
			metadata_load_state: effectiveMetadataLoadState,
			profile_override: hasProfileOverride ? true : undefined,
		},
	};
}
