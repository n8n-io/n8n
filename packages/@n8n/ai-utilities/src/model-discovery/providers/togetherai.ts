import { makeBearerDataListing } from '../request';

/** Source: Together AI OpenAI-compatible API (`/v1/models`). */
export const listTogetherAiModels = makeBearerDataListing(
	'togetherai',
	'https://api.together.ai/v1',
);
