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
 * An observed change in something a promotion tracks (a local review, a PR,
 * a peer instance). Trackers translate external events into signals; the
 * promotion core never knows where a signal came from.
 */
export interface PromotionSignal {
	name: string;
	payload: Record<string, unknown>;
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

	/**
	 * React to a tracked signal. The dispatcher has already stored the observed
	 * value under `metadata.signals[signal.name]`, so implementations must
	 * re-evaluate from stored signals (level-triggered), not trust the event
	 * edge — duplicate or late deliveries are then no-ops. Runs without an
	 * acting user, so only transitions that need no user context belong here.
	 */
	onSignal?(promotion: Promotion, signal: PromotionSignal): Promise<Promotion>;
}
