import { makeBearerDataListing } from '../request';

/** Source: LmChatXAiGrok `loadOptions` routing. */
export const listXaiModels = makeBearerDataListing('xai', 'https://api.x.ai/v1');
