/**
 * Opt-in reviewer auto-assignment.
 *
 * When a PR carries the `Auto-assign reviewers` label, request review from
 * every team that owns a changed file (per .github/OWNERS). This is strictly
 * opt-in: without the label the script is a no-op, so it never adds friction
 * to PRs that don't want it.
 *
 * Assignment happens once: after requesting reviewers the trigger label is
 * swapped for the `Reviewers auto-assigned` marker, and any PR already carrying
 * that marker is skipped. This stops later `synchronize` events from
 * re-requesting (and re-notifying) the same teams.
 *
 * Complements `owners-review-recommendations.mjs`, which only *suggests*
 * reviewer teams in a comment — this one actually requests them.
 */

import {
	addLabel,
	ensureEnvVar,
	getChangedFiles,
	readPrLabels,
	removeLabel,
	requestTeamReviewers,
} from './github-helpers.mjs';
import { assignOwnership, ownershipsToAllocations, parseOwnersFile } from './owners.mjs';

export const AUTO_ASSIGN_LABEL = 'Auto-assign reviewers';
export const ASSIGNED_LABEL = 'Reviewers auto-assigned';

/**
 * Convert an OWNERS team handle (`@n8n-io/catalysts`) into the GitHub team slug
 * (`catalysts`) expected by the requestReviewers API.
 *
 * @param { string } team
 * @returns { string }
 */
export function teamHandleToSlug(team) {
	return team.replace(/^@[^/]+\//, '');
}

/**
 * @param { string[] } labels
 * @returns { boolean }
 */
export function hasAutoAssignLabel(labels) {
	return labels.includes(AUTO_ASSIGN_LABEL);
}

/**
 * Determine the team slugs that own files in the changeset, de-duplicated and
 * stable-ordered (largest ownership first, matching allocation order).
 *
 * @param { Set<string> } changedFiles
 * @returns { string[] }
 */
export function resolveOwnerTeamSlugs(changedFiles) {
	const owners = parseOwnersFile();
	const ownerships = assignOwnership(changedFiles, owners);
	const allocations = ownershipsToAllocations(ownerships);

	return allocations.map((allocation) => teamHandleToSlug(allocation.team));
}

/**
 * @param { number } pullRequestNumber
 */
export async function run(pullRequestNumber) {
	const labels = readPrLabels();

	if (labels.includes(ASSIGNED_LABEL)) {
		console.log(
			`PR #${pullRequestNumber} already carries the "${ASSIGNED_LABEL}" label; reviewers were already assigned.`,
		);
		return;
	}

	if (!hasAutoAssignLabel(labels)) {
		console.log(
			`PR #${pullRequestNumber} is missing the "${AUTO_ASSIGN_LABEL}" label; skipping reviewer assignment.`,
		);
		return;
	}

	const changedFiles = await getChangedFiles(pullRequestNumber);
	const teamSlugs = resolveOwnerTeamSlugs(changedFiles);

	if (teamSlugs.length === 0) {
		console.log(`No owning teams matched for PR #${pullRequestNumber}; nothing to assign.`);
		return;
	}

	console.log(`Requesting review from team(s): ${teamSlugs.join(', ')}`);
	await requestTeamReviewers(pullRequestNumber, teamSlugs);

	// Swap the trigger label for the done-marker so later runs no-op.
	await addLabel(pullRequestNumber, ASSIGNED_LABEL);
	await removeLabel(pullRequestNumber, AUTO_ASSIGN_LABEL);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const pullRequestNumber = parseInt(ensureEnvVar('PULL_REQUEST_NUMBER'));
	await run(pullRequestNumber);
}
