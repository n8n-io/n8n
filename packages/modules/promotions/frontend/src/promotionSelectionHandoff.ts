import type { PromotionDependencyReport, PromotionDirection } from '@n8n/api-types';

import type { ResourceKey } from './promotionPreview.selection';

/**
 * Carries a selection from a project page to the changes view of the environment. A selection
 * can be too long for a URL, so it stays in memory. The URL keeps the project and the included
 * items (`?from=<projectId>&include=<resourceKey>`), so a reload still opens a useful selection.
 */
export type PromotionSelectionHandoff = {
	direction: PromotionDirection;
	/** The project page that the user came from. */
	fromProjectId: string;
	selected: ResourceKey[];
	/** Items that "Include it" added, with the project of each. */
	extra: Array<[key: ResourceKey, projectId: string]>;
	/**
	 * The dependency report of the project page. The changes view computes its own for every
	 * change, so only this one knows the gaps of the selection that came over.
	 */
	report?: PromotionDependencyReport;
	/** The names of the included items that the changes view does not list, by key. */
	names?: Array<[key: ResourceKey, name: string]>;
};

let pending: PromotionSelectionHandoff | undefined;

export function setPromotionSelectionHandoff(handoff: PromotionSelectionHandoff) {
	pending = handoff;
}

/** Returns the handoff for this page once. Any other handoff is dropped. */
export function takePromotionSelectionHandoff(
	direction: PromotionDirection,
	fromProjectId: string | undefined,
): PromotionSelectionHandoff | undefined {
	const handoff = pending;
	pending = undefined;
	return handoff?.direction === direction && handoff.fromProjectId === fromProjectId
		? handoff
		: undefined;
}
