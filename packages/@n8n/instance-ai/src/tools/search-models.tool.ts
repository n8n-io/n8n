import { Tool } from '@n8n/agents';
import { getLegacyBuilderToolNames } from '@n8n/api-types';

import { ModelCatalogService } from './models/model-catalog.service';
import { searchModelsInputSchema, searchModelsOutputSchema } from './models/schemas';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const catalogService = new ModelCatalogService();

export function createSearchModelsTool(service = catalogService) {
	return new Tool(DOMAIN_TOOL_IDS.SEARCH_MODELS)
		.legacyNames(...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.SEARCH_MODELS))
		.description('Search the models.dev catalog for text-generation models.')
		.input(searchModelsInputSchema)
		.output(searchModelsOutputSchema)
		.untrustedOutput()
		.handler(async (input, ctx) => await service.search(input, ctx.abortSignal))
		.build();
}
