import { Tool } from '@n8n/agents';

import { ModelCatalogService } from './models/model-catalog.service';
import { searchModelsInputSchema, searchModelsOutputSchema } from './models/schemas';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const catalogService = new ModelCatalogService();

export function createSearchModelsTool(service = catalogService) {
	return new Tool(DOMAIN_TOOL_IDS.SEARCH_MODELS)
		.description(
			'Search models.dev for recent text-generation models when selecting a new model without a relevant credential or a suitable named builder-hint recommendation. ' +
				'This includes selecting a model while building a workflow. ' +
				'Use query to filter model IDs and names before the limit, for example provider="openrouter", query="claude" or query="openai". ' +
				'For an unspecified model, omit query unless the user requested a maker or family. Do not narrow discovery to a remembered model ID. ' +
				'If a provider credential or Gateway credits is available, use nodes(action="explore-resources") with that credential instead. ' +
				'Do not use this tool to check an unfamiliar or existing model, or as a fallback when credential lookup fails. ' +
				'Results include preview models and catalog metadata; they do not establish credential access or model validity.',
		)
		.input(searchModelsInputSchema)
		.output(searchModelsOutputSchema)
		.untrustedOutput()
		.handler(async (input, ctx) => await service.search(input, ctx.abortSignal))
		.build();
}
