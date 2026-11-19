import {
	addLabel,
	ensureEnvVar,
	getChangedFiles,
	getPullRequestById,
	readPrLabels,
	removeLabel,
	requestTeamReviewers,
} from '../github-helpers.mjs';
import {
	assignOwnership,
	ownershipsToAllocations,
	parseOwnersFile,
	resolveRequiredTeams,
	teamHandleToSlug,
} from './owners.mjs';

export { teamHandleToSlug };

export const AUTO_ASSIGN_LABEL = 'Auto-assign reviewers';
export const AUTO_ASSIGN_REQUIRED_LABEL = 'Auto-assign required reviewers';
export const ASSIGNED_LABEL = 'Reviewers auto-assigned';

/**
 * @param { Set<string> } changedFiles
 * @param { boolean } requiredOnly
 * @returns { string[] }
 */
export function resolveOwnerTeamSlugs(changedFiles, requiredOnly = false) {
	const owners = parseOwnersFile();
	const ownerships = requiredOnly
		? resolveRequiredTeams(changedFiles, owners)
		: assignOwnership(changedFiles, owners);
	const allocations = ownershipsToAllocations(ownerships);

	return allocations.map((allocation) => teamHandleToSlug(allocation.team));
}

/**
 * @param { number } pullRequestNumber
 */
export async function run(pullRequestNumber) {
	// Read live labels because a queued event can predate a successful assignment.
	const labels = readPrLabels(await getPullRequestById(pullRequestNumber));
	const triggerLabels = [AUTO_ASSIGN_LABEL, AUTO_ASSIGN_REQUIRED_LABEL].filter((label) =>
		labels.includes(label),
	);

	if (labels.includes(ASSIGNED_LABEL)) {
		console.log(
			`PR #${pullRequestNumber} already carries the "${ASSIGNED_LABEL}" label; reviewers were already assigned.`,
		);
		for (const label of triggerLabels) await removeLabel(pullRequestNumber, label);
		return;
	}

	if (triggerLabels.length === 0) {
		console.log(`PR #${pullRequestNumber} has no auto-assignment label; skipping.`);
		return;
	}

	const requiredOnly = !triggerLabels.includes(AUTO_ASSIGN_LABEL);
	const changedFiles = await getChangedFiles(pullRequestNumber);
	const teamSlugs = resolveOwnerTeamSlugs(changedFiles, requiredOnly);

	if (teamSlugs.length === 0) {
		console.log(
			`No ${requiredOnly ? 'required ' : ''}owning teams matched for PR #${pullRequestNumber}.`,
		);
		return;
	}

	console.log(`Requesting review from team(s): ${teamSlugs.join(', ')}`);
	await requestTeamReviewers(pullRequestNumber, teamSlugs);

	await addLabel(pullRequestNumber, ASSIGNED_LABEL);
	for (const label of triggerLabels) await removeLabel(pullRequestNumber, label);
}

export async function main() {
	const pullRequestNumber = parseInt(ensureEnvVar('PULL_REQUEST_NUMBER'));
	await run(pullRequestNumber);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
