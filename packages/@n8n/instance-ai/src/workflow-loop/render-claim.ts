/**
 * User-facing wording for a verification claim.
 *
 * Every surface that discloses coverage renders from here, so the guidance the
 * model reads and the publish approval the user clicks state the same facts.
 * A claim at `verified` needs no disclosure.
 */

import type { VerificationClaim } from './workflow-loop-state';

export function formatClaimNodeList(names: readonly string[], max = 8): string {
	if (names.length <= max) return names.join(', ');
	return `${names.slice(0, max).join(', ')} and ${String(names.length - max)} more`;
}

export function formatClaimHeadline(claim: VerificationClaim): string {
	switch (claim.level) {
		case 'verified':
			// A run always executes the draft. On a published workflow whose live
			// version is older, "verified end to end" reads as "production works"
			// while production still runs the untested version.
			return claim.liveState === 'live-stale'
				? 'Verified in the draft, NOT live.'
				: 'Verified end to end.';
		case 'unproven':
			return (
				'Changed but NOT verified. The node(s) this change was about were never proven: ' +
				`${formatClaimNodeList(claim.unprovenTargets)}.`
			);
		case 'partial':
			return 'Ran without errors, but NOT fully verified.';
		case 'failed':
			return 'Verification did not pass.';
	}
}

/**
 * The one publish fact worth a sentence. `unpublished` and `live-current` need
 * none: a new build is expected to be unpublished, and a current live version
 * is what a reader already assumes.
 *
 * Fact only, no call to action. This sentence renders inside the publish
 * approval too, where "publish the workflow" would argue for the click the
 * user is being asked to weigh. The prompt to publish belongs to the surfaces
 * the model reads, not the card the user approves.
 */
export function describeClaimLiveState(claim: VerificationClaim): string | undefined {
	if (claim.liveState !== 'live-stale') return undefined;
	return (
		'This ran against the draft. The live version is still the previous one, ' +
		'so nothing changed for production yet.'
	);
}

export function describeClaimCoverage(claim: VerificationClaim): string[] {
	const facts: string[] = [];

	const liveState = describeClaimLiveState(claim);
	if (liveState !== undefined) facts.push(liveState);

	if (claim.nodesNotReached.length > 0) {
		facts.push(
			`${String(claim.nodesNotReached.length)} of ${String(claim.plannedNodeCount)} node(s) were ` +
				`never reached, so they are UNVERIFIED: ${formatClaimNodeList(claim.nodesNotReached)}.`,
		);
	}
	if (claim.simulatedNodes.length > 0) {
		facts.push(
			'Output was simulated, so nothing real happened at: ' +
				`${formatClaimNodeList(claim.simulatedNodes.map((node) => node.nodeName))}.`,
		);
	}
	if (claim.pinnedNodes.length > 0) {
		facts.push(
			`Some output came from pin data saved on the workflow: ${formatClaimNodeList(claim.pinnedNodes)}. ` +
				'Remove those pins for a live test.',
		);
	}
	return facts;
}

export function formatClaimDisclosure(claim: VerificationClaim): string | undefined {
	// A stale live version needs no disclosure here: this text is read on the
	// publish path, and publishing is what fixes a stale live version. The
	// draft/live distinction is disclosed where it changes what the model may
	// say — the verify result and the loop guidance.
	if (claim.level === 'verified') return undefined;
	return [formatClaimHeadline(claim), ...describeClaimCoverage(claim)].join(' ');
}
