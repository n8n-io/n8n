import {
	AUTOMATION_LOCAL_TARGET_ID,
	type AutomationRecommendationReason,
	type AutomationRunTarget,
	type LinkedInstanceSummary,
} from '@n8n/api-types';
import type { RunTargetOption } from '@n8n/instance-ai';

import { LOCAL_CARD_TARGET } from './automation-card';

/**
 * Pure rules for the places that the automation card lists and offers. A linked instance is
 * named by the id of its link.
 */

/** The places that the card lists, and the ids of the ones that it offers as an answer. */
export type CardPlaces = {
	/** This instance first, then each link of the user in the stored order. */
	targets: AutomationRunTarget[];
	/** This instance, then each link that was online at its last check. */
	offered: string[];
	/**
	 * True when the lookup found that the user has no link. False when the card lists links, and
	 * when it lists none for another cause, for example in a shared chat.
	 */
	noLinks: boolean;
};

/**
 * A card that offers only this instance, for example on MCP, in a shared chat, or for a workflow
 * that cannot move. The user can have links that it does not list.
 */
export const LOCAL_PLACES: Readonly<CardPlaces> = Object.freeze({
	targets: [LOCAL_CARD_TARGET],
	offered: [AUTOMATION_LOCAL_TARGET_ID],
	noLinks: false,
});

/** True for every target id but this instance's. An absent target is this instance. */
export function isLinkedTarget(targetId: string | undefined): targetId is string {
	return targetId !== undefined && targetId !== AUTOMATION_LOCAL_TARGET_ID;
}

/**
 * A link on the card: its id and stored status only. The chat stores the card and the owner can
 * share the chat, so the card holds no name and no address of the owner's links. The frontend
 * names each link from the viewer's own list.
 */
function linkedCardTarget(link: Pick<LinkedInstanceSummary, 'id' | 'status'>): AutomationRunTarget {
	return { id: link.id, kind: 'linked', status: link.status };
}

/**
 * Lists this instance and every link. The status is the one that the last check stored, so
 * the card does not wait for a request to each instance. Only an online link is offered.
 */
export function cardPlaces(
	links: readonly Pick<LinkedInstanceSummary, 'id' | 'status'>[],
): CardPlaces {
	const online = links.filter((link) => link.status === 'online').map((link) => link.id);
	return {
		targets: [{ ...LOCAL_CARD_TARGET }, ...links.map(linkedCardTarget)],
		offered: [AUTOMATION_LOCAL_TARGET_ID, ...online],
		noLinks: links.length === 0,
	};
}

const NO_CLOUD_LINKED: AutomationRecommendationReason = 'no-cloud-linked';

/**
 * The reasons that the card gives for its recommendation. The recommendation reads only the
 * targets of the card, so it says "no cloud linked" also when the card lists no link for another
 * cause. That reason stays only when the user has no link. The list is never empty, as the card
 * schema requires.
 */
export function cardReasons(
	reasons: readonly AutomationRecommendationReason[],
	places: Pick<CardPlaces, 'noLinks'>,
): AutomationRecommendationReason[] {
	if (places.noLinks) return [...reasons];
	const known = reasons.filter((reason) => reason !== NO_CLOUD_LINKED);
	return known.length > 0 ? known : [...reasons];
}

/**
 * The targets as the recommendation reads them. A link with MCP turned off cannot take the
 * workflow either, so the recommendation counts it as offline. The recommendation does not read
 * the label, so the id stands in for the name that the card does not hold.
 */
export function recommendationTargets(targets: readonly AutomationRunTarget[]): RunTargetOption[] {
	return targets.map((target) => ({
		id: target.id,
		kind: target.kind,
		label: target.id,
		status: target.status === 'mcp-disabled' ? 'offline' : target.status,
	}));
}
