// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
export {
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS,
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS_VERSION,
	INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION,
} from './prompts';
export {
	isPersonalizedPromptSuggestionResolution,
	isTaxonomyPromptSuggestionResolution,
	resolveTaxonomyPromptSuggestions,
	resolveTaxonomySegment,
	type TaxonomyPromptSuggestionResolution,
} from './metadata';
export { default as TaxonomyPromptSuggestions } from './components/TaxonomyPromptSuggestions.vue';
export { useInstanceAiInspirationFromTaxonomyExperiment } from './useInstanceAiInspirationFromTaxonomyExperiment';
