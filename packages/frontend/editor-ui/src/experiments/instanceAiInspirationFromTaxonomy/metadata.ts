// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
import type { CloudPersonalizationMetadata } from '@/experiments/instanceAiPersonalizedPromptSuggestions/metadata';
import type {
	PersonalizedPromptDisplaySuggestion,
	PersonalizedPromptMetadataLoadState,
	PersonalizedPromptSuggestionResolution,
} from '@/experiments/instanceAiPersonalizedPromptSuggestions/types';

import {
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS,
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
	type INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS_VERSION,
	TAXONOMY_SEE_MORE_ENABLED,
	type TaxonomyPromptSuggestion,
	type TaxonomyRole,
	type TaxonomySuggestionSection,
} from './prompts';

const TEAM_METADATA_KEY = 'what_team_are_you_on';

const ROLE_SECTION_SIZE = 4;
const EVERYONE_SECTION_SIZE = 2;

export type TaxonomyDisplaySuggestion = PersonalizedPromptDisplaySuggestion & {
	section: TaxonomySuggestionSection;
};

const TAXONOMY_ROLE_ANSWERS = {
	Sales: 'sales-and-marketing',
	Marketing: 'sales-and-marketing',
} as const satisfies Record<string, TaxonomyRole>;

export type TaxonomySuggestionFormat = 'list' | 'rows';

export type TaxonomyPromptSegment =
	| { source: 'taxonomy'; taxonomyRole: TaxonomyRole; segmentKey: TaxonomyRole }
	| { source: 'excluded' };

export type TaxonomyPromptTelemetryPayload = {
	suggestion_catalog_version:
		| typeof INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION
		| typeof INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS_VERSION;
	suggestion_format: TaxonomySuggestionFormat;
	suggestion_source: 'taxonomy';
	segment_key: TaxonomyRole;
	metadata_load_state: PersonalizedPromptMetadataLoadState;
};

export type TaxonomyPromptSuggestionResolution =
	| {
			source: 'taxonomy';
			suggestions: TaxonomyDisplaySuggestion[];
			showSeeMore: boolean;
			telemetryPayload: TaxonomyPromptTelemetryPayload;
	  }
	| { source: 'excluded' };

export function isTaxonomyPromptSuggestionResolution(
	resolution: PersonalizedPromptSuggestionResolution | TaxonomyPromptSuggestionResolution | null,
): resolution is Extract<TaxonomyPromptSuggestionResolution, { source: 'taxonomy' }> {
	return resolution !== null && 'source' in resolution && resolution.source === 'taxonomy';
}

export function isPersonalizedPromptSuggestionResolution(
	resolution: PersonalizedPromptSuggestionResolution | TaxonomyPromptSuggestionResolution | null,
): resolution is PersonalizedPromptSuggestionResolution {
	return resolution !== null && !('source' in resolution);
}

export function resolveTaxonomySegment(
	metadata: CloudPersonalizationMetadata,
): TaxonomyPromptSegment {
	const roleAnswer = metadata?.[TEAM_METADATA_KEY];
	if (typeof roleAnswer !== 'string') {
		return { source: 'excluded' };
	}

	const taxonomyRole = TAXONOMY_ROLE_ANSWERS[roleAnswer as keyof typeof TAXONOMY_ROLE_ANSWERS];
	if (!taxonomyRole) {
		return { source: 'excluded' };
	}

	return { source: 'taxonomy', taxonomyRole, segmentKey: taxonomyRole };
}

function getBucketSuggestions(
	taxonomyRole: TaxonomyRole,
	catalog: readonly TaxonomyPromptSuggestion[],
): TaxonomyDisplaySuggestion[] | null {
	const suggestions = catalog
		.filter((suggestion) => suggestion.taxonomyRole === taxonomyRole)
		.sort((a, b) => a.order - b.order)
		.map(({ id, shortTitle, description, builderPrompt, section }) => ({
			id,
			shortTitle,
			description,
			builderPrompt,
			section,
		}));
	const roleCount = suggestions.filter((suggestion) => suggestion.section === 'role').length;
	const everyoneCount = suggestions.filter(
		(suggestion) => suggestion.section === 'everyone',
	).length;

	if (roleCount !== ROLE_SECTION_SIZE || everyoneCount !== EVERYONE_SECTION_SIZE) {
		return null;
	}

	return suggestions;
}

const EXCLUDED_RESOLUTION = { source: 'excluded' } as const;

export function resolveTaxonomyPromptSuggestions({
	metadata,
	metadataLoadState,
	suggestionFormat = 'list',
	catalog = INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS,
	catalogVersion = INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
}: {
	metadata: CloudPersonalizationMetadata;
	metadataLoadState: PersonalizedPromptMetadataLoadState;
	suggestionFormat?: TaxonomySuggestionFormat;
	catalog?: readonly TaxonomyPromptSuggestion[];
	catalogVersion?:
		| typeof INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION
		| typeof INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS_VERSION;
}): TaxonomyPromptSuggestionResolution {
	if (metadataLoadState !== 'loaded') {
		return EXCLUDED_RESOLUTION;
	}

	const segment = resolveTaxonomySegment(metadata);
	if (segment.source === 'excluded') {
		return EXCLUDED_RESOLUTION;
	}

	const suggestions = getBucketSuggestions(segment.taxonomyRole, catalog);
	if (!suggestions) {
		return EXCLUDED_RESOLUTION;
	}

	return {
		source: 'taxonomy',
		suggestions,
		showSeeMore: TAXONOMY_SEE_MORE_ENABLED,
		telemetryPayload: {
			suggestion_catalog_version: catalogVersion,
			suggestion_format: suggestionFormat,
			suggestion_source: 'taxonomy',
			segment_key: segment.segmentKey,
			metadata_load_state: metadataLoadState,
		},
	};
}
