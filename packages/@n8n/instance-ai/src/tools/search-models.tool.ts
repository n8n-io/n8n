import { Tool } from '@n8n/agents';
import { getLegacyBuilderToolNames } from '@n8n/api-types';

import { ModelCatalogService } from './models/model-catalog.service';
import { searchModelsInputSchema, searchModelsOutputSchema } from './models/schemas';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const catalogService = new ModelCatalogService();

export function createSearchModelsTool(fetch: typeof globalThis.fetch, service = catalogService) {
	return new Tool(DOMAIN_TOOL_IDS.SEARCH_MODELS)
		.legacyNames(...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.SEARCH_MODELS))
		.description(
			'Search models.dev for recent text-generation models when selecting a new model without a relevant credential or a suitable named builder-hint recommendation. ' +
				'This includes selecting a model for a workflow node or for an Agent main model. ' +
				'Use query to filter model IDs and names before the limit, for example provider="openrouter", query="claude" or query="openai". ' +
				'For an unspecified model, omit query unless the user requested a maker or family. Do not narrow discovery to a remembered model ID. ' +
				'If a provider credential or Gateway credits is available, list its models instead: get_node_parameter_options for a workflow node, agent_builder_resolve_llm for an Agent. ' +
				'For an Agent, prefer a model with toolCalling true, then pass its provider and id to agent_builder_resolve_llm, which checks credential access. ' +
				'Do not use this tool to check an unfamiliar or existing model, or as a fallback when credential lookup fails. ' +
				'Results include preview models and catalog metadata; they do not establish credential access or model validity.',
		)
		.input(searchModelsInputSchema)
		.output(searchModelsOutputSchema)
		.untrustedOutput()
		.handler(async (input, ctx) => await service.search(input, fetch, ctx.abortSignal))
		.build();
}
