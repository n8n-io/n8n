import { Tool } from '@n8n/agents';

import { ModelCatalogService } from './models/model-catalog.service';
import { searchModelsInputSchema, searchModelsOutputSchema } from './models/schemas';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const catalogService = new ModelCatalogService();

export function createSearchModelsTool(service = catalogService) {
	return new Tool(DOMAIN_TOOL_IDS.SEARCH_MODELS)
		.description(
			'Search models.dev for recent text-generation models from a provider during preliminary exploration, before a relevant credential is connected. ' +
				'If a provider credential or Gateway credits is available, use nodes(action="explore-resources") with that credential instead. ' +
				'Do not use this tool on every build, to check an unfamiliar model, or as a fallback when credential lookup fails. ' +
				'Results include preview models and catalog metadata; they do not establish credential access or model validity.',
		)
		.input(searchModelsInputSchema)
		.output(searchModelsOutputSchema)
		.handler(async (input, ctx) => await service.search(input, ctx.abortSignal))
		.build();
}
