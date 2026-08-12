#!/usr/bin/env node
/**
 * POSTs the validated review (or a failure report) to the n8n Orchestrator's
 * resume URL, so the suspended execution always resumes — success or not.
 * fetch() instead of curl to avoid E2BIG from shell argument limits.
 *
 * Environment variables:
 *   RESUME_URL         - n8n Wait-node resume URL, HMAC included (required)
 *   PR_NUMBER          - reviewed PR (required)
 *   HEAD_SHA           - reviewed head sha (required)
 *   VALIDATED_REVIEW   - path to the validator's normalized JSON (optional)
 *   VALIDATION_ERROR   - validator/setup error text (optional)
 *   CLAUDE_OUTCOME     - "success" or "failure" (required)
 *   GITHUB_RUN_ID      - set by Actions
 */

import { existsSync, readFileSync } from 'node:fs';

export function buildCallbackPayload({ prNumber, headSha, runId, claudeOutcome }, review, error) {
	const claudeFailed = claudeOutcome !== 'success';
	return {
		success: !claudeFailed && review !== null && !error,
		pr_number: Number(prNumber),
		head_sha: headSha,
		gh_run_id: runId,
		review,
		error: error ?? (claudeFailed ? 'claude run failed' : null),
	};
}

async function main() {
	const resumeUrl = process.env.RESUME_URL;
	if (!resumeUrl) {
		console.error('RESUME_URL environment variable is required');
		process.exit(1);
	}

	let review = null;
	const reviewPath = process.env.VALIDATED_REVIEW;
	if (reviewPath && existsSync(reviewPath)) {
		try {
			review = JSON.parse(readFileSync(reviewPath, 'utf8'));
		} catch (err) {
			console.warn(`Failed to parse ${reviewPath}: ${err.message}`);
		}
	}

	const payload = buildCallbackPayload(
		{
			prNumber: process.env.PR_NUMBER,
			headSha: process.env.HEAD_SHA,
			runId: process.env.GITHUB_RUN_ID ?? '',
			claudeOutcome: process.env.CLAUDE_OUTCOME,
		},
		review,
		process.env.VALIDATION_ERROR || null,
	);

	const response = await fetch(resumeUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		console.error(`Callback failed with ${response.status}: ${await response.text()}`);
		process.exit(1);
	}
	console.log(`Callback delivered (success=${payload.success})`);
}

const isDirectRun =
	process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirectRun) await main();
