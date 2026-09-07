export type PersonalizedPromptRole =
	| 'executive-owner'
	| 'support'
	| 'product-design'
	| 'sales'
	| 'it'
	| 'engineering'
	| 'marketing'
	| 'other';

export type PersonalizedPromptUseCase =
	| 'lead-generation-qualification'
	| 'lead-nurturing'
	| 'market-research'
	| 'content-creation'
	| 'campaign-audience-engagement'
	| 'data-insights'
	| 'customer-inquiries'
	| 'issue-resolution'
	| 'inbox-process-automation'
	| 'scam-phishing-detection'
	| 'data-protection'
	| 'it-service-desk'
	| 'data-management'
	| 'development-support'
	| 'insights-reporting'
	| 'user-market-research'
	| 'content-asset-creation'
	| 'role-default'
	| 'global-top-performers';

export type PersonalizedPromptSuggestionSource =
	| 'matrix'
	| 'role_default'
	| 'global_top_performers'
	| 'v2_top_used_fallback';

export type PersonalizedPromptMetadataLoadState = 'loaded' | 'failed' | 'timed_out' | 'not_cloud';

export type PersonalizedPromptFormat = 'cards' | 'list';

export type PersonalizedPromptSuggestion = {
	id: string;
	role: PersonalizedPromptRole;
	useCase: PersonalizedPromptUseCase;
	order: number;
	style: 'tool-specific' | 'generic';
	shortTitle: string;
	description: string;
	builderPrompt: string;
};

export type PersonalizedPromptDisplaySuggestion = Pick<
	PersonalizedPromptSuggestion,
	'id' | 'shortTitle' | 'description' | 'builderPrompt'
>;

export type PersonalizedPromptTelemetryPayload = {
	suggestion_catalog_version: 'v4-personalized';
	suggestion_format: PersonalizedPromptFormat;
	suggestion_source: PersonalizedPromptSuggestionSource;
	profile_role?: PersonalizedPromptRole;
	profile_use_case?: PersonalizedPromptUseCase;
	segment_key?: string;
	metadata_load_state: PersonalizedPromptMetadataLoadState;
	profile_override?: boolean;
};

export type PersonalizedPromptSuggestionResolution = {
	suggestions: PersonalizedPromptDisplaySuggestion[];
	fallbackSuggestions: PersonalizedPromptDisplaySuggestion[];
	showSeeMore: boolean;
	telemetryPayload: PersonalizedPromptTelemetryPayload;
};
