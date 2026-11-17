import type { PromotionPlannedMove } from '@n8n/api-types';

import type { ResourceKey } from './promotionPreview.selection';

/**
 * The moves of workflows and folders between two team projects that an Apply does. A move is
 * one transfer: the item keeps its id, its history and its executions.
 */

/** A project of a move. The name is absent when the user cannot access the project. */
export type MoveProject = { id: string; name?: string };

export const moveKey = ({ kind, id }: Pick<PromotionPlannedMove, 'kind' | 'id'>): ResourceKey =>
	`${kind}:${id}`;

/**
 * The preview plans the moves of every change that it lists. The page keeps the moves of the
 * items in the operation. A move of an item that the preview does not list stays.
 */
export function scopePlannedMoves(
	moves: readonly PromotionPlannedMove[],
	{ selected, listed }: { selected: ReadonlySet<ResourceKey>; listed: ReadonlySet<ResourceKey> },
): PromotionPlannedMove[] {
	return moves.filter((move) => {
		const key = moveKey(move);
		return selected.has(key) || !listed.has(key);
	});
}

/** Each project that the moves change, once. A project keeps the name that any move gives it. */
export function changedProjectsOf(moves: readonly PromotionPlannedMove[]): MoveProject[] {
	const projects = new Map<string, MoveProject>();
	for (const { fromProject, toProject } of moves) {
		for (const project of [fromProject, toProject]) {
			const known = projects.get(project.id);
			if (!known || (known.name === undefined && project.name !== undefined)) {
				projects.set(project.id, project);
			}
		}
	}
	return [...projects.values()];
}

/** The names that the page may show, and how many projects it must not name. */
export function splitProjectNames(projects: readonly MoveProject[]) {
	const names = projects.flatMap(({ name }) => (name === undefined ? [] : [name])).sort();
	return { names, hidden: projects.length - names.length };
}

/** Apply: what happens to a credential that this instance holds in another project. */
export type OwnerMoveNote = { text: string; allowed: boolean };
