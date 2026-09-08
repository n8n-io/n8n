/**
 * User-facing wording for a verification claim.
 *
 * Every surface that discloses coverage renders from here, so the guidance the
 * model reads and the publish approval the user clicks state the same facts.
 * A claim at `verified` needs no disclosure.
 */

import type { VerificationClaim } from './workflow-loop-state';

/** Node names, capped so a wide workflow does not flood the message. */
export function formatClaimNodeList(names: readonly string[], max = 8): string {
	if (names.length <= max) return names.join(', ');
	return `${names.slice(0, max).join(', ')} and ${String(names.length - max)} more`;
}

/** Short headline for a claim that cannot be reported as verified. */
export function formatClaimHeadline(claim: VerificationClaim): string {
	switch (claim.level) {
		case 'verified':
			return 'Verified end to end.';
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

/** One short sentence per fact the claim carries, most significant first. */
export function describeClaimCoverage(claim: VerificationClaim): string[] {
	const facts: string[] = [];
	// No standalone ratio: on a fully reached run it says nothing, and the count
	// only means something next to the nodes it refers to.
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
		// Called out separately from the simulated list it belongs to: the remedy
		// differs — the user has to remove pins saved on the workflow.
		facts.push(
			`Some output came from pin data saved on the workflow: ${formatClaimNodeList(claim.pinnedNodes)}. ` +
				'Remove those pins for a live test.',
		);
	}
	return facts;
}

/** One-line disclosure for a claim below `verified`, or undefined when none is needed. */
export function formatClaimDisclosure(claim: VerificationClaim): string | undefined {
	if (claim.level === 'verified') return undefined;
	return [formatClaimHeadline(claim), ...describeClaimCoverage(claim)].join(' ');
}
