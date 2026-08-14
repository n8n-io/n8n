export const WORKFLOW_REVIEW_POLICY_SETTINGS_KEY = 'security.workflowReviews';

export const WORKFLOW_REVIEWS_ENV_FEATURE_FLAG = 'N8N_ENV_FEAT_WORKFLOW_REVIEWS';

export function isWorkflowReviewsEnvFeatureFlagEnabled(): boolean {
	return process.env[WORKFLOW_REVIEWS_ENV_FEATURE_FLAG] === 'true';
}

export function isWorkflowReviewsFeatureAvailable(isLicensed: boolean): boolean {
	return isLicensed && isWorkflowReviewsEnvFeatureFlagEnabled();
}
