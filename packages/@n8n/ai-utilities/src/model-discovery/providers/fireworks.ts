import { makeBearerDataListing } from '../request';

/** Source: Fireworks OpenAI-compatible inference API (`/v1/models`). */
export const listFireworksModels = makeBearerDataListing(
	'fireworks',
	'https://api.fireworks.ai/inference/v1',
);
