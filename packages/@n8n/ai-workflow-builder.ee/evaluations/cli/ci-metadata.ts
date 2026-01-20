/**
 * CI Metadata for LangSmith experiments.
 *
 * Provides metadata to distinguish CI runs from local development runs
 * and to track provenance of automated evaluation results.
 */

export interface CIMetadata {
	/** Whether this run is from CI or local development */
	source: 'ci' | 'local';
	/** The GitHub Actions event that triggered this run (e.g., 'push', 'schedule', 'workflow_dispatch') */
	trigger?: string;
	/** The Git commit SHA being evaluated */
	commitSha?: string;
	/** The Git branch or tag name */
	branch?: string;
	/** The GitHub Actions run ID for linking back to the workflow run */
	runId?: string;
}

/**
 * Build CI metadata from environment variables.
 *
 * When running in GitHub Actions, populates metadata from standard GH environment variables.
 * When running locally, only sets source to 'local'.
 */
export function buildCIMetadata(): CIMetadata {
	const isCI = process.env.GITHUB_ACTIONS === 'true';

	if (!isCI) {
		return { source: 'local' };
	}

	return {
		source: 'ci',
		trigger: process.env.GITHUB_EVENT_NAME,
		commitSha: process.env.GITHUB_SHA,
		branch: process.env.GITHUB_REF_NAME,
		runId: process.env.GITHUB_RUN_ID,
	};
}
