import type {
	AutomationProposalCard,
	AutomationRunTarget,
	LinkedInstanceSummary,
} from '@n8n/api-types';

/**
 * Pure rules that name the linked places of an automation card. The card holds only the id and
 * the status of each link: the chat stores the card, and the owner can share the chat. So the
 * viewer's own list of links names a place. A teammate's list never holds the owner's links, so a
 * teammate sees a name in words, never the owner's link name or address.
 */

/** A place of the card, with the name and the address from the viewer's own link. */
export type CardTarget = AutomationRunTarget & {
	/** Display name of the viewer's link. Absent when the viewer has no link with this id. */
	label?: string;
	/** Address of the viewer's link, for links that open it in a new tab. */
	baseUrl?: string;
};

/** The card as the viewer sees it. A card from the server is one, without names. */
export type ViewedProposal = Omit<AutomationProposalCard, 'targets'> & { targets: CardTarget[] };

export type ViewerLink = Pick<LinkedInstanceSummary, 'id' | 'name' | 'baseUrl'>;

/** True when the card lists a linked place, so that its names need the viewer's links. */
export function hasLinkedTargets(proposal: AutomationProposalCard): boolean {
	return proposal.targets.some((target) => target.kind === 'linked');
}

function viewedTarget(target: AutomationRunTarget, links: readonly ViewerLink[]): CardTarget {
	// A new object, so that no field of the stored card other than these reaches the view.
	const own: CardTarget = { id: target.id, kind: target.kind, status: target.status };
	if (target.kind !== 'linked') return own;
	const link = links.find(({ id }) => id === target.id);
	return link ? { ...own, label: link.name, baseUrl: link.baseUrl } : own;
}

/** The card with the name and the address of each place that is one of the viewer's links. */
export function withViewerLinks(
	proposal: AutomationProposalCard,
	links: readonly ViewerLink[],
): ViewedProposal {
	return { ...proposal, targets: proposal.targets.map((target) => viewedTarget(target, links)) };
}
