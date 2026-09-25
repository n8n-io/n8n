import type { CloudPersonalizationMetadata } from '@/experiments/instanceAiPersonalizedPromptSuggestions/metadata';
import type {
	PersonalizedPromptDisplaySuggestion,
	PersonalizedPromptMetadataLoadState,
	PersonalizedPromptSuggestionResolution,
} from '@/experiments/instanceAiPersonalizedPromptSuggestions/types';

import {
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS,
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
	TAXONOMY_SEE_MORE_ENABLED,
	type TaxonomyPromptSuggestion,
	type TaxonomyRole,
} from './prompts';

const TEAM_METADATA_KEY = 'what_team_are_you_on';

const SUGGESTIONS_PER_BUCKET = 4;

const TAXONOMY_ROLE_ANSWERS = {
	Sales: 'sales-and-marketing',
	Marketing: 'sales-and-marketing',
	IT: 'it',
} as const satisfies Record<string, TaxonomyRole>;

export type TaxonomyPromptSegment =
	| { source: 'taxonomy'; taxonomyRole: TaxonomyRole; segmentKey: TaxonomyRole }
	| { source: 'control' };

export type TaxonomyPromptTelemetryPayload = {
	suggestion_catalog_version: typeof INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION;
	suggestion_format: 'list';
	suggestion_source: 'taxonomy';
	segment_key: TaxonomyRole;
	metadata_load_state: PersonalizedPromptMetadataLoadState;
};

export type TaxonomyPromptSuggestionResolution =
	| {
			source: 'taxonomy';
			suggestions: PersonalizedPromptDisplaySuggestion[];
			showSeeMore: boolean;
			telemetryPayload: TaxonomyPromptTelemetryPayload;
	  }
	| { source: 'control' };

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
		return { source: 'control' };
	}

	const taxonomyRole = TAXONOMY_ROLE_ANSWERS[roleAnswer as keyof typeof TAXONOMY_ROLE_ANSWERS];
	if (!taxonomyRole) {
		return { source: 'control' };
	}

	return { source: 'taxonomy', taxonomyRole, segmentKey: taxonomyRole };
}

function getBucketSuggestions(
	taxonomyRole: TaxonomyRole,
	catalog: readonly TaxonomyPromptSuggestion[],
): PersonalizedPromptDisplaySuggestion[] | null {
	const suggestions = catalog
		.filter((suggestion) => suggestion.taxonomyRole === taxonomyRole)
		.sort((a, b) => a.order - b.order)
		.map(({ id, shortTitle, description, builderPrompt }) => ({
			id,
			shortTitle,
			description,
			builderPrompt,
		}));

	return suggestions.length === SUGGESTIONS_PER_BUCKET ? suggestions : null;
}

const CONTROL_RESOLUTION = { source: 'control' } as const;

export function resolveTaxonomyPromptSuggestions({
	metadata,
	metadataLoadState,
	catalog = INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS,
}: {
	metadata: CloudPersonalizationMetadata;
	metadataLoadState: PersonalizedPromptMetadataLoadState;
	catalog?: readonly TaxonomyPromptSuggestion[];
}): TaxonomyPromptSuggestionResolution {
	if (metadataLoadState !== 'loaded') {
		return CONTROL_RESOLUTION;
	}

	const segment = resolveTaxonomySegment(metadata);
	if (segment.source === 'control') {
		return CONTROL_RESOLUTION;
	}

	const suggestions = getBucketSuggestions(segment.taxonomyRole, catalog);
	if (!suggestions) {
		return CONTROL_RESOLUTION;
	}

	return {
		source: 'taxonomy',
		suggestions,
		showSeeMore: TAXONOMY_SEE_MORE_ENABLED,
		telemetryPayload: {
			suggestion_catalog_version: INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
			suggestion_format: 'list',
			suggestion_source: 'taxonomy',
			segment_key: segment.segmentKey,
			metadata_load_state: metadataLoadState,
		},
	};
}
