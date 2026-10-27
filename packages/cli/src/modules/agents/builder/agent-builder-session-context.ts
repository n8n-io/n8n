import { buildAgentPreviewPath } from './agent-builder-preview-path';
import { getModelRecommendationsSection } from './agents-builder-model-recommendations';

const NO_MODEL_RECOMMENDATIONS =
	'No Recommended LLM models section is available; do not recommend or name current, best, latest, or fallback model IDs from memory. Ask via `agent_builder_ask_questions` when the user needs model guidance or choice.';

/** Per-Agent context the builder needs: the Test link and the model recommendations. */
export async function buildBuilderSessionContext(
	projectId: string,
	agentId: string,
): Promise<string> {
	const modelRecommendationsSection = await getModelRecommendationsSection();

	return `\
## Session context

- Test link for the target agent: [Test](${buildAgentPreviewPath(projectId, agentId)}). Use "Test" as the link label.

${modelRecommendationsSection ?? NO_MODEL_RECOMMENDATIONS}`;
}
