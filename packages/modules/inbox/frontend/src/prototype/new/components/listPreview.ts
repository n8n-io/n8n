import type { InboxItem } from '@n8n/api-types';

import {
	promotionActivityReview,
	selfHealingDetail,
	workflowReviewDetail,
} from '../../prototype.fixtures';
import { prototypeDescription } from '../../prototype.session';

/** A report is Markdown. A preview shows its words in one run. */
function plainText(markdown: string) {
	return markdown
		.replace(/^#{1,6}\s*(.+)$/gm, '$1:')
		.replace(/^\s*[-*]\s+/gm, '')
		.replace(/(\*\*|__|`)/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * The text under the title in the Email and Compact rows. The list items carry no description,
 * so the sample descriptions of the prototype supply it. An edit in the detail shows here too.
 */
export function listPreviewText(item: InboxItem): string {
	switch (item.type) {
		case 'workflow_review':
			return plainText(prototypeDescription(item.id, workflowReviewDetail.description ?? ''));
		case 'self_healing_result':
			return plainText(prototypeDescription(item.id, selfHealingDetail.report));
		case 'promotion_review':
			return plainText(prototypeDescription(item.id, promotionActivityReview.description ?? ''));
	}
}
