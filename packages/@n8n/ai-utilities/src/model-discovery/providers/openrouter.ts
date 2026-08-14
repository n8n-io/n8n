import { makeBearerDataListing } from '../request';

/** Source: LmChatOpenRouter `loadOptions` routing. */
export const listOpenRouterModels = makeBearerDataListing(
	'openrouter',
	'https://openrouter.ai/api/v1',
);
