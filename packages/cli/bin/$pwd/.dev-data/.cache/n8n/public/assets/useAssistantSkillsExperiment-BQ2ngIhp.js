import { $d as init_runtime_core_esm_bundler, Rd as computed } from "./vendor-Hx42-oQF.js";
import { bS as ASSISTANT_SKILLS_EXPERIMENT, vy as usePostHog } from "./app-D5flEmb-.js";
//#region src/experiments/assistantSkills/useAssistantSkillsExperiment.ts
init_runtime_core_esm_bundler();
function useAssistantSkillsExperiment() {
	const posthog = usePostHog();
	return { isEnabled: computed(() => posthog.isFeatureEnabled(ASSISTANT_SKILLS_EXPERIMENT.name)) };
}
//#endregion
export { useAssistantSkillsExperiment as t };
