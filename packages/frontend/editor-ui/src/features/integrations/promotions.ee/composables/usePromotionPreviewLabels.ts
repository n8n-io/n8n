import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { isBlocking, type Blocker } from '../promotionOperation';
import { isContainer } from '../promotionPreview.tree';

/** Apply keeps these resources as they are on the instance. It does not create them. */
const KEPT_BY_APPLY = new Set<PromotionResource['type']>(['credential', 'variable']);

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

	/** Why the resource stops Apply. `undefined` when it does not. */
	function blockerMessage(
		resource: PromotionResource,
		blockers: readonly Blocker[] = [],
	): string | undefined {
		const blocking = blockers.filter(isBlocking);
		if (blocking.length === 0) return undefined;
		if (resource.type === 'workflow') {
			if (blocking.every(({ kind }) => kind === 'location')) {
				return i18n.baseText('promotions.preview.blockers.workflowLocation');
			}
			return i18n.baseText('promotions.preview.marker.workflow', {
				adjustToNumber: blocking.length,
				interpolate: { count: String(blocking.length) },
			});
		}
		const [first] = blocking;
		if (first.kind === 'location') return i18n.baseText('promotions.preview.folder.moveConflict');
		const count = new Set(blocking.flatMap(({ workflowKeys }) => workflowKeys)).size;
		const options = { adjustToNumber: count, interpolate: { count: String(count) } };
		if (first.kind === 'access') return i18n.baseText('promotions.preview.marker.access', options);
		if (first.kind === 'missing' && resource.type === 'credential') {
			return i18n.baseText('promotions.preview.marker.missingCredential', options);
		}
		if (first.kind === 'missing' && resource.type === 'variable') {
			return i18n.baseText('promotions.preview.marker.missingVariable', options);
		}
		return i18n.baseText('promotions.preview.marker.conflict', options);
	}

	/** The checkbox of a project or folder selects the workflows inside it. */
	function selectLabel(resource: PromotionResource): string {
		const interpolate = { name: resource.name };
		return isContainer(resource)
			? i18n.baseText('promotions.preview.selectContainer', { interpolate })
			: i18n.baseText('promotions.preview.select', { interpolate });
	}

	return { changeLabel, blockerMessage, selectLabel };
}
