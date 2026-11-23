import type {
	PromotionDirection,
	PromotionMissingDependency,
	PromotionResource,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { isBlocking, type Blocker } from '../promotionOperation';
import type { ApplyCheckResult } from '../promotions.types';
import { isContainer } from '../promotionPreview.tree';

/** Apply keeps these resources as they are on the instance. It does not create them. */
const KEPT_BY_APPLY = new Set<PromotionResource['type']>(['credential', 'variable']);

const MOVED_DETAIL = {
	workflow: {
		existing: 'promotions.preview.blockers.movedWorkflow',
		newProject: 'promotions.preview.blockers.movedWorkflow.newProject',
	},
	folder: {
		existing: 'promotions.preview.blockers.movedFolder',
		newProject: 'promotions.preview.blockers.movedFolder.newProject',
	},
} as const;

/** Labels for change details and blockers in the promotion preview. */
export function usePromotionPreviewLabels() {
	const i18n = useI18n();

	function changeLabel(
		resource: PromotionResource,
		direction: PromotionDirection,
	): string | undefined {
		switch (resource.change) {
			case 'added':
				// The branch has it and this instance does not. Apply asks for it instead.
				return direction === 'apply' && KEPT_BY_APPLY.has(resource.type)
					? i18n.baseText('promotions.preview.side.notOnInstance')
					: i18n.baseText('promotions.preview.change.added');
			case 'archived':
				return i18n.baseText('promotions.preview.change.archived');
			case 'deleted':
				return i18n.baseText('promotions.preview.change.deleted');
			case 'modified':
				if (resource.previousParentKey !== undefined) {
					return i18n.baseText('promotions.preview.change.moved');
				}
				if (resource.previousId !== undefined) {
					return i18n.baseText('promotions.preview.change.linked');
				}
				if (resource.previousName !== undefined) {
					return i18n.baseText('promotions.preview.change.renamed');
				}
				return i18n.baseText('promotions.preview.change.modified');
			case 'unchanged':
				return undefined;
		}
	}

	/** Why the resource stops the operation. `undefined` when it does not. */
	function blockerMessage(
		resource: PromotionResource,
		blockers: readonly Blocker[] = [],
	): string | undefined {
		const blocking = blockers.filter(isBlocking);
		if (blocking.length === 0) return undefined;
		if (resource.type === 'workflow') {
			if (resource.movedToProject) {
				return i18n.baseText('promotions.preview.marker.movedOut', {
					interpolate: {
						project:
							resource.movedToProject.name ?? i18n.baseText('promotions.preview.personalProject'),
					},
				});
			}
			if (resource.movedFromProject) {
				return i18n.baseText('promotions.preview.marker.movedIn', {
					interpolate: { project: resource.movedFromProject.name },
				});
			}
			return i18n.baseText(
				// Users cannot resolve a dependency that they cannot access.
				blocking.every(({ kind }) => kind === 'outside')
					? 'promotions.preview.marker.workflow.outside'
					: 'promotions.preview.marker.workflow',
				{ adjustToNumber: blocking.length, interpolate: { count: String(blocking.length) } },
			);
		}
		const [first] = blocking;
		if (first.kind === 'moved' && resource.type === 'folder') {
			return i18n.baseText('promotions.preview.marker.movedFolder');
		}
		const count = new Set(blocking.flatMap(({ workflowKeys }) => workflowKeys)).size;
		const options = { adjustToNumber: count, interpolate: { count: String(count) } };
		if (first.kind === 'access') return i18n.baseText('promotions.preview.marker.access', options);
		if (first.kind === 'missing' && resource.type === 'credential') {
			return i18n.baseText('promotions.preview.marker.missingCredential', options);
		}
		if (first.kind === 'missing' && resource.type === 'variable') {
			return i18n.baseText('promotions.preview.marker.missingVariable', options);
		}
		if (first.kind === 'outside' && resource.type === 'credential') {
			return i18n.baseText('promotions.preview.marker.outsideCredential', options);
		}
		return i18n.baseText('promotions.preview.marker.conflict', options);
	}

	/**
	 * What a workflow says about the dependencies that Promote leaves out, or that it cannot use
	 * on this instance after an Apply. They do not stop it.
	 */
	function missingDependencyMarker(
		dependencies: readonly PromotionMissingDependency[],
		direction: PromotionDirection,
	): string {
		const options = {
			adjustToNumber: dependencies.length,
			interpolate: { count: String(dependencies.length) },
		};
		if (dependencies.every(({ group }) => group === 'outside-access')) {
			return i18n.baseText(`promotions.preview.marker.outside.${direction}`, options);
		}
		// Only Apply has the group `needs-action`. A dependency of another project that the user
		// can access is not outside the access of the user, so the text only says that the Promote
		// does not include the dependencies.
		return dependencies.some(({ group }) => group === 'needs-action')
			? i18n.baseText('promotions.preview.marker.notUsable', options)
			: i18n.baseText('promotions.preview.marker.notIncluded', options);
	}

	/** The checkbox of a project or folder selects it and everything inside it. */
	function selectLabel(resource: PromotionResource): string {
		const interpolate = { name: resource.name };
		return isContainer(resource)
			? i18n.baseText('promotions.preview.selectContainer', { interpolate })
			: i18n.baseText('promotions.preview.select', { interpolate });
	}

	/** Names both projects of a move between projects, and how to fix it. */
	function moveDetail(
		type: keyof typeof MOVED_DETAIL,
		move: ApplyCheckResult['movedWorkflows'][number],
	): string {
		return i18n.baseText(MOVED_DETAIL[type][move.projectExists ? 'existing' : 'newProject'], {
			interpolate: {
				project: move.project.name,
				instanceProject:
					move.instanceProject.name ?? i18n.baseText('promotions.preview.personalProject'),
			},
		});
	}

	return { changeLabel, blockerMessage, missingDependencyMarker, selectLabel, moveDetail };
}
