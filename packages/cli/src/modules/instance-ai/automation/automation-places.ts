import {
	AUTOMATION_LOCAL_TARGET_ID,
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
};

/** A card that offers only this instance, for example on MCP or in a shared chat. */
export const LOCAL_PLACES: Readonly<CardPlaces> = Object.freeze({
	targets: [LOCAL_CARD_TARGET],
	offered: [AUTOMATION_LOCAL_TARGET_ID],
});

/** True for every target id but this instance's. An absent target is this instance. */
export function isLinkedTarget(targetId: string | undefined): targetId is string {
	return targetId !== undefined && targetId !== AUTOMATION_LOCAL_TARGET_ID;
}

function linkedCardTarget(link: LinkedInstanceSummary): AutomationRunTarget {
	return {
		id: link.id,
		kind: 'linked',
		label: link.name,
		status: link.status,
		baseUrl: link.baseUrl,
	};
}

/**
 * Lists this instance and every link. The status is the one that the last check stored, so
 * the card does not wait for a request to each instance. Only an online link is offered.
 */
export function cardPlaces(links: readonly LinkedInstanceSummary[]): CardPlaces {
	const online = links.filter((link) => link.status === 'online').map((link) => link.id);
	return {
		targets: [{ ...LOCAL_CARD_TARGET }, ...links.map(linkedCardTarget)],
		offered: [AUTOMATION_LOCAL_TARGET_ID, ...online],
	};
}

/**
 * The targets as the recommendation reads them. A link with MCP turned off cannot take the
 * workflow either, so the recommendation counts it as offline.
 */
export function recommendationTargets(targets: readonly AutomationRunTarget[]): RunTargetOption[] {
	return targets.map((target) => ({
		id: target.id,
		kind: target.kind,
		label: target.label ?? 'This computer',
		status: target.status === 'mcp-disabled' ? 'offline' : target.status,
	}));
}
