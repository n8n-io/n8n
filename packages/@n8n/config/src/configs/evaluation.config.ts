import { Config, Env } from '../decorators';

@Config
export class EvaluationConfig {
	/**
	 * Force-enable the parallel-execution feature for evaluation test runs.
	 *
	 * Acts as an operator-level override of the `080_eval_parallel_execution`
	 * PostHog rollout flag. When set to `true`, the FE renders the
	 * concurrency UI for every user and the BE honours `concurrency` payloads
	 * regardless of PostHog cohort. When `false` (default), PostHog remains
	 * the source of truth — the rollout flag controls visibility per-user.
	 *
	 * Useful for:
	 * - Local development without PostHog wiring.
	 * - Operator escape hatch if PostHog is unreachable.
	 * - Self-hosted deployments that want the feature without PostHog
	 *   dependency.
	 *
	 * Cannot force-disable: setting this to `false` falls back to PostHog,
	 * not a kill-switch. Use PostHog itself to disable a rolled-out flag.
	 */
	@Env('N8N_EVAL_PARALLEL_EXECUTION_ENABLED')
	parallelExecutionEnabled: boolean = false;

	/**
	 * Force-enable the eval-collections feature surface (multi-version
	 * comparison + AI insights).
	 *
	 * Acts as an operator-level override of the `084_eval_collections`
	 * PostHog rollout flag. When `true`, the collection CRUD endpoints + AI
	 * insights endpoint + frontend collections list/setup/compare views are
	 * available regardless of PostHog cohort. When `false` (default),
	 * PostHog remains the source of truth.
	 *
	 * Useful for:
	 * - Local development without PostHog wiring (mirrors the
	 *   parallelExecutionEnabled pattern above).
	 * - QA environments that need the feature on for a smoke run.
	 * - Self-hosted deployments that want the feature without PostHog.
	 *
	 * Cannot force-disable: setting this to `false` falls back to PostHog,
	 * not a kill-switch. Use PostHog itself to disable a rolled-out flag.
	 */
	@Env('N8N_EVAL_COLLECTIONS_ENABLED')
	collectionsEnabled: boolean = false;
}
