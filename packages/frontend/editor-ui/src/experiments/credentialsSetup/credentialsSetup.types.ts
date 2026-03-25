export type SetupMode =
	| 'managedOAuth'
	| 'tenantOAuth'
	| 'tokenManual'
	| 'serverManual'
	| 'partnerProvisioned'
	| 'generic';

export type SetupFriction =
	| 'one_click'
	| 'one_field_then_connect'
	| 'paste_token'
	| 'server_wizard'
	| 'multi_step';

export type SetupConfidence = 'high' | 'medium' | 'low';

export type ConfidenceReason =
	| 'explicit_override'
	| 'oauth_managed_clients'
	| 'single_bootstrap_field'
	| 'no_visible_required_fields'
	| 'token_like_fields'
	| 'server_like_fields'
	| 'hybrid_extra_fields'
	| 'multiple_auth_options'
	| 'unknown_field_pattern'
	| 'fallback_generic';

export type SetupRequirement =
	| 'admin_role'
	| 'developer_account'
	| 'manual_resource_share'
	| 'public_distribution_review';

export type SetupStep =
	| { kind: 'field'; field: string; label?: string }
	| { kind: 'oauth'; managed?: boolean }
	| { kind: 'info'; key: string }
	| { kind: 'test' };

export interface CredentialSetupRecipe {
	setupMode: SetupMode;
	friction: SetupFriction;
	badgeLabel?: string;
	requirements?: SetupRequirement[];
	preSteps?: SetupStep[];
	postSteps?: SetupStep[];
	manualFallback?: boolean;
}

export interface ResolvedSetupRecipe {
	recipe: CredentialSetupRecipe;
	confidence: SetupConfidence;
	confidenceReasons: ConfidenceReason[];
	resolutionSource: 'explicit_override' | 'inference';
	credentialType: string;
}

export interface RecipeActivation {
	resolved: ResolvedSetupRecipe;
	activated: boolean;
	activationGates: {
		inExperiment: boolean;
		inV1Cohort: boolean;
		confidenceMet: boolean;
	};
}

export type RecipeSurface = 'badges' | 'modal' | 'setupPanel';
