import { makeBearerDataListing } from '../request';

/** Source: LmChatOpenRouter `loadOptions` routing. */
export const listOpenRouterModels = makeBearerDataListing(
	'openrouter',
	'https://openrouter.ai/api/v1',
	// Attributes n8n usage in OpenRouter's app rankings.
	{ 'HTTP-Referer': 'https://n8n.io/' },
);
