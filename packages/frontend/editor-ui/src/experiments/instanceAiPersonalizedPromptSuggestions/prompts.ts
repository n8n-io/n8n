import type { PersonalizedPromptSuggestion } from './types';

// Exact prompt rows must be copied from the Notion prompt DB before rollout.
export const INSTANCE_AI_PERSONALIZED_PROMPT_SUGGESTIONS =
	[] satisfies readonly PersonalizedPromptSuggestion[];
