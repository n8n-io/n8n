import { makeBearerDataListing } from '../request';

/** Source: Baseten OpenAI-compatible inference API (`/v1/models`). */
export const listBasetenModels = makeBearerDataListing(
	'baseten',
	'https://inference.baseten.co/v1',
);
