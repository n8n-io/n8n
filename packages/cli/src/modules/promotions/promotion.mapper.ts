import type {
	PromotionMetadataView,
	PromotionRequiredCredential,
	PromotionSummary,
} from '@n8n/api-types';

import type { Promotion } from './promotion.entity';

/**
 * Allowlist projection of the model-owned metadata blob. Models may stash
 * secrets in metadata (api-collab keeps peer API keys there), so the internal
 * API never spreads it — every exposed field is named here.
 */
function toMetadataView(metadata: Promotion['metadata']): PromotionMetadataView {
	const view: PromotionMetadataView = {};

	if (typeof metadata.baseBranch === 'string') view.baseBranch = metadata.baseBranch;
	if (typeof metadata.branch === 'string') view.branch = metadata.branch;
	if (typeof metadata.prNumber === 'number') view.prNumber = metadata.prNumber;
	if (typeof metadata.prUrl === 'string') view.prUrl = metadata.prUrl;
	if (typeof metadata.localReviewId === 'string') view.localReviewId = metadata.localReviewId;
	if (metadata.bindings && typeof metadata.bindings === 'object') {
		view.bindings = metadata.bindings as Record<string, string>;
	}
	if (Array.isArray(metadata.requiredCredentials)) {
		view.requiredCredentials = metadata.requiredCredentials as PromotionRequiredCredential[];
	}
	if (metadata.approvals && typeof metadata.approvals === 'object') {
		view.approvals = metadata.approvals as { source: boolean; destination: boolean };
	}

	return view;
}

export function toPromotionSummary(
	promotion: Promotion & { availableActions: string[] },
): PromotionSummary {
	return {
		id: promotion.id,
		model: promotion.model,
		role: promotion.role,
		unitOfWork: { type: promotion.unitOfWorkType, id: promotion.unitOfWorkId },
		state: promotion.state,
		availableActions: promotion.availableActions,
		metadata: toMetadataView(promotion.metadata),
		createdAt: promotion.createdAt.toISOString(),
		updatedAt: promotion.updatedAt.toISOString(),
	};
}
