export interface BuilderRuntimeSkillsOptions {
	modelRecommendationsSection: string | null;
	/**
	 * Active agents sub-feature modules (`AgentsConfig.modules`). Used to
	 * gate skills whose target capability is itself module-gated, so the
	 * builder LLM doesn't get instructions for a feature an operator
	 * intentionally turned off via `N8N_AGENTS_MODULES`.
	 */
	enabledModules?: ReadonlyArray<string>;
}
