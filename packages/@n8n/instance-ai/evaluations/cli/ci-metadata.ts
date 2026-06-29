/**
 * CI Metadata for LangSmith experiments.
 *
 * Distinguishes CI runs from local development runs and tracks provenance
 * of automated evaluation results.
 *
 * Git provenance (branch, commit SHA, PR number) is recorded explicitly on the
 * experiment metadata in CI from LANGSMITH_BRANCH / LANGSMITH_REVISION_ID /
 * GITHUB_* env vars. Downstream analytics (BigQuery KPIs) key off `branch` for
 * the dev-vs-official split, so it can't be left to fragile name parsing. Local
 * runs are always "dev" (source = 'local'), so they carry no branch here.
 */

import { execSync } from 'node:child_process';

export interface CIMetadata {
	source: 'ci' | 'local';
	/** GitHub Actions event that triggered this run (e.g., 'pull_request', 'merge_group', 'workflow_dispatch') */
	trigger?: string;
	/** GitHub Actions run ID for linking back to the workflow run */
	runId?: string;
	/** Git branch the run was built from. Drives the dev-vs-official KPI split. */
	branch?: string;
	/** Commit SHA the run was built from. */
	commitSha?: string;
	/** Pull-request number, when the run was triggered by a `pull_request` event. */
	prNumber?: string;
}

export function buildCIMetadata(): CIMetadata {
	const isCI = process.env.GITHUB_ACTIONS === 'true';

	if (!isCI) {
		return { source: 'local' };
	}

	return {
		source: 'ci',
		trigger: process.env.GITHUB_EVENT_NAME,
		runId: process.env.GITHUB_RUN_ID,
		branch:
			process.env.LANGSMITH_BRANCH ?? process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME,
		commitSha: process.env.LANGSMITH_REVISION_ID ?? process.env.GITHUB_SHA,
		// pull_request runs expose the number via GITHUB_REF as `refs/pull/<n>/merge`.
		prNumber: process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\//)?.[1],
	};
}

/**
 * Compute an informative experiment name prefix from branch and commit info.
 * Falls back to a generic name if no git context is available.
 *
 * - CI: `ci-{branch}-{short-sha}` from GitHub Actions env vars
 * - Local: `local-{branch}-{short-sha}[-dirty]` from git, dirty suffix if there are uncommitted changes
 * - Fallback: `instance-ai-workflow-evals`
 *
 * LangSmith appends its own random suffix, so this doesn't need to be unique.
 */
export function computeExperimentPrefix(): string {
	const ciName = computeCIExperimentName();
	if (ciName) return ciName;

	const localName = computeLocalExperimentName();
	if (localName) return localName;

	return 'instance-ai-workflow-evals';
}

function computeCIExperimentName(): string | undefined {
	if (process.env.GITHUB_ACTIONS !== 'true') return undefined;

	const branch =
		process.env.LANGSMITH_BRANCH ?? process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME;
	const sha = process.env.GITHUB_SHA;
	if (!branch || !sha) return undefined;

	return sanitize(`ci-${branch}-${sha.slice(0, 7)}`);
}

function computeLocalExperimentName(): string | undefined {
	try {
		const run = (cmd: string): string =>
			execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

		const branch = run('git rev-parse --abbrev-ref HEAD');
		const sha = run('git rev-parse --short HEAD');
		const dirty = run('git status --porcelain').length > 0 ? '-dirty' : '';
		return sanitize(`local-${branch}-${sha}${dirty}`);
	} catch {
		return undefined;
	}
}

function sanitize(name: string): string {
	return name.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_{2,}/g, '_');
}
