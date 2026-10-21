import type { PromotionResource } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

/** The change label that the tree rows and the change cards share, so both say the same. */
export function usePromotionPreviewLabels() {
	const i18n = useI18n();

	function changeLabel(resource: PromotionResource): string | undefined {
		switch (resource.change) {
			case 'added':
				return i18n.baseText('promotions.preview.change.added');
			case 'archived':
				return i18n.baseText('promotions.preview.change.archived');
			case 'deleted':
				return i18n.baseText('promotions.preview.change.deleted');
			case 'modified':
				if (resource.previousParentKey !== undefined) {
					return i18n.baseText('promotions.preview.change.moved');
				}
				if (resource.previousName !== undefined) {
					return i18n.baseText('promotions.preview.change.renamed');
				}
				return i18n.baseText('promotions.preview.change.modified');
			case 'unchanged':
				return undefined;
		}
	}

	return { changeLabel };
}
