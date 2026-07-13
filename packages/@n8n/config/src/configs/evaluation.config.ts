import { Config, Env } from '../decorators';

@Config
export class EvaluationConfig {
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
	 * - Local development without PostHog wiring.
	 * - QA environments that need the feature on for a smoke run.
	 * - Self-hosted deployments that want the feature without PostHog.
	 *
	 * Cannot force-disable: setting this to `false` falls back to PostHog,
	 * not a kill-switch. Use PostHog itself to disable a rolled-out flag.
	 */
	@Env('N8N_EVAL_COLLECTIONS_ENABLED')
	collectionsEnabled: boolean = false;

	/**
	 * Force-enable Instance AI's config-based evaluation capability (the
	 * `eval-config` tool + config-evals skill).
	 *
	 * Operator-level override of the `088_instance_ai_config_evals` PostHog
	 * rollout flag. When `true`, the capability is available regardless of
	 * PostHog cohort (useful for local dev, QA, and self-hosted without
	 * PostHog). When `false` (default), PostHog is the source of truth.
	 *
	 * Cannot force-disable: `false` defers to PostHog, it is not a kill-switch.
	 */
	@Env('N8N_INSTANCE_AI_CONFIG_EVALS_ENABLED')
	configEvalsEnabled: boolean = false;
}
