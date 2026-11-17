import type { PromotionPlannedMove } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { splitProjectNames, type MoveProject } from '../promotionMoves';

/** The texts of the moves between projects. A project without a name is never named. */
export function usePromotionMoveLabels() {
	const i18n = useI18n();

	const projectLabel = (project: MoveProject) =>
		project.name ?? i18n.baseText('promotions.preview.anotherProject');

	/** "Moves from Sales to Ops." */
	const moveSentence = (move: PromotionPlannedMove) =>
		i18n.baseText('promotions.moves.row', {
			interpolate: {
				from: projectLabel(move.fromProject),
				to: projectLabel(move.toProject),
			},
		});

	/** "This Apply moves "Sync orders" out of project Sales, which the branch does not hold." */
	const moveOutSentence = (move: PromotionPlannedMove) =>
		i18n.baseText('promotions.moves.out', {
			interpolate: { name: move.name, from: projectLabel(move.fromProject) },
		});

	/** "This Apply changes 2 projects: Ops, Sales." It counts the projects that it must not name. */
	function changedProjectsText(projects: readonly MoveProject[]): string {
		const { names, hidden } = splitProjectNames(projects);
		const options = {
			adjustToNumber: projects.length,
			interpolate: {
				count: String(projects.length),
				projects: names.join(', '),
				hidden: String(hidden),
			},
		};
		if (names.length === 0)
			return i18n.baseText('promotions.moves.changedProjects.hidden', options);
		return hidden > 0
			? i18n.baseText('promotions.moves.changedProjects.partial', options)
			: i18n.baseText('promotions.moves.changedProjects', options);
	}

	return { projectLabel, moveSentence, moveOutSentence, changedProjectsText };
}
