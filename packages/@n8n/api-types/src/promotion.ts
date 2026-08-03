import type { Iso8601DateTimeString } from './datetime';

export type PromotionRole = 'source' | 'destination';

/** A credential the promoted package declares it needs on the destination. */
export type PromotionRequiredCredential = {
	id: string;
	name: string;
	type: string;
};

/**
 * UI-safe projection of the model-owned metadata blob. Only fields the
 * frontend renders pass through; anything else (peer API keys, tokens)
 * stays server-side.
 */
export type PromotionMetadataView = {
	baseBranch?: string;
	branch?: string;
	prNumber?: number;
	prUrl?: string;
	/** Source-side: local workflow review whose approval fires mark-ready. */
	localReviewId?: string;
	/** Destination-side: source credential id → local credential id. */
	bindings?: Record<string, string>;
	requiredCredentials?: PromotionRequiredCredential[];
	approvals?: { source: boolean; destination: boolean };
};

export type PromotionSummary = {
	id: string;
	model: string;
	role: PromotionRole;
	unitOfWork: { type: string; id: string };
	/** Lifecycle state; the vocabulary is owned by the promotion model. */
	state: string;
	/** Actions the owning model allows in the current state/role. */
	availableActions: string[];
	metadata: PromotionMetadataView;
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
};

export type PromotionModelDescription = {
	name: string;
};

/** Instance-level promotion settings the UI needs to render context. */
export type PromotionsConfigView = {
	githubRepo: string;
	/** The environment branch this instance applies promotions from. */
	githubBranch: string;
	/** Whether the PR discovery tracker is running on this instance. */
	trackerEnabled: boolean;
};
