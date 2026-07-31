import type { User } from '@n8n/db';

import type { Promotion } from './promotion.entity';

export interface SubmitPromotionRequest {
	model: string;
	/** Optional because some models derive it externally (e.g. git destination reads it from the repo). */
	unitOfWork?: { type: string; id: string };
	/** Model-specific options; each model documents what it expects. */
	options: Record<string, unknown>;
}

/** The acting user; needed by models that export/import packages in-process. */
export interface PromotionContext {
	user: User;
}

/**
 * A promotion model (the canvas's "PromotionPath") owns the lifecycle of a
 * promotion: which states exist, which actions are available in each state,
 * and what side effects run on each transition. The core entity/service/API
 * are model-agnostic; adding a model means implementing this interface and
 * registering it at module init.
 */
export interface PromotionModel {
	readonly name: string;

	/** Create the promotion in its initial state and run submit side effects. */
	submit(request: SubmitPromotionRequest, ctx: PromotionContext): Promise<Promotion>;

	/** Actions available given the promotion's current state and role. */
	availableActions(promotion: Promotion): string[];

	/** Run a transition (already validated against availableActions) and its side effects. */
	execute(
		action: string,
		promotion: Promotion,
		payload: Record<string, unknown> | undefined,
		ctx: PromotionContext,
	): Promise<Promotion>;

	/** Reconcile with external state (peer instance, git remote). Manually triggered — no pollers. */
	sync?(promotion: Promotion, ctx: PromotionContext): Promise<Promotion>;
}
